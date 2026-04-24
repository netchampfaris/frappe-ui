import type { DocStore } from './DocStore'

export interface Operation<TParams, TResult> {
  /**
   * Execute the operation. Updates DocStore on success.
   * Rejects on error with a FrappeResponseError.
   */
  call(params: TParams): Promise<TResult>

  /**
   * Execute with an optimistic update. Applies `updater` to DocStore
   * immediately. On error, calls `rollback` or auto-reverts (restores the
   * pre-update snapshot).
   */
  callOptimistic(
    params: TParams,
    updater?: (store: DocStore) => void,
    rollback?: (store: DocStore) => void,
  ): Promise<TResult>
}

export type InsertPosition = 'start' | 'end' | number

export interface InsertOptions {
  /** Where to place the new doc in the list. Defaults to `'start'`. */
  at?: InsertPosition
}

/**
 * Specialized operation for list inserts. Adds an optional `options` arg with
 * an `at` position so the doc can be placed at the start, end, or a specific
 * index without a separate "prepend then move" step.
 */
export interface InsertOperation<TParams, TResult> {
  call(params: TParams, options?: InsertOptions): Promise<TResult>
  callOptimistic(
    params: TParams,
    updater?: (store: DocStore) => void,
    rollback?: (store: DocStore) => void,
    options?: InsertOptions,
  ): Promise<TResult>
}
