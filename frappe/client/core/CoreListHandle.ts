import type { ClientDoc, Doc } from './types'
import type { DocStore } from './DocStore'
import type { RequestManager } from './RequestManager'
import type {
  InsertOperation,
  InsertOptions,
  InsertPosition,
  Operation,
} from './Operation'
import { runOptimisticMutation } from './optimisticMutation'
import { docCollectionUrl, docResourceUrl } from './urls'

/**
 * A field selector for list fetches. Either:
 * - a flat field name (`'title'`, `'creation'`, `'owner'`)
 * - a child-table selector (`{ reactions: ['name', 'user', 'emoji'] }`)
 *
 * Child-table selectors are JSON-encoded and forwarded to the Frappe backend,
 * which expands them into nested table reads on the response.
 */
export type ListFieldSpec = string | Record<string, string[]>

export interface GetListParams {
  fields?: ListFieldSpec[]
  filters?: Record<string, any>
  orderBy?: string
  groupBy?: string
  limit?: number
  start?: number
  /** Custom URL for the list endpoint. Defaults to `/api/v2/document/{doctype}`. */
  url?: string
}

export interface CoreListHandle<TDoc extends ClientDoc> {
  /** Current list snapshot — updated via DocStore subscription. */
  data: TDoc[]
  /** Resolves when the initial fetch completes. */
  promise: Promise<void>
  reload(): Promise<void>
  dispose(): void
  next(): Promise<void>
  previous(): Promise<void>
  hasNextPage: boolean
  hasPreviousPage: boolean
  setValue: Operation<Partial<TDoc> & { name: string }, TDoc>
  delete: Operation<string, void>
  insert: InsertOperation<Partial<TDoc>, TDoc>
}

export interface CoreListHandleOptions<TDoc extends ClientDoc> {
  store: DocStore
  requestManager: RequestManager
  doctype: string
  fields?: ListFieldSpec[]
  filters?: Record<string, any>
  orderBy?: string
  groupBy?: string
  limit?: number
  start?: number
  url?: string
}

export function createCoreListHandle<TDoc extends ClientDoc>(
  options: CoreListHandleOptions<TDoc>,
): CoreListHandle<TDoc> {
  const {
    store,
    requestManager,
    doctype,
    fields,
    filters,
    orderBy,
    groupBy,
    limit = 20,
    start = 0,
    url: customUrl,
  } = options

  const listUrl = customUrl ?? docCollectionUrl(doctype)

  // List-local ordered names array
  let names: string[] = []
  let hasNextPage = false
  let hasPreviousPage = false
  let currentStart = start

  // Keep data in sync with DocStore — updated by subscribeDoctype listener
  let data: TDoc[] = []

  function rebuildData() {
    data = names.map((n) => store.get(doctype, n) as TDoc).filter(Boolean)
  }

  // When any doc in this doctype changes, refresh our data snapshot
  const unsubscribeDoctype = store.subscribeDoctype(doctype, (name) => {
    if (names.includes(name)) {
      rebuildData()
    }
  })

  const fetchPage = async (fetchStart: number): Promise<void> => {
    const body: Record<string, any> = { start: fetchStart, limit }
    if (fields?.length) body.fields = JSON.stringify(fields)
    if (filters && Object.keys(filters).length)
      body.filters = JSON.stringify(filters)
    if (orderBy) body.order_by = orderBy
    if (groupBy) body.group_by = groupBy

    const json = await requestManager.fetch({
      url: listUrl,
      method: 'GET',
      body,
    })

    if (json?.data) {
      const docs: any[] = json.data
      store.setMany(docs.map((d: any) => ({ doctype, ...d })))
      names = docs.map((d: any) => d.name)
      rebuildData()
      hasNextPage = json.has_next_page ?? false
      hasPreviousPage = fetchStart > 0
      currentStart = fetchStart
    }
  }

  const promise = fetchPage(start)

  const setValue: Operation<Partial<TDoc> & { name: string }, TDoc> = {
    async call(values) {
      const { name, ...rest } = values as { name: string } & Partial<TDoc>
      const json = await requestManager.fetch({
        url: docResourceUrl(doctype, name),
        method: 'PATCH',
        body: rest as Record<string, any>,
      })
      if (json?.data) {
        store.set({ doctype, ...json.data })
      }
      return store.get(doctype, name) as TDoc
    },

    async callOptimistic(values, updater, rollback) {
      const { name } = values as { name: string }
      const existing = store.get(doctype, name)
      const snapshot = existing ? ({ ...existing } as Doc) : null
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

  const deleteOp: Operation<string, void> = {
    async call(name) {
      await requestManager.fetch({
        url: docResourceUrl(doctype, name),
        method: 'DELETE',
      })
      store.remove(doctype, name)
      names = names.filter((n) => n !== name)
      rebuildData()
    },

    async callOptimistic(name, updater, rollback) {
      const existing = store.get(doctype, name)
      const snapshot = existing ? ({ ...existing } as Doc) : null
      const namesBefore = [...names]
      return runOptimisticMutation({
        store,
        run: async () => {
          await requestManager.fetch({
            url: docResourceUrl(doctype, name),
            method: 'DELETE',
          })
          store.remove(doctype, name)
        },
        apply: () => {
          updater?.(store)
          names = names.filter((n) => n !== name)
          rebuildData()
        },
        rollback,
        restore: () => {
          if (snapshot) store.set(snapshot)
          names = namesBefore
          rebuildData()
        },
      })
    },
  }

  function insertNameAt(name: string, at: InsertPosition) {
    if (at === 'start') {
      names = [name, ...names]
    } else if (at === 'end') {
      names = [...names, name]
    } else {
      const idx = Math.max(0, Math.min(at, names.length))
      names = [...names.slice(0, idx), name, ...names.slice(idx)]
    }
  }

  const insertOp: InsertOperation<Partial<TDoc>, TDoc> = {
    async call(values, options) {
      const json = await requestManager.fetch({
        url: docCollectionUrl(doctype),
        method: 'POST',
        body: values as Record<string, any>,
      })
      if (json?.data) {
        store.set({ doctype, ...json.data })
        insertNameAt(json.data.name, options?.at ?? 'start')
        rebuildData()
      }
      return store.get(doctype, json.data.name) as TDoc
    },

    async callOptimistic(values, updater, rollback, options) {
      const namesBefore = [...names]
      return runOptimisticMutation({
        store,
        run: () => insertOp.call(values, options),
        apply: () => updater?.(store),
        rollback,
        restore: () => {
          names = namesBefore
          rebuildData()
        },
      })
    },
  }

  return {
    get data() {
      return data
    },
    promise,
    reload: () => fetchPage(currentStart),
    dispose() {
      unsubscribeDoctype()
    },
    next: () => fetchPage(currentStart + limit),
    previous: () => fetchPage(Math.max(0, currentStart - limit)),
    get hasNextPage() {
      return hasNextPage
    },
    get hasPreviousPage() {
      return hasPreviousPage
    },
    setValue,
    delete: deleteOp,
    insert: insertOp,
  }
}
