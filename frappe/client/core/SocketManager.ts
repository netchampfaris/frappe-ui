export interface SocketManager {
  connect(): void
  disconnect(): void
  /** Subscribe to a socket event. Returns an unsubscribe function. */
  on(event: string, handler: (...args: any[]) => void): () => void
  /** Unsubscribe a specific handler, or all handlers for the event if omitted. */
  off(event: string, handler?: (...args: any[]) => void): void
  /**
   * Subscribe to list_update events for a specific doctype (doctype room).
   * Emits `doctype_subscribe` to the server on first subscriber, and
   * `doctype_unsubscribe` when the last subscriber is removed.
   * Returns an unsubscribe function.
   */
  onDocUpdate(doctype: string, callback: (name: string) => void): () => void
}

/** No-op implementation for environments without Socket.IO. */
export function createNoopSocketManager(): SocketManager {
  return {
    connect() {},
    disconnect() {},
    on(_event, _handler) {
      return () => {}
    },
    off(_event, _handler) {},
    onDocUpdate(_doctype, _callback) {
      return () => {}
    },
  }
}

/**
 * Creates a SocketManager that bridges Socket.IO events to the DocStore.
 *
 * `list_update` payload: `{ doctype, name, user }` — notifies that a doc in
 * the given doctype's list was created/updated/deleted. Sent to the doctype
 * room (requires `doctype_subscribe` from the client).
 *
 */
export function createSocketManager(socketIo: any): SocketManager {
  const handlers = new Map<string, Set<(...args: any[]) => void>>()
  // Reference count per doctype for server-side room membership.
  const doctypeRefCount = new Map<string, number>()

  function emit(event: string, ...args: any[]) {
    handlers.get(event)?.forEach((h) => h(...args))
  }

  // list_update: sent to the doctype room when any doc in the doctype is saved.
  // Payload: { doctype, name, user } — no full doc data.
  socketIo.on(
    'list_update',
    (payload: { doctype: string; name: string; user: string }) => {
      emit('list_update', payload)
      if (payload?.doctype) {
        emit(`list_update:${payload.doctype}`, String(payload.name))
      }
    },
  )

  function on(event: string, handler: (...args: any[]) => void): () => void {
    let set = handlers.get(event)
    if (!set) {
      set = new Set()
      handlers.set(event, set)
    }
    set.add(handler)
    return () => {
      handlers.get(event)?.delete(handler)
    }
  }

  function doctypeSubscribe(doctype: string): () => void {
    const count = doctypeRefCount.get(doctype) ?? 0
    if (count === 0) {
      socketIo.emit('doctype_subscribe', doctype)
    }
    doctypeRefCount.set(doctype, count + 1)
    return () => {
      const remaining = (doctypeRefCount.get(doctype) ?? 1) - 1
      if (remaining <= 0) {
        doctypeRefCount.delete(doctype)
        socketIo.emit('doctype_unsubscribe', doctype)
      } else {
        doctypeRefCount.set(doctype, remaining)
      }
    }
  }

  return {
    connect() {
      socketIo.connect?.()
    },
    disconnect() {
      socketIo.disconnect?.()
    },
    on,
    off(event, handler) {
      if (handler) {
        handlers.get(event)?.delete(handler)
      } else {
        handlers.delete(event)
      }
    },
    onDocUpdate(doctype, callback) {
      const unsubRoom = doctypeSubscribe(doctype)
      const unsubHandler = on(`list_update:${doctype}`, callback)
      return () => {
        unsubHandler()
        unsubRoom()
      }
    },
  }
}

/**
 * Creates a SocketManager that connects lazily on the first `on()` call.
 * `socketFactory` is called once to create the raw Socket.IO instance.
 * `list_update` events are routed through the doctype subscription helpers;
 * all other events delegate directly to the raw socket.
 */
export function createLazySocketManager(
  socketFactory: () => any,
): SocketManager {
  let socketManager: SocketManager | null = null
  let rawSocket: any = null
  const pending: Array<{ event: string; handler: (...args: any[]) => void }> =
    []

  function ensureConnected() {
    if (socketManager) return
    rawSocket = socketFactory()
    socketManager = createSocketManager(rawSocket)
    for (const { event, handler } of pending) {
      rawSocket.on(event, handler)
    }
    pending.length = 0
  }

  return {
    connect() {
      rawSocket?.connect()
    },
    disconnect() {
      rawSocket?.disconnect()
    },
    on(event, handler) {
      if (event === 'list_update') {
        ensureConnected()
        return socketManager!.on(event, handler)
      }
      if (rawSocket) {
        rawSocket.on(event, handler)
      } else {
        pending.push({ event, handler })
        ensureConnected()
      }
      return () => rawSocket?.off(event, handler)
    },
    off(event, handler) {
      rawSocket?.off(event, handler)
    },
    onDocUpdate(doctype, callback) {
      ensureConnected()
      return socketManager!.onDocUpdate(doctype, callback)
    },
  }
}
