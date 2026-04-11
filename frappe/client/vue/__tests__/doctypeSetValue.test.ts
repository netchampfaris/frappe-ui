/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { http, HttpResponse } from 'msw'
import '../../core/__tests__/setup'
import { createClient } from '../createVueClient'
import {
  BASE_URL,
  mockTodos,
  resetMockTodos,
  server,
  type TodoDoc,
} from '../../core/__tests__/mocks'

vi.mock('../frappe-socket', () => ({ initFrappeSocket: vi.fn() }))

function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

function makeClient() {
  const { defineDoctype, store, socket } = createClient({ baseUrl: BASE_URL })
  const ToDo = defineDoctype<TodoDoc>()({ doctype: 'ToDo' })
  return { ToDo, store, socket }
}

/** Reset mock data to known state before each test. */
beforeEach(() => {
  resetMockTodos()
  // Deep-reset seed fields that previous tests may have mutated
  Object.assign(mockTodos['todo-1'], {
    name: 'todo-1',
    description: 'First todo item',
    status: 'Open',
    priority: 1,
    assigned_to: 'user1@example.com',
    owner: 'admin@example.com',
    modified: '2026-01-14 10:00:00',
    creation: '2026-01-14 09:00:00',
  })
})

// ---------------------------------------------------------------------------
// Doctype-level setValue
// ---------------------------------------------------------------------------

describe('doctype-level setValue', () => {
  it('patches a doc on the server and updates DocStore', async () => {
    const { ToDo, store } = makeClient()

    const result = await ToDo.setValue.call({
      name: 'todo-1',
      status: 'Closed',
    })

    expect(result.name).toBe('todo-1')
    expect(result.status).toBe('Closed')
    expect(store.get('ToDo', 'todo-1')?.status).toBe('Closed')
    expect(mockTodos['todo-1'].status).toBe('Closed')
  })

  it('exposes loading and error state', async () => {
    const scope = effectScope()
    const { ToDo } = scope.run(() => makeClient())!

    expect(ToDo.setValue.loading).toBe(false)
    expect(ToDo.setValue.error).toBe(null)

    const promise = ToDo.setValue.call({ name: 'todo-1', status: 'Closed' })
    expect(ToDo.setValue.loading).toBe(true)
    await promise
    expect(ToDo.setValue.loading).toBe(false)
    expect(ToDo.setValue.error).toBe(null)
    scope.stop()
  })

  it('sets error on failure', async () => {
    server.use(
      http.patch(`${BASE_URL}/api/v2/document/ToDo/todo-1`, () =>
        HttpResponse.json(
          { errors: [{ title: 'Validation', type: 'ValidationError' }] },
          { status: 422 },
        ),
      ),
    )

    const scope = effectScope()
    const { ToDo } = scope.run(() => makeClient())!

    await expect(
      ToDo.setValue.call({ name: 'todo-1', status: 'Invalid' }),
    ).rejects.toThrow()

    expect(ToDo.setValue.error).not.toBe(null)
    expect(ToDo.setValue.loading).toBe(false)
    scope.stop()
  })

  it('does not require fetching the doc first', async () => {
    const { ToDo, store } = makeClient()

    // Store is empty — no prior getDoc call
    expect(store.get('ToDo', 'todo-1')).toBeNull()

    const result = await ToDo.setValue.call({
      name: 'todo-1',
      description: 'Updated without fetch',
    })

    expect(result.description).toBe('Updated without fetch')
    expect(store.get('ToDo', 'todo-1')).not.toBeNull()
    expect(store.get('ToDo', 'todo-1')?.description).toBe(
      'Updated without fetch',
    )
  })

  it('callOptimistic merges values immediately and reverts on error', async () => {
    const scope = effectScope()
    const { ToDo, store } = scope.run(() => makeClient())!

    // Pre-populate store with explicit known state
    store.set({
      doctype: 'ToDo',
      name: 'todo-1',
      description: 'First todo item',
      status: 'Open',
      priority: 1,
      owner: 'admin@example.com',
      modified: '2026-01-14 10:00:00',
      creation: '2026-01-14 09:00:00',
    })
    expect(store.get('ToDo', 'todo-1')?.status).toBe('Open')

    // Override to fail
    server.use(
      http.patch(`${BASE_URL}/api/v2/document/ToDo/todo-1`, () =>
        HttpResponse.json(
          { errors: [{ title: 'Error', type: 'Error', message: 'fail' }] },
          { status: 500 },
        ),
      ),
    )

    // Optimistic update should apply immediately
    const promise = ToDo.setValue.callOptimistic({
      name: 'todo-1',
      status: 'Closed',
    })
    expect(store.get('ToDo', 'todo-1')?.status).toBe('Closed')

    try {
      await promise
    } catch {
      /* expected */
    }

    // Rolled back to original
    expect(store.get('ToDo', 'todo-1')?.status).toBe('Open')
    scope.stop()
  })

  it('callOptimistic succeeds and keeps server response', async () => {
    const scope = effectScope()
    const { ToDo, store } = scope.run(() => makeClient())!

    store.set({
      doctype: 'ToDo',
      name: 'todo-1',
      description: 'First todo item',
      status: 'Open',
      priority: 1,
      owner: 'admin@example.com',
      modified: '2026-01-14 10:00:00',
      creation: '2026-01-14 09:00:00',
    })

    await ToDo.setValue.callOptimistic({
      name: 'todo-1',
      status: 'Closed',
    })

    expect(store.get('ToDo', 'todo-1')?.status).toBe('Closed')
    expect(mockTodos['todo-1'].status).toBe('Closed')
    scope.stop()
  })

  it('cross-updates getDoc handles via shared DocStore', async () => {
    // Override GET to return known state
    server.use(
      http.get(`${BASE_URL}/api/v2/document/ToDo/todo-1`, () =>
        HttpResponse.json({
          data: {
            name: 'todo-1',
            description: 'First todo item',
            status: 'Open',
            priority: 1,
            owner: 'admin@example.com',
            modified: '2026-01-14 10:00:00',
            creation: '2026-01-14 09:00:00',
          },
        }),
      ),
    )

    const scope = effectScope()
    const { ToDo } = scope.run(() => makeClient())!

    const handle = scope.run(() => ToDo.getDoc('todo-1'))!
    await handle.promise
    expect(handle.doc?.status).toBe('Open')

    // setValue at the doctype level
    await ToDo.setValue.call({ name: 'todo-1', status: 'Closed' })

    await nextTick()
    expect(handle.doc?.status).toBe('Closed')
    scope.stop()
  })

  it('cross-updates getList handles via shared DocStore', async () => {
    // Override GET list to return known state
    server.use(
      http.get(`${BASE_URL}/api/v2/document/ToDo`, () =>
        HttpResponse.json({
          data: [
            {
              name: 'todo-1',
              description: 'First todo item',
              status: 'Open',
              priority: 1,
              owner: 'admin@example.com',
              modified: '2026-01-14 10:00:00',
              creation: '2026-01-14 09:00:00',
            },
          ],
          has_next_page: false,
        }),
      ),
    )

    const scope = effectScope()
    const { ToDo } = scope.run(() => makeClient())!

    const list = scope.run(() => ToDo.getList())!
    await list.promise
    await flushPromises()

    expect(list.data.find((d) => d.name === 'todo-1')?.status).toBe('Open')

    await ToDo.setValue.call({ name: 'todo-1', status: 'Closed' })

    await nextTick()
    expect(list.data.find((d) => d.name === 'todo-1')?.status).toBe('Closed')
    scope.stop()
  })
})
