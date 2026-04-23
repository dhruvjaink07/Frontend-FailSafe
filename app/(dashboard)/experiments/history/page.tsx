"use client"

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react"
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
import useSWR from "swr"
import { useAppStore } from "@/lib/store"
import { parseError } from "@/lib/errors/error-handler"
import type { ExperimentHistoryItem } from "@/lib/api"
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, FlaskConical, History, ListChecks } from "lucide-react"

const DEFAULT_LIMIT = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// Module-level caches so state survives component unmount/mount (back/forward)
const HISTORY_CACHE_KEY = "fs:history:cache"
const HISTORY_DETAIL_CACHE_KEY = "fs:history:detail_cache"

function readSessionCache<T>(key: string): T | null {
  try {
    if (typeof sessionStorage === "undefined") return null
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeSessionCache<T>(key: string, value: T) {
  try {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

const globalHistCache = (globalThis as any).__fs_history_cache || readSessionCache<Record<string, { items: ExperimentHistoryItem[]; count: number; limit: number; offset: number }>>(HISTORY_CACHE_KEY) || {}
;(globalThis as any).__fs_history_cache = globalHistCache

const globalHistDetailCache = (globalThis as any).__fs_history_detail_cache || readSessionCache<Record<string, ExperimentHistoryItem>>(HISTORY_DETAIL_CACHE_KEY) || {}
;(globalThis as any).__fs_history_detail_cache = globalHistDetailCache

const historyCache = globalHistCache
const historyDetailCache = globalHistDetailCache

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
  // per-mount controller (stays in ref) but use module-level cache above
  const fetchControllerRef = useRef<AbortController | null>(null)
  const { historyState, setHistoryState } = useAppStore()
  const [items, setItems] = useState<ExperimentHistoryItem[]>([])
  const [count, setCount] = useState(0)
  const [limit, setLimit] = useState(() => {
    const urlLimit = Number(searchParams.get("limit") ?? NaN)
    if (Number.isFinite(urlLimit) && urlLimit > 0) return Math.min(urlLimit, 200)
    return historyState?.limit ?? DEFAULT_LIMIT
  })
  const [offset, setOffset] = useState(() => {
    const urlOffset = Number(searchParams.get("offset") ?? NaN)
    if (Number.isFinite(urlOffset) && urlOffset >= 0) return urlOffset
    return historyState?.offset ?? 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailById, setDetailById] = useState<Record<string, ExperimentHistoryItem>>({})
  const [detailLoadingById, setDetailLoadingById] = useState<Record<string, boolean>>({})
  const [platformFilter, setPlatformFilter] = useState<string>(() => historyState?.platform ?? "all")
  const [stateFilter, setStateFilter] = useState<string>(() => historyState?.phase ?? "all")
  const [faultTypeFilter, setFaultTypeFilter] = useState<string>(() => historyState?.faultType ?? "all")

  async function toggleDetails(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }

      setExpandedId(id)
      // Avoid duplicate fetches if already loading or cached
      if (detailById[id] || detailLoadingById[id]) return

      // If we have a module-level cached detail, use it
      const cachedDetail = historyDetailCache[id]
      if (cachedDetail) {
        setDetailById((prev) => ({ ...prev, [id]: cachedDetail }))
        return
      }

      setDetailLoadingById((prev) => ({ ...prev, [id]: true }))
      try {
        const detailed = await getExperimentHistoryDetail(id)
        historyDetailCache[id] = detailed
        try { writeSessionCache(HISTORY_DETAIL_CACHE_KEY, historyDetailCache) } catch {}
        setDetailById((prev) => ({ ...prev, [id]: detailed }))
      } catch {
        // Keep list item content as fallback when detail endpoint is unavailable.
      } finally {
        setDetailLoadingById((prev) => ({ ...prev, [id]: false }))
      }
  }

  useEffect(() => {
    // Use SWR to fetch & dedupe requests. We still read module cache first
    const nextLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT)
    const nextOffset = Number(searchParams.get("offset") ?? 0)
    const effectiveLimit = Number.isFinite(nextLimit) && nextLimit > 0 ? Math.min(nextLimit, 200) : DEFAULT_LIMIT
    const effectiveOffset = Number.isFinite(nextOffset) && nextOffset >= 0 ? nextOffset : 0

    const cacheKey = `${effectiveLimit}:${effectiveOffset}`
    const cached = historyCache[cacheKey]
    if (cached) {
      setItems(cached.items)
      setCount(cached.count)
      setLimit(cached.limit)
      setOffset(cached.offset)
      setError(null)
      setLoading(false)
      return
    }

    // Let SWR drive network requests and update state when ready
    // (useSWR call below is based on searchParams.toString())
  }, [searchParams.toString()])

  // SWR hook (dedupes in-flight requests)
  const nextLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT)
  const nextOffset = Number(searchParams.get("offset") ?? 0)
  const effectiveLimit = Number.isFinite(nextLimit) && nextLimit > 0 ? Math.min(nextLimit, 200) : DEFAULT_LIMIT
  const effectiveOffset = Number.isFinite(nextOffset) && nextOffset >= 0 ? nextOffset : 0
  const swrKey = `history:${effectiveLimit}:${effectiveOffset}`
  const { data: swrData, error: swrError, isLoading: swrLoading } = useSWR(swrKey, () => getExperimentHistory({ limit: effectiveLimit, offset: effectiveOffset }), {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  useEffect(() => {
    const cacheKey = `${effectiveLimit}:${effectiveOffset}`
    if (swrData) {
      historyCache[cacheKey] = { items: swrData.items, count: swrData.count, limit: swrData.limit, offset: swrData.offset }
      try { writeSessionCache(HISTORY_CACHE_KEY, historyCache) } catch {}
      setItems(swrData.items)
      setCount(swrData.count)
      setLimit(effectiveLimit)
      setOffset(swrData.offset)
      setError(null)
    }
    if (swrError) {
      setError(parseError(swrError).message)
    }
    setLoading(Boolean(swrLoading) && !Boolean(historyCache[cacheKey]))
  }, [swrData, swrError, swrLoading, effectiveLimit, effectiveOffset])

  const canPrev = offset > 0
  // Use the number of items actually returned to decide if there's a next page.
  const canNext = offset + items.length < count

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
    // Update URL and local state without forcing a full refresh
    router.replace(`/experiments/history?${params.toString()}`)
    setOffset(Math.max(0, nextOffset))
    setHistoryState({ offset: Math.max(0, nextOffset) })
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
                <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setHistoryState({ platform: v as any }) }}>
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

                <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setHistoryState({ phase: v as any }) }}>
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

                <Select value={faultTypeFilter} onValueChange={(v) => { setFaultTypeFilter(v); setHistoryState({ faultType: v }) }}>
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
                    setHistoryState({ platform: "all", phase: "all", faultType: "all" })
                  }}
                >
                  Clear Filters
                </Button>

                <div className="ml-auto sm:ml-0">
                  <label className="sr-only">Page size</label>
                  <Select value={String(limit)} onValueChange={(v) => {
                    const newLimit = Number(v)
                    if (!Number.isFinite(newLimit) || newLimit <= 0) return
                    setLimit(newLimit)
                    setOffset(0)
                    setHistoryState({ limit: newLimit, offset: 0 })
                    const params = new URLSearchParams()
                    params.set("limit", String(newLimit))
                    params.set("offset", String(0))
                    // Update URL without forcing refresh; the effect watches searchParams
                    router.replace(`/experiments/history?${params.toString()}`)
                  }}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Per page" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    <Table className="table-fixed">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-64">Experiment</TableHead>
                          <TableHead className="w-28">Platform</TableHead>
                          <TableHead className="w-36">Fault Type</TableHead>
                          <TableHead className="w-40">State / Phase</TableHead>
                          <TableHead className="w-36">Created</TableHead>
                          <TableHead className="w-36">Last Updated</TableHead>
                          <TableHead className="w-56 text-right">Actions</TableHead>
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
                              <TableCell className="font-mono text-xs sm:text-sm">
                                <div className="max-w-[16rem] truncate">{item.experiment.id}</div>
                              </TableCell>
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
                              <TableCell className="text-right align-middle">
                                <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                  <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                                    <Link href={`/metrics?id=${item.experiment.id}&platform=${item.experiment.target_type}`}>
                                      <ChevronDown className={`mr-2 h-4 w-4`} />
                                      Details
                                    </Link>
                                  </Button>
                                  <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                                    <Link href={`/experiments/${item.experiment.id}/live?platform=${item.experiment.target_type}`}>
                                      View
                                    </Link>
                                  </Button>
                                  {/* Logs action removed per user request */}
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
                                    </div>
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