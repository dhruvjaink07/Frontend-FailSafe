"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Topbar } from "@/components/topbar"
import { StatusIndicator } from "@/components/status-indicator"
import { ConnectionStatusCard } from "@/components/core/connection-status-card"
import { 
  FlaskConical, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight,
  Zap,
} from "lucide-react"
import { getExperiments, getSystemMetrics } from "@/lib/api"
import type { Experiment, SystemMetrics } from "@/lib/store"

export default function DashboardPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [experimentsLoading, setExperimentsLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchExperiments() {
      try {
        const expData = await getExperiments()
        if (!cancelled) {
          setExperiments(expData)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard experiments:", error)
      } finally {
        if (!cancelled) {
          setExperimentsLoading(false)
        }
      }
    }

    async function fetchMetrics() {
      try {
        const metricsData = await getSystemMetrics()
        if (!cancelled) {
          setSystemMetrics(metricsData)
          setMetricsError(null)
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load system metrics"
          console.error("Failed to fetch dashboard metrics:", error)
          setSystemMetrics(null)
          setMetricsError(message)
        }
      } finally {
        if (!cancelled) {
          setMetricsLoading(false)
        }
      }
    }

    fetchExperiments()
    fetchMetrics()

    const experimentsInterval = setInterval(fetchExperiments, 5000)
    const metricsInterval = setInterval(fetchMetrics, 30000)

    return () => {
      cancelled = true
      clearInterval(experimentsInterval)
      clearInterval(metricsInterval)
    }
  }, [])

  const activeExperiments = experiments.filter(
    e => e.phase === "baseline" || e.phase === "injecting" || e.phase === "recovering"
  )
  const completedCount = experiments.filter(e => e.phase === "completed").length
  const failedCount = experiments.filter(e => e.phase === "failed").length
  const metricsUnavailable = !metricsLoading && systemMetrics === null

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "bg-success/10 text-success border-success/20"
      case "medium": return "bg-warning/10 text-warning border-warning/20"
      case "high": return "bg-destructive/10 text-destructive border-destructive/20"
      case "critical": return "bg-destructive/10 text-destructive border-destructive/20"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar 
        title="Dashboard" 
        description="System overview and active experiments"
        action={{ label: "New Experiment", href: "/experiments/create" }}
      />
      
      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <ConnectionStatusCard />

          {metricsUnavailable ? (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    System metrics unavailable
                  </CardTitle>
                  <CardDescription>
                    The dashboard is still loading experiments, but the system metrics endpoint is returning an error.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-warning/30 text-warning">
                  Degraded
                </Badge>
              </CardHeader>
              {metricsError ? (
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {metricsError}
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Experiments
                </CardTitle>
                <FlaskConical className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {experimentsLoading ? "..." : activeExperiments.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {completedCount} completed, {failedCount} failed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Blast Radius
                </CardTitle>
                <Activity className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricsLoading ? "..." : systemMetrics ? `${systemMetrics.blastRadius}%` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemMetrics ? "Affected system surface" : "Metrics unavailable"}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cascade Depth
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricsLoading ? "..." : systemMetrics ? systemMetrics.cascadeDepth : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemMetrics ? "Failure propagation levels" : "Metrics unavailable"}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  System Severity
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <Badge 
                  variant="outline" 
                  className={getSeverityColor(systemMetrics?.severity || (metricsUnavailable ? "unknown" : "low"))}
                >
                  {metricsLoading ? "..." : systemMetrics?.severity?.toUpperCase() ?? "UNAVAILABLE"}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  {systemMetrics ? "Current system state" : "System metrics endpoint unavailable"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Experiments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Experiments</CardTitle>
                  <CardDescription>
                    Currently running fault injection tests
                  </CardDescription>
                </div>
                  <Button variant="outline" size="sm" asChild>
                  <Link href="/experiments">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {experimentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : activeExperiments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FlaskConical className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No Active Experiments</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Start a new experiment to test system resilience
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/experiments/create">Create Experiment</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeExperiments.map((experiment) => (
                    <div
                      key={experiment.id}
                      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium">{experiment.name}</h4>
                            <StatusIndicator status={experiment.phase} showLabel />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {experiment.faultType} on {experiment.targets.join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-medium">
                            {experiment.currentIntensity}%
                          </p>
                          <p className="text-xs text-muted-foreground">intensity</p>
                        </div>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                          <Link href={`/experiments/${experiment.id}/live`}>
                            View Live
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
              <Link href="/experiments/create">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base transition-colors duration-300">
                    <FlaskConical className="h-5 w-5 text-primary" />
                    Create Experiment
                  </CardTitle>
                  <CardDescription>
                    Configure and start a new fault injection test
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
            
            <Card className="cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-info/30">
              <Link href="/metrics">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base transition-colors duration-300">
                    <Activity className="h-5 w-5 text-info" />
                    View Metrics
                  </CardTitle>
                  <CardDescription>
                    Analyze system performance and resilience data
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
            
            <Card className="cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-warning/30">
              <Link href="/environment">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base transition-colors duration-300">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Manage Environment
                  </CardTitle>
                  <CardDescription>
                    Monitor and control test containers
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
