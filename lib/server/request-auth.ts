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

export function getAuthTokenFromRequest(request?: NextRequest): string | null {
  if (!request) return null
  // Prefer explicit Authorization header
  const authHeader = request.headers.get("authorization")
  if (authHeader && typeof authHeader === "string") return authHeader.replace(/^Bearer\s+/i, "").trim()

  // Fall back to cookie named 'failsafe_auth'
  try {
    // NextRequest exposes cookies via request.cookies
    // Use runtime call safely
    // @ts-ignore
    const cookie = request.cookies?.get?.("failsafe_auth")
    if (cookie && typeof cookie === "object") {
      return String(cookie.value || cookie)
    }
    if (cookie && typeof cookie === "string") return cookie
  } catch {
    // ignore
  }

  return null
}
