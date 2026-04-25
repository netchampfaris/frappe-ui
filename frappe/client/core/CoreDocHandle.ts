import type { ClientDoc, Doc } from './types'
import type { DocStore } from './DocStore'
import type { RequestManager } from './RequestManager'
import type { Operation } from './Operation'
import {
  invokeMethod,
  type DocMethods,
  type MethodDef,
  type TypedMethodOperation,
} from './Methods'
import { docMethodUrl, docResourceUrl } from './urls'
import { runOptimisticMutation } from './optimisticMutation'

export type { DocMethods, MethodDef } from './Methods'

export type MappedDocMethod<TArgs extends any[], TResult = any> = Operation<
  TArgs extends [] ? void : Parameters<(...a: TArgs) => void>[0],
  TResult
>

export type CoreDocHandleDocMethods<TMethods extends DocMethods> = {
  [K in keyof TMethods]: TypedMethodOperation<TMethods[K]>
}

export interface CoreDocHandleBase<TDoc extends ClientDoc> {
  /** Current snapshot from DocStore — updated synchronously via subscription. */
  doc: TDoc | null
  /** Resolves when the initial fetch completes. */
  promise: Promise<void>
  reload(): Promise<void>
  dispose(): void
  setValue: Operation<Partial<TDoc>, TDoc>
  delete: Operation<void, void>
}

export type CoreDocHandle<
  TDoc extends ClientDoc,
  TMethods extends DocMethods = {},
> = CoreDocHandleBase<TDoc> & CoreDocHandleDocMethods<TMethods>

export interface CoreDocHandleOptions<
  TDoc extends ClientDoc,
  TMethods extends DocMethods = {},
> {
  store: DocStore
  requestManager: RequestManager
  doctype: string
  name: string
  docMethods?: TMethods
}

export function createCoreDocHandle<
  TDoc extends ClientDoc,
  TMethods extends DocMethods = {},
>(
  options: CoreDocHandleOptions<TDoc, TMethods>,
): CoreDocHandle<TDoc, TMethods> {
  const { store, requestManager, doctype, name, docMethods } = options

  const docUrl = docResourceUrl(doctype, name)

  // Snapshot — shallow copy so mutations to the store's internal object
  // don't bleed into the handle after dispose() removes the subscription.
  function copyDoc(d: ReturnType<DocStore['get']>): TDoc | null {
    return d ? ({ ...d } as TDoc) : null
  }

  let doc: TDoc | null = copyDoc(store.get(doctype, name))

  const unsubscribe = store.subscribe(doctype, name, (updated) => {
    doc = copyDoc(updated)
  })

  let abortController: AbortController | null = null

  const reload = async (): Promise<void> => {
    abortController?.abort()
    abortController = new AbortController()
    try {
      const json = await requestManager.fetch({
        url: docUrl,
        method: 'GET',
        signal: abortController.signal,
      })
      if (json?.data) {
        store.set({ doctype, ...json.data })
      }
    } finally {
      abortController = null
    }
  }

  const promise = reload()

  function snapshotDoc(): Doc | null {
    const current = store.get(doctype, name)
    return current ? { ...current } : null
  }

  const setValue: Operation<Partial<TDoc>, TDoc> = {
    async call(values) {
      const json = await requestManager.fetch({
        url: docUrl,
        method: 'PATCH',
        body: values as Record<string, any>,
      })
      if (json?.data) {
        store.set({ doctype, ...json.data })
      }
      return store.get(doctype, name) as TDoc
    },

    async callOptimistic(values, updater, rollback) {
      const snapshot = snapshotDoc()
      return runOptimisticMutation({
        store,
        run: () => setValue.call(values),
        apply: () => updater?.(store),
        rollback,
        restore: () => {
          if (snapshot) {
            store.set(snapshot)
          } else {
            store.remove(doctype, name)
          }
        },
      })
    },
  }

  const deleteOp: Operation<void, void> = {
    async call() {
      await requestManager.fetch({
        url: docUrl,
        method: 'DELETE',
      })
      store.remove(doctype, name)
    },

    async callOptimistic(_, updater, rollback) {
      const snapshot = snapshotDoc()
      return runOptimisticMutation({
        store,
        run: () => deleteOp.call(),
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

  // Map docMethods to operations
  const mappedMethods: Record<string, Operation<any, any>> = {}
  if (docMethods) {
    for (const [key, def] of Object.entries(docMethods)) {
      mappedMethods[key] = {
        async call(params: any) {
          return invokeMethod({
            requestManager,
            store,
            url: docMethodUrl(doctype, name, def.method),
            def,
            params,
          })
        },
        async callOptimistic(params, updater, rollback) {
          const snapshot = snapshotDoc()
          return runOptimisticMutation({
            store,
            run: () => mappedMethods[key].call(params),
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
    }
  }

  return {
    get doc() {
      return doc
    },
    promise,
    reload,
    dispose() {
      unsubscribe()
      abortController?.abort()
    },
    setValue,
    delete: deleteOp,
    ...mappedMethods,
  } as CoreDocHandle<TDoc, TMethods>
}
