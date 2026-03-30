import { reactive, type MaybeRefOrGetter } from 'vue'
import { createDocStore, type DocStore } from '../core/DocStore'
import {
  createRequestManager,
  type RequestManagerConfig,
} from '../core/RequestManager'
import {
  createNoopSocketManager,
  createLazySocketManager,
  type SocketManager,
} from '../core/SocketManager'
import type { ClientDoc } from '../core/types'
import type { FrappeResponseError } from '../core/FrappeResponseError'
import type { DocMethods } from '../core/CoreDocHandle'
import {
  invokeMethod,
  type ControllerMethods,
  type MethodDef,
  type TypedFlatMethodOperation,
} from '../core/Methods'
import { wrapOperation } from './ReactiveOperation'
import {
  createVueDocHandle,
  type VueDocHandle,
  type VueDocHandleOptions,
  type FlatOperation,
} from './vueDocHandle'
import {
  createVueListHandle,
  type VueListHandle,
  type VueListHandleOptions,
  type ReactiveFilters,
} from './vueListHandle'
import { createVueNewDocHandle, type VueNewDocHandle } from './vueNewDocHandle'
import {
  createVueCountHandle,
  type VueCountHandle,
  type GetCountOptions,
} from './vueCountHandle'
import { initFrappeSocket } from './frappe-socket'
import { connectCache, type CacheAdapter } from '../core/CacheAdapter'

export interface CreateVueClientOptions {
  baseUrl?: string
  realtime?: boolean
  cache?: CacheAdapter
  onRequest?: RequestManagerConfig['onRequest']
  onError?: (error: FrappeResponseError) => void
  onResponse?: (response: any) => void
}

export type { ControllerMethods, MethodDef } from '../core/Methods'

export interface DoctypeDefinition<
  TControllerMethods extends ControllerMethods = {},
  TDocMethods extends DocMethods = {},
> {
  doctype: string
  docMethods?: TDocMethods
  controllerMethods?: TControllerMethods
}

/** Options for getDoc, minus the wiring that createVueClient provides. */
export type GetDocOptions<
  TDoc extends ClientDoc,
  TDocMethods extends DocMethods = {},
> = Omit<
  VueDocHandleOptions<TDoc, TDocMethods>,
  'store' | 'requestManager' | 'doctype' | 'name'
>

/** Options for getList, minus the wiring that createVueClient provides. */
export type GetListOptions<TDoc extends ClientDoc> = Omit<
  VueListHandleOptions<TDoc>,
  'store' | 'requestManager' | 'doctype' | 'socket'
>

export interface VueDoctypeInstanceBase<
  TDoc extends ClientDoc,
  TDocMethods extends DocMethods = {},
> {
  getDoc(
    name: MaybeRefOrGetter<string>,
    options?: GetDocOptions<TDoc, TDocMethods>,
  ): VueDocHandle<TDoc, TDocMethods>
  getList(options?: GetListOptions<TDoc>): VueListHandle<TDoc>
  /** Create a local-only reactive draft doc for form-based create flows. */
  newDoc(defaults?: Partial<TDoc>): VueNewDocHandle<TDoc>
  /** Reactive doc count with optional filters. */
  getCount(options?: GetCountOptions): VueCountHandle
  /** Bulk delete — removes docs from server and DocStore. */
  bulkDelete: FlatOperation<string[], void>
  /** Bulk update — patches multiple docs; DocStore auto-updated. */
  bulkUpdate: FlatOperation<Array<{ name: string } & Partial<TDoc>>, TDoc[]>
  /** Subscribe to realtime doc_update events for this doctype. Returns unsubscribe fn. */
  onUpdate(callback: (name: string) => void): () => void
}

export type VueControllerMethodHandles<
  TControllerMethods extends ControllerMethods,
> = {
  [K in keyof TControllerMethods]: TypedFlatMethodOperation<TControllerMethods[K]>
}

export type VueDoctypeInstance<
  TDoc extends ClientDoc,
  TControllerMethods extends ControllerMethods = {},
  TDocMethods extends DocMethods = {},
> = VueDoctypeInstanceBase<TDoc, TDocMethods> &
  VueControllerMethodHandles<TControllerMethods>

export interface VueClientResult {
  defineDoctype: <TDoc extends ClientDoc>() => <
    TControllerMethods extends ControllerMethods = {},
    TDocMethods extends DocMethods = {},
  >(
    definition: DoctypeDefinition<TControllerMethods, TDocMethods>,
  ) => VueDoctypeInstance<TDoc, TControllerMethods, TDocMethods>
  store: DocStore
  socket: SocketManager
}

