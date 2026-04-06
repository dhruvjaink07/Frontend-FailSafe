"use client"

import { Badge } from "@/components/ui/badge"
import { AlertCircle, WifiOff } from "lucide-react"

interface DataStateIndicatorProps {
  state: "initial_loading" | "partial" | "stale" | "disconnected" | "ready"
}

export function DataStateIndicator({ state }: DataStateIndicatorProps) {
  if (state === "ready") return null

  if (state === "initial_loading") {
    return <Badge variant="outline">Loading data...</Badge>
  }

  if (state === "partial") {
    return (
      <Badge variant="outline" className="border-warning/30 text-warning">
        <AlertCircle className="mr-1 h-3 w-3" />
        Partial data
      </Badge>
    )
  }

  if (state === "stale") {
    return (
      <Badge variant="outline" className="border-warning/30 text-warning">
        <AlertCircle className="mr-1 h-3 w-3" />
        Data delayed
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-destructive/30 text-destructive">
      <WifiOff className="mr-1 h-3 w-3" />
      Disconnected
    </Badge>
  )
}
