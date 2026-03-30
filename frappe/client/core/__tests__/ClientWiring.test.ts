/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { createDocStore } from '../DocStore'
import { connectCache, createMemoryCacheAdapter } from '../CacheAdapter'
import { createCoreClient } from '../createCoreClient'

describe('client wiring', () => {
  it('removes deleted docs from the connected cache', async () => {
    const store = createDocStore()
    const cache = createMemoryCacheAdapter()

    await connectCache(store, cache)

    store.set({ doctype: 'ToDo', name: 'todo-1', status: 'Open' })
    store.remove('ToDo', 'todo-1')

    await expect(cache.loadAll()).resolves.toEqual([])
  })

  it('throws when createCoreClient is given realtime: true without a socket', () => {
    expect(() => createCoreClient({ realtime: true })).toThrow(
      'createCoreClient requires realtime.socketIo',
    )
  })
})