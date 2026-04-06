import type { EndpointMetrics, Experiment, FaultType, Platform, SystemMetrics } from "@/lib/store"

type UnknownRecord = Record<string, unknown>

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

export function normalizeExperiment(raw: UnknownRecord): Experiment & {
  state: string
  maxStable: number
  breaking: number
  timeline: Record<string, unknown>
} {
  return {
    id: asString(raw.id),
    name: asString(raw.name, "Untitled Experiment"),
    platform: (asString(raw.platform, "backend") as Platform),
    faultType: (asString(raw.faultType ?? raw.fault_type, "latency") as FaultType),
    targets: asStringArray(raw.targets),
    duration: asNumber(raw.duration),
    adaptive: Boolean(raw.adaptive),
    stepIntensity: asNumber(raw.stepIntensity ?? raw.step_intensity, 10),
    maxIntensity: asNumber(raw.maxIntensity ?? raw.max_intensity, 100),
    currentIntensity: asNumber(raw.current_intensity ?? raw.currentIntensity ?? raw.intensity),
    phase: asString(raw.phase, "baseline") as Experiment["phase"],
    createdAt: asString(raw.createdAt ?? raw.created_at, new Date().toISOString()),
    startedAt: asString(raw.startedAt ?? raw.started_at) || undefined,
    completedAt: asString(raw.completedAt ?? raw.completed_at) || undefined,

    state: asString(raw.state, asString(raw.phase, "baseline")),
    maxStable: asNumber(raw.max_stable_intensity ?? raw.maxStableIntensity),
    breaking: asNumber(raw.breaking_intensity ?? raw.breakingIntensity),
    timeline: (raw.timeline_history as Record<string, unknown>) || {},
  }
}

export function normalizeSystemMetrics(raw: UnknownRecord): SystemMetrics {
  return {
    blastRadius: asNumber(raw.blastRadius ?? raw.blast_radius),
    cascadeDepth: asNumber(raw.cascadeDepth ?? raw.cascade_depth),
    severity: (asString(raw.severity, "low") as SystemMetrics["severity"]),
  }
}

export function normalizeEndpointMetrics(raw: UnknownRecord): EndpointMetrics {
  return {
    endpoint: asString(raw.endpoint ?? raw.name),
    latencyAvg: asNumber(raw.latencyAvg ?? raw.latency_avg ?? raw.latency?.["avg_ms"]),
    latencyP95: asNumber(raw.latencyP95 ?? raw.latency_p95 ?? raw.latency?.["p95_ms"]),
    latencyP99: asNumber(raw.latencyP99 ?? raw.latency_p99 ?? raw.latency?.["p99_ms"]),
    errorRate: asNumber(raw.errorRate ?? raw.error_rate ?? raw.errors?.["rate_percent"]),
    cpu: asNumber(raw.cpu),
    memory: asNumber(raw.memory),
    degraded: Boolean(raw.degraded),
  }
}

export function normalizeMetricSnapshot(raw: UnknownRecord): {
  system: SystemMetrics
  endpoints: EndpointMetrics[]
  intensityHistory: { timestamp: string; value: number }[]
} {
  const endpointsRaw = Array.isArray(raw.endpoints) ? raw.endpoints : []
  const intensityRaw = Array.isArray(raw.intensityHistory ?? raw.intensity_history)
    ? ((raw.intensityHistory ?? raw.intensity_history) as UnknownRecord[])
    : []

  return {
    system: normalizeSystemMetrics((raw.system as UnknownRecord) || {}),
    endpoints: endpointsRaw.map((item) => normalizeEndpointMetrics((item as UnknownRecord) || {})),
    intensityHistory: intensityRaw.map((point) => ({
      timestamp: asString(point.timestamp, new Date().toISOString()),
      value: asNumber(point.value),
      phase: asString(point.phase ?? point.state ?? point.stage) || undefined,
    })),
  }
}
