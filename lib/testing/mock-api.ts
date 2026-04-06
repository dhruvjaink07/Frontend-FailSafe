import { createFakeEndpointMetrics, createFakeExperiment, createFakeSystemMetrics } from "@/lib/testing/fake-experiment"

export const mockApi = {
  async getExperiments() {
    return [createFakeExperiment()]
  },
  async getExperiment(id: string) {
    return createFakeExperiment(id)
  },
  async getMetrics() {
    return {
      system: createFakeSystemMetrics(),
      endpoints: createFakeEndpointMetrics(),
      intensityHistory: Array.from({ length: 30 }, (_, index) => ({
        timestamp: new Date(Date.now() - (30 - index) * 1000).toISOString(),
        value: Math.min(100, index * 3),
      })),
    }
  },
}
