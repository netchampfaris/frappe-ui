/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { effectScope, ref, nextTick } from 'vue'
import '../../core/__tests__/setup'
import { createDocStore } from '../../core/DocStore'
import { createRequestManager } from '../../core/RequestManager'
import { createVueListHandle } from '../vueListHandle'
import {
  BASE_URL,
  server,
  mockTodos,
  type TodoDoc,
} from '../../core/__tests__/mocks'

function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

function makeList(
  opts: Partial<Parameters<typeof createVueListHandle<TodoDoc>>[0]> = {},
) {
  const store = createDocStore()
  const rm = createRequestManager({ baseUrl: BASE_URL })
  const handle = createVueListHandle<TodoDoc>({
    store,
    requestManager: rm,
    doctype: 'ToDo',
    ...opts,
  })
  return { handle, store }
}

/**
 * Creates a deferred promise + resolver pair.
 * The resolver is available immediately (no race condition).
 */
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}

// ---------------------------------------------------------------------------
// Custom URL for getList
// ---------------------------------------------------------------------------

describe('getList custom url', () => {
  it('fetches from a custom URL instead of the default', async () => {
    server.use(
      http.get(`${BASE_URL}/api/v2/method/custom_todo_list`, () => {
        return HttpResponse.json({
          data: [
            { ...mockTodos['todo-1'], custom_field: 'from_custom_url' },
          ],
          has_next_page: false,
        })
      }),
    )

    const scope = effectScope()
    const { handle } = scope.run(() =>
      makeList({ url: '/api/v2/method/custom_todo_list' }),
    )!

    await handle.promise
    expect(handle.data.length).toBe(1)
    expect(handle.data[0].name).toBe('todo-1')
    expect((handle.data[0] as any).custom_field).toBe('from_custom_url')
    scope.stop()
  })

  it('custom URL receives the same query params as standard list', async () => {
    let receivedParams: Record<string, string> = {}

    server.use(
      http.get(`${BASE_URL}/api/v2/method/custom_list`, ({ request }) => {
        const url = new URL(request.url)
        receivedParams = Object.fromEntries(url.searchParams.entries())
        return HttpResponse.json({
          data: [mockTodos['todo-1']],
          has_next_page: false,
        })
      }),
    )

    const scope = effectScope()
    const { handle } = scope.run(() =>
      makeList({
        url: '/api/v2/method/custom_list',
        filters: { status: 'Open' },
        fields: ['name', 'status'],
        orderBy: 'modified desc',
        limit: 10,
      }),
    )!

    await handle.promise
    expect(receivedParams.filters).toBe(JSON.stringify({ status: 'Open' }))
    expect(receivedParams.fields).toBe(JSON.stringify(['name', 'status']))
    expect(receivedParams.order_by).toBe('modified desc')
    expect(receivedParams.limit).toBe('10')
    expect(receivedParams.start).toBe('0')
    scope.stop()
  })

  it('pagination works with custom URL', async () => {
    server.use(
      http.get(
        `${BASE_URL}/api/v2/method/custom_paginated`,
        ({ request }) => {
          const url = new URL(request.url)
          const start = parseInt(url.searchParams.get('start') ?? '0')
          const limit = parseInt(url.searchParams.get('limit') ?? '20')

          const allDocs = Object.values(mockTodos).sort((a, b) =>
            b.modified.localeCompare(a.modified),
          )
          const page = allDocs.slice(start, start + limit)
          return HttpResponse.json({
            data: page,
            has_next_page: start + limit < allDocs.length,
          })
        },
      ),
    )

    const scope = effectScope()
    const { handle } = scope.run(() =>
      makeList({ url: '/api/v2/method/custom_paginated', limit: 2 }),
    )!

    await handle.promise
    expect(handle.data.length).toBe(2)
    expect(handle.hasNextPage).toBe(true)

    await handle.next()
    expect(handle.hasPreviousPage).toBe(true)
    scope.stop()
  })
})

// ---------------------------------------------------------------------------
// isItemLoading
// ---------------------------------------------------------------------------

