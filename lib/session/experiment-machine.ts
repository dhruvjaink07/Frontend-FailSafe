import type { ExperimentPhase } from "@/lib/store"

export const transitions: Record<ExperimentPhase, ExperimentPhase[]> = {
  baseline: ["injecting"],
  injecting: ["recovering", "failed"],
  recovering: ["completed", "failed"],
  completed: [],
  failed: [],
}

export function canTransition(from: ExperimentPhase, to: ExperimentPhase): boolean {
  return transitions[from].includes(to)
}
