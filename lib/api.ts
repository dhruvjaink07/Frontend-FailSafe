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
  experiment: {
    id: string
    state: "running" | "completed" | "failed"
    phase: "baseline" | "injecting" | "recovering" | "completed"
    fault_type: string
    current_intensity?: number
  }
}

export interface AndroidMetricsResponse {
  app_recovered?: boolean
  [key: string]: unknown
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
}): Promise<LogEntry[]> {
  const params = new URLSearchParams()
  if (filters?.endpoint) params.set("endpoint", filters.endpoint)
  if (filters?.status) params.set("status", filters.status)
  if (filters?.timeRange) params.set("timeRange", filters.timeRange)
  
  return requestClient<LogEntry[]>(buildApiUrl(`/logs?${params.toString()}`), {
    dedupeKey: `logs:${params.toString()}`,
  })
}

export async function getSessionRole(): Promise<SessionRole> {
  return requestClient<SessionRole>(buildApiUrl("/auth/role"), {
    dedupeKey: "auth:role",
  })
}
