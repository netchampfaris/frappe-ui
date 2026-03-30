import type { DocStore } from './DocStore'

export async function runOptimisticMutation<TResult>(options: {
  store: DocStore
  run: () => Promise<TResult>
  apply?: () => void
  rollback?: (store: DocStore) => void
  restore?: () => void
}): Promise<TResult> {
  const { store, run, apply, rollback, restore } = options

  apply?.()

  try {
    return await run()
  } catch (error) {
    if (rollback) {
      rollback(store)
    } else {
      restore?.()
    }
    throw error
  }
}
