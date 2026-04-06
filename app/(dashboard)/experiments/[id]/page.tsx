"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Topbar } from "@/components/topbar"
import { StatusIndicator } from "@/components/status-indicator"
import { 
  ArrowLeft,
  Play,
  Clock,
  Target,
  Gauge,
  CheckCircle,
  XCircle,
} from "lucide-react"
import type { Experiment } from "@/lib/store"

interface ExperimentPageProps {
  params: Promise<{ id: string }>
}

export default function ExperimentPage({ params }: ExperimentPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchExperiment() {
      try {
        const res = await fetch(`/api/experiments/${id}`)
        if (res.ok) {
          const data = await res.json()
          setExperiment(data)
        }
      } catch (error) {
        console.error("Failed to fetch experiment:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchExperiment()
  }, [id])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Topbar title="Loading..." />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!experiment) {
    return (
      <div className="flex min-h-screen flex-col">
        <Topbar title="Experiment Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">The experiment you are looking for does not exist.</p>
          <Button onClick={() => router.push("/experiments")}>Back to Experiments</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar title={experiment.name} description="Experiment details and results" />
      
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    experiment.phase === "completed" ? "bg-success/10" : 
                    experiment.phase === "failed" ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    {experiment.phase === "completed" ? (
                      <CheckCircle className="h-6 w-6 text-success" />
                    ) : experiment.phase === "failed" ? (
                      <XCircle className="h-6 w-6 text-destructive" />
                    ) : (
                      <Play className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <CardTitle>{experiment.name}</CardTitle>
                    <CardDescription>
                      Created {formatDate(experiment.createdAt)}
                    </CardDescription>
                  </div>
                </div>
                <StatusIndicator status={experiment.phase} showLabel size="lg" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Platform</p>
                  <p className="mt-1 font-medium capitalize">{experiment.platform}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Fault Type</p>
                  <p className="mt-1 font-medium capitalize">{experiment.faultType}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="mt-1 font-medium">{experiment.duration}s</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Max Intensity</p>
                  <p className="mt-1 font-medium">{experiment.maxIntensity}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Targets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Targets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {experiment.targets.map((target) => (
                  <Badge key={target} variant="secondary" className="font-mono">
                    {target}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <span className="text-muted-foreground">Adaptive Mode</span>
                  <Badge variant={experiment.adaptive ? "default" : "secondary"}>
                    {experiment.adaptive ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <span className="text-muted-foreground">Step Intensity</span>
                  <span className="font-medium">{experiment.stepIntensity}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">{formatDate(experiment.createdAt)}</p>
                  </div>
                </div>
                {experiment.startedAt && (
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-warning" />
                    <div>
                      <p className="font-medium">Started</p>
                      <p className="text-sm text-muted-foreground">{formatDate(experiment.startedAt)}</p>
                    </div>
                  </div>
                )}
                {experiment.completedAt && (
                  <div className="flex items-center gap-4">
                    <div className={`h-2 w-2 rounded-full ${
                      experiment.phase === "completed" ? "bg-success" : "bg-destructive"
                    }`} />
                    <div>
                      <p className="font-medium">{experiment.phase === "completed" ? "Completed" : "Failed"}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(experiment.completedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {experiment.phase === "baseline" && (
            <div className="flex justify-end">
              <Button asChild>
                <Link href={`/experiments/${experiment.id}/live`}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Experiment
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
