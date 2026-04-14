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
import { Download, Gauge, Square } from "lucide-react"
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
  maxIntensity?: number
  maxStableIntensity?: number
  breakingIntensity?: number
  createdAt?: string
  updatedAt?: string
  package?: string
}

type LiveMetrics =
  | { kind: "frontend"; data: Awaited<ReturnType<typeof getFrontendMetricsReport>> }
  | { kind: "backend"; data: Awaited<ReturnType<typeof getBackendMetricsReport>> }
  | { kind: "android"; data: Awaited<ReturnType<typeof getAndroidMetricsReport>> }

type FrontendMetricSample = {
  phase: string
  metrics?: {
    lcp?: number
    cls?: number
    inp?: number
    long_tasks?: number
    errors?: number
    unhandled_rejections?: number
  }
  api_calls?: Array<{
    url?: string
    duration?: number
    status?: number
  }>
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function phaseToKey(phase: string): "baseline" | "injecting" | "recovery" {
  const value = phase.toLowerCase()
  if (value === "injecting") return "injecting"
  if (value === "recovery" || value === "recovering" || value === "completed") return "recovery"
  return "baseline"
}

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function normalizeFrontendMetrics(source: unknown) {
  const root = asRecord(source)
  const failsafeIndex = asRecord(root.failsafe_index)
  const frontendScore = asRecord(root.frontend_score)
  const vitals = asRecord(root.vitals)
  const stability = asRecord(root.stability)
  const apiQuality = asRecord(root.api_quality)
  const sampleArray = Array.isArray(root.frontend)
    ? root.frontend.filter((item): item is FrontendMetricSample => Boolean(item && typeof item === "object"))
    : []

  const phaseBuckets: Record<"baseline" | "injecting" | "recovery", FrontendMetricSample[]> = {
    baseline: [],
    injecting: [],
    recovery: [],
  }

  for (const sample of sampleArray) {
    phaseBuckets[phaseToKey(sample.phase)].push(sample)
  }

  const lcp = {
    baseline: average(phaseBuckets.baseline.map((sample) => safeNumber(sample.metrics?.lcp))),
    injecting: average(phaseBuckets.injecting.map((sample) => safeNumber(sample.metrics?.lcp))),
    recovery: average(phaseBuckets.recovery.map((sample) => safeNumber(sample.metrics?.lcp))),
  }

  const cls = {
    baseline: average(phaseBuckets.baseline.map((sample) => safeNumber(sample.metrics?.cls))),
    injecting: average(phaseBuckets.injecting.map((sample) => safeNumber(sample.metrics?.cls))),
    recovery: average(phaseBuckets.recovery.map((sample) => safeNumber(sample.metrics?.cls))),
  }

  const inp = {
    baseline: average(phaseBuckets.baseline.map((sample) => safeNumber(sample.metrics?.inp))),
    injecting: average(phaseBuckets.injecting.map((sample) => safeNumber(sample.metrics?.inp))),
    recovery: average(phaseBuckets.recovery.map((sample) => safeNumber(sample.metrics?.inp))),
  }

  const longTasks = {
    baseline: average(phaseBuckets.baseline.map((sample) => safeNumber(sample.metrics?.long_tasks))),
    injecting: average(phaseBuckets.injecting.map((sample) => safeNumber(sample.metrics?.long_tasks))),
    recovery: average(phaseBuckets.recovery.map((sample) => safeNumber(sample.metrics?.long_tasks))),
  }

  const jsErrors = {
    baseline: average(phaseBuckets.baseline.map((sample) => safeNumber(sample.metrics?.errors))),
    injecting: average(phaseBuckets.injecting.map((sample) => safeNumber(sample.metrics?.errors))),
    recovery: average(phaseBuckets.recovery.map((sample) => safeNumber(sample.metrics?.errors))),
  }

  const unhandledRejections = {
    baseline: average(phaseBuckets.baseline.map((sample) => safeNumber(sample.metrics?.unhandled_rejections))),
    injecting: average(phaseBuckets.injecting.map((sample) => safeNumber(sample.metrics?.unhandled_rejections))),
    recovery: average(phaseBuckets.recovery.map((sample) => safeNumber(sample.metrics?.unhandled_rejections))),
  }

  const allApiCalls = sampleArray.flatMap((sample) =>
    Array.isArray(sample.api_calls) ? sample.api_calls : [],
  )

  const phaseApiCalls = {
    baseline: phaseBuckets.baseline.flatMap((sample) => (Array.isArray(sample.api_calls) ? sample.api_calls : [])),
    injecting: phaseBuckets.injecting.flatMap((sample) => (Array.isArray(sample.api_calls) ? sample.api_calls : [])),
    recovery: phaseBuckets.recovery.flatMap((sample) => (Array.isArray(sample.api_calls) ? sample.api_calls : [])),
  }

  const phaseApiLatency = {
    baseline: average(phaseApiCalls.baseline.map((call) => safeNumber(call.duration))),
    injecting: average(phaseApiCalls.injecting.map((call) => safeNumber(call.duration))),
    recovery: average(phaseApiCalls.recovery.map((call) => safeNumber(call.duration))),
  }

  const phaseApiErrors = {
    baseline: phaseApiCalls.baseline.filter((call) => {
      const status = safeNumber(call.status, -1)
      return status === 0 || status >= 400 || status < 0
    }).length,
    injecting: phaseApiCalls.injecting.filter((call) => {
      const status = safeNumber(call.status, -1)
      return status === 0 || status >= 400 || status < 0
    }).length,
    recovery: phaseApiCalls.recovery.filter((call) => {
      const status = safeNumber(call.status, -1)
      return status === 0 || status >= 400 || status < 0
    }).length,
  }
  const successfulCalls = allApiCalls.filter((call) => {
    const status = safeNumber(call.status, -1)
    return status >= 200 && status < 400
  })
  const failedCalls = allApiCalls.filter((call) => {
    const status = safeNumber(call.status, -1)
    return status === 0 || status >= 400 || status < 0
  })

  const computedApiQuality = {
    successRate: allApiCalls.length ? (successfulCalls.length / allApiCalls.length) * 100 : 0,
    avgLatency: average(allApiCalls.map((call) => safeNumber(call.duration))),
    errorCount: failedCalls.length,
  }

  const fallbackLcp = {
    baseline: safeNumber(asRecord(vitals.lcp).baseline),
    injecting: safeNumber(asRecord(vitals.lcp).injecting),
    recovery: safeNumber(asRecord(vitals.lcp).recovery),
  }

  const phaseSeries = [
    {
      phase: "baseline",
      label: "Baseline",
      lcp: sampleArray.length > 0 ? lcp.baseline : fallbackLcp.baseline,
      cls: cls.baseline,
      inp: inp.baseline,
      longTasks: longTasks.baseline,
      jsErrors: jsErrors.baseline,
      unhandledRejections: unhandledRejections.baseline,
      apiLatency: phaseApiLatency.baseline,
      apiErrors: phaseApiErrors.baseline,
    },
    {
      phase: "injecting",
      label: "Injecting",
      lcp: sampleArray.length > 0 ? lcp.injecting : fallbackLcp.injecting,
      cls: cls.injecting,
      inp: inp.injecting,
      longTasks: longTasks.injecting,
      jsErrors: jsErrors.injecting,
      unhandledRejections: unhandledRejections.injecting,
      apiLatency: phaseApiLatency.injecting,
      apiErrors: phaseApiErrors.injecting,
    },
    {
      phase: "recovery",
      label: "Recovery",
      lcp: sampleArray.length > 0 ? lcp.recovery : fallbackLcp.recovery,
      cls: cls.recovery,
      inp: inp.recovery,
      longTasks: longTasks.recovery,
      jsErrors: jsErrors.recovery,
      unhandledRejections: unhandledRejections.recovery,
      apiLatency: phaseApiLatency.recovery,
      apiErrors: phaseApiErrors.recovery,
    },
  ]

  return {
    hasSamples: sampleArray.length > 0,
    sampleCount: sampleArray.length,
    apiCallCount: allApiCalls.length,
    lcp: sampleArray.length > 0 ? lcp : fallbackLcp,
    cls,
    inp,
    longTasks,
    jsErrors,
    unhandledRejections,
    apiQuality: {
      successRate:
        sampleArray.length > 0
          ? computedApiQuality.successRate
          : safeNumber(apiQuality.success_rate),
      avgLatency:
        sampleArray.length > 0
          ? computedApiQuality.avgLatency
          : safeNumber(apiQuality.avg_latency),
      errorCount:
        sampleArray.length > 0
          ? computedApiQuality.errorCount
          : safeNumber(apiQuality.error_count),
    },
    failsafe: {
      score: safeNumber(failsafeIndex.score, safeNumber(frontendScore.score, 0)),
      status:
        typeof failsafeIndex.status === "string"
          ? failsafeIndex.status
          : typeof frontendScore.status === "string"
            ? frontendScore.status
            : "unknown",
      summary:
        typeof failsafeIndex.summary === "string"
          ? failsafeIndex.summary
          : "Frontend score generated from latest metrics payload.",
    },
    raw: root,
    phaseSeries,
    legacyStability: stability,
  }
}

function readNestedRecord(source: unknown, key: string): Record<string, unknown> {
  const root = asRecord(source)
  const direct = asRecord(root[key])
  if (Object.keys(direct).length) return direct

  const experiment = asRecord(root.experiment)
  const fromExperiment = asRecord(experiment[key])
  if (Object.keys(fromExperiment).length) return fromExperiment

  const statusPayload = asRecord(root.status_payload)
  const fromStatus = asRecord(statusPayload[key])
  if (Object.keys(fromStatus).length) return fromStatus

  const raw = asRecord(root.raw)
  const fromRaw = asRecord(raw[key])
  if (Object.keys(fromRaw).length) return fromRaw

  return {}
}

function normalizeBackendMetrics(source: unknown) {
  const root = asRecord(source)
  const experiment = asRecord(root.experiment)
  const aggregateStats = asRecord(root.aggregate_stats)
  const baselineNode = readNestedRecord(source, "baseline_metrics")
  const impactNode = readNestedRecord(source, "max_impact_metrics")
  const recoveryNode = readNestedRecord(source, "recovery_metrics")
  const insightsNode = readNestedRecord(source, "insights")

  const baselineAvg = safeNumber(baselineNode.avg_latency ?? baselineNode.AvgLatency)
  const impactAvg = safeNumber(impactNode.avg_latency ?? impactNode.AvgLatency)
  const recoveryAvg = safeNumber(recoveryNode.avg_latency ?? recoveryNode.AvgLatency)

  const baselineP95 = safeNumber(baselineNode.p95 ?? baselineNode.P95)
  const impactP95 = safeNumber(impactNode.p95 ?? impactNode.P95)
  const recoveryP95 = safeNumber(recoveryNode.p95 ?? recoveryNode.P95)

  const baselineErrorRate = safeNumber(baselineNode.error_rate ?? baselineNode.ErrorRate)
  const impactErrorRate = safeNumber(impactNode.error_rate ?? impactNode.ErrorRate)
  const recoveryErrorRate = safeNumber(recoveryNode.error_rate ?? recoveryNode.ErrorRate)

  const degradationFactor = safeNumber(insightsNode.degradation_factor ?? root.blast_radius_percent)
  const recoveryTimeSeconds = safeNumber(insightsNode.recovery_time_seconds)
  const criticalEndpoints = safeStringArray(insightsNode.critical_endpoints)

  const totalRequests = safeNumber(root.total_requests)
  const observedEndpoints = safeStringArray(experiment.observed_endpoints)
  const totalEndpoints = safeNumber(root.total_endpoints, observedEndpoints.length)
  const systemSeverity =
    typeof root.system_severity === "string"
      ? root.system_severity
      : typeof aggregateStats.system_severity === "string"
        ? String(aggregateStats.system_severity)
        : ""

  return {
    baselineAvg,
    impactAvg,
    recoveryAvg,
    baselineP95,
    impactP95,
    recoveryP95,
    baselineErrorRate,
    impactErrorRate,
    recoveryErrorRate,
    degradationFactor,
    recoveryTimeSeconds,
    criticalEndpoints,
    totalRequests,
    totalEndpoints,
    systemSeverity,
  }
}

function hasBackendMetricsSnapshot(source: unknown): boolean {
  const root = asRecord(source)
  const experiment = asRecord(root.experiment)
  const aggregateStats = asRecord(root.aggregate_stats)
  const baselineNode = readNestedRecord(source, "baseline_metrics")
  const impactNode = readNestedRecord(source, "max_impact_metrics")
  const recoveryNode = readNestedRecord(source, "recovery_metrics")
  const insightsNode = readNestedRecord(source, "insights")

  const hasTimingData =
    typeof baselineNode.avg_latency === "number" ||
    typeof baselineNode.AvgLatency === "number" ||
    typeof impactNode.avg_latency === "number" ||
    typeof impactNode.AvgLatency === "number" ||
    typeof recoveryNode.avg_latency === "number" ||
    typeof recoveryNode.AvgLatency === "number"

  const hasInsights =
    typeof insightsNode.degradation_factor === "number" ||
    typeof insightsNode.recovery_time_seconds === "number"

  const hasAggregateSummary =
    typeof root.blast_radius_percent === "number" ||
    typeof root.cascade_depth === "number" ||
    typeof root.total_requests === "number" ||
    typeof root.total_endpoints === "number" ||
    typeof root.system_severity === "string" ||
    typeof experiment.current_intensity === "number" ||
    Array.isArray(experiment.intensity_history) ||
    Object.keys(aggregateStats).length > 0

  return hasTimingData || hasInsights || hasAggregateSummary
}

function normalizeEndpointName(endpoint: string): string {
  return endpoint.replace(/^"+|"+$/g, "")
}

type BackendEndpointMetricRow = {
  endpoint: string
  requestsTotal: number
  p50: number
  p95: number
  p99: number
  avg: number
  errorRate: number
  degraded: boolean
}

function pickNumber(record: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return fallback
}

function pickString(record: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return fallback
}

function pickBoolean(record: Record<string, unknown>, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true
      if (value.toLowerCase() === "false") return false
    }
  }
  return fallback
}

