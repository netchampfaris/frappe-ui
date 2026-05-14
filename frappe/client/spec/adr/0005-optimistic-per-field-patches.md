# Optimistic mutations: per-field patches, confirmed-only persistence

**Status**: accepted

## Context

`Operation.callOptimistic(args, updater?, rollback?)` applies a change to DocStore before the server confirms it, then reverts on error. The original spec described auto-revert as "via a pre-update snapshot": before the optimistic update, capture the entire affected doc; on failure, restore that snapshot.

Whole-doc snapshot rollback is broken under concurrent optimistic operations on the same doc. Concrete failure mode:

```
t=0    store: { status: 'Open',   priority: 2 }
t=0    A: setValue.callOptimistic({ status: 'Closed' })
       → store: { status: 'Closed', priority: 2 }
       → snapshot S_A captured: { status: 'Open', priority: 2 }

t=50ms B: setValue.callOptimistic({ priority: 3 })
       → store: { status: 'Closed', priority: 3 }
       → snapshot S_B captured: { status: 'Closed', priority: 2 }

t=100ms B succeeds — server returns { status: 'Closed', priority: 3 } via response.docs[]
       → store: { status: 'Closed', priority: 3 }   ✓ (confirmed)

t=150ms A fails — auto-revert to S_A
       → store: { status: 'Open', priority: 2 }   ✗ silently lost B's confirmed priority
```

A second, independent concern: optimistic writes flow through `DocStore.subscribeAll` and therefore reach the CacheAdapter. On reload during an in-flight optimistic op, IDB rehydrates DocStore with unconfirmed state and no in-flight op exists to confirm or revert it. The cache "lies" until the next refetch overwrites the affected doc.

A survey of frappe-bench apps showed optimistic mutations are real but used selectively: gameplan toggles task status and checkboxes optimistically; helpdesk, crm, drive default to pessimistic. The dominant pattern is `setValue.callOptimistic({ singleField: newValue })` — concurrent multi-field optimistic ops on the same doc are rare but happen (e.g. a user rapidly editing two fields in a form).

We considered three rollback models:

- **(A) Per-field patch + per-field revert.** Each `setValue.callOptimistic({fields})` records both the patch and a per-field snapshot of only the affected fields. On failure, only those fields revert. Concurrent ops on different fields compose correctly. Concurrent ops on the *same* field degrade to last-write-wins on the store, with rollback of the earlier op silently no-opping on the contested field.
- **(B) Layered-patch model.** Maintain a per-doc registry of active optimistic patches. Effective store value = `serverBase + patches.reduce(apply)`. Most correct under all concurrent scenarios. Effectively a small CRDT.
- **(C) Serialise optimistic ops per doc.** A second `callOptimistic` while one is in-flight is queued. Trivially correct; kills the responsive-toggle UX that is the whole point of optimistic.

And two cache-persistence models:

- **(p1) Persist everything.** Optimistic writes flow into IDB. On reload, briefly stale; first refetch fixes it.
- **(p2) Persist confirmed only.** DocStore notifications carry `meta.optimistic`; CacheAdapter filters them out. Cache never lies.

## Decision

**Rollback model: (A) per-field patches with per-field revert.**

- `setValue.callOptimistic({field1, field2, ...})` records the patch `{field1, field2, ...}` and a snapshot of *only those fields* before the optimistic write.
- On failure, the SDK restores only those fields from the snapshot. Concurrent or confirmed changes to other fields are untouched.
- If two concurrent ops target the same field, the second op's optimistic value is what's visible. Rollback of the earlier op finds the snapshot's value no longer matches the store and silently no-ops on the contested field, with a dev-mode warning. Last-write-wins.
- `delete.callOptimistic()` records a full pre-delete snapshot of the doc; rollback re-inserts it into the store.
- `insert.callOptimistic(values, tempDoc, options)` records the temp name and insertion position; rollback removes the temp doc.
- The custom escape-hatch form `callOptimistic(args, updater, rollback)` remains available. Caller-provided `rollback` is authoritative; the SDK does not attempt patch tracking when this form is used.

**Persistence model: (p2) confirmed-only persistence.**

DocStore subscription notifications carry `meta: { full?: boolean; optimistic?: boolean }`. `connectCache(store, adapter)` registers a `subscribeAll` listener that skips notifications with `optimistic: true`. Optimistic writes are visible to in-memory subscribers (which is the entire point) but invisible to disk.

## Rationale

- **(A) handles the common case correctly.** Multi-field optimistic ops on a single doc compose cleanly. The pathological "two ops on the same field" case is rare in practice (the survey didn't find a single example) and degrades gracefully to LWW.
- **(B) is theoretically cleaner but the complexity-to-benefit ratio is wrong for v1.** It requires a per-doc patch registry, recomputation on every confirmation, and CRDT-flavoured corner-case reasoning. It can be added later non-disruptively: (A) and (B) produce identical results in every case the survey found.
- **(C) defeats the purpose.** Optimistic UX exists to absorb rapid user input; serialising kills it.
- **(p2) eliminates a real bug class for free.** The same `meta` channel that carries `full: boolean` (ADR-0001) carries `optimistic: boolean`. The cache's subscription filter is one line. There's no reason to ship the "cache lies briefly" behaviour when avoiding it is this cheap.
- **`response.docs[]` harvest interacts cleanly.** When B's mutation succeeds, the server response includes B's confirmed doc; RequestManager harvests it and writes with `{ full: true, optimistic: false }`. The store now has confirmed B; B's optimistic patch is dropped from tracking; A's pending patch is unaffected.

## Consequences

- **Same-field rollback is silently lossy in concurrent cases.** Documented and dev-warned. Apps that need stronger guarantees combine optimistic with explicit invalidation or use the pessimistic `.call()`.
- **DocStore's notification payload grows.** It now carries `meta: { full?, optimistic? }`. This is a one-time API change, but it must be reflected in every subscriber: cache wiring, framework adapters, the optimistic patch tracker itself.
- **A small per-doc patch registry lives in DocStore (or alongside it).** Tracks active optimistic patches: their fields, their snapshots, their owning op. The registry is in-memory only; not persisted (per p2).
- **Reload during an in-flight optimistic op behaves predictably.** The op was in-memory only, so reload loses it; cache shows confirmed state; the user's optimistic intent is dropped. This matches what happens for any in-flight mutation across reload — there is no offline queue in v1.
- **The custom `callOptimistic(args, updater, rollback)` shape remains.** Patch-tracking is only automatic for the standard `setValue` / `delete` / `insert` shapes. For arbitrary updaters, the caller knows the change and provides the rollback.
- **Future migration to (B) is non-breaking.** Per-field rollback is a strict subset of layered-patch behaviour for the cases the survey found. Apps coded against (A) work unchanged if the implementation moves to (B) later.
