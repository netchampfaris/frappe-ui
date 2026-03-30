import type { DocStore } from './DocStore'
import type { RequestManager } from './RequestManager'
import type { FrappeResponseError } from './FrappeResponseError'
import type { Operation } from './Operation'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface MethodDef {
  method: string
  httpMethod?: HttpMethod
  /** Builds the body/params from the call arguments. */
  args?: (...args: any[]) => Record<string, any>
}

export type DocMethods = Record<string, MethodDef>
export type ControllerMethods = Record<string, MethodDef>

type MethodArgsTuple<TMethod extends MethodDef> = NonNullable<
  TMethod['args']
> extends (...args: infer TArgs) => Record<string, any>
  ? TArgs
  : [params?: Record<string, any>]

type MethodParam<TMethod extends MethodDef> = MethodArgsTuple<TMethod> extends []
  ? never
  : MethodArgsTuple<TMethod>[0]

export type TypedMethodOperation<TMethod extends MethodDef, TResult = any> =
  MethodArgsTuple<TMethod> extends []
    ? {
        call(): Promise<TResult>
        callOptimistic(
          params?: undefined,
          updater?: (store: DocStore) => void,
          rollback?: (store: DocStore) => void,
        ): Promise<TResult>
      }
    : Operation<MethodParam<TMethod>, TResult>

export type TypedFlatMethodOperation<
  TMethod extends MethodDef,
  TResult = any,
> = MethodArgsTuple<TMethod> extends []
  ? {
      call(): Promise<TResult>
      callOptimistic(
        params?: undefined,
        updater?: (store: DocStore) => void,
        rollback?: (store: DocStore) => void,
      ): Promise<TResult>
      loading: boolean
      error: FrappeResponseError | null
      data: TResult | null
    }
  : {
      call(params: MethodParam<TMethod>): Promise<TResult>
      callOptimistic(
        params: MethodParam<TMethod>,
        updater?: (store: DocStore) => void,
        rollback?: (store: DocStore) => void,
      ): Promise<TResult>
      loading: boolean
      error: FrappeResponseError | null
      data: TResult | null
    }

export async function invokeMethod(options: {
  requestManager: RequestManager
  store: DocStore
  url: string
  def: MethodDef
  params: any
}) {
  const { requestManager, store, url, def, params } = options
  const body = def.args ? def.args(params) : (params ?? {})
  const json = await requestManager.fetch({
    url,
    method: def.httpMethod ?? 'POST',
    body,
  })

  if (json?.docs?.length) {
    store.setMany(json.docs)
  }

  return json
}
