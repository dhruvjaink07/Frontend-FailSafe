"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const HEALTH_URL = "/api/health"
const DISPLAY_HEALTH_URL = "Go Orchestrator"

export function BackendHealthBanner() {
  const [healthy, setHealthy] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkHealth = async () => {
      setChecking(true)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(HEALTH_URL, {
          signal: controller.signal,
          method: "GET",
          headers: { "Accept": "text/plain" },
        })
        clearTimeout(timeoutId)
        const payload = (await response.json()) as { healthy?: boolean }
        if (!cancelled) {
          setHealthy(Boolean(response.ok && payload.healthy))
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error("Health check failed:", error)
          setHealthy(false)
        }
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

  if (healthy === true) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Backend reachable at {DISPLAY_HEALTH_URL}
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
        {checking ? "Checking backend health..." : `Backend unavailable at ${DISPLAY_HEALTH_URL}`}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-warning hover:bg-warning/15"
        onClick={async () => {
          try {
            setChecking(true)
            const response = await fetch(HEALTH_URL)
            const payload = (await response.json()) as { healthy?: boolean }
            setHealthy(Boolean(response.ok && payload.healthy))
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
