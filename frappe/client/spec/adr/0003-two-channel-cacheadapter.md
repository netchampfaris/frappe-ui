# Two-channel CacheAdapter (doc + kv)

**Status**: accepted

## Context

The v3 SDK persists data to IndexedDB for cold-start hydration. Before this ADR, `CacheAdapter` exposed a single channel:

```ts
interface CacheAdapter {
  persist(doc: Doc): void
  persistMany(docs: Doc[]): void
  loadAll(): Promise<Doc[]>
  remove(doctype: string, name: string): void
  clear(): void
}
```

`connectCache(store, adapter)` wired the adapter as a subscriber to `DocStore.subscribeAll`, so every `store.set()` would background-persist the affected doc.

Two requirements emerged from later decisions that the single channel cannot serve:

1. **[ADR-0002](./0002-usecall-as-peer-primitive.md) — `useCall({ cache: 'key' })`.** `useCall` returns arbitrary data — RPC results, aggregates, app-specific payloads — that is not doc-shaped. Persisting these under the doc channel is incoherent (no `doctype`/`name`) and rehydrating from the doc channel can't retrieve them.

2. **`getList({ cache: 'key' })`.** The current spec persists docs via the store, but a list's own names array (`['todo-1', 'todo-3']`) is list-local state that has nowhere to live. On cold start, the docs are cached but the list itself can't render them until the server returns — a missed instant-render opportunity that the older API (`createListResource({ cache: 'foo' })`) addressed and that real apps rely on.

A third constraint also became binding: [ADR-0001](./0001-doc-freshness-and-completeness.md) requires per-doc `meta: { full: boolean }`, and [ADR-0005](./0005-optimistic-per-field-patches.md) requires the cache to filter out `optimistic: true` writes. Both push `meta` into the doc-channel's persistence path.

We considered:

- **(A) Two channels, two IDB object stores.** `docs` for the by-doc channel (with `meta` per row), `kv` for arbitrary keyed values. Each channel has its own methods on `CacheAdapter`.
- **(B) One channel, single object store, discriminator column.** Store everything as `{ type: 'doc' | 'kv', key, value, meta? }`. Smaller schema. Worse queries.
- **(C) Drop persistence for `useCall` and `getList.cache`.** Memory-only kv; no IDB for non-doc data. Smallest spec. Loses instant render for those primitives on cold start.

## Decision

**`CacheAdapter` has two channels, backed by two IDB object stores.**

```ts
interface CacheAdapter {
  // doc channel
  persist(doc: Doc, meta?: { full: boolean }): void
  persistMany(docs: Doc[], meta?: { full: boolean }): void
  loadAllDocs(): Promise<Array<{ doc: Doc; meta: { full: boolean } }>>
  removeDoc(doctype: string, name: string): void

  // kv channel
  persistKey(key: string, value: unknown): void
  loadKey(key: string): Promise<unknown | undefined>
  removeKey(key: string): void

  // shared
  clear(): void
}
```

Wiring:
- `connectCache(store, adapter)` subscribes to `DocStore.subscribeAll` and persists each notification to the **doc channel only**, filtering out `meta.optimistic === true`.
- `useCall({ cache: 'key' })` writes to the **kv channel** on every confirmed response and reads from it once at mount.
- `getList({ cache: 'key' })` writes its names array to the **kv channel** under that key (the docs themselves are already handled by the doc channel via DocStore).

The IDB schema commits to two object stores: `docs` (key path: `doctype + '/' + name`, value includes `meta`) and `kv` (key path: `key`, value is arbitrary JSON-serialisable). Memory and default adapters mirror the same shape.

## Rationale

- **The two channels have non-overlapping responsibilities.** Doc channel: normalised cache backing cross-instance sync. Kv channel: per-resource persistence for primitives that don't share state. Forcing them into one channel produces awkward queries (filtering by discriminator on every `loadAll`) for no gain.
- **`meta` belongs on the doc channel only.** The kv channel stores opaque blobs; whatever invariants `useCall` or `getList` rely on can live inside the persisted value itself.
- **Two object stores is the standard IDB pattern for this shape.** Independent indices, independent migrations, clear ownership.
- **(B) was rejected** because the discriminator pattern makes `loadAllDocs()` slower (full-table scan vs object-store scan) and makes the per-doc `meta` schema have to be optional everywhere it appears.
- **(C) was rejected** because [ADR-0002](./0002-usecall-as-peer-primitive.md) explicitly relies on `useCall` cache for migration parity with `createResource`'s widespread `cache: 'foo'` usage. Killing kv-cache would silently regress real-app perceived perf on cold start.

## Consequences

- **The IDB schema is fixed for v1.** Both object stores are part of the contract. Changing them requires a schema version bump, which forces existing clients to flush and rebuild their cache on first load after an upgrade. Acceptable for SDK majors; not free.
- **`meta` is the extension point for doc-channel evolution.** Today carries `{ full }` (ADR-0001) and is read by the subscription filter as `{ optimistic }` (ADR-0005, in-memory only). Future additions ride the same channel without further schema changes.
- **Future offline support has a place to live.** Each channel can grow a `tombstone`, `pendingMutation`, or `lastSyncedAt` field without disturbing the other. The two-channel split is not offline-specific, but it does not foreclose offline either.
- **The CacheAdapter interface is extension-safe.** `persist(doc, meta?)` and `persistKey(key, value)` both accept additional optional arguments without breaking callers.
- **Implementations multiply by two.** `createMemoryCacheAdapter()`, `createIDBCacheAdapter()`, `createDefaultCacheAdapter()` all have to implement both channels. The cost is small (each is ~30 lines) but it does exist.
