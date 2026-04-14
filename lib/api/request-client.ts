import { config } from "@/lib/config/config"
import { parseError } from "@/lib/errors/error-handler"
import { getApiKey } from "@/lib/security/api-key-store"

interface RequestOptions extends Omit<RequestInit, "signal"> {
  timeoutMs?: number
  dedupeKey?: string
  signal?: AbortSignal
}

const inFlight = new Map<string, Promise<unknown>>()
const controllers = new Map<string, AbortController>()
const uiOnlyPreview = process.env.NEXT_PUBLIC_UI_ONLY_PREVIEW === "true"

function getUiPreviewFallback<T>(url: string, method: string): T | null {
  if (method !== "GET") return null

  const normalized = (() => {
    try {
      return new URL(url, "http://local").pathname
    } catch {
      return url
    }
  })()

  if (normalized.endsWith("/api/health")) {
    return {
      status: "ok",
      backend: "unconfigured",
      mode: "ui-preview",
    } as T
  }

  if (normalized.endsWith("/api/experiments")) {
    return [] as T
  }

  if (normalized.endsWith("/api/containers")) {
    return [] as T
  }

  if (normalized.endsWith("/api/logs")) {
    return [] as T
  }

  if (normalized.endsWith("/api/auth/role")) {
    return { role: "viewer", keyId: "ui-preview" } as T
  }

  if (normalized.endsWith("/api/metrics/system")) {
    return {
      blastRadius: 0,
      cascadeDepth: 0,
      severity: "low",
    } as T
  }

  return null
}

function getRequestKey(url: string, options: RequestOptions): string {
  const method = options.method ?? "GET"
  const body = typeof options.body === "string" ? options.body : ""
  return options.dedupeKey ?? `${method}:${url}:${body}`
}

function mergeSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  const abort = () => controller.abort()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort()
      break
    }
    signal.addEventListener("abort", abort, { once: true })
  }
  return controller.signal
}

export function cancelRequest(key: string): void {
  controllers.get(key)?.abort()
  controllers.delete(key)
  inFlight.delete(key)
}

export async function requestClient<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const key = getRequestKey(url, options)
  const method = options.method ?? "GET"

  if (uiOnlyPreview) {
    const fallback = getUiPreviewFallback<T>(url, method)
    if (fallback !== null) {
      return fallback
    }
  }

  if (inFlight.has(key)) {
    return inFlight.get(key) as Promise<T>
  }

  const timeoutController = new AbortController()
  const requestController = new AbortController()
  const timeoutMs = options.timeoutMs ?? config.REQUEST_TIMEOUT_MS
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs)
  const signal = options.signal
    ? mergeSignals([options.signal, timeoutController.signal, requestController.signal])
    : mergeSignals([timeoutController.signal, requestController.signal])

  controllers.set(key, requestController)

      const task = (async () => {
    try {
      const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData
      const res = await fetch(url, {
        ...options,
        signal,
        headers: {
              ...(isFormData ? {} : { "Content-Type": "application/json" }),
              "x-api-key": getApiKey() ?? "",
              ...options.headers,
        },
      })

      if (!res.ok) {
        let payload: unknown = null
        try {
          payload = await res.json()
        } catch {
          try {
            const text = await res.text()
            payload = { message: text || `Request failed with status ${res.status}` }
          } catch {
            payload = { message: `Request failed with status ${res.status}` }
          }
        }
        throw parseError({ ...(payload as object), status: res.status })
      }

      if (res.status === 204) {
        return null as T
      }

      try {
        return (await res.json()) as T
      } catch (e) {
        // If the backend returned non-JSON but status is OK, include the raw text
        try {
          const text = await res.text()
          throw parseError({ message: text || "Backend returned non-JSON response", status: res.status })
        } catch (e2) {
          throw parseError(e)
        }
      }
    } catch (error) {
      throw parseError(error)
    } finally {
      clearTimeout(timeout)
      controllers.delete(key)
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, task)
  return task
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  const base = config.API_BASE.endsWith("/") ? config.API_BASE.slice(0, -1) : config.API_BASE
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalizedPath}`
}
