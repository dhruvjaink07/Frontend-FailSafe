let runtimeApiKey: string | null = null

const ACTIVE_KEY_STORAGE = "failsafe:active-api-key"
const KEY_META_STORAGE = "failsafe:api-key-meta"

type CachedApiKeyMeta = {
  id: string
  name: string
  role: "viewer" | "engineer" | "admin"
  key: string
  createdAt: string
  lastUsed?: string
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

export function setApiKey(key: string | null): void {
  runtimeApiKey = key?.trim() || null
  if (!isBrowser()) return

  if (runtimeApiKey) {
    sessionStorage.setItem(ACTIVE_KEY_STORAGE, runtimeApiKey)
  } else {
    sessionStorage.removeItem(ACTIVE_KEY_STORAGE)
  }
}

export function getApiKey(): string | null {
  if (runtimeApiKey) return runtimeApiKey
  if (!isBrowser()) return null

  const persisted = sessionStorage.getItem(ACTIVE_KEY_STORAGE)
  runtimeApiKey = persisted?.trim() || null

  // Auto-restore the newest cached key when session state is missing.
  if (!runtimeApiKey) {
    const cached = listCachedApiKeys()
    const newest = cached[0]?.key?.trim()
    if (newest) {
      runtimeApiKey = newest
      sessionStorage.setItem(ACTIVE_KEY_STORAGE, runtimeApiKey)
    }
  }

  return runtimeApiKey
}

export function maskApiKey(key: string): string {
  if (!key) return ""
  if (key.length <= 8) return "****"
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

export function listCachedApiKeys(): CachedApiKeyMeta[] {
  if (!isBrowser()) return []
  const raw = localStorage.getItem(KEY_META_STORAGE)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is CachedApiKeyMeta => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.role === "string" &&
        typeof item.key === "string" &&
        typeof item.createdAt === "string"
      )
    })
  } catch {
    return []
  }
}

export function cacheApiKeyMeta(entry: CachedApiKeyMeta): void {
  if (!isBrowser()) return
  const current = listCachedApiKeys().filter((item) => item.id !== entry.id)
  localStorage.setItem(KEY_META_STORAGE, JSON.stringify([entry, ...current]))
}

export function removeCachedApiKey(id: string): void {
  if (!isBrowser()) return
  const next = listCachedApiKeys().filter((item) => item.id !== id)
  localStorage.setItem(KEY_META_STORAGE, JSON.stringify(next))
}
