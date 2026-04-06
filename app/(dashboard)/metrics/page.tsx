"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataStateIndicator } from "@/components/core/data-state-indicator"
import { Topbar } from "@/components/topbar"
import { alignTimeSeries, decimateTimeSeries, toEndpointSeries } from "@/lib/adapters/metrics-adapter"
import { config } from "@/lib/config/config"
import { getExperiments, getMetrics } from "@/lib/api"
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
  const [selectedExperiment, setSelectedExperiment] = useState(searchParams.get("id") ?? "")
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getMetrics>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<"active" | "paused" | "disconnected" | "stale">("paused")
  const lastPaintAt = useRef(0)

  useEffect(() => {
    getExperiments()
      .then((data) => {
        setExperiments(data)
        if (!selectedExperiment && data.length > 0) {
          const next = data[0].id
          setSelectedExperiment(next)
          router.replace(`/metrics?id=${next}`)
        }
      })
      .catch((err) => setError(parseError(err).message))
  }, [router, selectedExperiment])

  const fetchMetrics = useCallback(async () => {
    if (!selectedExperiment) return
    try {
      const now = Date.now()
      if (now - lastPaintAt.current < config.CHART_UPDATE_THROTTLE_MS) {
        return
      }
      const data = await getMetrics(selectedExperiment)
      setMetrics({ ...data, intensityHistory: decimateTimeSeries(data.intensityHistory) })
      setError(null)
      lastPaintAt.current = now
    } catch (err) {
      setError(parseError(err).message)
      throw err
    }
  }, [selectedExperiment])

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
  }, [fetchMetrics, selectedExperiment])

  const endpointSeries = useMemo(() => toEndpointSeries(metrics?.endpoints ?? []), [metrics])
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
        <div className="mx-auto max-w-7xl space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-sm text-muted-foreground">Experiment</span>
                  <Select
                    value={selectedExperiment}
                    onValueChange={(value) => {
                      setSelectedExperiment(value)
                      router.replace(`/metrics?id=${value}`)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Select experiment" /></SelectTrigger>
                    <SelectContent>
                      {experiments.length === 0 ? (
                        <SelectItem value="none" disabled>No experiments</SelectItem>
                      ) : (
                        experiments.map((experiment) => (
                          <SelectItem key={experiment.id} value={experiment.id}>{experiment.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <DataStateIndicator state={connectionState === "active" || connectionState === "paused" ? "ready" : connectionState} />
                  <Button variant="outline" className="w-full sm:w-auto" onClick={exportMetrics}><Download className="mr-2 h-4 w-4" />Export</Button>
                </div>
              </div>
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          {!metrics ? (
            <Card>
              <CardContent className="py-12 text-center">
                {!selectedExperiment ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">No experiment selected</p>
                    <p className="text-xs text-muted-foreground">Select an experiment above to view metrics</p>
                  </div>
                ) : experiments.length === 0 ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">No experiments found</p>
                    <p className="text-xs text-muted-foreground">Create an experiment to view metrics</p>
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

              <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Phase-Aligned Intensity</CardTitle>
                    <CardDescription>Throttled updates and decimated points for long sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={alignedSeries}>
                          <XAxis dataKey="label" hide />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line dataKey="baseline" stroke="hsl(var(--info))" dot={false} isAnimationActive={false} name="Baseline" />
                          <Line dataKey="injecting" stroke="hsl(var(--warning))" dot={false} isAnimationActive={false} name="Injecting" />
                          <Line dataKey="recovery" stroke="hsl(var(--success))" dot={false} isAnimationActive={false} name="Recovery" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Endpoint Degradation</CardTitle>
                    <CardDescription>Failures always ranked before recovery and normal states</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {endpointSeries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Metrics empty for selected experiment.</p>
                    ) : (
                      <div className="space-y-2">
                        {endpointSeries
                          .sort((a, b) => Number(b.degraded) - Number(a.degraded) || b.errorRate - a.errorRate)
                          .map((item) => (
                            <div key={item.name} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                              <span className="min-w-0 break-all font-mono text-xs">{item.name}</span>
                              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                                <span className="text-xs text-muted-foreground">P95 {item.latency}ms</span>
                                <span className="text-xs text-muted-foreground">Errors {item.errorRate}%</span>
                                <Badge variant={item.degraded ? "destructive" : "secondary"}>{item.degraded ? "Degraded" : "Healthy"}</Badge>
                              </div>
                            </div>
                          ))}
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
