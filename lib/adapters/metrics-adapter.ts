import { config } from "@/lib/config/config"

type EndpointMetricLike = {
  endpoint: string
  latencyP95: number
  errorRate: number
  degraded: boolean
}

type MetricsLike = {
  endpoints?: Record<string, { latency?: { p95_ms?: number }; errors?: { rate_percent?: number } }>
}

export function toChartSeries(metrics: MetricsLike): Array<{ name: string; latency: number; errorRate: number }> {
  return Object.entries(metrics.endpoints ?? {}).map(([endpoint, data]) => ({
    name: endpoint,
    latency: Number(data.latency?.p95_ms ?? 0),
    errorRate: Number(data.errors?.rate_percent ?? 0),
  }))
}

export function toEndpointSeries(items: EndpointMetricLike[]): Array<{ name: string; latency: number; errorRate: number; degraded: boolean }> {
  return items.map((item) => ({
    name: item.endpoint,
    latency: item.latencyP95,
    errorRate: item.errorRate,
    degraded: item.degraded,
  }))
}

export function decimateTimeSeries<T>(data: T[], maxPoints = config.MAX_METRIC_POINTS): T[] {
  if (data.length <= maxPoints) return data
  const step = Math.ceil(data.length / maxPoints)
  return data.filter((_, index) => index % step === 0)
}

export function alignTimeSeries(
  baseline: Array<{ timestamp: number; value: number }>,
  injecting: Array<{ timestamp: number; value: number }>,
  recovery: Array<{ timestamp: number; value: number }>,
): Array<{ timestamp: number; baseline?: number; injecting?: number; recovery?: number }> {
  const index = new Map<number, { timestamp: number; baseline?: number; injecting?: number; recovery?: number }>()

  for (const point of baseline) {
    index.set(point.timestamp, { ...(index.get(point.timestamp) ?? { timestamp: point.timestamp }), baseline: point.value })
  }
  for (const point of injecting) {
    index.set(point.timestamp, { ...(index.get(point.timestamp) ?? { timestamp: point.timestamp }), injecting: point.value })
  }
  for (const point of recovery) {
    index.set(point.timestamp, { ...(index.get(point.timestamp) ?? { timestamp: point.timestamp }), recovery: point.value })
  }

  return Array.from(index.values()).sort((a, b) => a.timestamp - b.timestamp)
}
