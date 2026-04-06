import { normalizeExperiment, normalizeMetricSnapshot } from "@/lib/adapters/data-normalizer"
import { decimateTimeSeries } from "@/lib/adapters/metrics-adapter"
import { buildApiUrl, requestClient } from "@/lib/api/request-client"
import { config } from "@/lib/config/config"
import { Poller } from "@/lib/polling/polling-manager"
import type { EndpointMetrics, Experiment, SystemMetrics } from "@/lib/store"

export interface ExperimentSessionState {
  experiment: (Experiment & { state: string; maxStable: number; breaking: number; timeline: Record<string, unknown> }) | null
  metrics: {
    system: SystemMetrics
    endpoints: EndpointMetrics[]
    intensityHistory: { timestamp: string; value: number; phase?: string }[]
  } | null
  connection: "active" | "paused" | "disconnected" | "stale"
  lastUpdatedAt?: number
}

type Subscriber = (state: ExperimentSessionState) => void

export class ExperimentSession {
  id: string
  private poller: Poller
  private subscribers = new Set<Subscriber>()
  private state: ExperimentSessionState = {
    experiment: null,
    metrics: null,
    connection: "paused",
  }

  constructor(id: string) {
    this.id = id
    this.poller = new Poller({
      intervalMs: config.POLL_ACTIVE_MS,
      hiddenIntervalMs: config.POLL_HIDDEN_MS,
      onTick: async () => {
        const [experimentRaw, metricsRaw] = await Promise.all([
          requestClient<Record<string, unknown>>(buildApiUrl(`/experiments/${id}`), { dedupeKey: `exp:${id}` }),
          requestClient<Record<string, unknown>>(buildApiUrl(`/experiments/${id}/metrics`), { dedupeKey: `metrics:${id}` }),
        ])

        const experiment = normalizeExperiment(experimentRaw)
        const metrics = normalizeMetricSnapshot(metricsRaw)
        this.state = {
          experiment,
          metrics: {
            ...metrics,
            intensityHistory: decimateTimeSeries(metrics.intensityHistory, config.MAX_METRIC_POINTS),
          },
          connection: this.state.connection,
          lastUpdatedAt: Date.now(),
        }
        this.notify()
        return experiment.phase !== "completed" && experiment.phase !== "failed"
      },
      onStateChange: (connection) => {
        this.state = { ...this.state, connection }
        this.notify()
      },
    })
  }

  start(): void {
    this.poller.start()
  }

  stop(): void {
    this.poller.stop()
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback)
    callback(this.state)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notify(): void {
    for (const subscriber of this.subscribers) {
      subscriber(this.state)
    }
  }
}
