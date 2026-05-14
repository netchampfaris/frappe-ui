# Vue Adapter Spec

Thin layer that converts core DocStore subscriptions into Vue reactivity.
Developers don't import this directly — it's wired in via `createClient`.

---

## How it's activated

```ts
// src/client.ts
import {
  createClient,
  createDefaultCacheAdapter,
} from 'frappe-ui/frappe/vue'

export const {
  defineDoctype,
  useCall,
  useSocketEvent,
  store,
  socket,
} = createClient({
  baseUrl: 'https://mysite.com',
  realtime: true,
  cache: createDefaultCacheAdapter('my-app-cache'),
  onError(error) {
    if (error.isAuth) router.push('/login')
  },
})
```

`createClient` options:

| Option        | Type                                   | Description                                                                                                                                                  |
|---------------|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `baseUrl?`    | `string`                               | Prepended to all API requests. Defaults to `''`.                                                                                                             |
| `realtime?`   | `boolean`                              | Initialises `SocketManager` and exposes `socket`. Per-resource subscriptions remain opt-in via `getList`/`getDoc({ realtime: true })` — see ADR-0004.        |
| `cache?`      | `CacheAdapter`                         | Two-channel persistence adapter (doc + kv). See ADR-0003.                                                                                                    |
| `onRequest?`  | `fn`                                   | Interceptor called before every request.                                                                                                                     |
| `onResponse?` | `fn`                                   | Called after every successful response. RequestManager also harvests `response.docs[]` here.                                                                 |
| `onError?`    | `(error: FrappeResponseError) => void` | Global error handler.                                                                                                                                        |

All doctype objects created via this client's `defineDoctype` automatically
return Vue-reactive handles.

---

## What the adapter provides

### Primitives

| Export             | Purpose                                                                                                                  |
|--------------------|--------------------------------------------------------------------------------------------------------------------------|
| `defineDoctype`    | Doctype-bound primitives (used by the generated `doctypes.ts`)                                                            |
| `useCall`          | Free-form RPC composable (peer to `defineDoctype`) — see [api.md](./api.md#usecall)                                       |
| `useSocketEvent`   | Vue-cleanup-managed custom socket event subscription — see below                                                          |
| `uploadFile`       | File upload with reactive `progress` / `loading` / `data` / `error`                                                       |
| `store`            | The underlying `DocStore` instance (advanced; for debugging)                                                              |
| `socket`           | The `SocketManager` instance (when `realtime: true`)                                                                      |

### Reactive wrappers

All handles are wrapped in `reactive()` so nested `Ref`/`ComputedRef`
properties auto-unwrap. Consumers never need `.value` in templates or scripts.

| Core concept                  | Vue wrapper                                                              |
|-------------------------------|--------------------------------------------------------------------------|
| `DocStore.subscribe()`        | `shallowRef` updated in `watchEffect`, exposed as `computed`             |
| `DocStore.subscribeDoctype()` | version counter `ref` that invalidates `computed` data                   |
| Operation `loading`           | `ref<boolean>()` — unwrapped to `boolean` via `reactive()`               |
| Operation `isInitialLoading`  | `ref<boolean>()` — true only during the first call with no prior data    |
| Operation `error`             | `ref<FrappeResponseError | null>()` — unwrapped via `reactive()`         |
| Operation `data`              | `ref<T | null>()` — unwrapped via `reactive()`                           |
| Operation `abort`             | function; `canAbort` / `aborted` are reactive refs                       |

### Reactive input support

| Input type        | Vue wrapper                                                                                  |
|-------------------|----------------------------------------------------------------------------------------------|
| `getDoc` name     | `MaybeRefOrGetter<string>` — `ref`, `computed`, getter, or plain string                      |
| `getList` filters | Per-key `MaybeRefOrGetter<T>` OR a `MaybeRefOrGetter<Record>` for the whole object           |
| `useCall` params  | Same shape as `getList.filters`                                                              |
| `enabled` option  | `MaybeRefOrGetter<boolean>` — controls whether fetch is active                               |

### Lifecycle integration

- **`tryOnScopeDispose()`** — auto-cleanup subscriptions when the component
  unmounts or the effect scope is disposed. Applies to `getDoc`, `getList`,
  `useCall`, `getCount`, and `useSocketEvent`. Works outside `setup()`
  (e.g., in composables called from `onMounted`).
- **`nextTick` batching** — DocStore subscription callbacks for `getDoc` are
  fired in `nextTick` to batch rapid store updates into a single Vue update.
- **Per-resource realtime** — `getList`/`getDoc` subscribe to `list_update`
  only when their own `realtime: true` option is set, regardless of
  `createClient`'s global flag (which only governs SocketManager
  initialisation). See ADR-0004.

