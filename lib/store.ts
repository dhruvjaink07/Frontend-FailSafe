import { create } from "zustand"
import { parseError } from "@/lib/errors/error-handler"
import { requestClient } from "@/lib/api/request-client"

export type ExperimentPhase = "baseline" | "injecting" | "recovering" | "completed" | "failed"
export type Platform = "backend" | "frontend" | "android"
export type FaultType =
  | "latency"
  | "error"
  | "timeout"
  | "memory"
  | "cpu"
  | "network"
  | "kill"
  | "network_delay"
  | "packet_loss"
  | "cpu_stress"
  | "memory_stress"
  | "kill_app"
  | "network_disable"
  | "network_latency"
  | "revoke_camera"
  | "revoke_location"
  | "battery_drain"

export interface Experiment {
  id: string
  name: string
  platform: Platform
  faultType: FaultType
  targets: string[]
  duration: number
  adaptive: boolean
  stepIntensity: number
  maxIntensity: number
  currentIntensity: number
  phase: ExperimentPhase
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface SystemMetrics {
  blastRadius: number
  cascadeDepth: number
  severity: "low" | "medium" | "high" | "critical" | "isolated" | "unknown"
}

export interface EndpointMetrics {
  endpoint: string
  requestsTotal?: number
  latencyP50?: number
  latencyAvg: number
  latencyP95: number
  latencyP99: number
  jitterMs?: number
  stddevMs?: number
  errorTotal?: number
  maxFailureStreak?: number
  errorRate: number
  impactOrder?: number
  stabilityScore?: number
  cpu: number
  memory: number
  degraded: boolean
}

export interface BackendContainerSummary {
  id: string
  name: string
  status: "running" | "stopped" | "error"
  image: string
  ports: string[]
  createdAt: string
}

export type BackendContainerLoadStatus = "idle" | "loading" | "ready" | "error"

let backendContainersInFlight: Promise<BackendContainerSummary[]> | null = null
const BACKEND_CONTAINERS_CACHE_TTL_MS = 5000

interface AppState {
  selectedExperimentId: string | null
  setSelectedExperimentId: (id: string | null) => void
  filters: {
    platform: Platform | "all"
    phase: ExperimentPhase | "all"
    search: string
  }
  setFilters: (filters: Partial<AppState["filters"]>) => void
  logFilters: {
    endpoint: string
    status: string
    timeRange: string
  }
  setLogFilters: (filters: Partial<AppState["logFilters"]>) => void
  currentRole: "viewer" | "engineer" | "admin" | null
  setCurrentRole: (role: AppState["currentRole"]) => void
  backendContainers: BackendContainerSummary[]
  backendContainersFetchedAt: number
  setBackendContainers: (containers: BackendContainerSummary[]) => void
  backendContainersStatus: BackendContainerLoadStatus
  backendContainersError: string | null
  backendContainersUnavailable: boolean
  loadBackendContainers: (options?: { force?: boolean }) => Promise<BackendContainerSummary[]>
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedExperimentId: null,
  setSelectedExperimentId: (id) => set({ selectedExperimentId: id }),
  filters: {
    platform: "all",
    phase: "all",
    search: "",
  },
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  logFilters: {
    endpoint: "",
    status: "",
    timeRange: "1h",
  },
  setLogFilters: (filters) =>
    set((state) => ({
      logFilters: { ...state.logFilters, ...filters },
    })),
  currentRole: null,
  setCurrentRole: (role) => set({ currentRole: role }),
  backendContainers: [],
  backendContainersFetchedAt: 0,
  setBackendContainers: (containers) =>
    set({
      backendContainers: containers,
      backendContainersFetchedAt: Date.now(),
    }),
  backendContainersStatus: "idle",
  backendContainersError: null,
  backendContainersUnavailable: false,
  loadBackendContainers: async (options) => {
    const force = options?.force ?? false
    const state = get()
    const cacheFresh = Date.now() - state.backendContainersFetchedAt < BACKEND_CONTAINERS_CACHE_TTL_MS

    if (!force && state.backendContainers.length > 0 && cacheFresh) {
      return state.backendContainers
    }

    if (backendContainersInFlight) {
      return backendContainersInFlight
    }

    backendContainersInFlight = (async () => {
      set({ backendContainersStatus: "loading", backendContainersError: null, backendContainersUnavailable: false })

      try {
        const items = await requestClient<BackendContainerSummary[]>("/api/containers", {
          dedupeKey: "backend-containers:list",
        })
        set({
          backendContainers: items,
          backendContainersFetchedAt: Date.now(),
          backendContainersStatus: "ready",
          backendContainersError: null,
          backendContainersUnavailable: false,
        })
        return items
      } catch (error) {
        const parsed = parseError(error)
        const shouldFallbackToEmptyState =
          parsed.type === "backend_crash" ||
          parsed.type === "network_failure" ||
          parsed.type === "auth_failure" ||
          parsed.status === 401 ||
          parsed.status === 503

        if (shouldFallbackToEmptyState) {
          set({
            backendContainers: [],
            backendContainersFetchedAt: Date.now(),
            backendContainersStatus: "ready",
            backendContainersError: null,
            backendContainersUnavailable: true,
          })
          return []
        }

        const message = parsed.message || "Failed to load containers"
        set({ backendContainersStatus: "error", backendContainersError: message, backendContainersUnavailable: false })
        throw error
      } finally {
        backendContainersInFlight = null
      }
    })()

    return backendContainersInFlight
  },
}))