describe('isItemLoading', () => {
  it('returns false when no operation is in flight', async () => {
    const scope = effectScope()
    const { handle } = scope.run(() => makeList())!
    await handle.promise

    expect(handle.isItemLoading('todo-1')).toBe(false)
    expect(handle.isItemLoading('todo-1', 'setValue')).toBe(false)
    expect(handle.isItemLoading('todo-1', 'delete')).toBe(false)
    scope.stop()
  })

  it('tracks setValue loading per item', async () => {
    const gate = deferred()

    server.use(
      http.patch(
        `${BASE_URL}/api/v2/document/ToDo/:name`,
        async ({ params, request }) => {
          const { name } = params as { name: string }
          await gate.promise
          const updates = (await request.json()) as any
          Object.assign(mockTodos[name], updates)
          return HttpResponse.json({ data: mockTodos[name] })
        },
      ),
    )

    const scope = effectScope()
    const { handle } = scope.run(() => makeList())!
    await handle.promise

    const promise = handle.setValue.call({ name: 'todo-1', status: 'Closed' })
    await flushPromises()

    // During flight: todo-1 is loading for setValue, todo-2 is not
    expect(handle.isItemLoading('todo-1')).toBe(true)
    expect(handle.isItemLoading('todo-1', 'setValue')).toBe(true)
    expect(handle.isItemLoading('todo-1', 'delete')).toBe(false)
    expect(handle.isItemLoading('todo-2')).toBe(false)

    gate.resolve()
    await promise

    // After completion: no longer loading
    expect(handle.isItemLoading('todo-1')).toBe(false)
    expect(handle.isItemLoading('todo-1', 'setValue')).toBe(false)
    scope.stop()
  })

  it('tracks delete loading per item', async () => {
    const gate = deferred()

    server.use(
      http.delete(
        `${BASE_URL}/api/v2/document/ToDo/:name`,
        async ({ params }) => {
          const { name } = params as { name: string }
          await gate.promise
          delete mockTodos[name]
          return HttpResponse.json({ data: null })
        },
      ),
    )

    const scope = effectScope()
    const { handle } = scope.run(() => makeList())!
    await handle.promise

    const promise = handle.delete.call('todo-1')
    await flushPromises()

    expect(handle.isItemLoading('todo-1')).toBe(true)
    expect(handle.isItemLoading('todo-1', 'delete')).toBe(true)
    expect(handle.isItemLoading('todo-1', 'setValue')).toBe(false)
    expect(handle.isItemLoading('todo-2')).toBe(false)

    gate.resolve()
    await promise

    expect(handle.isItemLoading('todo-1')).toBe(false)
    scope.stop()
  })

  it('tracks multiple items simultaneously', async () => {
    const gates: Record<string, ReturnType<typeof deferred>> = {
      'todo-1': deferred(),
      'todo-2': deferred(),
    }

    server.use(
      http.patch(
        `${BASE_URL}/api/v2/document/ToDo/:name`,
        async ({ params, request }) => {
          const { name } = params as { name: string }
          await gates[name].promise
          const updates = (await request.json()) as any
          Object.assign(mockTodos[name], updates)
          return HttpResponse.json({ data: mockTodos[name] })
        },
      ),
    )

    const scope = effectScope()
    const { handle } = scope.run(() => makeList())!
    await handle.promise

    const p1 = handle.setValue.call({ name: 'todo-1', status: 'Closed' })
    const p2 = handle.setValue.call({ name: 'todo-2', priority: 99 })
    await flushPromises()

    expect(handle.isItemLoading('todo-1')).toBe(true)
    expect(handle.isItemLoading('todo-2')).toBe(true)
    expect(handle.isItemLoading('todo-3')).toBe(false)

    // Resolve one at a time
    gates['todo-1'].resolve()
    await p1
    expect(handle.isItemLoading('todo-1')).toBe(false)
    expect(handle.isItemLoading('todo-2')).toBe(true)

    gates['todo-2'].resolve()
    await p2
    expect(handle.isItemLoading('todo-2')).toBe(false)
    scope.stop()
  })

  it('clears loading state on error', async () => {
    server.use(
      http.patch(`${BASE_URL}/api/v2/document/ToDo/:name`, () =>
        HttpResponse.json(
          { errors: [{ title: 'Error', type: 'ValidationError' }] },
          { status: 422 },
        ),
      ),
    )

    const scope = effectScope()
    const { handle } = scope.run(() => makeList())!
    await handle.promise

    await handle.setValue
      .call({ name: 'todo-1', status: 'Closed' })
      .catch(() => {})

    expect(handle.isItemLoading('todo-1')).toBe(false)
    scope.stop()
  })

  it('without action arg checks any action type', async () => {
    const gate = deferred()

    server.use(
      http.delete(
        `${BASE_URL}/api/v2/document/ToDo/:name`,
        async ({ params }) => {
          await gate.promise
          delete mockTodos[(params as { name: string }).name]
          return HttpResponse.json({ data: null })
        },
      ),
    )

    const scope = effectScope()
    const { handle } = scope.run(() => makeList())!
    await handle.promise

    const promise = handle.delete.call('todo-1')
    await flushPromises()

    // isItemLoading without action should detect the delete
    expect(handle.isItemLoading('todo-1')).toBe(true)
    expect(handle.isItemLoading('todo-1', 'setValue')).toBe(false)

    gate.resolve()
    await promise
    expect(handle.isItemLoading('todo-1')).toBe(false)
    scope.stop()
  })
})

