let runtimeAuthToken: string | null = null
const AUTH_TOKEN_STORAGE = "failsafe:auth-token"

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

export function setAuthToken(token: string | null): void {
  runtimeAuthToken = token?.trim() || null
  if (!isBrowser()) return

  if (runtimeAuthToken) {
    sessionStorage.setItem(AUTH_TOKEN_STORAGE, runtimeAuthToken)
  } else {
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE)
  }
}

export function getAuthToken(): string | null {
  if (runtimeAuthToken) return runtimeAuthToken
  if (!isBrowser()) return null

  const persisted = sessionStorage.getItem(AUTH_TOKEN_STORAGE)
  runtimeAuthToken = persisted?.trim() || null
  return runtimeAuthToken
}

export function clearAuthToken(): void {
  setAuthToken(null)
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken())
}

export default {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  isAuthenticated,
}