function normalizeBackendEndpointRows(source: unknown): BackendEndpointMetricRow[] {
  const root = asRecord(source)
  const statusPayload = asRecord(root.status_payload)
  const raw = asRecord(root.raw)

  const arrays: unknown[] = [
    root.metrics_aggregated,
    root.endpoints,
    root.aggregated_metrics,
    statusPayload.metrics_aggregated,
    statusPayload.endpoints,
    raw.metrics_aggregated,
    raw.endpoints,
    raw.aggregated_metrics,
  ]

  const firstArray = arrays.find((value) => Array.isArray(value))
  if (Array.isArray(firstArray)) {
    return firstArray
      .map((item, index) => {
        const record = asRecord(item)
        const endpoint = pickString(record, ["endpoint", "path", "name"], `endpoint-${index + 1}`)

        return {
          endpoint,
          requestsTotal: pickNumber(record, ["requests_total", "requestsTotal", "total_requests"]),
          p50: pickNumber(record, ["p50_ms", "p50", "latency_p50"]),
          p95: pickNumber(record, ["p95_ms", "p95", "latency_p95"]),
          p99: pickNumber(record, ["p99_ms", "p99", "latency_p99"]),
          avg: pickNumber(record, ["avg_ms", "avg", "avg_latency"]),
          errorRate: pickNumber(record, ["error_rate", "errorRate"]),
          degraded: pickBoolean(record, ["degraded", "is_degraded"]),
        }
      })
      .filter((row) => row.endpoint.length > 0)
      .sort((a, b) => {
        if (a.degraded !== b.degraded) return a.degraded ? -1 : 1
        if (a.errorRate !== b.errorRate) return b.errorRate - a.errorRate
        return b.p95 - a.p95
      })
  }

  const endpointObject = asRecord(root.endpoints)
  const fromEndpointObject = Object.entries(endpointObject)
    .map(([endpoint, value]) => {
      const record = asRecord(value)
      return {
        endpoint: normalizeEndpointName(endpoint),
        requestsTotal: pickNumber(record, ["requests_total", "requestsTotal", "count"]),
        p50: pickNumber(record, ["p50_ms", "p50", "latency_p50"]),
        p95: pickNumber(record, ["p95_ms", "p95", "latency_p95"]),
        p99: pickNumber(record, ["p99_ms", "p99", "latency_p99"]),
        avg: pickNumber(record, ["avg_ms", "avg", "latency_avg", "avg_latency"]),
        errorRate: pickNumber(record, ["error_rate", "errorRate"]),
        degraded: pickBoolean(record, ["degraded", "is_degraded"]),
      }
    })
    .sort((a, b) => {
      if (a.degraded !== b.degraded) return a.degraded ? -1 : 1
      if (a.errorRate !== b.errorRate) return b.errorRate - a.errorRate
      return b.p95 - a.p95
    })

  if (fromEndpointObject.length > 0) return fromEndpointObject

  const experiment = asRecord(root.experiment)
  const observed = safeStringArray(experiment.observed_endpoints)
  return observed.map((endpoint) => ({
    endpoint: normalizeEndpointName(endpoint),
    requestsTotal: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    avg: 0,
    errorRate: 0,
    degraded: false,
  }))
}

