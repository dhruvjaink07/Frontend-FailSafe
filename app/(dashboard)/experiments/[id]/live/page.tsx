"use client"

import { useEffect, useMemo, useState, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DataStateIndicator } from "@/components/core/data-state-indicator"
import { NetworkBanner } from "@/components/core/network-banner"
import { Topbar } from "@/components/topbar"
import { StatusIndicator } from "@/components/status-indicator"
import {
  getAndroidExperimentStatus,
  getAndroidMetricsReport,
  getBackendExperimentStatus,
  getBackendMetricsReport,
  getExperiments,
  getFrontendExperimentStatus,
  getFrontendMetricsReport,
  stopAndroidExperiment,
  stopBackendExperiment,
  stopFrontendExperiment,
} from "@/lib/api"
import { alignTimeSeries } from "@/lib/adapters/metrics-adapter"
import { parseError } from "@/lib/errors/error-handler"
import { logEvent } from "@/lib/events/event-logger"
import { Poller } from "@/lib/polling/polling-manager"
import { formatRelativeTime, toTimestampMs } from "@/lib/time/time-utils"
import { Download, Square } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type Platform = "frontend" | "backend" | "android"

type LiveExperiment = {
  id: string
  state: "running" | "completed" | "failed"
  phase: "baseline" | "injecting" | "recovering" | "completed"
  faultType: string
  targetType?: string
  targets?: string[]
  durationSeconds?: number
  currentIntensity?: number
  createdAt?: string
  updatedAt?: string
  package?: string
}

type LiveMetrics =
  | { kind: "frontend"; data: Awaited<ReturnType<typeof getFrontendMetricsReport>> }
  | { kind: "backend"; data: Awaited<ReturnType<typeof getBackendMetricsReport>> }
  | { kind: "android"; data: Awaited<ReturnType<typeof getAndroidMetricsReport>> }