// ---------------------------------------------------------------------------
// Reactive orderBy, limit, groupBy
// ---------------------------------------------------------------------------

describe('reactive query options', () => {
  it('refetches when orderBy ref changes', async () => {
    let receivedOrderBy: string[] = []

    server.use(
      http.get(`${BASE_URL}/api/v2/document/ToDo`, ({ request }) => {
        const url = new URL(request.url)
        receivedOrderBy.push(url.searchParams.get('order_by') ?? '')

        const todos = Object.values(mockTodos).sort((a, b) =>
          b.modified.localeCompare(a.modified),
        )
        return HttpResponse.json({ data: todos, has_next_page: false })
      }),
    )

    const orderBy = ref('modified desc')
    const scope = effectScope()
    const { handle } = scope.run(() => makeList({ orderBy }))!
    await handle.promise

    expect(receivedOrderBy).toContain('modified desc')

    orderBy.value = 'creation asc'
    await flushPromises()

    expect(receivedOrderBy).toContain('creation asc')
    scope.stop()
  })

  it('refetches when limit ref changes', async () => {
    let receivedLimits: string[] = []

    server.use(
      http.get(`${BASE_URL}/api/v2/document/ToDo`, ({ request }) => {
        const url = new URL(request.url)
        receivedLimits.push(url.searchParams.get('limit') ?? '')

        const todos = Object.values(mockTodos)
        return HttpResponse.json({ data: todos, has_next_page: false })
      }),
    )

    const limit = ref(10)
    const scope = effectScope()
    const { handle } = scope.run(() => makeList({ limit }))!
    await handle.promise

    expect(receivedLimits).toContain('10')

    limit.value = 50
    await flushPromises()

    expect(receivedLimits).toContain('50')
    scope.stop()
  })

  it('refetches when groupBy ref changes', async () => {
    let receivedGroupBy: (string | null)[] = []

    server.use(
      http.get(`${BASE_URL}/api/v2/document/ToDo`, ({ request }) => {
        const url = new URL(request.url)
        receivedGroupBy.push(url.searchParams.get('group_by'))

        const todos = Object.values(mockTodos)
        return HttpResponse.json({ data: todos, has_next_page: false })
      }),
    )

    const groupBy = ref<string | undefined>(undefined)
    const scope = effectScope()
    const { handle } = scope.run(() => makeList({ groupBy }))!
    await handle.promise

    // Initial: no group_by sent
    expect(receivedGroupBy[receivedGroupBy.length - 1]).toBeNull()

    groupBy.value = 'status'
    await flushPromises()

    expect(receivedGroupBy).toContain('status')
    scope.stop()
  })

  it('uses resolved limit for pagination', async () => {
    // Seed extra todos
    for (let i = 4; i <= 8; i++) {
      mockTodos[`todo-${i}`] = {
        name: `todo-${i}`,
        description: `Todo ${i}`,
        status: 'Open',
        priority: i,
        owner: 'admin@example.com',
        modified: `2026-01-${14 + i} 10:00:00`,
        creation: `2026-01-${14 + i} 09:00:00`,
      }
    }

    const limit = ref(2)
    const scope = effectScope()
    const { handle } = scope.run(() => makeList({ limit }))!
    await handle.promise

    expect(handle.data.length).toBe(2)
    expect(handle.hasNextPage).toBe(true)

    // next() should use the current resolved limit
    await handle.next()
    expect(handle.data.length).toBe(2)
    expect(handle.hasPreviousPage).toBe(true)
    scope.stop()
  })

  it('orderBy as getter function works', async () => {
    let receivedOrderBy: string[] = []

    server.use(
      http.get(`${BASE_URL}/api/v2/document/ToDo`, ({ request }) => {
        const url = new URL(request.url)
        const ob = url.searchParams.get('order_by')
        if (ob) receivedOrderBy.push(ob)
        const todos = Object.values(mockTodos)
        return HttpResponse.json({ data: todos, has_next_page: false })
      }),
    )

    const sortField = ref('modified')
    const scope = effectScope()
    const { handle } = scope.run(() =>
      makeList({ orderBy: () => `${sortField.value} desc` }),
    )!
    await handle.promise

    expect(receivedOrderBy).toContain('modified desc')

    sortField.value = 'creation'
    await flushPromises()

    expect(receivedOrderBy).toContain('creation desc')
    scope.stop()
  })
})
