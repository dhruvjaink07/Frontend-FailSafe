"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const DEFAULT_BACKENDS = "python=http://localhost:5000,go=http://localhost:8000"
const BACKENDS_CONFIG = process.env.NEXT_PUBLIC_API_BACKENDS || DEFAULT_BACKENDS

type Backend = { name: string; url: string }
const parseBackends = (cfg: string): Backend[] =>
  cfg.split(",").map(s => {
    const [name, url] = s.split("=").map(x => x.trim())
    return { name: name || url || "unknown", url: url || name }
  })

const BACKENDS = parseBackends(BACKENDS_CONFIG)

export function BackendHealthBanner() {
  const [statuses, setStatuses] = useState<Record<string, boolean | null>>(() => {
    const init: Record<string, boolean | null> = {}
    BACKENDS.forEach(b => (init[b.name] = null))
    return init
  })
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkHealth = async () => {
      setChecking(true)
      try {
        const checks = await Promise.all(
          BACKENDS.map(async b => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000)
            try {
              const response = await fetch(`${b.url.replace(/\/$/, "")}/api/health`, {
                signal: controller.signal,
                method: "GET",
              })
              clearTimeout(timeoutId)
              let payload: { healthy?: boolean } | null = null
              try {
                const text = await response.text()
                try {
                  payload = JSON.parse(text) as { healthy?: boolean }
                } catch {
                  payload = null
                }
              } catch {
                payload = null
              }
              return { name: b.name, healthy: Boolean(response.ok && (payload?.healthy ?? true)) }
            } catch (err) {
              clearTimeout(timeoutId)
              return { name: b.name, healthy: false }
            }
          })
        )
        if (!cancelled) {
          const next: Record<string, boolean | null> = {}
          checks.forEach(c => (next[c.name] = c.healthy))
          setStatuses(next)
        }
      } catch (error) {
        if (!cancelled) console.error("Health checks failed:", error)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const healthyNames = Object.entries(statuses)
    .filter(([, v]) => v === true)
    .map(([k]) => k)

  if (healthyNames.length > 0) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Backend reachable: {healthyNames.join(", ")}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-success hover:bg-success/15"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="mr-2 h-3 w-3" />
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        {checking ? (
          "Checking backend health..."
        ) : (
          <span>
            Backend unavailable: {BACKENDS.map(b => `${b.name} (${b.url})`).join(", ")}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-warning hover:bg-warning/15"
        onClick={async () => {
          try {
            setChecking(true)
            const response = await fetch(HEALTH_URL)
            let payload: { healthy?: boolean } | null = null
            try {
              const text = await response.text()
              try {
                payload = JSON.parse(text) as { healthy?: boolean }
              } catch {
                payload = null
              }
            } catch {
              payload = null
            }
            setHealthy(Boolean(response.ok && (payload?.healthy ?? true)))
          } catch {
            setHealthy(false)
          } finally {
            setChecking(false)
          }
        }}
      >
        <RefreshCw className="mr-2 h-3 w-3" />
        Retry
      </Button>
    </div>
  )
}
