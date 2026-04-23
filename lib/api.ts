import { normalizeExperiment, normalizeMetricSnapshot, normalizeSystemMetrics } from "@/lib/adapters/data-normalizer"
import { buildApiUrl, requestClient } from "@/lib/api/request-client"
import type { Experiment, SystemMetrics, EndpointMetrics, Platform, FaultType } from "./store"

function exactUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return buildApiUrl(`/backend${normalizedPath}`)
}

export interface FrontendStartPayload {
  fault_type: "latency" | "error" | "network"
  targets: string[]
  target_type: "frontend"
  duration_seconds: number
  frontend_run: {
    base_url: string
    metrics_endpoint: string
    target_urls: string[]
    headless?: boolean
    browser?: string
  }
}

export interface FrontendExperimentResponse {
  id: string
  state: "running" | "completed" | "failed"
  phase: "baseline" | "injecting" | "recovering" | "completed"
  fault_type: string
  target_type: string
  targets: string[]
  duration_seconds: number
  frontend_run?: {
    base_url: string
    metrics_endpoint: string
    target_urls: string[]
    headless?: boolean
    browser?: string
  }
  created_at: string
  updated_at: string
}

export interface FrontendStatusResponse {
  experiment: {
    id: string
    state: "running" | "completed" | "failed"
    phase: "baseline" | "injecting" | "recovering" | "completed"
    fault_type: string
    target_type: string
    duration_seconds: number
    current_intensity: number
    created_at: string
    updated_at: string
  }
}

export interface FrontendMetricsReport {
  experiment_id: string
  state: string
  phase: string
  total_metrics: number
  phases: Record<string, Record<string, number>>
  vitals: Record<string, Record<string, number>>
  stability: Record<string, Record<string, number>>
  api_quality: {
    success_rate: number
    avg_latency: number
    error_count: number
  }
  failsafe_index: {
    score: number
    status: string
    summary: string
  }
  frontend_score: {
    status: string
    score: number
  }
}

export interface BackendStartPayload {
  faultType?: "kill" | "network_delay" | "packet_loss" | "cpu_stress" | "memory_stress"
  fault_type?: "kill" | "network_delay" | "packet_loss" | "cpu_stress" | "memory_stress"
  targets: string[]
  targetType?: "docker"
  target_type?: "docker"
  observationType?: "http"
  observation_type?: "http"
  observedEndpoints?: string[]
  observed_endpoints?: string[]
  duration?: number
  duration_seconds?: number
  adaptive?: boolean
  stepIntensity?: number
  step_intensity?: number
  maxIntensity?: number
  max_intensity?: number
  dependencyGraph?: Record<string, string[]>
  targetEndpointMap?: Record<string, string[]>
  scenarios?: Array<{ type: string; at: number; duration_seconds: number }>
  expected?: { running: boolean }
}

export interface BackendExperimentResponse {
  id: string
  state: "running" | "completed" | "failed"
  phase: "baseline" | "injecting" | "recovering" | "completed"
  fault_type: string
  target_type: string
  targets: string[]
  duration_seconds: number
  current_intensity: number
  created_at: string
}

export interface BackendStatusResponse {
  experiment: {
    id: string
    state: "running" | "completed" | "failed"
    phase: "baseline" | "injecting" | "recovering" | "completed"
    fault_type: string
    current_intensity: number
    max_stable_intensity: number
    breaking_intensity: number
  }
}

export interface BackendMetricsResponse {
  experiment_id: string
  state: string
  baseline_metrics: {
    avg_latency: number
    p95: number
    error_rate: number
  }
  max_impact_metrics: {
    avg_latency: number
    p95: number
    error_rate: number
  }
  recovery_metrics: {
    avg_latency: number
    p95: number
    error_rate: number
  }
  insights: {
    degradation_factor: number
    recovery_time_seconds: number
    critical_endpoints: string[]
  }
}

export interface AndroidUploadResponse {
  id: string
  apk: string
  path: string
  package: string
  activity: string
}

