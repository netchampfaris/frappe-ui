import type { DocStore } from './DocStore'
import type { RequestManager } from './RequestManager'
import type { FrappeResponseError } from './FrappeResponseError'
import type { Operation } from './Operation'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface MethodDef<
  TArgs extends any[] = [params?: Record<string, any>],
  TResult = any,
> {
  method: string
  httpMethod?: HttpMethod
  /** Builds the body/params from the call arguments. */
  args?: (...args: TArgs) => Record<string, any>
  /** Optional type-only metadata for the resolved method result. */
  returns?: TResult
}

export type DocMethods = Record<string, MethodDef<any, any>>
export type ControllerMethods = Record<string, MethodDef<any, any>>

export type MethodArgsTuple<TMethod extends MethodDef<any, any>> = NonNullable<
  TMethod['args']
> extends (...args: infer TArgs) => Record<string, any>
  ? TArgs
  : [params?: Record<string, any>]

export type MethodParam<TMethod extends MethodDef<any, any>> = MethodArgsTuple<TMethod> extends []
  ? never
  : MethodArgsTuple<TMethod>[0]

export type MethodResult<TMethod extends MethodDef<any, any>> = TMethod extends MethodDef<
  any,
  infer TResult
>
  ? TResult
  : any

export type TypedMethodOperation<TMethod extends MethodDef<any, any>> =
  MethodArgsTuple<TMethod> extends []
    ? {
        call(): Promise<MethodResult<TMethod>>
        callOptimistic(
          params?: undefined,
          updater?: (store: DocStore) => void,
          rollback?: (store: DocStore) => void,
        ): Promise<MethodResult<TMethod>>
      }
    : Operation<MethodParam<TMethod>, MethodResult<TMethod>>

export type TypedFlatMethodOperation<
  TMethod extends MethodDef<any, any>,
> = MethodArgsTuple<TMethod> extends []
  ? {
      call(): Promise<MethodResult<TMethod>>
      callOptimistic(
        params?: undefined,
        updater?: (store: DocStore) => void,
        rollback?: (store: DocStore) => void,
      ): Promise<MethodResult<TMethod>>
      loading: boolean
      error: FrappeResponseError | null
      data: MethodResult<TMethod> | null
    }
  : {
      call(params: MethodParam<TMethod>): Promise<MethodResult<TMethod>>
      callOptimistic(
        params: MethodParam<TMethod>,
        updater?: (store: DocStore) => void,
        rollback?: (store: DocStore) => void,
      ): Promise<MethodResult<TMethod>>
      loading: boolean
      error: FrappeResponseError | null
      data: MethodResult<TMethod> | null
    }

export async function invokeMethod<TMethod extends MethodDef<any, any>>(options: {
  requestManager: RequestManager
  store: DocStore
  url: string
  def: TMethod
  params: MethodParam<TMethod>
}): Promise<MethodResult<TMethod>> {
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

  return (json?.message ?? json?.data ?? json) as MethodResult<TMethod>
}
