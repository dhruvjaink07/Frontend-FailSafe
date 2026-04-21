"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Topbar } from "@/components/topbar"
import { StatusIndicator } from "@/components/status-indicator"
import { 
  Server,
  Play,
  Square,
  RefreshCw,
  Box,
  HardDrive,
  CheckCircle,
} from "lucide-react"
import type { Container } from "@/lib/api"
import { useAppStore } from "@/lib/store"
import { requestClient } from "@/lib/api/request-client"
import { toast } from "sonner"

type ContainerAction = "starting" | "stopping"

export default function EnvironmentPage() {
  const [actionLoading, setActionLoading] = useState<Record<string, ContainerAction>>({})
  const [engineLoading, setEngineLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containers = useAppStore((state) => state.backendContainers as Container[])
  const backendContainersStatus = useAppStore((state) => state.backendContainersStatus)
  const backendContainersError = useAppStore((state) => state.backendContainersError)
  const backendContainersUnavailable = useAppStore((state) => state.backendContainersUnavailable)
  const loadBackendContainers = useAppStore((state) => state.loadBackendContainers)

  useEffect(() => {
    loadBackendContainers().catch((fetchError) => {
      console.error("Failed to fetch containers:", fetchError)
      setError("Failed to fetch containers")
    })
  }, [loadBackendContainers])

  async function handleStartEngine() {
    if (engineLoading) return

    setEngineLoading(true)
    setError(null)
    toast.info("Starting Docker engine...")
    try {
      await requestClient("/api/containers/engine/start", { method: "POST" })
      toast.success("Docker engine acknowledged")
      await loadBackendContainers({ force: true })
    } catch (error) {
      console.error("Failed to start Docker engine:", error)
      setError("Failed to start Docker engine")
      toast.error("Failed to start Docker engine")
    } finally {
      setEngineLoading(false)
    }
  }

  async function handleStart(name: string) {
    if (actionLoading[name]) return

    setActionLoading((prev) => ({ ...prev, [name]: "starting" }))
    toast.info(`Starting ${name}...`)
    try {
      await requestClient(`/api/containers/${name}/start`, { method: "POST" })
      await loadBackendContainers({ force: true })
      toast.success(`${name} started`)
    } catch (error) {
      console.error("Failed to start container:", error)
      setError("Failed to start container")
      toast.error(`Failed to start ${name}`)
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  // Start container and stream backend response line-by-line to UI
  const [streamingLines, setStreamingLines] = useState<Record<string, string[]>>({})
  const [streaming, setStreaming] = useState<Record<string, boolean>>({})
  const controllersRef = /*#__PURE__*/ useState(() => new Map<string, AbortController>())[0]

  async function handleStartStream(name: string) {
    if (actionLoading[name]) return

    setActionLoading((prev) => ({ ...prev, [name]: "starting" }))
    setStreaming((s) => ({ ...s, [name]: true }))
    setStreamingLines((s) => ({ ...s, [name]: [] }))
    const controller = new AbortController()
    controllersRef.set(name, controller)

    try {
      const res = await fetch(`/api/containers/${encodeURIComponent(name)}/start`, {
        method: "POST",
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        setStreamingLines((s) => ({ ...s, [name]: [...(s[name] || []), `ERROR: ${res.status} ${text}`] }))
        throw new Error(`Start request failed: ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) {
        // No stream available; read as text
        const text = await res.text()
        setStreamingLines((s) => ({ ...s, [name]: [...(s[name] || []), text] }))
      } else {
        const decoder = new TextDecoder()
        let buffer = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split(/\r?\n/)
          buffer = parts.pop() || ""
          if (parts.length) {
            setStreamingLines((s) => ({ ...s, [name]: [...(s[name] || []), ...parts] }))
          }
        }
        if (buffer) {
          setStreamingLines((s) => ({ ...s, [name]: [...(s[name] || []), buffer] }))
        }
      }

      // final refresh of containers state
      await loadBackendContainers({ force: true })
      toast.success(`${name} started`)
    } catch (err) {
      console.error("Stream start error", err)
      toast.error(`Failed to start ${name}`)
    } finally {
      controllersRef.delete(name)
      setStreaming((s) => {
        const next = { ...s }
        delete next[name]
        return next
      })
      setActionLoading((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  function cancelStream(name: string) {
    const ctrl = controllersRef.get(name)
    if (ctrl) {
      ctrl.abort()
      controllersRef.delete(name)
      setStreaming((s) => {
        const next = { ...s }
        delete next[name]
        return next
      })
      setStreamingLines((s) => ({ ...s, [name]: [...(s[name] || []), "<stream aborted>"] }))
    }
  }

  async function handleStop(name: string) {
    if (actionLoading[name]) return

    setActionLoading((prev) => ({ ...prev, [name]: "stopping" }))
    toast.info(`Stopping ${name}...`)
    try {
      await requestClient(`/api/containers/${name}/stop`, { method: "POST" })
      await loadBackendContainers({ force: true })
      toast.success(`${name} stopped`)
    } catch (error) {
      console.error("Failed to stop container:", error)
      setError("Failed to stop container")
      toast.error(`Failed to stop ${name}`)
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const runningCount = containers.filter(c => c.status === "running").length
  const stoppedCount = containers.filter(c => c.status === "stopped").length

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar 
        title="Environment" 
        description="Manage test containers and services"
      />
      
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Docker Engine Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-primary" />
                    Docker Engine
                  </CardTitle>
                  <CardDescription>Container runtime status</CardDescription>
                </div>
                {backendContainersUnavailable ? (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <span className="mr-1 h-3 w-3 inline-block" />
                    Disconnected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-end">
                {!backendContainersUnavailable ? (
                  <div className="text-sm text-muted-foreground">Engine running</div>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleStartEngine} disabled={engineLoading}>
                    {engineLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Start Docker Engine
                  </Button>
                )}
              </div>
              {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-2xl font-bold">{containers.length}</p>
                  <p className="text-sm text-muted-foreground">Total Containers</p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-2xl font-bold text-success">{runningCount}</p>
                  <p className="text-sm text-muted-foreground">Running</p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{stoppedCount}</p>
                  <p className="text-sm text-muted-foreground">Stopped</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Container List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    Containers
                  </CardTitle>
                  <CardDescription>Test environment services</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadBackendContainers({ force: true })}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncing || backendContainersStatus === "loading" ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {backendContainersStatus === "loading" || backendContainersStatus === "idle" ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : backendContainersError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Server className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-destructive">{backendContainersError}</p>
                </div>
              ) : containers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Server className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No containers found</p>
                  <p className="text-sm text-muted-foreground mt-2">Ensure Docker is running and containers are available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {containers.map((container) => (
                    <div
                      key={container.id}
                      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          container.status === "running" ? "bg-success/10" : "bg-muted"
                        }`}>
                          <Server className={`h-5 w-5 ${
                            container.status === "running" ? "text-success" : "text-muted-foreground"
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{container.name}</h4>
                            <StatusIndicator 
                              status={container.status === "running" ? "running" : "stopped"} 
                              showLabel 
                            />
                            {actionLoading[container.name] === "starting" && (
                              <Badge variant="outline" className="border-info/20 bg-info/10 text-info">Starting...</Badge>
                            )}
                            {actionLoading[container.name] === "stopping" && (
                              <Badge variant="outline" className="border-warning/20 bg-warning/10 text-warning">Stopping...</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {container.image}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {container.ports.map((port) => (
                              <Badge key={port} variant="secondary" className="font-mono text-xs">
                                {port}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        {container.status === "running" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStop(container.name)}
                            disabled={!!actionLoading[container.name]}
                          >
                            {actionLoading[container.name] ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Square className="mr-2 h-4 w-4" />
                            )}
                            Stop
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStart(container.name)}
                              disabled={!!actionLoading[container.name]}
                            >
                              {actionLoading[container.name] ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="mr-2 h-4 w-4" />
                              )}
                              Start
                            </Button>
                            <div className="ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartStream(container.name)}
                                disabled={!!actionLoading[container.name] || !!streaming[container.name]}
                              >
                                Start & Stream
                              </Button>
                            </div>
                          </>
                        )}
                      </div>

                      {streamingLines[container.name] && streamingLines[container.name].length > 0 && (
                        <div className="mt-2 rounded border border-border bg-muted p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm font-medium">Live Start Output</div>
                            {streaming[container.name] ? (
                              <Button size="sm" variant="ghost" onClick={() => cancelStream(container.name)}>Abort</Button>
                            ) : null}
                          </div>
                          <pre className="max-h-40 overflow-auto text-xs font-mono">{streamingLines[container.name].join("\n")}</pre>
                        </div>
                      )}
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
 