export default function LiveExperimentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [platform, setPlatform] = useState<Platform>((searchParams.get("platform") as Platform) || "backend")
  const [experiment, setExperiment] = useState<LiveExperiment | null>(null)
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null)
  const [connection, setConnection] = useState<"active" | "paused" | "disconnected" | "stale">("paused")
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | undefined>(undefined)
  const [stopping, setStopping] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [initialFetchComplete, setInitialFetchComplete] = useState(false)

  useEffect(() => {
    const queryPlatform = searchParams.get("platform") as Platform | null
    if (queryPlatform) {
      setPlatform(queryPlatform)
      return
    }

    getExperiments()
      .then((items) => {
        const found = items.find((item) => item.id === id)
        if (found) setPlatform(found.platform as Platform)
      })
      .catch(() => {
        setPlatform("backend")
      })
  }, [id, searchParams])

  useEffect(() => {
    setInitialFetchComplete(false)
    const fetchCurrent = async () => {
      try {
        if (platform === "frontend") {
          const [statusRes, reportRes] = await Promise.all([
            getFrontendExperimentStatus(id),
            getFrontendMetricsReport(id),
          ])
          setExperiment({
            id: statusRes.experiment.id,
            state: statusRes.experiment.state,
            phase: statusRes.experiment.phase,
            faultType: statusRes.experiment.fault_type,
            targetType: statusRes.experiment.target_type,
            durationSeconds: statusRes.experiment.duration_seconds,
            currentIntensity: statusRes.experiment.current_intensity,
            createdAt: statusRes.experiment.created_at,
            updatedAt: statusRes.experiment.updated_at,
            targets: [],
          })
          setMetrics({ kind: "frontend", data: reportRes })
        } else if (platform === "backend") {
          const [statusRes, reportRes] = await Promise.all([
            getBackendExperimentStatus(id),
            getBackendMetricsReport(id),
          ])
          setExperiment({
            id: statusRes.experiment.id,
            state: statusRes.experiment.state,
            phase: statusRes.experiment.phase,
            faultType: statusRes.experiment.fault_type,
            currentIntensity: statusRes.experiment.current_intensity,
            createdAt: new Date().toISOString(),
            targets: [],
          })
          setMetrics({ kind: "backend", data: reportRes })
        } else {
          const [statusRes, reportRes] = await Promise.all([
            getAndroidExperimentStatus(id),
            getAndroidMetricsReport(id),
          ])
          setExperiment({
            id: statusRes.experiment.id,
            state: statusRes.experiment.state,
            phase: statusRes.experiment.phase,
            faultType: statusRes.experiment.fault_type,
            currentIntensity: statusRes.experiment.current_intensity,
            createdAt: new Date().toISOString(),
            targets: [],
          })
          setMetrics({ kind: "android", data: reportRes })
        }
        setConnection("active")
        setLastUpdatedAt(Date.now())
        setErrorMessage(null)
      } catch (error) {
        const parsed = parseError(error)
        setConnection("disconnected")
        setErrorMessage(parsed.message)
      } finally {
        setInitialFetchComplete(true)
      }
    }

    const poller = new Poller({
      intervalMs: 2000,
      hiddenIntervalMs: 7000,
      onTick: fetchCurrent,
      onStateChange: setConnection,
    })

    fetchCurrent().catch(() => undefined)
    poller.start()

    return () => poller.stop()
  }, [id, platform])

  const dataState = useMemo(() => {
    if (!initialFetchComplete) return "initial_loading" as const
    if (connection === "disconnected") return "disconnected" as const
    if (connection === "stale") return "stale" as const
    if (!experiment || !metrics) return "partial" as const
    return "ready" as const
  }, [connection, experiment, initialFetchComplete, metrics])

  const isActive = experiment ? experiment.state === "running" : false

  const alignedSeries = useMemo(() => {
    if (!metrics) return []

    if (metrics.kind === "frontend") {
      const vitals = metrics.data.vitals
      const baseline = [
        { timestamp: toTimestampMs(Date.now() - 60000), value: vitals.lcp.baseline },
      ]
      const injecting = [
        { timestamp: toTimestampMs(Date.now() - 30000), value: vitals.lcp.injecting },
      ]
      const recovery = [
        { timestamp: toTimestampMs(Date.now()), value: vitals.lcp.recovery },
      ]
      return alignTimeSeries(baseline, injecting, recovery).map((point) => ({
        ...point,
        label: new Date(point.timestamp).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }))
    }

    if (metrics.kind === "backend") {
      const report = metrics.data
      const baseline = [{ timestamp: toTimestampMs(Date.now() - 60000), value: report.baseline_metrics.avg_latency }]
      const injecting = [{ timestamp: toTimestampMs(Date.now() - 30000), value: report.max_impact_metrics.avg_latency }]
      const recovery = [{ timestamp: toTimestampMs(Date.now()), value: report.recovery_metrics.avg_latency }]
      return alignTimeSeries(baseline, injecting, recovery).map((point) => ({
        ...point,
        label: new Date(point.timestamp).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }))
    }

    return []
  }, [metrics])

  const handleStop = async () => {
    if (!experiment) return
    logEvent("experiment_stop_clicked", { experimentId: experiment.id, platform })
    setStopping(true)
    setErrorMessage(null)
    try {
      if (platform === "frontend") {
        await stopFrontendExperiment(experiment.id)
      } else if (platform === "backend") {
        await stopBackendExperiment(experiment.id)
      } else {
        await stopAndroidExperiment(experiment.id)
      }
    } catch (error) {
      const parsed = parseError(error)
      setErrorMessage(parsed.message)
      logEvent("error_occurred", { source: "stop_experiment", message: parsed.message })
    } finally {
      setStopping(false)
    }
  }

  const handleExport = () => {
    const blob = new Blob([
      JSON.stringify(
        {
          platform,
          experiment,
          metrics,
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    ])
    const href = URL.createObjectURL(blob)
    const element = document.createElement("a")
    element.href = href
    element.download = `experiment-${id}-report.json`
    element.click()
    URL.revokeObjectURL(href)
  }

  if (!experiment && dataState === "initial_loading") {
    return (
      <div className="flex min-h-screen flex-col">
        <Topbar title="Loading live session" description="Initializing experiment session" />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!experiment) {
    return (
      <div className="flex min-h-screen flex-col">
        <Topbar title="Experiment Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-muted-foreground">Experiment not found or expired.</p>
          <Button onClick={() => router.push("/experiments")}>Back to experiments</Button>
        </div>
      </div>
    )
  }

  const chartTitle = platform === "frontend" ? "Frontend LCP by Phase" : platform === "backend" ? "Backend Latency by Phase" : "Android Session Timeline"

  return (
    <div className="flex min-h-screen flex-col">
      <NetworkBanner online={connection !== "disconnected"} />
      <Topbar title={`Live: ${experiment.id}`} description="Platform-specific monitoring" />

      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <span>Runtime State</span>
                    <DataStateIndicator state={dataState} />
                  </CardTitle>
                  <CardDescription>
                    {lastUpdatedAt ? `Last update ${formatRelativeTime(lastUpdatedAt)}` : "Awaiting first data frame"}
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export JSON
                  </Button>
                  {isActive && (
                    <Button variant="destructive" className="w-full sm:w-auto" onClick={handleStop} disabled={stopping}>
                      <Square className="mr-2 h-4 w-4" />
                      {stopping ? "Stopping..." : "Stop"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <StatusIndicator status={experiment.phase} showLabel />
                <Badge variant="outline" className="capitalize">{platform}</Badge>
                <Badge variant="outline">Fault: {experiment.faultType}</Badge>
                <Badge variant="outline">State: {experiment.state}</Badge>
              </div>
              {typeof experiment.currentIntensity === "number" && typeof (experiment as { maxIntensity?: number }).maxIntensity === "number" && (
                <>
                  <Progress value={(experiment.currentIntensity / Math.max(1, (experiment as { maxIntensity?: number }).maxIntensity ?? 100)) * 100} />
                  <p className="text-sm text-muted-foreground">
                    Current intensity {experiment.currentIntensity}%
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{chartTitle}</CardTitle>
                <CardDescription>Phase-aligned lifecycle series</CardDescription>
              </CardHeader>
              <CardContent>
                {alignedSeries.length ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={alignedSeries}>
                        <XAxis dataKey="label" hide />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="baseline" stroke="hsl(var(--info))" dot={false} isAnimationActive={false} name="Baseline" />
                        <Line type="monotone" dataKey="injecting" stroke="hsl(var(--warning))" dot={false} isAnimationActive={false} name="Injecting" />
                        <Line type="monotone" dataKey="recovery" stroke="hsl(var(--success))" dot={false} isAnimationActive={false} name="Recovery" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {platform === "android" ? "Android metrics report available after execution" : "No timeline data yet"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report Summary</CardTitle>
                <CardDescription>Platform-specific verified response data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!metrics ? (
                  <p className="text-sm text-muted-foreground">Partial data. Waiting for metrics snapshot.</p>
                ) : metrics.kind === "frontend" ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">FailSafe Score</p>
                        <p className="text-xl font-semibold">{metrics.data.failsafe_index.score}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-xl font-semibold capitalize">{metrics.data.failsafe_index.status}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{metrics.data.failsafe_index.summary}</p>
                  </>
                ) : metrics.kind === "backend" ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Degradation Factor</p>
                        <p className="text-xl font-semibold">{metrics.data.insights.degradation_factor}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Recovery Time</p>
                        <p className="text-xl font-semibold">{metrics.data.insights.recovery_time_seconds}s</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Critical Endpoints</p>
                        <p className="text-xl font-semibold">{metrics.data.insights.critical_endpoints.length}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {metrics.data.insights.critical_endpoints.join(", ") || "No critical endpoints reported."}
                    </p>
                  </>
                ) : (
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-muted-foreground">{JSON.stringify(metrics.data, null, 2)}</pre>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
