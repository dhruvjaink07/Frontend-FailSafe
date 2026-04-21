"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Topbar } from "@/components/topbar"
import { StatusIndicator } from "@/components/status-indicator"
import { 
  FlaskConical, 
  Search,
  Play,
  Eye,
  Gauge,
  Trash2,
} from "lucide-react"
import type { Experiment, Platform, ExperimentPhase } from "@/lib/store"
import { useAppStore } from "@/lib/store"
import { getExperiments } from "@/lib/api"
import { parseError } from "@/lib/errors/error-handler"

export default function ExperimentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <ExperimentsPageContent />
    </Suspense>
  )
}

function ExperimentsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { filters, setFilters } = useAppStore()

  useEffect(() => {
    getExperiments()
      .then((data) => {
        setExperiments(data)
        setError(null)
      })
      .catch((err) => {
        setError(parseError(err).message)
      })
      .finally(() => setLoading(false))
  }, [])

  // If there are no experiments at all (and no active filters), redirect
  // directly to the Create page so users can start quickly.
  useEffect(() => {
    if (!loading && experiments.length === 0 && filters.platform === 'all' && filters.phase === 'all' && !filters.search) {
      router.replace('/experiments/create')
    }
  }, [loading, experiments.length, filters, router])

  useEffect(() => {
    const platform = searchParams.get("platform") as Platform | "all" | null
    const phase = searchParams.get("phase") as ExperimentPhase | "all" | null
    const search = searchParams.get("search")
    if (platform || phase || search) {
      setFilters({
        platform: platform ?? "all",
        phase: phase ?? "all",
        search: search ?? "",
      })
    }
  }, [searchParams, setFilters])

  const syncFilters = (next: { platform?: Platform | "all"; phase?: ExperimentPhase | "all"; search?: string }) => {
    const merged = { ...filters, ...next }
    setFilters(merged)
    const params = new URLSearchParams()
    if (merged.platform !== "all") params.set("platform", merged.platform)
    if (merged.phase !== "all") params.set("phase", merged.phase)
    if (merged.search) params.set("search", merged.search)
    router.replace(`/experiments?${params.toString()}`)
  }

  const filteredExperiments = experiments.filter(exp => {
    if (filters.platform !== "all" && exp.platform !== filters.platform) return false
    if (filters.phase !== "all" && exp.phase !== filters.phase) return false
    if (filters.search && !exp.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const getPlatformColor = (platform: Platform) => {
    switch (platform) {
      case "backend": return "bg-info/10 text-info border-info/20"
      case "frontend": return "bg-warning/10 text-warning border-warning/20"
      case "android": return "bg-success/10 text-success border-success/20"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar 
        title="Experiments" 
        description="Manage fault injection experiments"
        action={{ label: "New Experiment", href: "/experiments/create" }}
      />
      
      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search experiments..."
                    className="pl-9"
                    value={filters.search}
                    onChange={(e) => syncFilters({ search: e.target.value })}
                  />
                </div>
                <Select
                  value={filters.platform}
                  onValueChange={(value) => syncFilters({ platform: value as Platform | "all" })}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="backend">Backend</SelectItem>
                    <SelectItem value="frontend">Frontend</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.phase}
                  onValueChange={(value) => syncFilters({ phase: value as ExperimentPhase | "all" })}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    <SelectItem value="baseline">Baseline</SelectItem>
                    <SelectItem value="injecting">Injecting</SelectItem>
                    <SelectItem value="recovering">Recovering</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center">
                  <Button variant="outline" className="ml-2" onClick={() => syncFilters({ platform: 'all', phase: 'all', search: '' })}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Experiments List */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>All Experiments</CardTitle>
                <CardDescription>
                  {filteredExperiments.length} experiment{filteredExperiments.length !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredExperiments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FlaskConical className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No Experiments Found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filters.search || filters.platform !== "all" || filters.phase !== "all"
                      ? "No experiments match your filters. Try these quick searches:"
                      : "Create your first experiment to get started or try a quick example search"}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {[
                      "auth-service",
                      "latency",
                      "database",
                      "login_flow",
                      "mobile",
                    ].map((example) => (
                      <Button
                        key={example}
                        variant="outline"
                        size="sm"
                        onClick={() => syncFilters({ search: example })}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Button className="mt-2" asChild>
                      <Link href="/experiments/create">Create Experiment</Link>
                    </Button>
                    <Button variant="ghost" className="mt-2" asChild>
                      <Link href="/docs">Documentation</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredExperiments.map((experiment) => (
                    <div
                      key={experiment.id}
                      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <FlaskConical className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium">{experiment.name}</h4>
                            <Badge variant="outline" className={getPlatformColor(experiment.platform)}>
                              {experiment.platform}
                            </Badge>
                            <StatusIndicator status={experiment.phase} showLabel />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {experiment.faultType} fault on {experiment.targets.join(", ")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Created {formatDate(experiment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:shrink-0">
                        {experiment.phase === "baseline" && (
                          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                            <Link href={`/experiments/${experiment.id}/live?platform=${experiment.platform}`}>
                              <Play className="mr-2 h-4 w-4" />
                              Start
                            </Link>
                          </Button>
                        )}
                        {(experiment.phase === "injecting" || experiment.phase === "recovering") && (
                          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                            <Link href={`/experiments/${experiment.id}/live?platform=${experiment.platform}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Live
                            </Link>
                          </Button>
                        )}
                        {(experiment.phase === "completed" || experiment.phase === "failed") && (
                          <>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                              <Link href={`/experiments/${experiment.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Results
                              </Link>
                            </Button>
                            {experiment.platform === "backend" && (
                              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                <Link href={`/metrics?id=${experiment.id}`}>
                                  <Gauge className="mr-2 h-4 w-4" />
                                  View Metrics
                                </Link>
                              </Button>
                            )}
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
