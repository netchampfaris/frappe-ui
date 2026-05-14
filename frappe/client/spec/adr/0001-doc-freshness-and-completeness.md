# Doc freshness and completeness

**Status**: accepted

## Context

The v3 data SDK exposes `getDoc(name)` as a reactive handle that reads from a normalised in-memory store (`DocStore`). Multiple sources can populate the same DocStore entry:

1. A direct `GET /api/v2/document/{doctype}/{name}` from another `getDoc` consumer.
2. A `getList({ fields: [...] })` that included this doc — a **partial** entry containing only the fields the list asked for.
3. The `response.docs[]` side channel attached to mutation and doc-method responses.
4. Cold-start hydration from the on-disk cache (any of the above, persisted earlier).
5. A live `list_update` socket event triggering a refetch.

A naive stale-while-revalidate (SWR) contract — "return whatever's in the store immediately, refetch in the background" — gives the appearance of instant render at the cost of surprising bugs: a detail page that binds `<Editor v-model="doc.content" />` against a partial entry produced by a list will render an empty editor, accept keystrokes, and race a `setValue` against the in-flight full fetch. The user-visible failure is silent data loss.

We considered three contracts:

- **(α) Pure SWR.** `doc` returns whatever the store has, regardless of completeness. Consumer is responsible for tolerating partials.
- **(β) Field-aware getDoc.** `getDoc(name, { fields: [...] })` declares the fields needed; `doc` stays null until the store has them all. Requires field-tracking metadata on every store entry.
- **(γ) Endpoint-based completeness.** Each store entry carries a `full: boolean` flag set by the request layer based on which endpoint produced it. `getDoc` accepts only `full: true` entries; otherwise `doc` is null and `loading` stays true.

A survey of the frappe-bench apps that use the older `createDocumentResource` / `useDoc` API confirmed that real apps already work as if (γ) is the contract: list-to-detail navigations always re-fetch, components guard with `v-if="doc"` before binding, and no app today relies on partial-from-list data on a detail page. The survey also showed that `getDoc` is never called with a `fields` selector in current code — (β)'s primary motivation does not exist in v1.

## Decision

`getDoc.doc` returns a doc **only when its DocStore entry is `full`**. A store entry is `full` when it arrived via one of:

1. `GET /api/v2/document/{doctype}/{name}` — direct response.
2. `POST /api/v2/document/{doctype}` — insert response.
3. `PUT` / `PATCH /api/v2/document/{doctype}/{name}` — setValue/save response.
4. Any entry in `response.docs[]` — Frappe's standard side channel populated by `frappe.response.docs.append(doc.as_dict())`.

`RequestManager` harvests `response.docs[]` on **every** successful response (regardless of the call's primary purpose) and writes each doc to the store with `{ full: true }`. List responses, doc-method primary return values, and socket events default to `{ full: false }`.

Partial entries remain in the store and continue to back `getList.data` for the list that produced them. They do not satisfy `getDoc`.

The cold-start cache preserves `meta.full` per doc so that SWR-from-cache only triggers for entries that were full when persisted.

## Rationale

- **Correctness over magic** is the spec-wide stance. The pure-SWR contract trades correctness for instant render in scenarios where consumers will silently get it wrong; the survey shows consumers are already designing around that footgun manually.
- **Endpoint-based classification is free.** The request layer is the one place that unambiguously knows the source of a response. No new API surface; no consumer effort.
- **`response.docs[]` is a 10+ year old Frappe convention.** Harvesting it gives doc-methods and bulk updates cross-instance sync without any new server-side or consumer-side work. The optimisation is in the implementation, not the contract.
- **(α) was rejected** because the failure mode (silent partial-data binding) is hard to detect in code review and produces silent data loss.
- **(β) was rejected for v1** because no current app uses field-scoped getDoc, and (γ)'s implementation is a strict subset of what (β) would need. (β) remains an additive future feature; every `full: true` entry trivially satisfies any fields-known query, so layering (β) on later is non-breaking.

## Consequences

- **Cold-start lists pay a small price.** A `getList` whose names array is restored from kv-cache will render the docs from the doc-cache only if those docs were persisted as full. Lists alone never produce full entries, so list-only cold-start hits show empty rows until the first refetch lands. In practice this is unchanged from the older API (where lists also refetched on mount).
- **Detail pages reached via list navigation pay one fetch.** No app today relied on partial-from-list data for detail rendering; the cost is the round-trip that was happening anyway under `v-if="doc"`.
- **Doc-methods and bulk ops get cross-instance sync for free.** Any server-side method that calls `frappe.response.docs.append(doc.as_dict())` participates in the canonical sync — consumers see updates in every `getDoc` / `getList` showing that doc, without any client-side wiring.
- **DocStore subscription notifications carry `meta`.** This adds a second flag-bearing channel ([ADR-0005](./0005-optimistic-per-field-patches.md) uses the same channel for `optimistic: boolean`), and ADR-0003 commits the IDB schema to storing `meta.full` on every doc.
- **Reversal cost is real.** Changing the definition of "full" later means a one-time IDB cache flush across deployed clients. Acceptable for SDK upgrades; not free.
