# Core Store Spec (Framework-Agnostic)

Pure JS/TS layer with zero framework dependencies. Every framework adapter
(Vue, React, Svelte) consumes this via `subscribe()`.

---

## DocStore

Canonical in-memory document store. One entry per document, shared by all
consumers (getDoc, getList, socket updates).

```ts
interface DocStore {
  get(doctype: string, name: string): Doc | null

  // set(doc) merges into the existing entry. `meta` records per-entry flags:
  //   full       — entry came from an endpoint known to return the full doc
  //                (GET/POST/PATCH /document/{doctype}/{name} or response.docs[])
  //   optimistic — entry is an unconfirmed optimistic write; the CacheAdapter
  //                connector filters these out via the subscribeAll listener
  set(doc: Doc, meta?: { full?: boolean; optimistic?: boolean }): void
  setMany(docs: Doc[], meta?: { full?: boolean; optimistic?: boolean }): void
  remove(doctype: string, name: string): void

  // Subscribers receive the doc plus its current meta on every notification.
  subscribe(
    doctype: string,
    name: string,
    listener: (
      doc: Doc | null,
      meta: { full: boolean; optimistic: boolean },
    ) => void,
  ): () => void

  subscribeDoctype(
    doctype: string,
    listener: (
      name: string,
      doc: Doc | null,
      meta: { full: boolean; optimistic: boolean },
    ) => void,
  ): () => void

  // subscribeAll fires for every set/remove across every doctype. The
  // CacheAdapter's `connectCache` helper uses this and skips notifications
  // where meta.optimistic === true (ADR-0005).
  subscribeAll(
    listener: (
      doc: Doc | null,
      meta: { full: boolean; optimistic: boolean },
    ) => void,
  ): () => void

  // Cold-start hydration — does not notify subscribers. meta is preserved
  // so that ADR-0001's "full only satisfies getDoc" rule survives reload.
  hydrate(entries: Array<{ doc: Doc; meta: { full: boolean } }>): void

  // Snapshot all docs for a doctype.
  getAll(doctype: string): Doc[]
}

type Doc = { doctype: string; name: string; [key: string]: any }
```

Internal implementation: `Map<"DocType/name", { doc: Doc; meta }>` +
listener sets keyed by doctype/name, doctype, and "all".

### Merge semantics

`set()` merges: `Object.assign(existingDoc, incomingDoc)`. `meta` overwrites
the entry's recorded flags, with two stickiness rules:

- A subsequent partial `set()` does NOT downgrade a previously-`full` entry.
  Once an entry is `meta.full = true`, the flag is sticky — newer partial
  data refreshes fields without flipping the entry back to partial.
- An optimistic `set()` followed by a confirmed `set()` for the same doc
  flips `meta.optimistic` back to `false`. The confirmed data wins on any
  fields it overlaps.

Transforms are never stored. They are pure functions applied at read time by
each consumer (getDoc, getList). Two consumers of the same doc can apply
completely different transforms.

### Optimistic patch registry

DocStore maintains a per-doc registry of active optimistic patches so that
per-field rollback works correctly under concurrent ops. When an optimistic
write applies via `setValue.callOptimistic({...fields})`, the SDK records:

- the patched field set,
- a snapshot of those fields' values before the write,
- the owning op's id.

On confirmation, the patch is dropped. On rollback, only the patched fields
are restored — concurrent or confirmed changes to other fields survive.
Same-field overlaps degrade to last-write-wins with a dev-mode warning.
See [ADR-0005](./adr/0005-optimistic-per-field-patches.md).

---

## RequestManager

HTTP plumbing: deduplication, CSRF, abort, global hooks, and the
`response.docs[]` harvest.

```ts
interface RequestManager {
  /** Executes an HTTP request and returns the parsed JSON body. */
  fetch(config: RequestConfig): Promise<any>
  /** Fetches a single document. The response includes the full doc on `.data`. */
  fetchDoc(doctype: string, name: string): Promise<any>
}

interface RequestConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, any>
  // If true, concurrent requests to the same URL+method are deduplicated.
  // Defaults to true for GET, false for mutations.
  dedupe?: boolean
  // Wired to handle-level abort() — see "Abort" below.
  signal?: AbortSignal
}

interface RequestManagerConfig {
  baseUrl?: string
  onRequest?: (config: RequestConfig) => RequestConfig | void
  onError?: (error: FrappeResponseError) => void
  onResponse?: (response: any) => void
  store: DocStore   // required — RequestManager harvests response.docs into it
}
```

### response.docs[] harvest

On every successful response, RequestManager scans the response envelope for
a `docs` array. Each entry is written to DocStore with `meta.full = true` —
regardless of which endpoint produced the response. This is the
implementation of ADR-0001's "full" classification rule (4).

Sources of `response.docs[]` in Frappe:

