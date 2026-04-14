import type { NextRequest } from "next/server"
import { findApiKeyByValue, type ApiRole } from "@/lib/server/api-key-registry"
import { HARDCODED_BACKEND_API_KEY } from "@/lib/security/api-key-store"

export interface AuthContext {
  role: ApiRole
  keyId: string
}

export function getAuthContext(request: NextRequest): AuthContext | null {
  const header = request.headers.get("x-api-key")
  const matched = findApiKeyByValue(header)
  if (!matched) return null
  return {
    role: matched.role,
    keyId: matched.id,
  }
}

export function hasAnyRole(context: AuthContext | null, allowed: ApiRole[]): boolean {
  if (!context) return false
  return allowed.includes(context.role)
}

export function getForwardedApiKey(request?: NextRequest): string {
  return request?.headers.get("x-api-key")?.trim() || HARDCODED_BACKEND_API_KEY
}