---

## How getDoc works in Vue

```
ToDo.getDoc(name)
  ↓
  watchEffect: resolves name, subscribes to DocStore
  ↓
  DocStore.subscribe('ToDo', name) → nextTick(() => _doc.value = updated)
  ↓
  doc = computed(() => meta.full ? transform(_doc.value) : null)
  ↓
  Component re-renders
```

When `name` is a `ref` or getter:
1. `watchEffect` tracks the reactive name.
2. On change: unsubscribe old, subscribe new, fetch new doc.
3. Old doc value cleared immediately; new fetch populates it.

`doc` resolves only when the DocStore entry's `meta.full` is `true`. Partial
entries from `getList` projections do not satisfy `getDoc` — see ADR-0001.

---

## How getList works in Vue

```
ToDo.getList({ filters: { status } })
  ↓
  watchEffect: resolves all filter values, triggers fetch
  ↓
  fetch → docs merged into DocStore (meta.full = false), names array updated
  ↓
  data = computed(() => names.map(n => DocStore.get('ToDo', n)))
  ↓
  DocStore.subscribeDoctype() bumps version counter on any change
  ↓
  data computed re-runs, component re-renders
```

Filter reactivity:
1. Each filter value can be a `ref`, `computed`, getter, or static value.
2. Whole-object filter mode: `filters: () => ({ owner: user.name, ...active.value })`.
3. `watchEffect` tracks all reactive filter values.
4. On change: debounce (if configured) → refetch with new filters.
5. Realtime: only when this handle has `realtime: true`. When `socket` is
   present and the handle opted in, `list_update` events refetch the
   changed doc individually (or refetch the whole page if the name is unknown).

`list.row(name)` is exposed as a computed for O(1) row lookup.

---

## How Operations work in Vue

Core `Operation.call()` returns a plain `Promise`. The Vue adapter wraps it
via `wrapOperation()`:

```ts
// Core
interface Operation<TParams, TResult> {
  call(params: TParams): Promise<TResult>
  callOptimistic(
    params: TParams,
    updater?: (store: DocStore) => void,
    rollback?: (store: DocStore) => void,
  ): Promise<TResult>
  // Fluent setter — registers `fn`, returns `this` for chaining.
  // Pass null to clear.
  validate(
    fn:
      | ((params: TParams) => string | Error | void | Promise<string | Error | void>)
      | null,
  ): this
}

// Vue-wrapped (before reactive() unwrapping)
interface ReactiveOperation<TParams, TResult> {
  call(params: TParams): Promise<TResult>
  callOptimistic(...): Promise<TResult>
  validate(fn: ... | null): this
  loading: Ref<boolean>
  isInitialLoading: Ref<boolean>
  error: Ref<FrappeResponseError | null>
  data: Ref<TResult | null>
  abort: () => void
  canAbort: Ref<boolean>
  aborted: Ref<boolean>
}

// After reactive() — what the consumer actually sees (FlatOperation)
interface FlatOperation<TParams, TResult> {
  call(params: TParams): Promise<TResult>
  callOptimistic(...): Promise<TResult>
  validate(fn: ... | null): this
  loading: boolean
  isInitialLoading: boolean
  error: FrappeResponseError | null
  data: TResult | null
  abort(): void
  canAbort: boolean
  aborted: boolean
}
```

### InsertOperation (list only)

`insert` has a specialised shape to support optimistic placeholders:

