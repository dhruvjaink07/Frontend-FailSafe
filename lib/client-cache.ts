type CacheEntry = { ts: number; value: any }

const MEMORY_CACHE = new Map<string, CacheEntry>()

function supportsSessionStorage() {
  try {
    return typeof window !== "undefined" && !!window.sessionStorage
  } catch {
    return false
  }
}

export function setCached(key: string, value: any) {
  const entry: CacheEntry = { ts: Date.now(), value }
  MEMORY_CACHE.set(key, entry)
  if (supportsSessionStorage()) {
    try {
      sessionStorage.setItem(key, JSON.stringify(entry))
    } catch {
      // ignore
    }
  }
}

export function getCached<T = any>(key: string, ttlMs = 60000): T | null {
  // check memory cache first
  const mem = MEMORY_CACHE.get(key)
  if (mem && Date.now() - mem.ts <= ttlMs) return mem.value as T

  if (supportsSessionStorage()) {
    try {
      const raw = sessionStorage.getItem(key)
      if (!raw) return null
      const entry = JSON.parse(raw) as CacheEntry
      if (Date.now() - entry.ts <= ttlMs) {
        // warm memory cache
        MEMORY_CACHE.set(key, entry)
        return entry.value as T
      }
      return null
    } catch {
      return null
    }
  }

  return null
}

export function clearCached(key: string) {
  MEMORY_CACHE.delete(key)
  if (supportsSessionStorage()) {
    try {
      sessionStorage.removeItem(key)
    } catch {}
  }
}

export function clearAllCached() {
  MEMORY_CACHE.clear()
  if (supportsSessionStorage()) {
    try {
      sessionStorage.clear()
    } catch {}
  }
}

export default { getCached, setCached, clearCached, clearAllCached }
