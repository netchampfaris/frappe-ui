import { reactive, readonly } from 'vue'
import { makeGetParams } from './common'
import { useCall } from './useCall'

type Field = string

type ChildTableField = {
  [key: string]: Field[]
}

type Filter = {
  [key: Field]: string | number | boolean
}

type OrderBy =
  | `${Field} ASC`
  | `${Field} DESC`
  | `${Field} asc`
  | `${Field} desc`

interface ListOptions<T> {
  doctype: string
  fields?: Array<Field | ChildTableField>
  filters?: Filter[]
  orderBy?: OrderBy
  start?: number
  limit?: number
  groupBy?: Field
  parent?: string
  debug?: boolean
  cacheKey?: string | Array<string | number | boolean>
  transform?: (data: T[]) => T[]
}

export function useList<T>(options: ListOptions<T>) {
  let params = makeGetParams({
    fields: options.fields?.length ? JSON.stringify(options.fields) : null,
    filters: options.filters ? JSON.stringify(options.filters) : null,
    order_by: options.orderBy,
    start: options.start,
    limit: options.limit,
    group_by: options.groupBy,
    parent: options.parent,
    debug: options.debug,
  })
  let url = `/api/v2/document/${options.doctype}?${params}`

  const {
    data,
    error,
    isFetching,
    isFinished,
    canAbort,
    abort,
    aborted,
    execute,
  } = useCall<T[]>(url, {
    afterFetch(ctx) {
      if (options.transform) {
        let returnValue = options.transform(ctx.data)
        if (Array.isArray(returnValue)) {
          ctx.data = returnValue
        }
      }
      return ctx
    },
  })

  return reactive({
    data: readonly(data),
    error: readonly(error),
    isFetching,
    isFinished,
    canAbort,
    abort,
    aborted,
    execute,
  })
}