export interface AndroidStartPayload {
  fault_type: "kill_app" | "network_disable" | "network_latency" | "revoke_camera" | "revoke_location" | "battery_drain"
  targets: string[]
  target_type: "android"
  observation_type: "android"
  duration_seconds: number
  apk: string
  android_run: {
    avd_name: string
    headless: boolean
    reset_app_state?: boolean
  }
  scenarios?: Array<{ type: string; at: number; duration_seconds: number }>
  expected?: {
    running: boolean
    not_crash: boolean
    not_anr: boolean
    should_recover: boolean
  }
}

export interface AndroidExperimentResponse {
  id: string
  state: "running" | "completed" | "failed"
  phase: "baseline" | "injecting" | "recovering" | "completed"
  fault_type: string
  package: string
}

export interface AndroidStatusResponse {
  id: string
  state: "running" | "completed" | "failed"
  phase: "baseline" | "injecting" | "recovering" | "completed"
  fault_type: string
  current_state?: string
  observation_type?: string
  target_type?: string
  package?: string
  created_at?: string
  updated_at?: string
  current_sample_at?: string
  current_intensity?: number
  is_terminal?: boolean
  next_fault?: string | null
  next_fault_eta_ms?: number
  server_time?: string
  faults?: {
    applied?: number
    scheduled?: number
    events?: Array<{
      at?: string
      at_ms?: number
      in_phase?: string
      type?: string
    }>
  }
  health?: {
    status?: string
    severity?: string
    failure_type?: string
    crash_reason?: string
    thread?: string
  }
  progress?: {
    completed_percent_of_plan?: number
    duration_seconds?: number
    elapsed_ms?: number
    fault_elapsed_ms?: number
    phase_elapsed_ms?: number
  }
  state_transitions?: unknown[]
  timeline?: {
    fault_start?: string
    first_impact?: Record<string, string>
    recovery?: Record<string, string>
  }
  timeline_status?: {
    impact_observed?: boolean
    impact_pending?: boolean
    recovery_observed?: boolean
    waiting_for_step?: string
  }
  validation?: {
    configured?: boolean
    expected?: {
      app_state?: string
      not_anr?: boolean
      not_crash?: boolean
      running?: boolean
      should_recover?: boolean
    }
    passed?: boolean
    reasons?: string[]
  }
  experiment?: {
    id?: string
    state?: "running" | "completed" | "failed"
    phase?: "baseline" | "injecting" | "recovering" | "completed"
    fault_type?: string
    current_intensity?: number
    current_state?: string
    observation_type?: string
    target_type?: string
    package?: string
    created_at?: string
    updated_at?: string
  }
}

export interface AndroidMetricsResponse {
  blast_radius_percent?: number
  cascade_depth?: number
  crash_classification?: {
    lifecycle_bug?: number
    network_bug?: number
    ui_bug?: number
    unknown?: number
  }
  health?: {
    crash_reason?: string
    failure_type?: string
    severity?: string
    status?: string
    thread?: string
  }
  impact?: {
    app_availability_percent?: number
    blast_radius_percent?: number
    cascade_depth?: number
    disruption_events?: number
  }
  recovery?: {
    auto_recovered?: boolean
    manual_intervention_required?: boolean
    recovered?: boolean
    recovery_time_ms?: number
    running?: boolean
    stable_recovered?: boolean
  }
  replay_hints?: Array<{
    at_ms?: number
    at_time?: string
    fault?: string
    step?: string
  }>
  resilience_threshold?: {
    breaking_intensity?: number
    intensity_steps?: number[]
    max_stable_intensity?: number
  }
  scenario?: string
  stability?: {
    anr_detected?: boolean
    background_samples?: number
    crash_rate_percent?: number
    unexpected_restarts?: number
    uptime_percent?: number
    warning_signals?: number
  }
  state_transitions?: unknown[]
  summary?: {
    reason?: string
    result?: string
    suggestion?: string
  }
  target_type?: string
  timeline?: {
    fault_start?: string
    first_impact?: Record<string, string>
    recovery?: Record<string, string>
  }
  validation?: {
    configured?: boolean
    expected?: {
      app_state?: string
      not_anr?: boolean
      not_crash?: boolean
      running?: boolean
      should_recover?: boolean
    }
    passed?: boolean
    reasons?: string[]
  }
}