function getBackendRuntimeSeries(source: unknown): Array<{ timestamp: number; baseline?: number; injecting?: number; recovery?: number }> {
  const root = asRecord(source)
  const experiment = asRecord(root.experiment)
  const intensityHistory = Array.isArray(experiment.intensity_history)
    ? experiment.intensity_history.filter((value): value is number => typeof value === "number")
    : []

  if (intensityHistory.length === 0) return []

  const now = Date.now()
  const stepMs = 10000
  const firstPointAt = now - (intensityHistory.length - 1) * stepMs

  const baseline = [{ timestamp: toTimestampMs(firstPointAt - stepMs), value: 0 }]
  const injecting = intensityHistory.map((value, index) => ({
    timestamp: toTimestampMs(firstPointAt + index * stepMs),
    value,
  }))

  const state = typeof experiment.state === "string" ? experiment.state : ""
  const recovery = state === "completed" || state === "failed"
    ? [{ timestamp: toTimestampMs(now), value: safeNumber(experiment.current_intensity, intensityHistory[intensityHistory.length - 1] ?? 0) }]
    : []

  return alignTimeSeries(baseline, injecting, recovery)
}

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
        let nextExperiment: LiveExperiment | null = null

        if (platform === "frontend") {
          const statusRes = await getFrontendExperimentStatus(id)
          nextExperiment = {
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
          }
          setExperiment(nextExperiment)

          try {
            const reportRes = await getFrontendMetricsReport(id)
            setMetrics({ kind: "frontend", data: reportRes })
          } catch (metricsError) {
            console.warn("⚠️ Frontend metrics not ready yet:", metricsError)
          }
        } else if (platform === "backend") {
          const statusRes = await getBackendExperimentStatus(id)
          const statusRecord = statusRes as unknown as Record<string, unknown>
          const statusExperiment = asRecord((statusRecord as { experiment?: unknown }).experiment)
          console.log("📡 Backend status response:", statusRes)
          nextExperiment = {
            id: statusRes.experiment.id,
            state: statusRes.experiment.state,
            phase: statusRes.experiment.phase,
            faultType: statusRes.experiment.fault_type,
            currentIntensity: statusRes.experiment.current_intensity,
            maxIntensity: safeNumber(statusExperiment.max_intensity, 100),
            maxStableIntensity: safeNumber(statusExperiment.max_stable_intensity),
            breakingIntensity: safeNumber(statusExperiment.breaking_intensity),
            createdAt: typeof statusExperiment.created_at === "string" ? statusExperiment.created_at : new Date().toISOString(),
            updatedAt: typeof statusExperiment.updated_at === "string" ? statusExperiment.updated_at : undefined,
            targets: safeStringArray(statusExperiment.targets),
          }
          setExperiment(nextExperiment)
          setMetrics({ kind: "backend", data: statusRes as unknown as Awaited<ReturnType<typeof getBackendMetricsReport>> })

          if (statusRes.experiment.state === "completed" || statusRes.experiment.state === "failed") {
            try {
              const reportRes = await getBackendMetricsReport(id)
              console.log("📊 Backend metrics response:", reportRes)
              const merged = {
                ...(statusRes as unknown as Record<string, unknown>),
                ...(reportRes as unknown as Record<string, unknown>),
              }
              setMetrics({ kind: "backend", data: merged as Awaited<ReturnType<typeof getBackendMetricsReport>> })
            } catch (metricsError) {
              console.warn("⚠️ Backend metrics not ready yet:", metricsError)
            }
          }
        } else {
          const statusRes = await getAndroidExperimentStatus(id)
          nextExperiment = {
            id: statusRes.experiment.id,
            state: statusRes.experiment.state,
            phase: statusRes.experiment.phase,
            faultType: statusRes.experiment.fault_type,
            currentIntensity: statusRes.experiment.current_intensity,
            createdAt: new Date().toISOString(),
            targets: [],
          }
          setExperiment(nextExperiment)

          try {
            const reportRes = await getAndroidMetricsReport(id)
            setMetrics({ kind: "android", data: reportRes })
          } catch (metricsError) {
            console.warn("⚠️ Android metrics not ready yet:", metricsError)
          }
        }
        setConnection("active")
        setLastUpdatedAt(Date.now())
        setErrorMessage(null)
      } catch (error) {
        const parsed = parseError(error)
        console.error("❌ Polling error:", parsed.message, error)
        setConnection("disconnected")
        setErrorMessage(parsed.message)
      } finally {
        setInitialFetchComplete(true)
      }
    }

    const poller = new Poller({
      intervalMs: 3500,
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
  const backendMetricsReady = metrics?.kind === "backend" && hasBackendMetricsSnapshot(metrics.data)
  const frontendMetricsModel = useMemo(
    () => (metrics?.kind === "frontend" ? normalizeFrontendMetrics(metrics.data) : null),
    [metrics],
  )

  const alignedSeries = useMemo(() => {
    if (!metrics) return []

    if (metrics.kind === "frontend") {
      const frontend = frontendMetricsModel
      if (!frontend) return []
      const lcp = frontend.lcp
      const baseline = [
        { timestamp: toTimestampMs(Date.now() - 60000), value: safeNumber(lcp.baseline) },
      ]
      const injecting = [
        { timestamp: toTimestampMs(Date.now() - 30000), value: safeNumber(lcp.injecting) },
      ]
      const recovery = [
        { timestamp: toTimestampMs(Date.now()), value: safeNumber(lcp.recovery) },
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
      const runtimeSeries = getBackendRuntimeSeries(metrics.data)
      if (runtimeSeries.length > 0) {
        return runtimeSeries.map((point) => ({
          ...point,
          label: new Date(point.timestamp).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        }))
      }

      const report = normalizeBackendMetrics(metrics.data)
      const baseline = [{ timestamp: toTimestampMs(Date.now() - 60000), value: report.baselineAvg }]
      const injecting = [{ timestamp: toTimestampMs(Date.now() - 30000), value: report.impactAvg }]
      const recovery = [{ timestamp: toTimestampMs(Date.now()), value: report.recoveryAvg }]
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
  }, [frontendMetricsModel, metrics])

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

  const chartTitle = platform === "frontend" ? "Frontend Metrics by Phase" : platform === "backend" ? "Backend Latency by Phase" : "Android Session Timeline"

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
                  {platform === "backend" && (
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push(`/metrics?id=${id}`)}>
                      <Gauge className="mr-2 h-4 w-4" />
                      Open Metrics
                    </Button>
                  )}
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
                {platform === "frontend" && frontendMetricsModel ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground">LCP</p>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={frontendMetricsModel.phaseSeries}>
                            <XAxis dataKey="label" fontSize={11} />
                            <YAxis width={36} />
                            <Tooltip />
                            <Line type="monotone" dataKey="lcp" stroke="hsl(var(--info))" dot={{ r: 3 }} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground">CLS</p>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={frontendMetricsModel.phaseSeries}>
                            <XAxis dataKey="label" fontSize={11} />
                            <YAxis width={36} />
                            <Tooltip />
                            <Line type="monotone" dataKey="cls" stroke="hsl(var(--warning))" dot={{ r: 3 }} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground">INP</p>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={frontendMetricsModel.phaseSeries}>
                            <XAxis dataKey="label" fontSize={11} />
                            <YAxis width={36} />
                            <Tooltip />
                            <Line type="monotone" dataKey="inp" stroke="hsl(var(--success))" dot={{ r: 3 }} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground">API Latency</p>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={frontendMetricsModel.phaseSeries}>
                            <XAxis dataKey="label" fontSize={11} />
                            <YAxis width={36} />
                            <Tooltip />
                            <Line type="monotone" dataKey="apiLatency" stroke="hsl(var(--primary))" dot={{ r: 3 }} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border p-3 md:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Stability and Errors</p>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={frontendMetricsModel.phaseSeries}>
                            <XAxis dataKey="label" fontSize={11} />
                            <YAxis width={36} />
                            <Tooltip />
                            <Line type="monotone" dataKey="longTasks" stroke="hsl(var(--warning))" dot={{ r: 3 }} isAnimationActive={false} name="Long Tasks" />
                            <Line type="monotone" dataKey="jsErrors" stroke="hsl(var(--destructive))" dot={{ r: 3 }} isAnimationActive={false} name="JS Errors" />
                            <Line type="monotone" dataKey="unhandledRejections" stroke="hsl(var(--info))" dot={{ r: 3 }} isAnimationActive={false} name="Unhandled Rejections" />
                            <Line type="monotone" dataKey="apiErrors" stroke="hsl(var(--muted-foreground))" dot={{ r: 3 }} isAnimationActive={false} name="API Errors" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : alignedSeries.length ? (
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
                    {(() => {
                      const frontend = frontendMetricsModel ?? normalizeFrontendMetrics(metrics.data)
                      return (
                        <>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">FailSafe Score</p>
                              <p className="text-xl font-semibold">{frontend.failsafe.score.toFixed(2)}</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Status</p>
                              <p className="text-xl font-semibold capitalize">{frontend.failsafe.status}</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Collected Samples</p>
                              <p className="text-xl font-semibold">{frontend.sampleCount}</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Observed API Calls</p>
                              <p className="text-xl font-semibold">{frontend.apiCallCount}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">LCP (B / I / R)</p>
                              <p className="text-lg font-semibold">
                                {frontend.lcp.baseline.toFixed(2)} / {frontend.lcp.injecting.toFixed(2)} / {frontend.lcp.recovery.toFixed(2)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">CLS (B / I / R)</p>
                              <p className="text-lg font-semibold">
                                {frontend.cls.baseline.toFixed(4)} / {frontend.cls.injecting.toFixed(4)} / {frontend.cls.recovery.toFixed(4)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">INP (B / I / R)</p>
                              <p className="text-lg font-semibold">
                                {frontend.inp.baseline.toFixed(2)} / {frontend.inp.injecting.toFixed(2)} / {frontend.inp.recovery.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Success Rate</p>
                              <p className="text-lg font-semibold">{frontend.apiQuality.successRate.toFixed(2)}%</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Average API Latency</p>
                              <p className="text-lg font-semibold">{frontend.apiQuality.avgLatency.toFixed(2)}ms</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">API Errors</p>
                              <p className="text-lg font-semibold">{frontend.apiQuality.errorCount}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Long Tasks (B / I / R)</p>
                              <p className="text-lg font-semibold">
                                {frontend.longTasks.baseline.toFixed(2)} / {frontend.longTasks.injecting.toFixed(2)} / {frontend.longTasks.recovery.toFixed(2)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">JS Errors (B / I / R)</p>
                              <p className="text-lg font-semibold">
                                {frontend.jsErrors.baseline.toFixed(2)} / {frontend.jsErrors.injecting.toFixed(2)} / {frontend.jsErrors.recovery.toFixed(2)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Unhandled Rejections (B / I / R)</p>
                              <p className="text-lg font-semibold">
                                {frontend.unhandledRejections.baseline.toFixed(2)} / {frontend.unhandledRejections.injecting.toFixed(2)} / {frontend.unhandledRejections.recovery.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">{frontend.failsafe.summary}</p>

                          {!frontend.hasSamples && (
                            <p className="text-sm text-warning">
                              Frontend samples are empty. Run the frontend collector with this experiment ID to populate LCP/CLS/INP metrics.
                            </p>
                          )}
                        </>
                      )
                    })()}
                  </>
                ) : metrics.kind === "backend" ? (
                  <>
                    {!backendMetricsReady ? (
                      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                        Waiting for backend metrics payload.
                      </div>
                    ) : (() => {
                      const backend = normalizeBackendMetrics(metrics.data)
                      const endpointRows = normalizeBackendEndpointRows(metrics.data)
                      return (
                        <>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Current Intensity</p>
                              <p className="text-xl font-semibold">{experiment.currentIntensity ?? 0}%</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Max Stable Intensity</p>
                              <p className="text-xl font-semibold">{experiment.maxStableIntensity ?? 0}%</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Breaking Intensity</p>
                              <p className="text-xl font-semibold">{experiment.breakingIntensity ?? 0}%</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Degradation Factor</p>
                              <p className="text-xl font-semibold">{backend.degradationFactor}</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Recovery Time</p>
                              <p className="text-xl font-semibold">{backend.recoveryTimeSeconds}s</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Critical Endpoints</p>
                              <p className="text-xl font-semibold">{backend.criticalEndpoints.length}</p>
                            </div>
                          </div>
                          {(backend.totalRequests > 0 || backend.totalEndpoints > 0 || backend.systemSeverity) && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="rounded-lg border border-border p-3">
                                <p className="text-xs text-muted-foreground">Total Requests</p>
                                <p className="text-xl font-semibold">{backend.totalRequests}</p>
                              </div>
                              <div className="rounded-lg border border-border p-3">
                                <p className="text-xs text-muted-foreground">Total Endpoints</p>
                                <p className="text-xl font-semibold">{backend.totalEndpoints}</p>
                              </div>
                              <div className="rounded-lg border border-border p-3">
                                <p className="text-xs text-muted-foreground">System Severity</p>
                                <p className="text-xl font-semibold capitalize">{backend.systemSeverity || "unknown"}</p>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Baseline P95 / Error</p>
                              <p className="text-lg font-semibold">{backend.baselineP95}ms / {backend.baselineErrorRate}</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Impact P95 / Error</p>
                              <p className="text-lg font-semibold">{backend.impactP95}ms / {backend.impactErrorRate}</p>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <p className="text-xs text-muted-foreground">Recovery P95 / Error</p>
                              <p className="text-lg font-semibold">{backend.recoveryP95}ms / {backend.recoveryErrorRate}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {backend.criticalEndpoints.join(", ") || "No critical endpoints reported."}
                          </p>
                          {endpointRows.length > 0 && (
                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Endpoint</th>
                                    <th className="px-3 py-2 text-right">Requests</th>
                                    <th className="px-3 py-2 text-right">P50</th>
                                    <th className="px-3 py-2 text-right">P95</th>
                                    <th className="px-3 py-2 text-right">P99</th>
                                    <th className="px-3 py-2 text-right">Avg</th>
                                    <th className="px-3 py-2 text-right">Error Rate</th>
                                    <th className="px-3 py-2 text-right">Degraded</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpointRows.map((row) => (
                                    <tr key={row.endpoint} className="border-t border-border/60">
                                      <td className="px-3 py-2 font-mono text-xs sm:text-sm">{row.endpoint}</td>
                                      <td className="px-3 py-2 text-right">{row.requestsTotal}</td>
                                      <td className="px-3 py-2 text-right">{row.p50}</td>
                                      <td className="px-3 py-2 text-right">{row.p95}</td>
                                      <td className="px-3 py-2 text-right">{row.p99}</td>
                                      <td className="px-3 py-2 text-right">{row.avg}</td>
                                      <td className="px-3 py-2 text-right">{row.errorRate}</td>
                                      <td className="px-3 py-2 text-right">{row.degraded ? "yes" : "no"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )
                    })()}
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