export function createClient(
  options: CreateVueClientOptions = {},
): VueClientResult {
  const {
    baseUrl = '',
    realtime,
    cache,
    onRequest,
    onError,
    onResponse,
  } = options

  const store = createDocStore()

  if (cache) {
    connectCache(store, cache)
  }
  const requestManager = createRequestManager({
    baseUrl,
    onRequest,
    onError,
    onResponse,
  })

  let socket: SocketManager

  if (realtime) {
    socket = createLazySocketManager(initFrappeSocket)
  } else {
    socket = createNoopSocketManager()
  }

  function defineDoctype<TDoc extends ClientDoc>() {
    return function <
      TControllerMethods extends ControllerMethods = {},
      TDocMethods extends DocMethods = {},
    >(
      definition: DoctypeDefinition<TControllerMethods, TDocMethods>,
    ): VueDoctypeInstance<TDoc, TControllerMethods, TDocMethods> {
      const { doctype, docMethods, controllerMethods } = definition

      // Map controller-level methods as reactive operations
      const mappedControllerMethods: Record<
        string,
        ReturnType<typeof wrapOperation>
      > = {}
      if (controllerMethods) {
        for (const [key, def] of Object.entries(controllerMethods)) {
          mappedControllerMethods[key] = wrapOperation({
            async call(params: any) {
              return invokeMethod({
                requestManager,
                store,
                url: `/api/v2/method/${doctype}/${def.method}`,
                def,
                params,
              })
            },
            async callOptimistic(params, updater, rollback) {
              if (updater) updater(store)
              try {
                return await mappedControllerMethods[key].call(params)
              } catch (e) {
                if (rollback) rollback(store)
                throw e
              }
            },
          })
        }
      }

      // Bulk delete — POST /api/v2/document/{doctype}/bulk_delete with body { names }
      const bulkDelete = wrapOperation({
        async call(names: string[]) {
          await requestManager.fetch({
            url: `/api/v2/document/${doctype}/bulk_delete`,
            method: 'POST',
            body: { names },
          })
          names.forEach((n) => store.remove(doctype, n))
        },
        async callOptimistic(names: string[], updater, rollback) {
          const snapshots = names.map((n) => {
            const doc = store.get(doctype, n)
            return doc ? { ...doc } : null
          })
          if (updater) {
            updater(store)
          } else {
            names.forEach((n) => store.remove(doctype, n))
          }
          try {
            await bulkDelete.call(names)
          } catch (e) {
            if (rollback) {
              rollback(store)
            } else {
              snapshots.forEach((snap) => {
                if (snap) store.set(snap)
              })
            }
            throw e
          }
        },
      })

      // Bulk update — POST /api/v2/document/{doctype}/bulk_update with body { docs }
      type BulkUpdateRow = { name: string } & Record<string, any>
      async function bulkUpdateCall(rows: BulkUpdateRow[]): Promise<TDoc[]> {
        const json = await requestManager.fetch({
          url: `/api/v2/document/${doctype}/bulk_update`,
          method: 'POST',
          body: { docs: rows },
        })
        if (json?.docs?.length) {
          store.setMany(json.docs)
        } else {
          // Optimistically apply patches if server returns no docs
          rows.forEach((row) => {
            const { name, ...rest } = row
            const existing = store.get(doctype, name)
            if (existing) store.set({ ...existing, ...rest })
          })
        }
        return (json?.docs ?? []) as TDoc[]
      }
      const bulkUpdate = wrapOperation({
        call: bulkUpdateCall,
        async callOptimistic(rows: BulkUpdateRow[], updater, rollback) {
          const snapshots = rows.map((row) => {
            const doc = store.get(doctype, row.name)
            return doc ? { ...doc } : null
          })
          if (updater) {
            updater(store)
          } else {
            rows.forEach((row) => {
              const { name, ...rest } = row
              const existing = store.get(doctype, name)
              if (existing) store.set({ ...existing, ...rest })
            })
          }
          try {
            return await bulkUpdateCall(rows)
          } catch (e) {
            if (rollback) {
              rollback(store)
            } else {
              snapshots.forEach((snap) => {
                if (snap) store.set(snap)
              })
            }
            throw e
          }
        },
      })

      function onUpdate(callback: (name: string) => void): () => void {
        return socket.onDocUpdate(doctype, callback)
      }

      // Wrap in reactive() so nested ReactiveOperation Refs auto-unwrap:
      // ToDo.bulkDelete.loading → boolean (not Ref<boolean>)
      return reactive({
        // Controller methods spread first so built-ins below always win
        ...mappedControllerMethods,
        bulkDelete,
        bulkUpdate,
        onUpdate,

        getDoc(
          name: MaybeRefOrGetter<string>,
          docOptions?: GetDocOptions<TDoc, TDocMethods>,
        ): VueDocHandle<TDoc, TDocMethods> {
          return createVueDocHandle<TDoc, TDocMethods>({
            store,
            requestManager,
            doctype,
            name,
            docMethods,
            ...docOptions,
          })
        },

        getList(listOptions?: GetListOptions<TDoc>): VueListHandle<TDoc> {
          return createVueListHandle<TDoc>({
            store,
            requestManager,
            doctype,
            socket,
            ...listOptions,
          })
        },

        newDoc(defaults?: Partial<TDoc>): VueNewDocHandle<TDoc> {
          return createVueNewDocHandle<TDoc>({
            store,
            requestManager,
            doctype,
            defaults,
          })
        },

        getCount(countOptions?: GetCountOptions): VueCountHandle {
          return createVueCountHandle({
            store,
            requestManager,
            doctype,
            ...countOptions,
          })
        },
      }) as unknown as VueDoctypeInstance<
        TDoc,
        TControllerMethods,
        TDocMethods
      >
    }
  }

  return { defineDoctype, store, socket }
}
