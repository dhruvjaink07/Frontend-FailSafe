import type { EndpointMetrics, Experiment, SystemMetrics } from "@/lib/store"

export function createFakeExperiment(id = "exp-demo"): Experiment {
  return {
    id,
    name: "Synthetic Load Session",
    platform: "backend",
    faultType: "latency",
    targets: ["/api/orders", "/api/payments"],
    duration: 300,
    adaptive: true,
    stepIntensity: 10,
    maxIntensity: 100,
    currentIntensity: 30,
    phase: "injecting",
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    startedAt: new Date(Date.now() - 30_000).toISOString(),
  }
}

export function createFakeSystemMetrics(): SystemMetrics {
  return {
    blastRadius: 23,
    cascadeDepth: 2,
    severity: "medium",
  }
}

export function createFakeEndpointMetrics(): EndpointMetrics[] {
  return [
    {
      endpoint: "/api/orders",
      latencyAvg: 62,
      latencyP95: 110,
      latencyP99: 190,
      errorRate: 1.2,
      cpu: 33,
      memory: 44,
      degraded: false,
    },
    {
      endpoint: "/api/payments",
      latencyAvg: 120,
      latencyP95: 260,
      latencyP99: 420,
      errorRate: 6.1,
      cpu: 58,
      memory: 71,
      degraded: true,
    },
  ]
}