export interface CreateExperimentPayload {
  name: string
  platform: Platform
  faultType: FaultType
  targets: string[]
  duration: number
  adaptive: boolean
  stepIntensity: number
  maxIntensity: number
  expectedBehavior: {
    notCrash: boolean
    shouldRecover: boolean
  }
}

export interface Container {
  id: string
  name: string
  status: "running" | "stopped" | "error"
  image: string
  ports: string[]
  createdAt: string
}

export interface ApiKey {
  id: string
  name: string
  key: string
  role: "viewer" | "engineer" | "admin"
  createdAt: string
  lastUsed?: string
}

export interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  endpoint: string
  message: string
  metadata?: Record<string, unknown>
}

export interface SessionRole {
  role: "viewer" | "engineer" | "admin"
  keyId: string
}

const EXPERIMENT_START_TIMEOUT_MS = 45_000
const ANDROID_EXPERIMENT_START_TIMEOUT_MS = 180_000

export interface ExperimentHistoryItem {
  experiment: {
    id: string
    fault_type: string
    target_type: "backend" | "android" | "frontend"
    state: string
    phase: string
    created_at: string
    updated_at: string
  }
  metrics: {
    status_payload: Record<string, unknown> | null
    aggregated: Array<{
      endpoint: string
      requests_total: number
      p50_ms: number
      p95_ms: number
      p99_ms: number
      avg_ms: number
      stddev_ms: number
      jitter_ms: number
      error_rate: number
      max_failure_streak: number
      latency_ratio: number
      error_delta: number
      stability_score: number
      impact_order: number
      degraded: boolean
      avg_cpu: number
      max_cpu: number
      avg_memory: number
      max_memory: number
    }>
    raw: Array<Record<string, unknown>>
  }
  summary:
    | {
        blast_radius: number
        cascade_depth: number
        system_severity: string
        total_requests: number
      }
    | {
        target_package: string
        scenario: string
        failure_type: string
        health_status: string
        severity: string
        crash_reason: string
        recovered: boolean
        auto_recovered: boolean
        stable_recovered: boolean
        manual_intervention_required: boolean
        running: boolean
        recovery_time_ms: number
        summary_result: string
        summary_reason: string
        summary_suggestion: string
      }
    | null
}

export interface ExperimentHistoryResponse {
  items: ExperimentHistoryItem[]
  count: number
  limit: number
  offset: number
}

