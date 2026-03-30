import { createDocStore, type DocStore } from './DocStore'
import {
  createRequestManager,
  type RequestManagerConfig,
} from './RequestManager'
import {
  createNoopSocketManager,
  createSocketManager,
  type SocketManager,
} from './SocketManager'
import { createCoreDocHandle, type DocMethods } from './CoreDocHandle'
import { createCoreListHandle, type GetListParams } from './CoreListHandle'
import { invokeMethod, type ControllerMethods, type MethodDef } from './Methods'
import type { Doc } from './types'
import type { FrappeResponseError } from './FrappeResponseError'
import type { RequestConfig } from './types'

export interface CreateCoreClientOptions {
  baseUrl?: string
  realtime?: boolean | { socketIo: any }
  onRequest?: RequestManagerConfig['onRequest']
  onError?: (error: FrappeResponseError) => void
  onResponse?: (response: any) => void
}

export interface DoctypeDefinition<
  TControllerMethods extends ControllerMethods = {},
  TDocMethods extends DocMethods = {},
> {
  doctype: string
  docMethods?: TDocMethods
  controllerMethods?: TControllerMethods
}
export type { ControllerMethods, MethodDef } from './Methods'

export interface CoreClientResult {
  /** Curried factory for creating doctype-bound handles. */
  defineDoctype: <TDoc extends Doc>() => <
    TControllerMethods extends ControllerMethods = {},
    TDocMethods extends DocMethods = {},
  >(
    definition: DoctypeDefinition<TControllerMethods, TDocMethods>,
  ) => DoctypeInstance<TDoc, TControllerMethods, TDocMethods>
  store: DocStore
  socket: SocketManager
}

export interface DoctypeInstance<
  TDoc extends Doc,
  TControllerMethods extends ControllerMethods = {},
  TDocMethods extends DocMethods = {},
> {
  getDoc(name: string): ReturnType<typeof createCoreDocHandle<TDoc>>
  getList(params?: GetListParams): ReturnType<typeof createCoreListHandle<TDoc>>
  // Controller-level methods exposed as Operations
  [key: string]: any
}

export function createCoreClient(
  options: CreateCoreClientOptions = {},
): CoreClientResult {
  const { baseUrl = '', realtime, onRequest, onError, onResponse } = options

  if (realtime === true) {
    throw new Error(
      'createCoreClient requires realtime.socketIo; use createVueClient for automatic socket setup.',
    )
  }

  const store = createDocStore()
  const requestManager = createRequestManager({
    baseUrl,
    onRequest,
    onError,
    onResponse,
  })

  let socket: SocketManager
  if (realtime && typeof realtime === 'object' && realtime.socketIo) {
    socket = createSocketManager(realtime.socketIo)
  } else {
    socket = createNoopSocketManager()
  }

  function defineDoctype<TDoc extends Doc>() {
    return function <
      TControllerMethods extends ControllerMethods = {},
      TDocMethods extends DocMethods = {},
    >(
      definition: DoctypeDefinition<TControllerMethods, TDocMethods>,
    ): DoctypeInstance<TDoc, TControllerMethods, TDocMethods> {
      const { doctype, docMethods, controllerMethods } = definition

      // Map controller-level methods (not per-doc)
      const mappedControllerMethods: Record<string, any> = {}
      if (controllerMethods) {
        for (const [key, def] of Object.entries(controllerMethods)) {
          mappedControllerMethods[key] = {
            async call(params: any) {
              return invokeMethod({
                requestManager,
                store,
                url: `/api/v2/method/${doctype}/${def.method}`,
                def,
                params,
              })
            },
          }
        }
      }

      return {
        getDoc(name: string) {
          return createCoreDocHandle<TDoc>({
            store,
            requestManager,
            doctype,
            name,
            docMethods,
          })
        },
        getList(params?: GetListParams) {
          return createCoreListHandle<TDoc>({
            store,
            requestManager,
            doctype,
            ...params,
          })
        },
        ...mappedControllerMethods,
      }
    }
  }

  return { defineDoctype, store, socket }
}