- `execute_doc_method` (`frappe/api/v2.py:258`) — appends `doc.as_dict()`
  after running any whitelisted doc method.
- `bulk_update_docs` (`v2.py:454`) — appends each updated doc.
- Direct doc endpoints (`read_doc`, `insert_doc`, `set_value`) — return full
  docs in the primary response body; RequestManager additionally marks those
  `full` via endpoint dispatch (rules 1–3).
- Custom RPC — any server-side method may append docs explicitly to
  participate in cross-instance sync.

This is the mechanism that gives doc-methods, bulk ops, and well-behaved
custom RPC cross-instance sync without any per-call wiring.

### Deduplication & CSRF

Dedup key: `${method}:${fullUrlWithParams}`. Only GET dedupes by default.
POST/PATCH/DELETE never dedupe.

CSRF token read from cookie `csrf_token`, sent as `X-Frappe-CSRF-Token` on
mutating requests. `credentials: 'include'` on every request.

### Abort

Every reactive handle (`getDoc`, `getList`, `useCall`, `getCount`) owns an
`AbortController`. The handle's `.abort()` method aborts the in-flight fetch
via `RequestConfig.signal`. `.canAbort` reflects whether a request is
currently abortable; `.aborted` flips to `true` after `.abort()` and is
reset on the next fetch.

---

## CacheAdapter

Two-channel write-behind persistence. The **doc channel** mirrors DocStore
(with `meta.full` preserved). The **kv channel** persists arbitrary keyed
values used by `useCall({ cache })` and `getList({ cache })`.

```ts
interface CacheAdapter {
  // Doc channel
  persist(doc: Doc, meta: { full: boolean }): void
  persistMany(docs: Doc[], meta: { full: boolean }): void
  loadAllDocs(): Promise<Array<{ doc: Doc; meta: { full: boolean } }>>
  removeDoc(doctype: string, name: string): void

  // Kv channel
  persistKey(key: string, value: unknown): void
  loadKey(key: string): Promise<unknown | undefined>
  removeKey(key: string): void

  // Shared
  clear(): void
}
```

Three implementations are provided:
- `createMemoryCacheAdapter()` — tests and SSR.
- `createIDBCacheAdapter(dbName?)` — IndexedDB with two object stores:
  `docs` (key path `doctype + '/' + name`, value includes `meta`) and
  `kv` (key path `key`, value is JSON-serialisable).
- `createDefaultCacheAdapter(dbName?)` — IDB when available, memory fallback.

`connectCache(store, adapter)`:

- Registers a `subscribeAll` listener that calls `adapter.persist(doc, meta)`
  on every change — but **skips notifications with `meta.optimistic === true`**.
- Calls `adapter.loadAllDocs()` on startup and feeds the result to
  `store.hydrate(entries)` (which does not notify subscribers).
- Any `subscribeAll` notifications that arrive during the `loadAllDocs()`
  await are buffered and replayed after hydration.

See [ADR-0003](./adr/0003-two-channel-cacheadapter.md).

---

## SocketManager

```ts
interface SocketManager {
  connect(): void
  disconnect(): void
  on(event: string, handler: (...args: any[]) => void): () => void
  off(event: string, handler?: (...args: any[]) => void): void
  /**
   * Subscribe to list_update events for a specific doctype.
   * Emits `doctype_subscribe` to the server on the first subscriber and
   * `doctype_unsubscribe` when the last subscriber is removed.
   * Returns an unsubscribe function.
   */
  onDocUpdate(doctype: string, callback: (name: string) => void): () => void
}
```

`list_update` payload: `{ doctype, name, user }` — no doc data. Subscribed
handles refetch the changed doc individually (or refetch the current page if
the name is unknown to the list).

Three factory functions:
- `createNoopSocketManager()` — all methods are no-ops; used when
  `createClient({ realtime: false })`.
- `createSocketManager(store, socketIo)` — full implementation.
- `createLazySocketManager(store, initFn)` — wraps `createSocketManager`;
  defers `initFn()` until the first subscriber calls `onDocUpdate`.

Per-resource subscription gating is handled by the Vue adapter: only handles
that opted in via `getList({ realtime: true })` or `getDoc(name, { realtime: true })`
call `onDocUpdate`. See [ADR-0004](./adr/0004-realtime-opt-in-per-resource.md).

---

## Operation Shape

Shared contract for every mutation: `setValue`, `delete`, `insert`,
doc-methods, controller methods, bulk ops.