```ts
interface InsertOperation<TDoc> {
  call(
    values: Partial<TDoc>,
    options?: { at?: 'start' | 'end' | number },
  ): Promise<TDoc>
  callOptimistic(
    values: Partial<TDoc>,
    tempDoc?: Partial<TDoc>,
    options?: { at?: InsertPosition },
  ): Promise<TDoc>
  validate(fn: ((values: Partial<TDoc>) => ...) | null): this
  loading: boolean
  isInitialLoading: boolean
  error: FrappeResponseError | null
  data: TDoc | null
  abort(): void
  canAbort: boolean
  aborted: boolean
}
```

---

## Doctype instance shape

```ts
interface VueDoctypeInstance<TDoc, TControllerMethods> {
  getDoc(name: MaybeRefOrGetter<string>, options?: GetDocOptions): VueDocHandle<TDoc>
  getList(options?: GetListOptions): VueListHandle<TDoc>
  newDoc(defaults?: Partial<TDoc>): VueNewDocHandle<TDoc>
  getCount(options?: GetCountOptions): VueCountHandle
  setValue: FlatOperation<{ name: string } & Partial<TDoc>, TDoc>
  bulkDelete: FlatOperation<string[], void>
  bulkUpdate: FlatOperation<Array<{ name: string } & Partial<TDoc>>, TDoc[]>
  onUpdate(callback: (name: string) => void): () => void
  // + mapped controllerMethods as FlatOperation
}
```

`VueListHandle` additionally exposes:
- `row(name): Doc | undefined` — O(1) row lookup by name.
- `isItemLoading(name, action?): boolean` — per-item operation state.

---

## useSocketEvent

```ts
import { useSocketEvent } from '@/client'

useSocketEvent('typing:start', ({ user, channel }) => {
  if (channel !== currentChannel.value) return
  startTypingIndicator(user)
})

// Returns explicit stop() for early unsubscribe
const stop = useSocketEvent('presence:update', handler)
stop()
```

- Subscribes to the named socket event for the current effect scope.
- Auto-cleans up via `tryOnScopeDispose` — no manual `socket.off` needed.
- Internally calls `socket.on(name, handler)` on the client's SocketManager.
- Does not initialise the socket on its own; requires
  `createClient({ realtime: true })`.

---

## Cleanup

```ts
// Inside setup() — automatic
const todo = ToDo.getDoc('todo-1')
// → cleanup on component unmount (tryOnScopeDispose)

// Inside a composable
function useTodo(name: MaybeRefOrGetter<string>) {
  const todo = ToDo.getDoc(name)
  // → cleanup when calling scope disposes
  return todo
}

// Manual cleanup (rare)
const todo = ToDo.getDoc('todo-1')
todo.dispose()
```

---

## Progress Checklist

- [x] Vue adapter: reactive wrappers for doc / list / count / newDoc / operation
- [x] `shallowRef` subscriptions with `watchEffect` for getDoc
- [x] `MaybeRefOrGetter` for name, filters (per-key + whole-object), enabled, params
- [x] `tryOnScopeDispose` for auto-cleanup in getDoc, getList, useCall, getCount, useSocketEvent
- [x] `nextTick` batching for rapid store updates (getDoc)
- [x] `ReactiveOperation` wrapper with `loading` / `isInitialLoading` / `error` / `data` / `abort` (via `wrapOperation`)
- [x] `InsertOperation` with tempDoc optimistic placeholder and position control
- [x] `isItemLoading(name, action?)` per-item loading tracking on getList
- [x] `getList.row(name)` O(1) row lookup
- [x] `getList` custom `url` option for non-standard list endpoints
- [x] `getList` explicit `cache: 'key'` for names-array persistence (kv channel)
- [x] `getDoc` custom `url` option
- [x] Doctype-level `setValue` — patch any document without `getDoc`
- [x] Two-channel `CacheAdapter` (doc + kv) wired via `connectCache` (ADR-0003)
- [x] Realtime `list_update` auto-refetch in `getList` — per-resource opt-in (ADR-0004)
- [x] Realtime `list_update` auto-refetch in `getDoc` — per-resource opt-in (ADR-0004)
- [x] `useCall` free-form RPC composable (ADR-0002)
- [x] `useSocketEvent` for custom socket events with scope-bound cleanup
- [x] `abort()` / `canAbort` / `aborted` on every reactive handle
- [x] `initialData` option on every reactive handle
- [x] `validate(fn)` symmetric on every Operation — chainable, returns `this`
