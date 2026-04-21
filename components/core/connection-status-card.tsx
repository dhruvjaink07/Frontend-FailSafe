"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const HEALTH_URL = "/api/health"
const DISPLAY_HEALTH_URL = "http://localhost:8000/health"

function formatCheckedAt(value: Date | null) {
  if (!value) {
    return "Not checked yet"
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(value)
}

export function ConnectionStatusCard({ title = "Connection Status" }: { title?: string }) {
  const [healthy, setHealthy] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [engineAvailable, setEngineAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    const checkHealth = async () => {
      setChecking(true)
      try {
        const response = await fetch(HEALTH_URL)
        const payload = (await response.json()) as { healthy?: boolean }
        if (!cancelled) {
          setHealthy(Boolean(response.ok && payload.healthy))
          setLastCheckedAt(new Date())
        }
      } catch {
        if (!cancelled) {
          setHealthy(false)
          setLastCheckedAt(new Date())
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    const checkEngine = async () => {
      try {
        const res = await fetch("/api/containers", { cache: "no-store" })
        if (!cancelled) {
          if (res.ok) {
            try {
              const body = await res.json()
              setEngineAvailable(Array.isArray(body) && body.length > 0)
            } catch {
              setEngineAvailable(false)
            }
          } else {
            setEngineAvailable(false)
          }
        }
      } catch {
        if (!cancelled) setEngineAvailable(false)
      }
    }

    checkHealth()
    checkEngine()
    const interval = setInterval(() => {
      checkHealth()
      checkEngine()
    }, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const isHealthy = healthy === true

  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>Backend reachability for live experiment workflows.</CardDescription>
          </div>
          <Badge variant={isHealthy ? "secondary" : "destructive"} className="gap-1">
            {isHealthy ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {checking ? "Checking" : isHealthy ? "Healthy" : "Unreachable"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{DISPLAY_HEALTH_URL}</p>
          <p>Last checked {formatCheckedAt(lastCheckedAt)}</p>
          <p>
            Runtime: {engineAvailable === null ? "Checking" : engineAvailable ? "Connected" : "Unavailable"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full shrink-0 sm:w-auto"
          onClick={async () => {
            setChecking(true)
            try {
              const response = await fetch(HEALTH_URL)
              const payload = (await response.json()) as { healthy?: boolean }
              setHealthy(Boolean(response.ok && payload.healthy))
              setLastCheckedAt(new Date())
            } catch {
              setHealthy(false)
              setLastCheckedAt(new Date())
            } finally {
              setChecking(false)
            }
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardContent>
    </Card>
  )
}