```ts
interface Operation<TParams, TResult> {
  // Execute the operation. Updates DocStore on success.
  // Rejects on error with FrappeResponseError.
  call(params: TParams): Promise<TResult>

  // Execute with an optional optimistic update. If `updater` is provided it
  // is applied to DocStore immediately. On error, the SDK reverts via the
  // per-field patch registry (for built-in setValue/delete/insert) or via
  // the caller-provided `rollback` (for custom updaters).
  callOptimistic(
    params: TParams,
    updater?: (store: DocStore) => void,
    rollback?: (store: DocStore) => void,
  ): Promise<TResult>

  // Register a validation hook. Returning a string or Error (sync or async)
  // from `fn` blocks the next `.call()`: the returned value is wrapped as a
  // FrappeResponseError, `.error` is set, and the promise rejects. Returning
  // void/undefined proceeds.
  //
  // Fluent setter — mutates the operation and returns `this` for chaining:
  //   await op.validate(fn).call(args)
  //
  // Pass `null` to clear. `validate` is symmetric across every Operation —
  // setValue, delete, insert, doc-methods, controller methods, bulk ops —
  // and is always optional.
  validate(
    fn:
      | ((params: TParams) => string | Error | void | Promise<string | Error | void>)
      | null,
  ): this
}
```

### Error semantics

`.call()` **rejects the promise AND sets `.error`**. Consumers can use either
pattern:

```ts
// Pattern 1: try/catch (imperative)
try {
  await todo.setValue.call({ status: 'Closed' })
} catch (e) {
  /* FrappeResponseError */
}

// Pattern 2: check .error (template-driven)
await todo.setValue.call({ status: 'Closed' }).catch(() => {})
if (todo.setValue.error) {
  /* show inline error */
}
```

`.error` is cleared at the start of each new `.call()`. If a registered
validator short-circuits the call, the error wrapping the validation value
is set synchronously before the returned promise rejects.

### Optimistic semantics

Built-in operations track patches per-field for correct rollback under
concurrent ops:

- **`setValue.callOptimistic({...fields})`** — records the patch and a
  per-field snapshot before applying. Rollback restores only the patched
  fields; concurrent or confirmed changes to other fields survive.
- **`delete.callOptimistic()`** — snapshots the full doc, removes it from
  the store. Rollback re-inserts the doc.
- **`insert.callOptimistic(values, tempDoc, options)`** — inserts the temp
  doc at the requested position. Rollback removes the temp doc by its name.
- **Custom `callOptimistic(args, updater, rollback)`** — the caller's
  `rollback` is authoritative; the SDK does not attempt patch tracking
  because it can't know what `updater` touched.

Same-field overlapping ops degrade to last-write-wins on the store, with a
dev-mode warning. See [ADR-0005](./adr/0005-optimistic-per-field-patches.md).

### Return values

| Operation                              | Resolves to                  |
|----------------------------------------|------------------------------|
| `setValue.call()`                      | Updated `Doc`                |
| `delete.call()`                        | `void`                       |
| `insert.call(values, { at? })`         | Created `Doc` (with `name`)  |
| `bulkDelete.call()`                    | `void`                       |
| `bulkUpdate.call()`                    | `Doc[]` (updated docs)       |
| `docMethod.call()`                     | Server method return value   |
| `controllerMethod.call()`              | Server method return value   |

`insert` uses the specialised `InsertOperation` shape — `call` and
`callOptimistic` accept an extra `options.at: 'start' | 'end' | number` arg
(default `'start'`) so the new doc lands at the requested position without a
"prepend then move" step.

---

## FrappeResponseError

```ts
class FrappeResponseError extends Error {
  title: string
  type: string
  messages: Array<{ type: string; message: string }>
  exception?: string
  indicator?: string
  httpStatus: number
  _suppressGlobalError: boolean // set by local onError to skip global handler

  get isNotFound(): boolean   // httpStatus === 404
  get isPermission(): boolean // httpStatus === 403
  get isValidation(): boolean // type === 'ValidationError'
  get isAuth(): boolean       // httpStatus === 401
}
```

When a registered validator short-circuits a call, the returned value is
wrapped as a `FrappeResponseError` with `type: 'ValidationError'` and
`httpStatus: 0`, so the `isValidation` getter detects it.

---

## Progress Checklist

- [x] DocStore: get/set/remove/subscribe/subscribeDoctype/subscribeAll/hydrate
- [x] DocStore: `meta` channel on set + subscriptions (`full`, `optimistic`)
- [x] DocStore: optimistic patch registry for per-field rollback (ADR-0005)
- [x] RequestManager: fetch + fetchDoc with dedup + CSRF + abort + global hooks
- [x] RequestManager: `response.docs[]` auto-harvest into DocStore (ADR-0001)
- [x] Handle-level abort wired via `RequestConfig.signal`
- [x] CacheAdapter: two-channel (doc + kv); `connectCache` filters optimistic (ADR-0003)
- [x] SocketManager: `list_update` with `onDocUpdate` helper
- [x] Per-resource realtime gating in adapter layer (ADR-0004)
- [x] FrappeResponseError with structured error types
- [x] Operation shape with `call` / `callOptimistic` / `validate(fn)` (chainable)
- [x] CoreDocHandle with `abort` + `dispose`
- [x] CoreListHandle with `abort` + `dispose`
