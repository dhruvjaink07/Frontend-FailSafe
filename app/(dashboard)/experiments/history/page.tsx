"use client"

import { Fragment, Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Topbar } from "@/components/topbar"
import { getExperimentHistory, getExperimentHistoryDetail } from "@/lib/api"
import { parseError } from "@/lib/errors/error-handler"
import type { ExperimentHistoryItem } from "@/lib/api"
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, FlaskConical, History, ListChecks } from "lucide-react"

const DEFAULT_LIMIT = 10

function asSummaryLabel(item: ExperimentHistoryItem): { label: string; tone: "default" | "secondary" | "destructive" | "outline" } {
  if (!item.summary) return { label: "No summary", tone: "outline" }

  if (item.experiment.target_type === "android") {
    const summary = item.summary as {
      health_status?: string
      severity?: string
      recovered?: boolean
      running?: boolean
    }
    return {
      label: summary.health_status || summary.severity || (summary.recovered ? "Recovered" : summary.running ? "Running" : "Unknown"),
      tone: summary.severity === "critical" || summary.severity === "high" ? "destructive" : summary.recovered ? "secondary" : "outline",
    }
  }

  const summary = item.summary as { system_severity?: string; blast_radius?: number; cascade_depth?: number }
  return {
    label: summary.system_severity ? `${summary.system_severity}` : `Blast ${summary.blast_radius ?? 0}%`,
    tone: summary.system_severity === "critical" || summary.system_severity === "high" ? "destructive" : summary.system_severity === "medium" ? "secondary" : "outline",
  }
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (!value || Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function HistoryPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ExperimentHistoryItem[]>([])
  const [count, setCount] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailById, setDetailById] = useState<Record<string, ExperimentHistoryItem>>({})
  const [detailLoadingById, setDetailLoadingById] = useState<Record<string, boolean>>({})
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [faultTypeFilter, setFaultTypeFilter] = useState<string>("all")

  async function toggleDetails(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }

    setExpandedId(id)
    if (detailById[id]) return

    setDetailLoadingById((prev) => ({ ...prev, [id]: true }))
    try {
      const detailed = await getExperimentHistoryDetail(id)
      setDetailById((prev) => ({ ...prev, [id]: detailed }))
    } catch {
      // Keep list item content as fallback when detail endpoint is unavailable.
    } finally {
      setDetailLoadingById((prev) => ({ ...prev, [id]: false }))
    }
  }

  useEffect(() => {
    const nextLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT)
    const nextOffset = Number(searchParams.get("offset") ?? 0)
    setLimit(Number.isFinite(nextLimit) && nextLimit > 0 ? Math.min(nextLimit, 200) : DEFAULT_LIMIT)
    setOffset(Number.isFinite(nextOffset) && nextOffset >= 0 ? nextOffset : 0)
  }, [searchParams])

  useEffect(() => {
    setLoading(true)
    getExperimentHistory({ limit, offset })
      .then((response) => {
        console.log("📋 History response:", response)
        setItems(response.items)
        setCount(response.count)
        setLimit(response.limit)
        setOffset(response.offset)
        setError(null)
      })
      .catch((err) => {
        console.error("❌ History error:", err)
        setError(parseError(err).message)
      })
      .finally(() => setLoading(false))
  }, [limit, offset])

  const canPrev = offset > 0
  const canNext = offset + limit < count

  const pageStart = count === 0 ? 0 : offset + 1
  const pageEnd = Math.min(offset + items.length, count)

  const platformOptions = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.experiment.target_type).filter((value) => Boolean(value && value.trim())))).sort()
  }, [items])

  const stateOptions = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.experiment.state).filter((value) => Boolean(value && value.trim())))).sort()
  }, [items])

  const faultTypeOptions = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.experiment.fault_type).filter((value) => Boolean(value && value.trim())))).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (platformFilter !== "all" && item.experiment.target_type !== platformFilter) return false
      if (stateFilter !== "all" && item.experiment.state !== stateFilter) return false
      if (faultTypeFilter !== "all" && item.experiment.fault_type !== faultTypeFilter) return false
      return true
    })
  }, [faultTypeFilter, items, platformFilter, stateFilter])

  const navigate = (nextOffset: number) => {
    const params = new URLSearchParams()
    params.set("limit", String(limit))
    params.set("offset", String(Math.max(0, nextOffset)))
    router.replace(`/experiments/history?${params.toString()}`)
    router.refresh()
  }

  const summaryText = useMemo(() => {
    if (loading) return "Loading history"
    if (count === 0) return "No historical experiments found"
    if (filteredItems.length !== items.length) return `Filtered ${filteredItems.length} of ${items.length} on this page`
    return `${pageStart}-${pageEnd} of ${count}`
  }, [count, filteredItems.length, items.length, loading, pageEnd, pageStart])

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar title="Experiment History" description="API-key scoped records with aggregated, raw, and summary data" />

      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Experiment History
                  </CardTitle>
                  <CardDescription>{summaryText}</CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button variant="outline" asChild>
                    <Link href="/experiments">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Experiments
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => navigate(offset)}>
                    Refresh
                  </Button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {platformOptions.map((platform) => (
                      <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {stateOptions.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={faultTypeFilter} onValueChange={setFaultTypeFilter}>
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue placeholder="Fault Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fault Types</SelectItem>
                    {faultTypeOptions.map((faultType) => (
                      <SelectItem key={faultType} value={faultType}>{faultType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setPlatformFilter("all")
                    setStateFilter("all")
                    setFaultTypeFilter("all")
                  }}
                >
                  Clear Filters
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : items.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ListChecks className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyTitle>No history yet</EmptyTitle>
                    <EmptyDescription>
                      History records will appear here once experiments are created with the active API key.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/experiments/create">
                        <FlaskConical className="mr-2 h-4 w-4" />
                        Create Experiment
                      </Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : filteredItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No rows match the selected filters.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Experiment</TableHead>
                          <TableHead>Platform</TableHead>
                          <TableHead>Fault Type</TableHead>
                          <TableHead>State / Phase</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => {
                          const detailedItem = detailById[item.experiment.id] ?? item
                          const isExpanded = expandedId === item.experiment.id
                          const isLoadingDetail = Boolean(detailLoadingById[item.experiment.id])
                          return (
                              <Fragment key={item.experiment.id}>
                              <TableRow>
                              <TableCell className="font-mono text-xs sm:text-sm">{item.experiment.id}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{item.experiment.target_type}</Badge>
                              </TableCell>
                              <TableCell className="capitalize">{item.experiment.fault_type}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="text-sm font-medium capitalize">{item.experiment.state}</div>
                                  <div className="text-xs text-muted-foreground capitalize">{item.experiment.phase}</div>
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(item.experiment.created_at)}</TableCell>
                              <TableCell>{formatDate(item.experiment.updated_at)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleDetails(item.experiment.id)}
                                  >
                                    <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    {isExpanded ? "Hide" : isLoadingDetail ? "Loading..." : "Details"}
                                  </Button>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/experiments/${item.experiment.id}/live?platform=${item.experiment.target_type}`}>
                                      View
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={7} className="bg-muted/20 p-0">
                                  <div className="space-y-4 p-4">
                                    <div className="grid gap-4 lg:grid-cols-3">
                                      <Card className="border-border/70">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-sm">Experiment Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                          <p><span className="text-muted-foreground">Fault:</span> {detailedItem.experiment.fault_type}</p>
                                          <p><span className="text-muted-foreground">Platform:</span> {detailedItem.experiment.target_type}</p>
                                          <p><span className="text-muted-foreground">State:</span> {detailedItem.experiment.state}</p>
                                          <p><span className="text-muted-foreground">Phase:</span> {detailedItem.experiment.phase}</p>
                                        </CardContent>
                                      </Card>

                                      <Card className="border-border/70 lg:col-span-2">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-sm">Status Payload</CardTitle>
                                          <CardDescription>Latest stored payload from the backend, if available.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                          {detailedItem.metrics.status_payload ? (
                                            <pre className="max-h-72 overflow-auto rounded-lg bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                                              {formatJson(detailedItem.metrics.status_payload)}
                                            </pre>
                                          ) : (
                                            <p className="text-sm text-muted-foreground">No status payload stored for this experiment.</p>
                                          )}
                                        </CardContent>
                                      </Card>
                                    </div>

                                    <Card className="border-border/70">
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Aggregated Endpoint Metrics</CardTitle>
                                        <CardDescription>
                                          Endpoint-level p50/p95/p99/avg/error_rate/degraded values.
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent className="overflow-x-auto p-0">
                                        {detailedItem.metrics.aggregated.length === 0 ? (
                                          <p className="p-4 text-sm text-muted-foreground">No aggregated rows returned.</p>
                                        ) : (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Endpoint</TableHead>
                                                <TableHead className="text-right">Requests</TableHead>
                                                <TableHead className="text-right">P50</TableHead>
                                                <TableHead className="text-right">P95</TableHead>
                                                <TableHead className="text-right">P99</TableHead>
                                                <TableHead className="text-right">Avg</TableHead>
                                                <TableHead className="text-right">Error Rate</TableHead>
                                                <TableHead className="text-right">Degraded</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {detailedItem.metrics.aggregated
                                                .slice()
                                                .sort((a, b) => Number(b.degraded) - Number(a.degraded) || b.error_rate - a.error_rate || b.p95_ms - a.p95_ms)
                                                .map((row) => (
                                                  <TableRow key={row.endpoint}>
                                                    <TableCell className="font-mono text-xs">{row.endpoint}</TableCell>
                                                    <TableCell className="text-right">{row.requests_total}</TableCell>
                                                    <TableCell className="text-right">{row.p50_ms}</TableCell>
                                                    <TableCell className="text-right">{row.p95_ms}</TableCell>
                                                    <TableCell className="text-right">{row.p99_ms}</TableCell>
                                                    <TableCell className="text-right">{row.avg_ms}</TableCell>
                                                    <TableCell className="text-right">{row.error_rate}</TableCell>
                                                    <TableCell className="text-right">
                                                      <Badge variant={row.degraded ? "destructive" : "secondary"}>
                                                        {row.degraded ? "Yes" : "No"}
                                                      </Badge>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                            </TableBody>
                                          </Table>
                                        )}
                                      </CardContent>
                                    </Card>

                                    <Card className="border-border/70">
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Raw Samples</CardTitle>
                                        <CardDescription>
                                          Raw events captured for the experiment.
                                        </CardDescription>
                                      </CardHeader>
                                      <CardContent>
                                        {detailedItem.metrics.raw.length === 0 ? (
                                          <p className="text-sm text-muted-foreground">No raw samples stored.</p>
                                        ) : (
                                          <>
                                            <p className="mb-3 text-sm text-muted-foreground">
                                              Showing {Math.min(3, detailedItem.metrics.raw.length)} of {detailedItem.metrics.raw.length} raw records.
                                            </p>
                                            <div className="space-y-3">
                                              {detailedItem.metrics.raw.slice(0, 3).map((sample, index) => (
                                                <pre key={index} className="max-h-56 overflow-auto rounded-lg bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                                                  {formatJson(sample)}
                                                </pre>
                                              ))}
                                            </div>
                                          </>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                            </Fragment>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {pageStart}-{pageEnd} of {count}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(offset - limit)} disabled={!canPrev}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(offset + limit)} disabled={!canNext}>
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <HistoryPageContent />
    </Suspense>
  )
}