"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataStateIndicator } from "@/components/core/data-state-indicator"
import { Topbar } from "@/components/topbar"
import { config } from "@/lib/config/config"
import { getLogs, type LogEntry } from "@/lib/api"
import { parseError } from "@/lib/errors/error-handler"
import { Poller } from "@/lib/polling/polling-manager"
import { formatClock } from "@/lib/time/time-utils"
import { Download, Pause, Play, RefreshCw } from "lucide-react"

export default function LogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LogsPageContent />
    </Suspense>
  )
}

function LogsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [streaming, setStreaming] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [connectionState, setConnectionState] = useState<"active" | "paused" | "disconnected" | "stale">("paused")
  const [error, setError] = useState<string | null>(null)

  const [endpoint, setEndpoint] = useState(searchParams.get("endpoint") ?? "")
  const [status, setStatus] = useState(searchParams.get("status") ?? "")
  const [timeRange, setTimeRange] = useState(searchParams.get("timeRange") ?? "1h")
  const [experimentId, setExperimentId] = useState(searchParams.get("id") ?? "")
  const [query, setQuery] = useState(searchParams.get("q") ?? "")

  const updateUrl = useCallback((next: { endpoint?: string; status?: string; timeRange?: string; q?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    const update = (key: string, value: string | undefined) => {
      if (!value) params.delete(key)
      else params.set(key, value)
    }

    update("endpoint", next.endpoint)
    update("status", next.status)
    update("timeRange", next.timeRange)
    update("q", next.q)
    router.replace(`/logs?${params.toString()}`)
  }, [router, searchParams])

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getLogs({ endpoint, status, timeRange, experimentId })
      setError(null)
      setLogs(data.slice(-config.MAX_LOG_ENTRIES))
    } catch (err) {
      const parsed = parseError(err)
      setError(parsed.message)
      throw err
    }
  }, [endpoint, status, timeRange, experimentId])

  useEffect(() => {
    fetchLogs().catch(() => {})
  }, [fetchLogs])

  useEffect(() => {
    if (!streaming) return
    const poller = new Poller({
      intervalMs: 2000,
      hiddenIntervalMs: 7000,
      onTick: fetchLogs,
      onStateChange: setConnectionState,
    })
    poller.start()
    return () => poller.stop()
  }, [fetchLogs, streaming])

  useEffect(() => {
    if (!scrollRef.current || !autoScroll) return
    scrollRef.current.scrollTop = 0
  }, [logs, autoScroll])

  // fetch list of recent experiments to populate a selector for quick navigation
  const [experimentsList, setExperimentsList] = useState<Array<{ id: string; target_type: string }>>([])
  useEffect(() => {
    import('@/lib/api').then(({ getExperimentHistory }) => {
      getExperimentHistory({ limit: 20 }).then((resp) => {
        setExperimentsList(resp.items.map((it) => ({ id: it.experiment.id, target_type: it.experiment.target_type })))
      }).catch(() => {})
    })
  }, [])

  const filtered = useMemo(() => {
    return logs.filter((entry) => {
      const textMatch = !query || entry.message.toLowerCase().includes(query.toLowerCase()) || entry.endpoint.toLowerCase().includes(query.toLowerCase())
      const degradedMatch = status !== "degraded" || Boolean(entry.metadata?.degraded)
      return textMatch && degradedMatch
    })
  }, [logs, query, status])

  // Collapse consecutive identical log lines into a single display entry with a count
  const collapsed = useMemo(() => {
    if (!filtered.length) return [] as Array<LogEntry & { count?: number }>
    const out: Array<LogEntry & { count?: number }> = []
    let prev: (LogEntry & { count?: number }) | null = null
    for (const e of filtered) {
      if (prev && prev.message === e.message && prev.endpoint === e.endpoint && prev.level === e.level) {
        prev.count = (prev.count || 1) + 1
      } else {
        const copy: LogEntry & { count?: number } = { ...e }
        copy.count = 1
        out.push(copy)
        prev = copy
      }
    }
    return out
  }, [filtered])

  const endpoints = useMemo(() => [...new Set(logs.map((item) => item.endpoint))], [logs])

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" })
    const href = URL.createObjectURL(blob)
    const element = document.createElement("a")
    element.href = href
    element.download = `logs-${Date.now()}.json`
    element.click()
    URL.revokeObjectURL(href)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar title="Logs" description="Streaming logs with failure-aware filtering" />

      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Search logs"
                    value={query}
                    onChange={(event) => {
                      const value = event.target.value
                      setQuery(value)
                      updateUrl({ endpoint, status, timeRange, q: value })
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={endpoint || "all"}
                    onValueChange={(value) => {
                      const next = value === "all" ? "" : value
                      setEndpoint(next)
                      updateUrl({ endpoint: next, status, timeRange, q: query })
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Endpoint" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All endpoints</SelectItem>
                      {endpoints.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select
                    value={status || "all"}
                    onValueChange={(value) => {
                      const next = value === "all" ? "" : value
                      setStatus(next)
                      updateUrl({ endpoint, status: next, timeRange, q: query })
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warn</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="degraded">Degraded only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={timeRange}
                    onValueChange={(value) => {
                      setTimeRange(value)
                      updateUrl({ endpoint, status, timeRange: value, q: query })
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15m">15m</SelectItem>
                      <SelectItem value="1h">1h</SelectItem>
                      <SelectItem value="6h">6h</SelectItem>
                      <SelectItem value="24h">24h</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="min-w-[160px]">
                    <Select value={experimentId || "all"} onValueChange={(val) => { const next = val === "all" ? "" : val; setExperimentId(next); updateUrl({ endpoint, status, timeRange, q: query }) }}>
                      <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Experiment" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Experiments</SelectItem>
                        {experimentsList.map((exp) => (
                          <SelectItem key={exp.id} value={exp.id}>{exp.id} ({exp.target_type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => setStreaming((current) => !current)}>
                    {streaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => fetchLogs().catch(() => {})}><RefreshCw className="h-4 w-4" /></Button>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={exportLogs}><Download className="mr-2 h-4 w-4" />Export</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex flex-wrap items-center gap-2">Log Stream <DataStateIndicator state={connectionState === "active" || connectionState === "paused" ? "ready" : connectionState} /></CardTitle>
                  <CardDescription>{filtered.length} entries shown</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={autoScroll ? "default" : "outline"} size="sm" className="w-full sm:w-auto" onClick={() => setAutoScroll((current) => !current)}>
                    Auto-scroll {autoScroll ? "On" : "Off"}
                  </Button>
                  {streaming && <Badge variant="outline" className="animate-pulse">Live</Badge>}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="py-8 text-center">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-muted-foreground">No logs available</p>
                      <p className="text-xs text-muted-foreground">Logs will appear here when experiments run</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-muted-foreground">No logs match your filters</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              ) : (
                <div ref={scrollRef} className="h-[600px] overflow-y-auto rounded-lg border border-border bg-muted/20 font-mono text-xs">
                      {collapsed.map((entry) => (
                        <div key={entry.id} className="flex flex-col gap-1 border-b border-border/50 px-3 py-2 last:border-0 sm:flex-row sm:gap-3">
                          <span className="text-muted-foreground">{formatClock(entry.timestamp)}</span>
                          <span className="w-14 uppercase text-muted-foreground sm:text-right">{entry.level}</span>
                          <span className="break-all text-primary">{entry.endpoint}</span>
                          <span className="flex-1">{entry.message}</span>
                          {entry.count && entry.count > 1 && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">×{entry.count}</span>
                          )}
                        </div>
                      ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
