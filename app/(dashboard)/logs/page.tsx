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
import { Download, Pause, Play, RefreshCw, Repeat, Trash2, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

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
  const [follow, setFollow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // session persistence keys + module cache
  const LOGS_STATE_KEY = "fs:logs:state"
  const LOGS_CACHE_KEY = "fs:logs:cache"

  function readSessionCache<T>(key: string): T | null {
    try {
      if (typeof sessionStorage === "undefined") return null
      const raw = sessionStorage.getItem(key)
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  function writeSessionCache<T>(key: string, value: T) {
    try {
      if (typeof sessionStorage === "undefined") return
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }

  const savedState = readSessionCache<{ endpoint?: string; status?: string; timeRange?: string; id?: string; q?: string }>(LOGS_STATE_KEY) || {}

  const [endpoint, setEndpoint] = useState<string>(searchParams.get("endpoint") ?? savedState.endpoint ?? "")
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? savedState.status ?? "")
  const [timeRange, setTimeRange] = useState<string>(searchParams.get("timeRange") ?? savedState.timeRange ?? "1h")
  const [experimentId, setExperimentId] = useState<string>(searchParams.get("id") ?? savedState.id ?? "")
  const [query, setQuery] = useState<string>(searchParams.get("q") ?? savedState.q ?? "")
  const [levelFilters, setLevelFilters] = useState<Record<string, boolean>>({
    error: true,
    warn: true,
    info: true,
    debug: true,
  })
  const [isFetching, setIsFetching] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const isMountedRef = useRef(true)
  const { toast } = useToast()
  const loadingToastRef = useRef<ReturnType<typeof toast> | null>(null)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const updateUrl = useCallback((next: { endpoint?: string; status?: string; timeRange?: string; q?: string; id?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    const update = (key: string, value: string | undefined) => {
      if (!value) params.delete(key)
      else params.set(key, value)
    }

    update("endpoint", next.endpoint)
    update("status", next.status)
    update("timeRange", next.timeRange)
    update("id", next.id)
    update("q", next.q)
    router.replace(`/logs?${params.toString()}`)
  }, [router, searchParams])

  const fetchLogs = useCallback(async () => {
    if (!isMountedRef.current) return
    setIsFetching(true)
    let timer: ReturnType<typeof setTimeout> | null = null
    timer = setTimeout(() => { if (isMountedRef.current) setShowLoading(true) }, 700)
    try {
      const data = await getLogs({ endpoint, status, timeRange, experimentId })
      if (!isMountedRef.current) return
      setError(null)
      const trimmed = data.slice(-config.MAX_LOG_ENTRIES)
      setLogs(trimmed)
      // Persist into module-level cache and sessionStorage so UI can hydrate quickly
      try {
        const cacheKey = `${endpoint}:${status}:${timeRange}:${experimentId}:${query}`
        const existing = (globalThis as any).__fs_logs_cache || readSessionCache<Record<string, LogEntry[]>>(LOGS_CACHE_KEY) || {}
        existing[cacheKey] = trimmed
        ;(globalThis as any).__fs_logs_cache = existing
        writeSessionCache(LOGS_CACHE_KEY, existing)
      } catch {}
    } catch (err) {
      const parsed = parseError(err)
      if (isMountedRef.current) setError(parsed.message)
      // swallow to avoid unhandled rejections — UI shows error and allows Retry
    } finally {
      if (timer) clearTimeout(timer)
      if (isMountedRef.current) {
        setShowLoading(false)
        setIsFetching(false)
      }
    }
  }, [endpoint, status, timeRange, experimentId])

  useEffect(() => {
    // hydrate from module cache to avoid empty flash on navigation
    try {
      const cacheKey = `${endpoint}:${status}:${timeRange}:${experimentId}:${query}`
      const globalCache = (globalThis as any).__fs_logs_cache || readSessionCache<Record<string, LogEntry[]>>(LOGS_CACHE_KEY) || {}
      ;(globalThis as any).__fs_logs_cache = globalCache
      const cached = globalCache[cacheKey]
      if (cached && cached.length) {
        setLogs(cached)
        setError(null)
      }
    } catch {}
    fetchLogs().catch(() => {})
  }, [endpoint, status, timeRange, experimentId, query])

  // Show a snackbar/toast if the initial fetch is slow
  useEffect(() => {
    if (showLoading) {
      if (!loadingToastRef.current) {
        const t = toast({ title: 'Loading logs', description: experimentId ? `Fetching logs for ${experimentId}` : 'Fetching logs' })
        loadingToastRef.current = t
      }
    } else {
      if (loadingToastRef.current) {
        loadingToastRef.current.dismiss()
        loadingToastRef.current = null
      }
    }
    return () => {
      if (loadingToastRef.current) {
        loadingToastRef.current.dismiss()
        loadingToastRef.current = null
      }
    }
  }, [showLoading, experimentId, toast])

  // Keyboard shortcuts: Ctrl+Shift+F = toggle follow, R = refresh, S = toggle streaming, C = clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return
      const key = (e.key || '').toLowerCase()
      if (document.activeElement) {
        const tag = (document.activeElement as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement).isContentEditable) return
      }
      if (key === 'f') {
        e.preventDefault()
        setFollow((c) => !c)
        if (!streaming) setStreaming(true)
      } else if (key === 'r') {
        e.preventDefault()
        fetchLogs().catch(() => {})
      } else if (key === 's') {
        e.preventDefault()
        setStreaming((c) => !c)
      } else if (key === 'c') {
        e.preventDefault()
        clearLogs()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fetchLogs, streaming])

  useEffect(() => {
    if (!streaming || follow) return
    const poller = new Poller({
      intervalMs: 2000,
      hiddenIntervalMs: 7000,
      onTick: fetchLogs,
      onStateChange: setConnectionState,
    })
    poller.start()
    return () => poller.stop()
  }, [fetchLogs, streaming])

  // SSE follow mode: open EventSource when `follow` is enabled and an experiment is selected.
  useEffect(() => {
    if (!follow || !experimentId) return

    const url = `/api/experiments/backend/logs?id=${encodeURIComponent(experimentId)}&follow=true&format=sse`
    let es: EventSource | null = null
    try {
      es = new EventSource(url)
    } catch (err) {
      setConnectionState("disconnected")
      return
    }

    es.onopen = () => setConnectionState("active")
    es.onerror = () => setConnectionState("stale")
    es.onmessage = (e) => {
      setConnectionState("active")
      // Parse SSE payload into LogEntry shape. Backends may send either
      // a plain text line or a JSON object. We normalize both cases.
      let parsed: any = null
      try {
        parsed = JSON.parse(e.data)
      } catch {
        parsed = { message: e.data }
      }

      const now = new Date()
      const entry = {
        id: parsed.id ?? `sse-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: parsed.timestamp
          ? (typeof parsed.timestamp === "number" ? new Date(parsed.timestamp).toISOString() : String(parsed.timestamp))
          : now.toISOString(),
        level: (parsed.level ?? parsed.level_name ?? parsed.l ?? "info").toLowerCase(),
        endpoint: parsed.endpoint ?? parsed.path ?? parsed.source ?? "",
        message: parsed.message ?? parsed.line ?? String(parsed),
        metadata: parsed.metadata ?? parsed.meta ?? null,
      }

      setLogs((prev) => {
        const next = [...prev, entry]
        if (next.length > config.MAX_LOG_ENTRIES) return next.slice(-config.MAX_LOG_ENTRIES)
        return next
      })
    }

    return () => {
      if (es) es.close()
      setConnectionState("paused")
    }
  }, [follow, experimentId])

  useEffect(() => {
    if (!scrollRef.current || !autoScroll) return
    const el = scrollRef.current

    // decide whether newest entries are at the top or bottom by comparing timestamps
    let newestAtTop = true
    if (logs.length >= 2) {
      try {
        const first = new Date(logs[0].timestamp).getTime()
        const last = new Date(logs[logs.length - 1].timestamp).getTime()
        newestAtTop = first >= last
      } catch {
        newestAtTop = true
      }
    }

    // wait for DOM update and then jump to the correct edge
    requestAnimationFrame(() => {
      if (newestAtTop) el.scrollTop = 0
      else el.scrollTop = el.scrollHeight
    })
  }, [logs, autoScroll])

  // fetch list of recent experiments to populate a selector for quick navigation
  const [experimentsList, setExperimentsList] = useState<Array<{ id: string; target_type: string; label?: string }>>([])
  const [experimentsLoading, setExperimentsLoading] = useState(false)
  const [experimentsError, setExperimentsError] = useState<string | null>(null)

  const loadExperiments = useCallback(async () => {
    setExperimentsLoading(true)
    setExperimentsError(null)
    try {
      const { getExperimentHistory } = await import('@/lib/api')
      const resp = await getExperimentHistory({ limit: 20 })
      const backendExps = resp.items
        .filter((it) => it.experiment.target_type === "backend")
        .map((it) => {
          const id = String(it.experiment?.id ?? "")
          return { id, target_type: it.experiment.target_type, label: `${id.slice(0, 8)}${id.length > 8 ? '…' : ''}` }
        })
      setExperimentsList(backendExps)
      // If no experiment id is present in the URL, select the first backend experiment
      if (!searchParams.get('id') && backendExps.length) {
        const first = backendExps[0].id
        setExperimentId(first)
        updateUrl({ endpoint, status, timeRange, q: query, id: first })
      }
    } catch (err) {
      const parsed = parseError(err)
      setExperimentsError(parsed.message)
    } finally {
      setExperimentsLoading(false)
    }
  }, [searchParams, updateUrl, endpoint, status, timeRange, query])

  useEffect(() => {
    loadExperiments().catch(() => {})
  }, [loadExperiments])

  // persist UI filter state to sessionStorage
  useEffect(() => {
    try {
      writeSessionCache(LOGS_STATE_KEY, { endpoint, status, timeRange, id: experimentId, q: query })
    } catch {}
  }, [endpoint, status, timeRange, experimentId, query])

  const filtered = useMemo(() => {
    return logs.filter((entry) => {
      // If a status is explicitly selected via the dropdown, honor it.
      if (status && status !== "all") {
        if (status === "degraded") {
          if (!entry.metadata?.degraded) return false
        } else if ((entry.level ?? "").toLowerCase() !== status) return false
      } else {
        // Otherwise apply per-level visibility filters
        const lvl = (entry.level ?? "").toLowerCase()
        if (!levelFilters[lvl]) return false
      }
      const textMatch = !query || entry.message.toLowerCase().includes(query.toLowerCase()) || entry.endpoint.toLowerCase().includes(query.toLowerCase())
      const degradedMatch = status !== "degraded" || Boolean(entry.metadata?.degraded)
      if (!textMatch || !degradedMatch) return false

      // show all messages (noisy messages are always visible)

      return true
    })
  }, [logs, query, status, levelFilters])

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

  function levelStyle(level?: string) {
    const l = (level || "").toLowerCase()
    if (l === "error" || l === "err" || l === "fatal") return "bg-destructive/10 text-destructive"
    if (l === "warn" || l === "warning") return "bg-amber-100 text-amber-700"
    if (l === "info") return "bg-primary/10 text-primary"
    if (l === "debug") return "bg-muted/10 text-muted-foreground"
    return "bg-muted/10 text-muted-foreground"
  }

  const endpoints = useMemo(() => {
    const set = new Set<string>()
    for (const item of logs) {
      const ep = String(item.endpoint ?? "").trim()
      if (!ep) continue
      if (ep.toLowerCase() === "unknown") continue
      set.add(ep)
    }
    return [...set]
  }, [logs])

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" })
    const href = URL.createObjectURL(blob)
    const element = document.createElement("a")
    element.href = href
    element.download = `logs-${Date.now()}.json`
    element.click()
    URL.revokeObjectURL(href)
  }

  const clearLogs = () => setLogs([])

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
                      updateUrl({ endpoint, status, timeRange, q: value, id: experimentId })
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={endpoint || "all"}
                    onValueChange={(value) => {
                      const next = value === "all" ? "" : value
                      setEndpoint(next)
                      updateUrl({ endpoint: next, timeRange, q: query, id: experimentId })
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Endpoint" /></SelectTrigger>
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
                      updateUrl({ endpoint, status: next, timeRange, q: query, id: experimentId })
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

                  {/* compact toolbar: removed per-level checkboxes to reduce clutter */}

                  <Select
                    value={timeRange}
                    onValueChange={(value) => {
                      setTimeRange(value)
                      updateUrl({ endpoint, timeRange: value, q: query, id: experimentId })
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15m">15m</SelectItem>
                      <SelectItem value="1h">1h</SelectItem>
                      <SelectItem value="6h">6h</SelectItem>
                      <SelectItem value="24h">24h</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="min-w-[160px]">
                    <Select value={experimentId || "all"} onValueChange={(val) => {
                      if (val === '__retry') {
                        loadExperiments().catch(() => {})
                        return
                      }
                      const next = val === "all" ? "" : val
                      setExperimentId(next)
                      updateUrl({ endpoint, timeRange, q: query, id: next })
                    }}>
                      <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Experiment" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Experiments</SelectItem>
                        {experimentsLoading ? (
                          <SelectItem value="__loading" disabled>Loading...</SelectItem>
                        ) : experimentsError ? (
                          <>
                            <SelectItem value="__none" disabled>No experiments</SelectItem>
                            <SelectItem value="__retry">Retry loading experiments</SelectItem>
                          </>
                        ) : (
                          experimentsList.map((exp) => (
                            <SelectItem key={exp.id} value={exp.id} title={exp.id}>{exp.label ?? exp.id}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="ml-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setStreaming((c) => !c)}>
                          {streaming ? 'Pause streaming' : 'Resume streaming'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setFollow((c) => !c); if (!streaming) setStreaming(true) }}>
                          {follow ? 'Disable follow (SSE)' : 'Enable follow (SSE)'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fetchLogs().catch(() => {})}>Refresh</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={clearLogs}>Clear logs</DropdownMenuItem>
                        <DropdownMenuItem onClick={exportLogs}>Export logs</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                  <div className="mt-1 text-xs text-muted-foreground">Shortcuts: <span className="font-medium">Ctrl+Shift+F</span>=Follow, <span className="font-medium">Ctrl+Shift+R</span>=Refresh, <span className="font-medium">Ctrl+Shift+S</span>=Stream, <span className="font-medium">Ctrl+Shift+C</span>=Clear</div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant={autoScroll ? "default" : "outline"} size="sm" className="w-full sm:w-auto" onClick={() => setAutoScroll((current) => !current)}>
                      Auto-scroll {autoScroll ? "On" : "Off"}
                    </Button>
                    {streaming && <Badge variant="outline" className="animate-pulse">Live</Badge>}
                    <div className="ml-2">
                      {follow ? (
                        <Badge variant={connectionState === "active" ? "default" : connectionState === "stale" ? "destructive" : "outline"}>
                          {connectionState === "active" ? "SSE Live" : connectionState === "stale" ? "SSE Reconnecting" : "SSE"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">SSE Off</Badge>
                      )}
                    </div>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="py-8 text-center">
                  {isFetching && logs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="text-sm text-muted-foreground">Loading logs…</p>
                      <div>
                        <Button size="sm" variant="ghost" onClick={() => fetchLogs().catch(() => {})}>Retry</Button>
                      </div>
                    </div>
                  ) : logs.length === 0 ? (
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
                          <span className="w-20 sm:text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${levelStyle(entry.level)}`}>{(entry.level || "").toUpperCase()}</span>
                          </span>
                          {(entry.endpoint && String(entry.endpoint).toLowerCase() !== "unknown") ? (
                            <span className="max-w-[28rem] truncate font-mono text-primary">{entry.endpoint}</span>
                          ) : null}
                          <span className="flex-1 truncate" title={typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message)}>{entry.message}</span>
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
