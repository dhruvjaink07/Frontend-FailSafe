export type ErrorType = "network_failure" | "auth_failure" | "invalid_payload" | "backend_crash" | "unknown"

export interface ParsedError {
  type: ErrorType
  message: string
  code?: string
  status?: number
  details?: unknown
}

function getTypeFromStatus(status?: number): ErrorType {
  if (!status) return "unknown"
  if (status === 401 || status === 403) return "auth_failure"
  if (status >= 400 && status < 500) return "invalid_payload"
  if (status >= 500) return "backend_crash"
  return "unknown"
}

export function parseError(res: unknown): ParsedError {
  if (res instanceof Error) {
    return {
      type: "network_failure",
      message: res.message || "Network failure",
      details: res,
    }
  }

  const value = res as {
    error?: string
    message?: string
    code?: string
    status?: number
    details?: unknown
  }

  const status = typeof value?.status === "number" ? value.status : undefined
  return {
    type: getTypeFromStatus(status),
    message: value?.error || value?.message || "Unknown error",
    code: value?.code,
    status,
    details: value?.details ?? res,
  }
}
