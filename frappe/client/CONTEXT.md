# frappe-ui data SDK

The v3 client SDK for fetching, mutating, caching, and syncing Frappe documents from a Vue app. Lives under `frappe/client/` and ships as three layers: a framework-agnostic core, a Vue adapter, and a developer-facing API generated from server-side DocType metadata.

Spec artifacts: [`spec/core.md`](./spec/core.md), [`spec/api.md`](./spec/api.md), [`spec/vue.md`](./spec/vue.md). Architecture decision records: [`spec/adr/`](./spec/adr/). This document captures the vocabulary so the spec, the implementation, and the generated docs stay aligned.

The component-library vocabulary (Dialog, dismissable, theme, etc.) lives in [`../../CONTEXT.md`](../../CONTEXT.md) and is intentionally separate.

## Language

### Store & data shape

**DocStore**: The canonical in-memory document store. One entry per `doctype/name` pair, shared by every `getDoc`, `getList`, `useCall` consumer, and socket handler. Normalised cache, not a query engine.
_Avoid_: store (ambiguous with Vuex/Pinia), cache (used for the persistence layer), state.

**doc (full)**: A DocStore entry that came from an endpoint known to return the entire document. Only full entries satisfy `getDoc.doc`. Full sources: `GET /api/v2/document/{doctype}/{name}`, document mutations (`POST`/`PATCH`/`PUT`), and any doc appearing in the `response.docs[]` side channel.
_Avoid_: complete, hydrated (as a synonym).

**doc (partial)**: A DocStore entry that came from a source not known to return the full document — primarily `getList` responses with a `fields` projection. Partial entries are visible to lists (their `data` reads back via DocStore) but do **not** satisfy `getDoc.doc`. `getDoc` keeps `doc` null and `loading: true` until a full fetch lands.
_Avoid_: projection (in the public spec; useful internally).

**response.docs[]**: Frappe's standard side channel on every API response. Any doc appended via `frappe.response.docs.append(doc.as_dict())` server-side is harvested by `RequestManager` on the client and written to DocStore with `{ full: true }`. The mechanism behind cross-instance sync for doc-methods, bulk updates, and custom RPC that wants to participate in sync.

**meta** (DocStore internal): Per-entry metadata carried on every `store.set()` and subscription notification. Currently two flags — `full: boolean` (Q3) and `optimistic: boolean` (Q8). The CacheAdapter filters on these when deciding what to persist.

### Persistence

**CacheAdapter**: Write-behind IDB persistence with two distinct channels.
- **doc channel** — persists individual docs along with their `meta`. Auto-driven via `DocStore.subscribeAll`, filtering out `optimistic: true` writes.
- **kv channel** — persists arbitrary keyed values. Used by `useCall({ cache: 'key' })` and `getList({ cache: 'key' })` (which stores its names array).

Three implementations ship: `createMemoryCacheAdapter()`, `createIDBCacheAdapter()`, `createDefaultCacheAdapter()` (IDB with memory fallback). Backed by two IDB object stores so the channels can evolve independently.
_Avoid_: storage, persistor.

**cache key**: A string identifier passed via `cache: 'foo'` on `useCall` or `getList`. The handle persists its result (or names array) under that key in the kv channel and re-hydrates from it on cold start. Explicit — no auto-derivation from params. Consumer owns invalidation via `cache.removeKey()`.

**hydration**: The cold-start phase where `CacheAdapter.loadAll*` populates `DocStore` and seeds kv-cached handles. Happens once per `createClient`; handles subscribed before hydration completes see data once it arrives, no flicker is enforced.

### Operations & mutations

**Operation**: The shared shape for every mutation — `setValue`, `delete`, `insert`, custom doc methods, controller methods, bulk ops. Exposes `.call(args)` and `.callOptimistic(args, updater?, rollback?)`. Wrapped by the Vue adapter as `FlatOperation` with reactive `loading`, `error`, `data`.

**call**: Primary verb for executing an Operation. Returns `Promise<TResult>`. Rejects on error AND sets `.error`. Cleared at the start of the next `.call()`.

**callOptimistic**: Same as `.call` but applies an update to DocStore immediately. For `setValue.callOptimistic({fields})` the SDK auto-records a per-field patch and per-field snapshot; on failure, only those specific fields revert. Custom `updater`/`rollback` callbacks are an escape hatch when the change can't be expressed as a field patch.

