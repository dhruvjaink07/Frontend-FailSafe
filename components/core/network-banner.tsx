"use client"

import { Wifi, WifiOff } from "lucide-react"

interface NetworkBannerProps {
  online: boolean
}

export function NetworkBanner({ online }: NetworkBannerProps) {
  if (online) return null

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <WifiOff className="h-4 w-4" />
      Disconnected. Reconnecting with backoff.
      <Wifi className="h-4 w-4 opacity-40" />
    </div>
  )
}
