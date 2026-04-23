"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataStateIndicator } from "@/components/core/data-state-indicator"
import { Topbar } from "@/components/topbar"
import { alignTimeSeries, decimateTimeSeries } from "@/lib/adapters/metrics-adapter"
import { config } from "@/lib/config/config"
import { getExperimentHistory, getExperiments, getMetrics, getFrontendMetricsReport, getBackendMetricsReport, getAndroidMetricsReport, getExperimentHistoryDetail } from "@/lib/api"
import { normalizeMetricSnapshot } from "@/lib/adapters/data-normalizer"
import { parseError } from "@/lib/errors/error-handler"
import { Poller } from "@/lib/polling/polling-manager"
import type { Experiment } from "@/lib/store"
import { toTimestampMs } from "@/lib/time/time-utils"
import { Download } from "lucide-react"

export default function MetricsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <MetricsPageContent />
    </Suspense>
  )
}

function MetricsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [historyOptions, setHistoryOptions] = useState<Array<{ id: string; name: string }>>([])
  const [selectedExperiment, setSelectedExperiment] = useState(searchParams.get("id") ?? "")
  const [experimentInput, setExperimentInput] = useState(searchParams.get("id") ?? "")
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [metricsPartial, setMetricsPartial] = useState(false)
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getMetrics>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFetchingMetrics, setIsFetchingMetrics] = useState(false)
  const [connectionState, setConnectionState] = useState<"active" | "paused" | "disconnected" | "stale">("paused")
  const lastPaintAt = useRef(0)

  useEffect(() => {
    const idFromUrl = searchParams.get("id") ?? ""
    if (idFromUrl && idFromUrl !== selectedExperiment) {
      setSelectedExperiment(idFromUrl)
      setExperimentInput(idFromUrl)
    }
    const platformFromUrl = searchParams.get("platform")
    if (platformFromUrl) setSelectedPlatform(platformFromUrl)
  }, [searchParams, selectedExperiment])

  useEffect(() => {
    getExperiments()
      .then(async (data) => {
        setExperiments(data)
        if (!selectedExperiment && data.length > 0) {
          const next = data[0].id
          setSelectedExperiment(next)
          setExperimentInput(next)
          router.replace(`/metrics?id=${next}`)
          return
        }

        if (data.length === 0) {
          const history = await getExperimentHistory({ limit: 50, offset: 0 })
          const options = history.items
            .map((item) => item.experiment.id)
            .filter((id): id is string => Boolean(id && id.trim()))
            .filter((id, index, all) => all.indexOf(id) === index)
            .map((id) => ({ id, name: id }))
          setHistoryOptions(options)
          if (!selectedExperiment && options.length > 0) {
            const next = options[0].id
            setSelectedExperiment(next)
            setExperimentInput(next)
            router.replace(`/metrics?id=${next}`)

            // Attempt autodetection of platform via history detail when experiments list is empty
            try {
              const detail = await getExperimentHistoryDetail(next)
              const inferred = (detail?.experiment?.target_type as string) || null
              if (inferred) setSelectedPlatform(inferred)
            } catch (e) {
              // ignore detail fetch failures
            }
          }
        } else {
          setHistoryOptions([])
        }
      })
      .catch((err) => setError(parseError(err).message))
  }, [router, selectedExperiment])

  const experimentOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>()
    for (const experiment of experiments) {
      if (!experiment.id?.trim()) continue
      byId.set(experiment.id, { id: experiment.id, name: experiment.id })
    }
    for (const option of historyOptions) {
      if (!option.id?.trim()) continue
      if (!byId.has(option.id)) {
        byId.set(option.id, option)
      }
    }
    if (selectedExperiment && !byId.has(selectedExperiment)) {
      byId.set(selectedExperiment, {
        id: selectedExperiment,
        name: selectedExperiment,
      })
    }
    return Array.from(byId.values())
  }, [experiments, historyOptions, selectedExperiment])

  // Helper: infer platform for a given experiment id (look up experiments list first, then history detail)
  async function inferPlatformFor(id: string | undefined) {
    if (!id) return null
    const found = experiments.find((e) => e.id === id)
    if (found?.platform) {
      setSelectedPlatform(found.platform)
      return found.platform
    }
    try {
      const detail = await getExperimentHistoryDetail(id)
      const inferred = (detail?.experiment?.target_type as string) || null
      if (inferred) setSelectedPlatform(inferred)
      return inferred
    } catch {
      setSelectedPlatform(null)
      return null
    }
  }

  const fetchMetrics = useCallback(async () => {
    if (!selectedExperiment) return
    try {
      setIsFetchingMetrics(true)
      const now = Date.now()
      if (now - lastPaintAt.current < config.CHART_UPDATE_THROTTLE_MS) {
        setIsFetchingMetrics(false)
        return
      }

      // Prefer platform-specific metrics endpoints when we know the experiment platform.
      const experimentRecord = experiments.find((e) => e.id === selectedExperiment)
      let raw: unknown = null

      const platform = selectedPlatform ?? experimentRecord?.platform
      if (platform === "frontend") {
        raw = await getFrontendMetricsReport(selectedExperiment)
      } else if (platform === "android") {
        raw = await getAndroidMetricsReport(selectedExperiment)
      } else if (platform === "backend") {
        raw = await getBackendMetricsReport(selectedExperiment)
      } else {
        // Fallback to generic proxy which may attempt to detect platform server-side
        raw = await getMetrics(selectedExperiment) as unknown as Record<string, unknown>
      }

      const normalized = normalizeMetricSnapshot((raw || {}) as Record<string, unknown>)
      setMetrics({ ...normalized, intensityHistory: decimateTimeSeries(normalized.intensityHistory) })
      const isPartial = (normalized.endpoints.length === 0 && normalized.intensityHistory.length === 0)
      setMetricsPartial(isPartial)
      setError(null)
      lastPaintAt.current = now
      setIsFetchingMetrics(false)
    } catch (err) {
      setError(parseError(err).message)
      throw err
    }
  }, [selectedExperiment, experiments, selectedPlatform])

  useEffect(() => {
    if (!selectedExperiment) return
    fetchMetrics().catch(() => {})
    const poller = new Poller({
      intervalMs: 3000,
      hiddenIntervalMs: 8000,
      onTick: fetchMetrics,
      onStateChange: setConnectionState,
    })
    poller.start()
    return () => poller.stop()
  }, [fetchMetrics, selectedExperiment, selectedPlatform])

  const alignedSeries = useMemo(() => {
    if (!metrics?.intensityHistory?.length) return []

    const withPhase = metrics.intensityHistory.some((point) => point.phase)
    const points = withPhase
      ? metrics.intensityHistory
      : metrics.intensityHistory.map((point, index, all) => {
          const ratio = all.length <= 1 ? 1 : index / (all.length - 1)
          const phase = ratio < 0.33 ? "baseline" : ratio < 0.66 ? "injecting" : "recovering"
          return { ...point, phase }
        })

    const baseline = points.filter((point) => point.phase === "baseline").map((point) => ({ timestamp: toTimestampMs(point.timestamp), value: point.value }))
    const injecting = points.filter((point) => point.phase === "injecting").map((point) => ({ timestamp: toTimestampMs(point.timestamp), value: point.value }))
    const recovery = points.filter((point) => point.phase === "recovering").map((point) => ({ timestamp: toTimestampMs(point.timestamp), value: point.value }))

    return alignTimeSeries(baseline, injecting, recovery).map((point) => ({
      ...point,
      label: new Date(point.timestamp).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    }))
  }, [metrics])

  const exportMetrics = () => {
    const payload = {
      selectedExperiment,
      metrics,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const href = URL.createObjectURL(blob)
    const element = document.createElement("a")
    element.href = href
    element.download = `metrics-${selectedExperiment || "none"}.json`
    element.click()
    URL.revokeObjectURL(href)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar title="Metrics" description="Aligned time-series and endpoint health" />

      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="grid gap-3 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-center">
                  <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Experiment</span>
                        {selectedPlatform && (
                          <Badge variant="outline" className="capitalize text-xs">
                            {selectedPlatform}
                          </Badge>
                        )}
                      </div>
                      <Select
                        value={selectedExperiment}
                        onValueChange={async (value) => {
                          setSelectedExperiment(value)
                          setExperimentInput(value)
                          router.replace(`/metrics?id=${value}`)
                          await inferPlatformFor(value)
                          // Immediately request metrics for the newly selected experiment
                          fetchMetrics().catch(() => {})
                        }}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select experiment" /></SelectTrigger>
                        <SelectContent>
                          {experimentOptions.length === 0 ? (
                            <SelectItem value="none" disabled>No experiments</SelectItem>
                          ) : (
                            experimentOptions.map((experiment) => (
                              <SelectItem key={experiment.id} value={experiment.id}>{experiment.id}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  
                </div>
                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <DataStateIndicator state={connectionState === "active" || connectionState === "paused" ? "ready" : connectionState} />
                  <Button variant="outline" className="w-full sm:w-auto" onClick={exportMetrics}><Download className="mr-2 h-4 w-4" />Export</Button>
                </div>
              </div>
              {error && (
                <div className="mt-3 flex items-center gap-3">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button size="sm" variant="ghost" onClick={() => fetchMetrics().catch(() => {})}>Retry</Button>
                </div>
              )}
              {metricsPartial && (
                <div className="mt-3">
                  <Card>
                    <CardContent>
                      <p className="text-sm text-warning">Warning: metrics endpoint returned partial or unsupported data for the selected platform. Charts or tables may be incomplete.</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          {!metrics ? (
            <Card>
              <CardContent className="py-12 text-center">
                {isFetchingMetrics ? (
                  <div className="flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : !selectedExperiment ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">No experiment selected</p>
                    <p className="text-xs text-muted-foreground">Select an experiment above to view metrics</p>
                  </div>
                ) : experiments.length === 0 ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">No metrics loaded yet</p>
                    <p className="text-xs text-muted-foreground">Select or paste an experiment ID and click Load</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Blast Radius</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-semibold">{metrics.system.blastRadius}%</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Cascade Depth</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-semibold">{metrics.system.cascadeDepth}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Severity</CardTitle></CardHeader>
                  <CardContent><Badge variant={metrics.system.severity === "critical" ? "destructive" : "outline"}>{metrics.system.severity}</Badge></CardContent>
                </Card>
              </div>

              <div className="grid gap-6 2xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Phase-Aligned Intensity</CardTitle>
                    <CardDescription>Throttled updates and decimated points for long sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={alignedSeries}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                          <XAxis dataKey="label" hide />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line dataKey="baseline" stroke="var(--info)" strokeWidth={3} dot={{ r: 2 }} isAnimationActive={false} name="Baseline" />
                          <Line dataKey="injecting" stroke="var(--warning)" strokeWidth={3} dot={{ r: 2 }} isAnimationActive={false} name="Injecting" />
                          <Line dataKey="recovery" stroke="var(--success)" strokeWidth={3} dot={{ r: 2 }} isAnimationActive={false} name="Recovery" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Endpoint Degradation</CardTitle>
                    <CardDescription>Raw endpoint metrics from backend response</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {metrics.endpoints.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Metrics empty for selected experiment.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full min-w-[960px] text-xs">
                          <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Endpoint</th>
                              <th className="px-3 py-2 text-right font-medium">Req</th>
                              <th className="px-3 py-2 text-right font-medium">P50</th>
                              <th className="px-3 py-2 text-right font-medium">P95</th>
                              <th className="px-3 py-2 text-right font-medium">P99</th>
                              <th className="px-3 py-2 text-right font-medium">Avg</th>
                              <th className="px-3 py-2 text-right font-medium">Jitter</th>
                              <th className="px-3 py-2 text-right font-medium">StdDev</th>
                              <th className="px-3 py-2 text-right font-medium">Error %</th>
                              <th className="px-3 py-2 text-right font-medium">FailStreak</th>
                              <th className="px-3 py-2 text-right font-medium">Impact</th>
                              <th className="px-3 py-2 text-right font-medium">Stability</th>
                              <th className="px-3 py-2 text-right font-medium">CPU %</th>
                              <th className="px-3 py-2 text-right font-medium">Mem MB</th>
                              <th className="px-3 py-2 text-right font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.endpoints
                              .slice()
                              .sort((a, b) => Number(b.degraded) - Number(a.degraded) || b.errorRate - a.errorRate)
                              .map((item) => (
                                <tr key={item.endpoint} className="border-t border-border/60">
                                  <td className="px-3 py-2 font-mono text-[11px]">{item.endpoint}</td>
                                  <td className="px-3 py-2 text-right">{item.requestsTotal ?? 0}</td>
                                  <td className="px-3 py-2 text-right">{item.latencyP50 ?? 0}ms</td>
                                  <td className="px-3 py-2 text-right">{item.latencyP95}ms</td>
                                  <td className="px-3 py-2 text-right">{item.latencyP99}ms</td>
                                  <td className="px-3 py-2 text-right">{item.latencyAvg}ms</td>
                                  <td className="px-3 py-2 text-right">{item.jitterMs ?? 0}ms</td>
                                  <td className="px-3 py-2 text-right">{item.stddevMs ?? 0}ms</td>
                                  <td className="px-3 py-2 text-right">{item.errorRate}%</td>
                                  <td className="px-3 py-2 text-right">{item.maxFailureStreak ?? 0}</td>
                                  <td className="px-3 py-2 text-right">{item.impactOrder ?? 0}</td>
                                  <td className="px-3 py-2 text-right">{item.stabilityScore ?? 0}</td>
                                  <td className="px-3 py-2 text-right">{item.cpu.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right">{item.memory.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right">
                                    <Badge variant={item.degraded ? "destructive" : "secondary"}>{item.degraded ? "Degraded" : "Healthy"}</Badge>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
