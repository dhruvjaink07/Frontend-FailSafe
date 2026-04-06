import { cn } from "@/lib/utils"
import { statusColor } from "@/lib/ui/status-rules"

type Status = "running" | "stopped" | "degraded" | "healthy" | "baseline" | "injecting" | "recovering" | "completed" | "failed"

interface StatusIndicatorProps {
  status: Status
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

const statusConfig: Record<Status, { color: string; label: string }> = {
  running: { color: statusColor.running.replace("text-", "bg-"), label: "Running" },
  stopped: { color: "bg-muted-foreground", label: "Stopped" },
  degraded: { color: statusColor.degraded.replace("text-", "bg-"), label: "Degraded" },
  healthy: { color: statusColor.healthy.replace("text-", "bg-"), label: "Healthy" },
  baseline: { color: "bg-info", label: "Baseline" },
  injecting: { color: statusColor.degraded.replace("text-", "bg-"), label: "Injecting" },
  recovering: { color: statusColor.recovering.replace("text-", "bg-"), label: "Recovering" },
  completed: { color: statusColor.completed.replace("text-", "bg-"), label: "Completed" },
  failed: { color: statusColor.failed.replace("text-", "bg-"), label: "Failed" },
}

const sizeConfig = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
}

export function StatusIndicator({ status, showLabel = false, size = "md" }: StatusIndicatorProps) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <span className={cn("rounded-full", config.color, sizeConfig[size])} />
      {showLabel && (
        <span className="text-sm text-muted-foreground">{config.label}</span>
      )}
    </div>
  )
}
