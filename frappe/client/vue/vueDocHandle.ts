import {
  ref,
  reactive,
  shallowRef,
  computed,
  watch,
  nextTick,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'
import type { ClientDoc, Doc } from '../core/types'
import type { DocStore } from '../core/DocStore'
import type { RequestManager } from '../core/RequestManager'
import type { FrappeResponseError } from '../core/FrappeResponseError'
import type { Operation } from '../core/Operation'
import type { DocMethods } from '../core/CoreDocHandle'
import { invokeMethod, type TypedFlatMethodOperation } from '../core/Methods'
import { runOptimisticMutation } from '../core/optimisticMutation'
import type { SocketManager } from '../core/SocketManager'
import { docMethodUrl, docResourceUrl } from '../core/urls'
import { wrapOperation, type ReactiveOperation } from './ReactiveOperation'

export interface VueDocHandleOptions<
  TSourceDoc extends ClientDoc,
  TDoc extends ClientDoc = TSourceDoc,
  TMethods extends DocMethods = {},
> {
  store: DocStore
  requestManager: RequestManager
  doctype: string
  name: MaybeRefOrGetter<string>
  docMethods?: TMethods
  enabled?: MaybeRefOrGetter<boolean>
  transform?: (doc: TSourceDoc) => TDoc
  onSuccess?: (doc: TDoc) => void
  onError?: (err: FrappeResponseError) => void
  /**
   * When provided, the handle subscribes to the doctype room and refetches
   * the doc whenever the server emits `list_update` for this name. Wired
   * automatically by `createClient` when `realtime: true`.
   */
  socket?: SocketManager
}

/** Flat shape of a reactive operation after reactive() unwrapping. */
export interface FlatOperation<TParams, TResult> {
  call(params: TParams): Promise<TResult>
  callOptimistic(
    params: TParams,
    updater?: (store: DocStore) => void,
    rollback?: (store: DocStore) => void,
  ): Promise<TResult>
  loading: boolean
  error: FrappeResponseError | null
  data: TResult | null
}

export type VueDocMethodHandles<TMethods extends DocMethods> = {
  [K in keyof TMethods]: TypedFlatMethodOperation<TMethods[K]>
}

/**
 * Public shape returned by createVueDocHandle (or GPTask.getDoc).
 * All ref/computed properties are automatically unwrapped via reactive().
 */
export interface VueDocHandleBase<
  TSourceDoc extends ClientDoc,
  TDoc extends ClientDoc = TSourceDoc,
> {
  /** Current doc — null while loading or when not found. */
  doc: TDoc | null
  loading: boolean
  error: FrappeResponseError | null
  /** Resolves when the first fetch completes. */
  promise: Promise<void>
  reload(): Promise<void>
  dispose(): void
  setValue: FlatOperation<Partial<TSourceDoc>, TDoc>
  delete: FlatOperation<void, void>
}

export type VueDocHandle<
  TSourceDoc extends ClientDoc,
  TDoc extends ClientDoc = TSourceDoc,
  TMethods extends DocMethods = {},
> = VueDocHandleBase<TSourceDoc, TDoc> & VueDocMethodHandles<TMethods>

export function createVueDocHandle<
  TSourceDoc extends ClientDoc,
  TDoc extends ClientDoc = TSourceDoc,
  TMethods extends DocMethods = {},
>(
  options: VueDocHandleOptions<TSourceDoc, TDoc, TMethods>,
): VueDocHandle<TSourceDoc, TDoc, TMethods> {
  const {
    store,
    requestManager,
    doctype,
    name,
    docMethods,
    enabled,
    transform,
    onSuccess,
    onError,
    socket,
  } = options

  const _doc = shallowRef<TSourceDoc | null>(null)
  const loading = ref(false)
  const error = ref<FrappeResponseError | null>(null)

  // Track current name for use in operations (which close over it)
  let currentName = ''

  let unsubscribeDoc: () => void = () => {}
  let unsubscribeRealtime: () => void = () => {}

  let resolvePromise: () => void = () => {}
  let promiseSettled = false
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })

  async function fetchDoc(n: string): Promise<void> {
    if (!n) return
    loading.value = true
    error.value = null
    try {
      const json = await requestManager.fetchDoc(doctype, n)
      if (json?.data) {
        store.set({ doctype, ...json.data })
      }
      if (onSuccess) {
        // Use the freshly-stored value rather than _doc (which updates async via nextTick)
        const fresh = store.get(doctype, n) as TSourceDoc | null
        if (fresh) {
          const result = transform
            ? transform({ ...fresh })
            : ({ ...fresh } as unknown as TDoc)
          onSuccess(result)
        }
      }
    } catch (e) {
      const err = e as FrappeResponseError
      if (onError) {
        err._suppressGlobalError = true
        onError(err)
      }
      error.value = err
    } finally {
      loading.value = false
      if (!promiseSettled) {
        promiseSettled = true
        resolvePromise()
      }
    }
  }

  // Resolve reactive inputs to plain values so the watcher only fires when
  // the resolved name/enabled actually change. Using watchEffect here would
  // re-run whenever any reactive dep accessed by the getters changes — e.g.
  // a parent computed that returns a new object on every store update —
  // which would cause an infinite refetch loop (fetchDoc → store.set →
  // parent recompute → new prop reference → watchEffect re-fires → fetchDoc).
  const resolvedName = computed(() => toValue(name))
  const resolvedEnabled = computed(() => toValue(enabled) ?? true)

  watch(
    [resolvedName, resolvedEnabled],
    ([n, isEnabled]) => {
      unsubscribeDoc()
      unsubscribeRealtime()

      if (!isEnabled || !n) {
        _doc.value = null
        currentName = n || ''
        return
      }

      currentName = n

      // Sync cached value immediately — shallow copy so mutations to the
      // store's internal object don't bleed into _doc after unsubscribe.
      const cached = store.get(doctype, n)
      _doc.value = cached ? ({ ...cached } as unknown as TSourceDoc) : null

      // Subscribe to future store updates — shallow copy + batch via nextTick
      unsubscribeDoc = store.subscribe(doctype, n, (updated) => {
        nextTick(() => {
          // Only update if name hasn't changed since subscription was created
          if (currentName === n) {
            _doc.value = updated
              ? ({ ...updated } as unknown as TSourceDoc)
              : null
          }
        })
      })

      // Refetch this doc when the server emits list_update for it. Lets the
      // handle reflect server-side mutations from doc methods (which may not
      // return the updated doc) and from other clients.
      if (socket) {
        unsubscribeRealtime = socket.onDocUpdate(doctype, (updatedName) => {
          if (updatedName === n && currentName === n) {
            fetchDoc(n)
          }
        })
      }

      fetchDoc(n)
    },
    { immediate: true },
  )

  const doc = computed<TDoc | null>(() => {
    if (transform && _doc.value) {
      return transform(_doc.value)
    }
    return _doc.value as TDoc | null
  })

  function readDoc(name = currentName): TDoc | null {
    const current = store.get(doctype, name) as TSourceDoc | null
    if (!current) return null
    const copy = { ...current } as unknown as TSourceDoc
    return transform ? transform(copy) : (copy as unknown as TDoc)
  }

  function snapshotDoc(): Doc | null {
    const current = store.get(doctype, currentName)
    return current ? { ...current } : null
  }

  const setCoreOp: Operation<Partial<TSourceDoc>, TDoc> = {
    async call(values) {
      const json = await requestManager.fetch({
        url: docResourceUrl(doctype, currentName),
        method: 'PATCH',
        body: values as Record<string, any>,
      })
      if (json?.data) {
        store.set({ doctype, ...json.data })
      }
      return readDoc(currentName) as TDoc
    },

    async callOptimistic(values, updater, rollback) {
      const snapshot = snapshotDoc()
      return runOptimisticMutation({
        store,
        run: () => setCoreOp.call(values),
        apply: () => {
          if (updater) {
            updater(store)
            return
          }
          const current = store.get(doctype, currentName)
          if (current) store.set({ ...current, ...(values as object) })
        },
        rollback,
        restore: () => {
          if (snapshot) {
            store.set(snapshot)
          } else {
            store.remove(doctype, currentName)
          }
        },
      })
    },
  }

  const deleteCoreOp: Operation<void, void> = {
    async call() {
      await requestManager.fetch({
        url: docResourceUrl(doctype, currentName),
        method: 'DELETE',
      })
      store.remove(doctype, currentName)
    },

    async callOptimistic(_, updater, rollback) {
      const snapshot = snapshotDoc()
      return runOptimisticMutation({
        store,
        run: () => deleteCoreOp.call(),
        apply: () => {
          if (updater) {
            updater(store)
          } else {
            store.remove(doctype, currentName)
          }
        },
        rollback,
        restore: () => {
          if (snapshot) {
            store.set(snapshot)
          }
        },
      })
    },
  }

  const setValue = wrapOperation(setCoreOp, { onError })
  const deleteOp = wrapOperation(deleteCoreOp, { onError })

  // Map docMethods to reactive operations
  const mappedMethods: Record<string, ReactiveOperation<any, any>> = {}
  if (docMethods) {
    for (const [key, def] of Object.entries(docMethods)) {
      const coreOp: Operation<any, any> = {
        async call(params: any) {
          return invokeMethod({
            requestManager,
            store,
            url: docMethodUrl(doctype, currentName, def.method),
            def,
            params,
          })
        },
        async callOptimistic(params, updater, rollback) {
          const snapshot = snapshotDoc()
          return runOptimisticMutation({
            store,
            run: () => coreOp.call(params),
            apply: () => updater?.(store),
            rollback,
            restore: () => {
              if (snapshot) {
                store.set(snapshot)
              }
            },
          })
        },
      }
      mappedMethods[key] = wrapOperation(coreOp, { onError })
    }
  }

  function dispose() {
    unsubscribeDoc()
    unsubscribeRealtime()
  }

  tryOnScopeDispose(dispose)

  // Wrap in reactive() so that Ref/ComputedRef properties are auto-unwrapped
  // in Vue templates: task.doc, task.loading, task.setValue.loading all work
  // without .value.
  return reactive({
    doc,
    loading,
    error,
    promise,
    reload: () => fetchDoc(currentName),
    dispose,
    setValue,
    delete: deleteOp,
    ...mappedMethods,
  }) as unknown as VueDocHandle<TSourceDoc, TDoc, TMethods>
}
