"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global app error", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Application error</h1>
      <p className="max-w-lg text-sm text-muted-foreground">
        A critical view failed to render. Reset the boundary to recover without restarting your whole session.
      </p>
      <Button onClick={reset}>Retry</Button>
    </div>
  )
}
