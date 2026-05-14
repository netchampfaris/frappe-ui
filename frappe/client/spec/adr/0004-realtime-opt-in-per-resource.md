# Realtime opt-in per resource

**Status**: accepted

## Context

`createClient({ realtime: true })` initialises a Socket.IO connection and exposes a `SocketManager`. The original spec implied that every `getList` and `getDoc` produced by `defineDoctype` would automatically subscribe to that doctype's `list_update` event — turning realtime on globally meant turning it on for every reactive handle in the app.

A survey of frappe-bench apps showed this is not how real apps want realtime:

- **gameplan** uses realtime heavily on *some* lists (project boards, task lists) and explicitly avoids it on others (discussion lists, where update volume would flood the UI).
- **helpdesk, crm, drive** have socket connections but their primary lists are explicitly non-realtime; they use socket events selectively for typing indicators, presence, and custom app events.
- The older `createListResource` / `createDocumentResource` API took `realtime: true` as a per-resource flag, opt-in.

The implicit-everywhere model would either flood UI with refetches on busy doctypes (cost: Vue work scaling with handle count, even after RequestManager dedup) or force every consumer to opt-out individually — both worse than the older API's behaviour.

A second concern: custom socket events (not `list_update`) are the dominant realtime use case for non-gameplan apps. The framework-agnostic `socket.on(event, handler)` works, but the survey caught multiple sites where `onUnmounted(() => socket.off(...))` was either missed or wired incorrectly. A Vue-reactive wrapper with scope-bound cleanup would retire a real bug class.

We considered:

- **(α) Opt-out default.** `createClient({ realtime: true })` → all lists/docs subscribe. Per-resource `realtime: false` to opt out. Most magical; biggest match for "you said you wanted realtime."
- **(β) Opt-in per resource.** `createClient({ realtime: true })` initialises the socket only. Each `getList`/`getDoc` must pass `realtime: true` to subscribe. Matches the older API; explicit.
- **(γ) No per-resource control.** Global on/off only. Smallest API; doesn't match real-app usage.

## Decision

**Realtime is opt-in per resource.**

- `createClient({ realtime: true })` initialises `SocketManager` and the `socket` export but does NOT cause any `getList`/`getDoc` to subscribe.
- `getList(options)` and `getDoc(name, options)` accept an explicit `realtime: true` option. Only handles with the flag set subscribe to `list_update` for their doctype.
- `useCall` does not participate in `list_update` (it's free-form RPC).
- A new `useSocketEvent(name, handler)` composable is added to the Vue adapter. It subscribes for the current effect scope and cleans up via `tryOnScopeDispose`. This is the canonical pattern for custom socket events.

## Rationale

- **Matches the survey's reality.** Apps want realtime to be a deliberate per-list / per-doc decision, not an ambient client capability. Forcing them to opt-out per-resource is worse ergonomics than the older API.
- **Avoids "spooky action at a distance."** With opt-in, a developer reading a component can see exactly which handles are reactive to remote changes by looking at the `getList` / `getDoc` options. With opt-out, they'd have to know the global default and the local override.
- **Prevents accidental traffic.** Apps that adopt v3 incrementally won't get a flood of new socket subscriptions just because some `createClient` call now passes `realtime: true`. The migration cost is bounded to handles that explicitly want the behaviour.
- **`useSocketEvent` fills a real bug class.** The survey caught 4+ hand-rolled `socket.on` + `onUnmounted(socket.off)` patterns; replacing them retires bugs that have either already been written or will be.
- **(α) was rejected** because the explicit-everywhere-by-default behaviour produced regressions in mental model — apps were already coding around it.
- **(γ) was rejected** because the survey clearly shows per-resource granularity is needed; without it, apps would have to manage realtime by maintaining separate `createClient` instances, which is incoherent.

## Consequences

- **Fully-realtime apps are slightly more verbose.** An app that wants every list to be live has to pass `realtime: true` on every `getList`. A future helper (`createClient({ defaultRealtime: true })` or similar) could ease this without breaking the per-resource override.
- **The spec text for realtime needs a rewrite.** The previous "list_update auto-refetch in getList" statement is now conditional on the per-resource flag. `api.md` and `vue.md` both carry this edit.
- **`useSocketEvent` is the only first-class extension point for non-`list_update` events.** Apps that want custom realtime semantics (typing, presence) compose this; the SDK does not try to be clever about other event shapes.
- **`SocketManager` subscription refcounting still applies.** When two lists for the same doctype both set `realtime: true`, the server-side `doctype_subscribe` is emitted only once. Per-list callbacks dispatch independently on the client.
- **Filter-membership staleness remains a per-list concern.** Realtime helps but does not fully fix it (see CONTEXT.md, "Deliberate non-features in v1"). Apps that need accurate filter membership combine `realtime: true` with their own logic or wait for a future `revalidateOnMutation` feature.
