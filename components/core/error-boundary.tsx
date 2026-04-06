"use client"

import React from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: React.ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error("Page-level error boundary caught an error", error)
  }

  private retry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <h2 className="text-lg font-semibold">{this.props.fallbackTitle ?? "Something crashed"}</h2>
          <p className="text-sm text-muted-foreground">This view failed unexpectedly. Retry without losing the rest of the dashboard.</p>
          <Button variant="outline" onClick={this.retry}>Try again</Button>
        </div>
      )
    }

    return this.props.children
  }
}
