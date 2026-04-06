export type UiStatus = "running" | "completed" | "failed" | "recovering" | "degraded" | "healthy"

export const statusColor: Record<UiStatus, string> = {
  running: "text-info",
  completed: "text-success",
  failed: "text-destructive",
  recovering: "text-warning",
  degraded: "text-warning",
  healthy: "text-success",
}

export const statusPriority: Record<UiStatus, number> = {
  failed: 1,
  degraded: 2,
  recovering: 3,
  running: 4,
  healthy: 5,
  completed: 6,
}

export function compareStatusPriority(a: UiStatus, b: UiStatus): number {
  return statusPriority[a] - statusPriority[b]
}
