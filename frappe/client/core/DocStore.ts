import type { Doc } from './types'

type Listener = (doc: Doc | null) => void
type DoctypeListener = (name: string, doc: Doc | null) => void
type GlobalListener = (
  doc: Doc | null,
  meta?: { doctype: string; name: string },
) => void

export interface DocStore {
  get(doctype: string, name: string): Doc | null
  set(doc: Doc): void
  setMany(docs: Doc[]): void
  remove(doctype: string, name: string): void

  /**
   * Subscribe to every set/remove across all doctypes.
   * Used by CacheAdapter to write-behind on every mutation.
   */
  subscribeAll(
    listener: (
      doc: Doc | null,
      meta?: { doctype: string; name: string },
    ) => void,
  ): () => void

  /**
   * Subscribe to a specific document. Listener fires synchronously on
   * set/remove. Returns an unsubscribe function.
   */
  subscribe(doctype: string, name: string, listener: Listener): () => void

  /**
   * Subscribe to any change for a doctype. Fires with the name of the changed
   * doc. Used by lists to keep their data in sync.
   */
  subscribeDoctype(doctype: string, listener: DoctypeListener): () => void

  /** Cold-start hydration from IDB/SSR. Does not notify subscribers. */
  hydrate(docs: Doc[]): void

  /** Snapshot all docs for a doctype. */
  getAll(doctype: string): Doc[]
}

function docKey(doctype: string, name: string) {
  return `${doctype}/${name}`
}

export function createDocStore(): DocStore {
  const docs = new Map<string, Doc>()
  const listeners = new Map<string, Set<Listener>>()
  const doctypeListeners = new Map<string, Set<DoctypeListener>>()
  const globalListeners = new Set<GlobalListener>()

  function notify(doctype: string, name: string, doc: Doc | null) {
    const key = docKey(doctype, name)

    const keyListeners = listeners.get(key)
    if (keyListeners) {
      for (const listener of keyListeners) {
        listener(doc)
      }
    }

    const dtListeners = doctypeListeners.get(doctype)
    if (dtListeners) {
      for (const listener of dtListeners) {
        listener(name, doc)
      }
    }

    for (const listener of globalListeners) {
      listener(doc, { doctype, name })
    }
  }

  // Frappe autoincrement doctypes serialise the doc name as a JS number.
  // Coerce to string at the store boundary so every consumer (socket
  // payloads, list `names` arrays, route param comparisons, store keys)
  // sees the same shape.
  function normaliseDoc(doc: Doc): Doc {
    return doc.name === undefined || typeof doc.name === 'string'
      ? doc
      : { ...doc, name: String(doc.name) }
  }

  return {
    get(doctype, name) {
      return docs.get(docKey(doctype, name)) ?? null
    },

    set(rawDoc) {
      const doc = normaliseDoc(rawDoc)
      const key = docKey(doc.doctype, doc.name)
      const existing = docs.get(key)
      if (existing) {
        Object.assign(existing, doc)
      } else {
        docs.set(key, { ...doc })
      }
      notify(doc.doctype, doc.name, docs.get(key)!)
    },

    setMany(rawList) {
      const docList = rawList.map(normaliseDoc)
      // Merge all first, then notify once per doc
      for (const doc of docList) {
        const key = docKey(doc.doctype, doc.name)
        const existing = docs.get(key)
        if (existing) {
          Object.assign(existing, doc)
        } else {
          docs.set(key, { ...doc })
        }
      }
      for (const doc of docList) {
        const key = docKey(doc.doctype, doc.name)
        notify(doc.doctype, doc.name, docs.get(key)!)
      }
    },

    remove(doctype, name) {
      docs.delete(docKey(doctype, name))
      notify(doctype, name, null)
    },

    subscribe(doctype, name, listener) {
      const key = docKey(doctype, name)
      let set = listeners.get(key)
      if (!set) {
        set = new Set()
        listeners.set(key, set)
      }
      set.add(listener)
      return () => {
        listeners.get(key)?.delete(listener)
      }
    },

    subscribeDoctype(doctype, listener) {
      let set = doctypeListeners.get(doctype)
      if (!set) {
        set = new Set()
        doctypeListeners.set(doctype, set)
      }
      set.add(listener)
      return () => {
        doctypeListeners.get(doctype)?.delete(listener)
      }
    },

    subscribeAll(listener) {
      globalListeners.add(listener)
      return () => globalListeners.delete(listener)
    },

    hydrate(rawList) {
      for (const raw of rawList) {
        const doc = normaliseDoc(raw)
        docs.set(docKey(doc.doctype, doc.name), { ...doc })
      }
      // No notifications — hydrate is for cold-start only
    },

    getAll(doctype) {
      const prefix = `${doctype}/`
      const result: Doc[] = []
      for (const [key, doc] of docs) {
        if (key.startsWith(prefix)) {
          result.push(doc)
        }
      }
      return result
    },
  }
}