**patch** (optimistic): The field-level diff recorded for each `callOptimistic`. Rollback applies the inverse of the patch only — leaving concurrent or confirmed changes intact.

**confirmed**: A DocStore write that has been acknowledged by the server (either via direct response or `response.docs[]`). Only confirmed writes flow into the CacheAdapter's doc channel; optimistic writes stay in memory.

### Free-form RPC

**useCall**: Free-form RPC composable, peer to `defineDoctype`-bound primitives. Mirrors the older `createResource` shape but Vue-reactive and integrated with the kv-cache channel. Does NOT write its result into DocStore; cross-instance sync happens only via `response.docs[]` server-side harvest. Verb set: `immediate` (option), `call`, `submit` (migration alias), `reload`.

**AppMethods** (deferred, v1.1): Typed code-generated callers for `@frappe.whitelist()` methods that aren't attached to a DocType controller. Would replace many `useCall` call sites with type-checked function calls. Not in v1; `useCall` is the v1 escape hatch.

### Realtime

**realtime** (option): Opt-in per resource. `createClient({ realtime: true })` initialises the socket, but `getList` and `getDoc` only subscribe to `list_update` when *they* are passed `realtime: true`. Matches the older API's per-resource opt-in.

**list_update**: Frappe socket event sent to the doctype room on every save. Payload is `{ doctype, name, user }` — no doc data. Subscribed lists either refetch the changed doc individually (if its name is already in their names array) or refetch the current page (if the name is new).

**useSocketEvent**: Vue composable for subscribing to custom socket events with auto-cleanup on scope dispose. Replaces hand-rolled `socket.on` / `onUnmounted(socket.off)` patterns. The single first-class extension point for non-`list_update` events (typing indicators, presence, custom app events).

## Relationships

- A `DocStore` entry has exactly one canonical version; `getDoc`, `getList`, and socket handlers all read from and write to that same version. Cross-instance sync is an emergent property of this.
- `getDoc.doc` is null unless the entry is `full`. Lists never produce full entries on their own — only doc endpoints and `response.docs[]` do.
- `useCall` is a peer to `defineDoctype`, not a child of it. The 67% of real-world data-fetching call sites that aren't doctype-bound are first-class citizens.
- The CacheAdapter's two channels are independent: the doc channel handles cross-instance sync via DocStore hydration; the kv channel handles per-resource cold-start (names arrays, `useCall.data`).
- Optimistic writes are visible to subscribers but invisible to the CacheAdapter. Confirmed writes are visible to both.

## Deliberate non-features in v1

- **Field-aware `getDoc`** — `getDoc(name, { fields: [...] })` would let detail pages assert which fields they need and accept partials that cover those. Deferred. Today's getDoc always wants the full doc.
- **Auto-membership tracking in lists** — when a doc moves out of a filtered list's window, the list does NOT auto-evict it. Lists are projections, not queries. Escape hatches: `list.reload()` after a mutation, `realtime: true`, or future-feature `revalidateOnMutation: true`.
- **Layered-patch optimistic model** — concurrent optimistic ops on the same field degrade to last-write-wins, not full CRDT-style replay. Documented; rare in practice.
- **Offline-mode mutation queue** — the SDK doesn't queue mutations when the network is down. `.call()` rejects and `.error` is set; the caller decides. Architecture is kept open for a future queue (CacheAdapter signatures are extension-safe), but no v1 surface area.
- **SSR / non-Vite** — the SDK assumes the frappe-ui Vite plugin for socket URL injection and codegen integration. Not designed for SSR or non-Vite builds.

## Flagged ambiguities

- **`useCall` and DocStore**: `useCall` deliberately does not write to DocStore. Endpoints that return doc-shaped data and want cross-instance sync must server-side `frappe.response.docs.append(doc)`. This is consistent but easy to miss when migrating from `createResource` patterns that *might* have happened to update component-local state. See [ADR-0004](./spec/adr/0004-usecall-as-peer-primitive.md) (proposed).
- **getList partial entries and getDoc**: List responses do not satisfy a subsequent `getDoc` for the same name, even if the list happened to request every field. The endpoint, not the response shape, determines fullness. See [ADR-0001](./spec/adr/0001-doc-freshness-and-completeness.md) (proposed).