// Experiment APIs
export async function startExperiment(payload: CreateExperimentPayload): Promise<Experiment> {
  if (payload.platform === "frontend") {
    const response = await startFrontendExperiment({
      fault_type: payload.faultType === "error" || payload.faultType === "network" ? (payload.faultType as "error" | "network") : "latency",
      targets: payload.targets,
      target_type: "frontend",
      duration_seconds: payload.duration,
      frontend_run: {
        base_url: "https://example.com",
        metrics_endpoint: exactUrl("/frontend/metrics"),
        target_urls: payload.targets,
      },
    })
    return normalizeExperiment(response as unknown as Record<string, unknown>)
  }

  if (payload.platform === "android") {
    const response = await startAndroidExperiment({
      fault_type: "kill_app",
      targets: payload.targets,
      target_type: "android",
      observation_type: "android",
      duration_seconds: payload.duration,
      apk: "apk-placeholder",
      android_run: {
        avd_name: "Pixel_8a",
        headless: true,
        reset_app_state: true,
      },
      expected: {
        running: true,
        not_crash: payload.expectedBehavior.notCrash,
        not_anr: true,
        should_recover: payload.expectedBehavior.shouldRecover,
      },
    })
    return normalizeExperiment(response as unknown as Record<string, unknown>)
  }

  const raw = await requestClient<Record<string, unknown>>(buildApiUrl("/experiments"), {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return normalizeExperiment(raw)
}

export async function startFrontendExperiment(payload: FrontendStartPayload): Promise<FrontendExperimentResponse> {
  return requestClient<FrontendExperimentResponse>(exactUrl("/experiments/frontend/start"), {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: EXPERIMENT_START_TIMEOUT_MS,
  })
}

export async function getFrontendExperimentStatus(id: string): Promise<FrontendStatusResponse> {
  return requestClient<FrontendStatusResponse>(exactUrl(`/experiments/frontend/status?id=${encodeURIComponent(id)}`), {
    dedupeKey: `frontend-status:${id}`,
  })
}

export async function getFrontendMetricsReport(id: string): Promise<FrontendMetricsReport> {
  return requestClient<FrontendMetricsReport>(exactUrl(`/experiments/frontend/metrics?id=${encodeURIComponent(id)}`), {
    dedupeKey: `frontend-metrics:${id}`,
  })
}

export async function stopFrontendExperiment(id: string): Promise<{ id: string; state: string; message: string }> {
  return requestClient<{ id: string; state: string; message: string }>(exactUrl(`/experiments/frontend/stop?id=${encodeURIComponent(id)}`), {
    method: "POST",
  })
}

export async function startBackendExperiment(payload: BackendStartPayload): Promise<BackendExperimentResponse> {
  return requestClient<BackendExperimentResponse>(exactUrl("/experiments/backend/start"), {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: EXPERIMENT_START_TIMEOUT_MS,
  })
}

export async function getBackendExperimentStatus(id: string): Promise<BackendStatusResponse> {
  return requestClient<BackendStatusResponse>(exactUrl(`/experiments/backend/status?id=${encodeURIComponent(id)}`), {
    dedupeKey: `backend-status:${id}`,
  })
}

export async function getBackendMetricsReport(id: string): Promise<BackendMetricsResponse> {
  return requestClient<BackendMetricsResponse>(exactUrl(`/experiments/backend/metrics?id=${encodeURIComponent(id)}`), {
    dedupeKey: `backend-metrics:${id}`,
  })
}

export async function stopBackendExperiment(id: string): Promise<void> {
  await requestClient<null>(exactUrl(`/experiments/backend/stop?id=${encodeURIComponent(id)}`), {
    method: "POST",
  })
}

export async function uploadAndroidApk(formData: FormData): Promise<AndroidUploadResponse> {
  return requestClient<AndroidUploadResponse>(exactUrl("/upload/apk"), {
    method: "POST",
    headers: {},
    body: formData,
  })
}

export async function startAndroidExperiment(payload: AndroidStartPayload): Promise<AndroidExperimentResponse> {
  return requestClient<AndroidExperimentResponse>(exactUrl("/experiments/android/start"), {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: ANDROID_EXPERIMENT_START_TIMEOUT_MS,
  })
}

export async function getAndroidExperimentStatus(id: string): Promise<AndroidStatusResponse> {
  return requestClient<AndroidStatusResponse>(exactUrl(`/experiments/android/status?id=${encodeURIComponent(id)}`), {
    dedupeKey: `android-status:${id}`,
  })
}

export async function getAndroidMetricsReport(id: string): Promise<AndroidMetricsResponse> {
  return requestClient<AndroidMetricsResponse>(exactUrl(`/experiments/android/metrics?id=${encodeURIComponent(id)}`), {
    dedupeKey: `android-metrics:${id}`,
  })
}

export async function stopAndroidExperiment(id: string): Promise<void> {
  await requestClient<null>(exactUrl(`/experiments/android/stop?id=${encodeURIComponent(id)}`), {
    method: "POST",
  })
}

export async function getExperiments(): Promise<Experiment[]> {
  const raw = await requestClient<Record<string, unknown>[]>(buildApiUrl("/experiments"), {
    dedupeKey: "experiments:list",
  })
  return raw.map((item) => normalizeExperiment(item))
}

export async function getExperimentHistory(params?: { limit?: number; offset?: number; signal?: AbortSignal }): Promise<ExperimentHistoryResponse> {
  const search = new URLSearchParams()
  if (typeof params?.limit === "number") search.set("limit", String(params.limit))
  if (typeof params?.offset === "number") search.set("offset", String(params.offset))
  const query = search.toString()
  return requestClient<ExperimentHistoryResponse>(buildApiUrl(`/experiments/history${query ? `?${query}` : ""}`), {
    dedupeKey: `experiments:history:${query || "default"}`,
    cache: "no-store",
    // History queries can take longer on large datasets; give more time.
    timeoutMs: 60_000,
    signal: params?.signal,
  })
}

export async function getExperimentHistoryDetail(id: string): Promise<ExperimentHistoryItem> {
  return requestClient<ExperimentHistoryItem>(buildApiUrl(`/experiments/history/detail?id=${encodeURIComponent(id)}`), {
    dedupeKey: `experiments:history:detail:${id}`,
    cache: "no-store",
    // Detail endpoints may also be heavy; increase timeout.
    timeoutMs: 60_000,
  })
}

export async function getExperimentStatus(id: string): Promise<Experiment> {
  const raw = await requestClient<Record<string, unknown>>(buildApiUrl(`/experiments/${id}`), {
    dedupeKey: `experiment:${id}`,
  })
  return normalizeExperiment(raw)
}

export async function stopExperiment(id: string): Promise<void> {
  await requestClient<null>(buildApiUrl(`/experiments/${id}/stop`), {
    method: "POST",
  })
}

// Metrics APIs
export async function getMetrics(id: string): Promise<{
  system: SystemMetrics
  endpoints: EndpointMetrics[]
  intensityHistory: { timestamp: string; value: number; phase?: string }[]
}> {
  const raw = await requestClient<Record<string, unknown>>(buildApiUrl(`/experiments/${id}/metrics`), {
    dedupeKey: `metrics:${id}`,
  })
  return normalizeMetricSnapshot(raw)
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const raw = await requestClient<Record<string, unknown>>(buildApiUrl("/metrics/system"), {
    dedupeKey: "metrics:system",
  })
  return normalizeSystemMetrics(raw)
}

// Container APIs
export async function getContainers(): Promise<Container[]> {
  return requestClient<Container[]>(buildApiUrl("/containers"), {
    dedupeKey: "containers:list",
  })
}

export async function startContainer(name: string): Promise<Container> {
  return requestClient<Container>(buildApiUrl(`/containers/${name}/start`), {
    method: "POST",
  })
}

export async function stopContainer(name: string): Promise<void> {
  await requestClient<null>(buildApiUrl(`/containers/${name}/stop`), {
    method: "POST",
  })
}

// API Key APIs
export async function getApiKeys(): Promise<ApiKey[]> {
  return requestClient<ApiKey[]>(buildApiUrl("/api-keys"), {
    dedupeKey: "api-keys:list",
  })
}

export async function createApiKey(name: string, role: ApiKey["role"]): Promise<ApiKey> {
  return requestClient<ApiKey>(buildApiUrl("/api-keys"), {
    method: "POST",
    body: JSON.stringify({ name, role }),
  })
}

export async function deleteApiKey(id: string): Promise<void> {
  await requestClient<null>(buildApiUrl(`/api-keys/${id}`), {
    method: "DELETE",
  })
}

// Logs APIs
export async function getLogs(filters?: {
  endpoint?: string
  status?: string
  timeRange?: string
  experimentId?: string
}): Promise<LogEntry[]> {
  const params = new URLSearchParams()
  if (filters?.endpoint) params.set("endpoint", filters.endpoint)
  if (filters?.status) params.set("status", filters.status)
  if (filters?.timeRange) params.set("timeRange", filters.timeRange)
  if (filters?.experimentId) params.set("id", filters.experimentId)

  return requestClient<LogEntry[]>(buildApiUrl(`/logs?${params.toString()}`), {
    dedupeKey: `logs:${params.toString()}`,
    // Log queries can be slow when querying large time ranges or backends.
    // Increase timeout to 60s to allow the backend to assemble results.
    timeoutMs: 60000,
  })
}

export async function getSessionRole(): Promise<SessionRole> {
  return requestClient<SessionRole>(buildApiUrl("/auth/role"), {
    dedupeKey: "auth:role",
  })
}
