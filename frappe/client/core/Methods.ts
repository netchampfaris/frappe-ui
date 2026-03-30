import type { DocStore } from './DocStore'
import type { RequestManager } from './RequestManager'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface MethodDef {
  method: string
  httpMethod?: HttpMethod
  /** Builds the body/params from the call arguments. */
  args?: (...args: any[]) => Record<string, any>
}

export type DocMethods = Record<string, MethodDef>
export type ControllerMethods = Record<string, MethodDef>

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
