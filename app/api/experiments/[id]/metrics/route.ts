import { NextRequest, NextResponse } from "next/server"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"
const BACKEND_API_KEY = process.env.BACKEND_API_KEY

type BackendMetrics = {
  baseline_metrics?: { avg_latency?: number; error_rate?: number }
  max_impact_metrics?: { avg_latency?: number; error_rate?: number }
  recovery_metrics?: { avg_latency?: number; error_rate?: number }
  insights?: { degradation_factor?: number }
}

function mapBackendMetrics(payload: BackendMetrics) {
  const baseline = payload.baseline_metrics?.avg_latency ?? 0
  const injecting = payload.max_impact_metrics?.avg_latency ?? 0
  const recovery = payload.recovery_metrics?.avg_latency ?? 0

  return {
    system: {
      blastRadius: Math.min(100, Math.round((payload.insights?.degradation_factor ?? 0) * 5)),
      cascadeDepth: payload.insights?.degradation_factor ? Math.max(1, Math.round(payload.insights.degradation_factor / 5)) : 0,
      severity: injecting > baseline * 3 ? "high" : injecting > baseline * 1.5 ? "medium" : "low",
    },
    endpoints: [],
    intensityHistory: [
      { timestamp: new Date(Date.now() - 120000).toISOString(), value: baseline, phase: "baseline" },
      { timestamp: new Date(Date.now() - 60000).toISOString(), value: injecting, phase: "injecting" },
      { timestamp: new Date().toISOString(), value: recovery, phase: "recovering" },
    ],
    raw: payload,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = request.headers.get("x-api-key")
    const headers = {
      ...(apiKey ? { "x-api-key": apiKey } : BACKEND_API_KEY ? { "x-api-key": BACKEND_API_KEY } : {}),
    }

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
