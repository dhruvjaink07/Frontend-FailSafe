import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

type BackendMetrics = {
  blast_radius_percent?: number
  cascade_depth?: number
  system_severity?: string
  total_requests?: number
  total_endpoints?: number
  resilience_threshold?: {
    intensity_steps?: number[]
    max_stable_intensity?: number
    breaking_intensity?: number
  }
  endpoints?: Record<
    string,
    {
      degraded?: boolean
      requests_total?: number
      latency?: { avg_ms?: number; p50_ms?: number; p95_ms?: number; p99_ms?: number; jitter_ms?: number; stddev_ms?: number }
      errors?: { total?: number; max_failure_streak?: number; rate_percent?: number }
      impact_order?: number
      stability_score?: number
      container?: { avg_cpu_percent?: number; avg_memory_mb?: number }
    }
  >
  baseline_metrics?: { avg_latency?: number; error_rate?: number }
  max_impact_metrics?: { avg_latency?: number; error_rate?: number }
  recovery_metrics?: { avg_latency?: number; error_rate?: number }
  insights?: { degradation_factor?: number }
}

function normalizeSeverity(value: unknown): "low" | "medium" | "high" | "critical" | "isolated" | "unknown" {
  const severity = typeof value === "string" ? value.toLowerCase() : ""
  if (severity === "critical" || severity === "high" || severity === "medium" || severity === "low") return severity
  if (severity === "isolated") return "isolated"
  return "unknown"
}

function normalizeEndpointName(endpoint: string): string {
  return endpoint.replace(/^"+|"+$/g, "")
}

function mapBackendMetrics(payload: BackendMetrics) {
  const steps = Array.isArray(payload.resilience_threshold?.intensity_steps)
    ? payload.resilience_threshold?.intensity_steps ?? []
    : []

  const baseline = payload.baseline_metrics?.avg_latency ?? 0
  const injecting = payload.max_impact_metrics?.avg_latency ?? 0
  const recovery = payload.recovery_metrics?.avg_latency ?? 0

  const endpointRows = Object.entries(payload.endpoints ?? {}).map(([endpoint, data]) => ({
    endpoint: normalizeEndpointName(endpoint),
    requestsTotal: Number(data.requests_total ?? 0),
    latencyP50: Number(data.latency?.p50_ms ?? 0),
    latencyAvg: Number(data.latency?.avg_ms ?? 0),
    latencyP95: Number(data.latency?.p95_ms ?? 0),
    latencyP99: Number(data.latency?.p99_ms ?? 0),
    jitterMs: Number(data.latency?.jitter_ms ?? 0),
    stddevMs: Number(data.latency?.stddev_ms ?? 0),
    errorTotal: Number(data.errors?.total ?? 0),
    maxFailureStreak: Number(data.errors?.max_failure_streak ?? 0),
    errorRate: Number(data.errors?.rate_percent ?? 0),
    impactOrder: Number(data.impact_order ?? 0),
    stabilityScore: Number(data.stability_score ?? 0),
    cpu: Number(data.container?.avg_cpu_percent ?? 0),
    memory: Number(data.container?.avg_memory_mb ?? 0),
    degraded: Boolean(data.degraded),
  }))

  const intensityHistory =
    steps.length > 0
      ? steps.map((value, index) => {
          const ratio = steps.length <= 1 ? 1 : index / (steps.length - 1)
          const phase = ratio < 0.33 ? "baseline" : ratio < 0.8 ? "injecting" : "recovering"
          return {
            timestamp: new Date(Date.now() - (steps.length - index) * 10000).toISOString(),
            value,
            phase,
          }
        })
      : [
          { timestamp: new Date(Date.now() - 120000).toISOString(), value: baseline, phase: "baseline" },
          { timestamp: new Date(Date.now() - 60000).toISOString(), value: injecting, phase: "injecting" },
          { timestamp: new Date().toISOString(), value: recovery, phase: "recovering" },
        ]

  return {
    system: {
      blastRadius: Number(payload.blast_radius_percent ?? Math.min(100, Math.round((payload.insights?.degradation_factor ?? 0) * 5))),
      cascadeDepth: Number(
        payload.cascade_depth ??
          (payload.insights?.degradation_factor ? Math.max(1, Math.round(payload.insights.degradation_factor / 5)) : 0),
      ),
      severity: normalizeSeverity(payload.system_severity ?? (injecting > baseline * 3 ? "high" : injecting > baseline * 1.5 ? "medium" : "low")),
    },
    endpoints: endpointRows,
    intensityHistory,
    raw: payload,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = getForwardedApiKey(request)
    const headers = { "x-api-key": apiKey }

    const backendRes = await fetch(
      `${BACKEND_BASE_URL}/experiments/backend/metrics?id=${encodeURIComponent(id)}`,
      { cache: "no-store", headers },
    )
    if (backendRes.ok) {
      const payload = (await backendRes.json()) as BackendMetrics
      return NextResponse.json(mapBackendMetrics(payload))
    }

    const frontendRes = await fetch(
      `${BACKEND_BASE_URL}/experiments/frontend/metrics?id=${encodeURIComponent(id)}`,
      { cache: "no-store", headers },
    )
    if (frontendRes.ok) {
      const payload = (await frontendRes.json()) as Record<string, unknown>
      return NextResponse.json({
        system: {
          blastRadius: Number((payload.failsafe_index as { score?: number } | undefined)?.score ?? 0),
          cascadeDepth: 0,
          severity: (payload.frontend_score as { status?: string } | undefined)?.status === "degraded" ? "medium" : "low",
        },
        endpoints: [],
        intensityHistory: [],
        raw: payload,
      })
    }

    const androidRes = await fetch(
      `${BACKEND_BASE_URL}/experiments/android/metrics?id=${encodeURIComponent(id)}`,
      { cache: "no-store", headers },
    )
    if (androidRes.ok) {
      const payload = (await androidRes.json()) as Record<string, unknown>
      return NextResponse.json({
        system: { blastRadius: 0, cascadeDepth: 0, severity: "low" },
        endpoints: [],
        intensityHistory: [],
        raw: payload,
      })
    }

    return NextResponse.json(
      { error: "Experiment metrics not found" },
      { status: 404 }
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 503 }
    )
  }
}
