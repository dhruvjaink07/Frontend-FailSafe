export type ApiRole = "viewer" | "engineer" | "admin"

export interface ApiKeyRecord {
  id: string
  name: string
  key: string
  role: ApiRole
  createdAt: string
  lastUsed?: string
}

function generateApiKey(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  const randomValues = crypto.getRandomValues(new Uint8Array(length))
  for (let index = 0; index < length; index += 1) {
    result += chars[randomValues[index] % chars.length]
  }
  return result
}

export const apiKeys: Map<string, ApiKeyRecord> = new Map()

export function findApiKeyByValue(rawKey: string | null): ApiKeyRecord | null {
  if (!rawKey) return null
  for (const key of apiKeys.values()) {
    if (key.key === rawKey) return key
  }
  return null
}
