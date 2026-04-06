const EXPERIMENT_CONFIG_KEY = "failsafe:last-experiment-config"
const RECENT_EXPERIMENTS_KEY = "failsafe:recent-experiments"

export function saveLastExperimentConfig(value: unknown): void {
  if (typeof window === "undefined") return
  localStorage.setItem(EXPERIMENT_CONFIG_KEY, JSON.stringify(value))
}

export function getLastExperimentConfig<T>(): T | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(EXPERIMENT_CONFIG_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function pushRecentExperiment(experiment: { id: string; name: string; createdAt: string }): void {
  if (typeof window === "undefined") return
  const current = getRecentExperiments()
  const next = [experiment, ...current.filter((item) => item.id !== experiment.id)].slice(0, 20)
  localStorage.setItem(RECENT_EXPERIMENTS_KEY, JSON.stringify(next))
}

export function getRecentExperiments(): Array<{ id: string; name: string; createdAt: string }> {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(RECENT_EXPERIMENTS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Array<{ id: string; name: string; createdAt: string }>
  } catch {
    return []
  }
}
