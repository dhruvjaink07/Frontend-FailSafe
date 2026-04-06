"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { PermissionGuard } from "@/components/core/permission-guard"
import { Topbar } from "@/components/topbar"
import { features } from "@/lib/config/features"
import { saveLastExperimentConfig } from "@/lib/storage/session-cache"
import { validateExperimentForm } from "@/lib/validators/experiment-validator"
import {
  getSessionRole,
  startAndroidExperiment,
  startBackendExperiment,
  startFrontendExperiment,
  uploadAndroidApk,
} from "@/lib/api"
import { useAppStore } from "@/lib/store"
import { 
  Server, 
  Monitor, 
  Smartphone,
  Zap,
  Clock,
  Target,
  X,
  Plus,
} from "lucide-react"
import type { Platform, FaultType } from "@/lib/store"
import type { BackendContainerSummary } from "@/lib/store"

const faultTypeSets: Record<Platform, { value: FaultType; label: string; description: string }[]> = {
  backend: [
    { value: "kill", label: "Kill", description: "Kill/restart a Docker target" },
    { value: "network_delay", label: "Network Delay", description: "Add latency to network traffic" },
    { value: "packet_loss", label: "Packet Loss", description: "Drop packets under load" },
    { value: "cpu_stress", label: "CPU Stress", description: "Throttle CPU availability" },
    { value: "memory_stress", label: "Memory Stress", description: "Apply memory pressure" },
  ],
  frontend: [
    { value: "latency", label: "Latency", description: "Add artificial delay to responses" },
    { value: "error", label: "Error", description: "Return error responses" },
    { value: "network", label: "Network", description: "Simulate network issues" },
  ],
  android: [
    { value: "kill_app", label: "Kill App", description: "Force stop the app" },
    { value: "network_disable", label: "Network Disable", description: "Disable network connectivity" },
    { value: "network_latency", label: "Network Latency", description: "Increase latency on the emulator" },
    { value: "revoke_camera", label: "Revoke Camera", description: "Revoke camera permission" },
    { value: "revoke_location", label: "Revoke Location", description: "Revoke location permission" },
    { value: "battery_drain", label: "Battery Drain", description: "Simulate low battery" },
  ],
}

export default function CreateExperimentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<Platform>("backend")
  const [faultType, setFaultType] = useState<FaultType>("latency")
  const [name, setName] = useState("")
  const [targets, setTargets] = useState<string[]>([])
  const [targetInput, setTargetInput] = useState("")
  const [duration, setDuration] = useState(300)
  const [adaptive, setAdaptive] = useState(true)
  const [stepIntensity, setStepIntensity] = useState(10)
  const [maxIntensity, setMaxIntensity] = useState(100)
  const [notCrash, setNotCrash] = useState(true)
  const [shouldRecover, setShouldRecover] = useState(true)
  const [frontendBaseUrl, setFrontendBaseUrl] = useState("https://example.com")
  const [frontendTargetUrl, setFrontendTargetUrl] = useState("/")
  const [frontendMetricsEndpoint, setFrontendMetricsEndpoint] = useState("http://localhost:8000/frontend/metrics")
  const [backendObservedEndpoints, setBackendObservedEndpoints] = useState("http://svc-a,http://svc-b,http://svc-c")
  const [androidApkId, setAndroidApkId] = useState("")
  const [androidAvdName, setAndroidAvdName] = useState("Pixel_8a")
  const [androidHeadless, setAndroidHeadless] = useState(true)
  const [androidResetAppState, setAndroidResetAppState] = useState(true)
  const [androidUploading, setAndroidUploading] = useState(false)
  const [androidUploadLabel, setAndroidUploadLabel] = useState<string | null>(null)
  const androidFileInputRef = useRef<HTMLInputElement | null>(null)
  const sessionRole = useAppStore((state) => state.currentRole)
  const setSessionRole = useAppStore((state) => state.setCurrentRole)
  const backendContainers = useAppStore((state) => state.backendContainers ?? [])
  const backendContainersStatus = useAppStore((state) => state.backendContainersStatus)
  const backendContainersError = useAppStore((state) => state.backendContainersError)
  const loadBackendContainers = useAppStore((state) => state.loadBackendContainers)

  useEffect(() => {
    if (sessionRole) return
    getSessionRole()
      .then((session) => setSessionRole(session.role))
      .catch(() => setSessionRole("viewer"))
  }, [sessionRole, setSessionRole])

  useEffect(() => {
    if (platform !== "backend") return

    loadBackendContainers().catch((fetchError) => {
      console.error("Failed to fetch backend containers:", fetchError)
    })
  }, [platform, loadBackendContainers])

  const faultTypes = useMemo(() => faultTypeSets[platform], [platform])
  const selectedBackendContainerNames = new Set(targets)
  const availableBackendContainers = backendContainers.filter((container) => container.status === "running")

  const addTarget = () => {
    if (targetInput.trim() && !targets.includes(targetInput.trim())) {
      setTargets([...targets, targetInput.trim()])
      setTargetInput("")
    }
  }

  const removeTarget = (target: string) => {
    setTargets(targets.filter(t => t !== target))
  }

  const toggleBackendTarget = (container: BackendContainerSummary) => {
    setTargets((current) =>
      current.includes(container.name)
        ? current.filter((target) => target !== container.name)
        : [...current, container.name]
    )
  }

  const selectAllBackendTargets = () => {
    setTargets(availableBackendContainers.map((container) => container.name))
  }

  const clearBackendTargets = () => setTargets([])

  const handleAndroidApkUpload = async () => {
    const file = androidFileInputRef.current?.files?.[0]
    if (!file) {
      setError("Choose an APK file to upload")
      return
    }

    setAndroidUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const uploaded = await uploadAndroidApk(formData)
      setAndroidApkId(uploaded.id)
      setAndroidUploadLabel(`${uploaded.package} (${uploaded.activity})`)
    } catch (uploadError) {
      console.error("Failed to upload APK:", uploadError)
      setError("Failed to upload APK")
    } finally {
      setAndroidUploading(false)
    }
  }

  const handleSubmit = async () => {
    const commonPayload = {
      name,
      platform,
      faultType,
      targets,
      duration,
      adaptive,
      stepIntensity,
      maxIntensity,
      expectedBehavior: {
        notCrash,
        shouldRecover,
      },
    }

    const payload =
      platform === "frontend"
        ? {
            ...commonPayload,
            frontendRun: {
              baseUrl: frontendBaseUrl,
              metricsEndpoint: frontendMetricsEndpoint,
              targetUrls: frontendTargetUrl
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            },
          }
        : platform === "backend"
          ? {
              ...commonPayload,
              observedEndpoints: backendObservedEndpoints
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            }
          : {
              ...commonPayload,
              apk: androidApkId,
              androidRun: {
                avdName: androidAvdName,
                headless: androidHeadless,
                resetAppState: androidResetAppState,
              },
            }

    const validation = validateExperimentForm(payload)
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Invalid experiment configuration")
      return
    }

    setLoading(true)
    setError(null)
    try {
      saveLastExperimentConfig(payload)
      const experiment =
        platform === "frontend"
          ? await startFrontendExperiment({
              fault_type: faultType as "latency" | "error" | "network",
              targets,
              target_type: "frontend",
              duration_seconds: duration,
              frontend_run: {
                base_url: frontendBaseUrl,
                metrics_endpoint: frontendMetricsEndpoint,
                target_urls: frontendTargetUrl.split(",").map((item) => item.trim()).filter(Boolean),
              },
            })
          : platform === "backend"
            ? await startBackendExperiment({
                faultType: faultType as "kill" | "network_delay" | "packet_loss" | "cpu_stress" | "memory_stress",
                targets,
                targetType: "docker",
                observationType: "http",
                observedEndpoints: backendObservedEndpoints.split(",").map((item) => item.trim()).filter(Boolean),
                duration,
                adaptive,
                stepIntensity,
                maxIntensity,
                expected: { running: true },
              })
            : await startAndroidExperiment({
                fault_type: faultType as "kill_app" | "network_disable" | "network_latency" | "revoke_camera" | "revoke_location" | "battery_drain",
                targets,
                target_type: "android",
                observation_type: "android",
                duration_seconds: duration,
                apk: androidApkId,
                android_run: {
                  avd_name: androidAvdName,
                  headless: androidHeadless,
                  reset_app_state: androidResetAppState,
                },
                expected: {
                  running: true,
                  not_crash: notCrash,
                  not_anr: true,
                  should_recover: shouldRecover,
                },
              })

      router.push(`/experiments/${experiment.id}/live?platform=${platform}`)
    } catch (error) {
      console.error("Failed to create experiment:", error)
      setError("Failed to create experiment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar 
        title="Create Experiment" 
        description="Configure a new fault injection test"
      />
      
      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Platform</CardTitle>
              <CardDescription>Select the target platform for this experiment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { value: "backend", label: "Backend", icon: Server, description: "API and services", enabled: features.backend },
                  { value: "frontend", label: "Frontend", icon: Monitor, description: "Web application", enabled: features.frontend },
                  { value: "android", label: "Android", icon: Smartphone, description: "Mobile app", enabled: features.android },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value as Platform)}
                    disabled={!p.enabled}
                    className={`flex min-h-40 flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
                      platform === p.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p.icon className={`h-8 w-8 ${platform === p.value ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-medium">{p.label}</span>
                    <span className="text-xs text-muted-foreground">{p.description}</span>
                    {!p.enabled && <Badge variant="outline">Disabled by feature flag</Badge>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Experiment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Experiment Details</CardTitle>
              <CardDescription>Basic information about the experiment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label htmlFor="name">Experiment Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., API Latency Test"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Targets</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="e.g., /api/users"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTarget())}
                  />
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={addTarget}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {targets.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {targets.map((target) => (
                      <Badge key={target} variant="secondary" className="gap-1">
                        <Target className="h-3 w-3" />
                        {target}
                        <button onClick={() => removeTarget(target)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {platform === "backend" && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Available Containers</p>
                      <p className="text-sm text-muted-foreground">
                        Select running containers to target this backend experiment.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={selectAllBackendTargets} disabled={backendContainersStatus === "loading" || availableBackendContainers.length === 0}>
                        Select All Running
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearBackendTargets} disabled={targets.length === 0}>
                        Clear
                      </Button>
                    </div>
                  </div>

                  {backendContainersStatus === "loading" ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : backendContainersError ? (
                    <p className="text-sm text-destructive">{backendContainersError}</p>
                  ) : availableBackendContainers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No running containers available.</p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {availableBackendContainers.map((container) => {
                        const selected = selectedBackendContainerNames.has(container.name)
                        return (
                          <button
                            key={container.id}
                            type="button"
                            onClick={() => toggleBackendTarget(container)}
                            className={`flex items-start justify-between rounded-md border p-3 text-left transition-colors ${
                              selected ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"
                            }`}
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{container.name}</p>
                              <p className="text-xs text-muted-foreground">{container.image}</p>
                              <p className="text-xs text-muted-foreground">{container.ports.join(", ") || "No exposed ports"}</p>
                            </div>
                            <Badge variant="outline" className={selected ? "border-primary text-primary" : ""}>
                              {selected ? "Selected" : "Add"}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fault Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Fault Configuration</CardTitle>
              <CardDescription>Configure the type and intensity of the fault</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={faultType} onValueChange={(v) => setFaultType(v as FaultType)}>
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
                  {faultTypes.map((ft) => (
                    <TabsTrigger key={ft.value} value={ft.value} className="whitespace-normal px-2 py-2 text-xs sm:text-sm">
                      {ft.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {faultTypes.map((ft) => (
                  <TabsContent key={ft.value} value={ft.value}>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{ft.label} Fault</p>
                        <p className="text-sm text-muted-foreground">{ft.description}</p>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              {platform === "frontend" && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="frontend-base-url">Base URL</Label>
                    <Input id="frontend-base-url" value={frontendBaseUrl} onChange={(e) => setFrontendBaseUrl(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frontend-target-url">Target URLs</Label>
                    <Input id="frontend-target-url" value={frontendTargetUrl} onChange={(e) => setFrontendTargetUrl(e.target.value)} placeholder="/ or example.com, /checkout" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frontend-metrics-endpoint">Metrics Endpoint</Label>
                    <Input id="frontend-metrics-endpoint" value={frontendMetricsEndpoint} onChange={(e) => setFrontendMetricsEndpoint(e.target.value)} />
                  </div>
                </div>
              )}

              {platform === "backend" && (
                <div className="space-y-2">
                  <Label htmlFor="backend-endpoints">Observed Endpoints</Label>
                  <Input
                    id="backend-endpoints"
                    value={backendObservedEndpoints}
                    onChange={(e) => setBackendObservedEndpoints(e.target.value)}
                    placeholder="http://svc-a,http://svc-b,http://svc-c"
                  />
                </div>
              )}

              {platform === "android" && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="android-apk-file">APK File</Label>
                      <Input id="android-apk-file" ref={androidFileInputRef} type="file" accept=".apk" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="android-apk-id">Uploaded APK ID</Label>
                      <Input id="android-apk-id" value={androidApkId} onChange={(e) => setAndroidApkId(e.target.value)} placeholder="Upload or paste APK ID" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleAndroidApkUpload} disabled={androidUploading}>
                      {androidUploading ? "Uploading..." : "Upload APK"}
                    </Button>
                    {androidUploadLabel && <Badge variant="outline">{androidUploadLabel}</Badge>}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="android-avd">AVD Name</Label>
                      <Input id="android-avd" value={androidAvdName} onChange={(e) => setAndroidAvdName(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="font-medium">Headless Emulator</p>
                        <p className="text-sm text-muted-foreground">Run without UI for CI/test stability</p>
                      </div>
                      <Switch checked={androidHeadless} onCheckedChange={setAndroidHeadless} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium">Reset App State</p>
                      <p className="text-sm text-muted-foreground">Clear app state before starting</p>
                    </div>
                    <Switch checked={androidResetAppState} onCheckedChange={setAndroidResetAppState} />
                  </div>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration (seconds)
                  </Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                    min={30}
                    max={3600}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Intensity (%)</Label>
                  <div className="pt-2">
                    <Slider
                      value={[maxIntensity]}
                      onValueChange={(v) => setMaxIntensity(v[0])}
                      min={10}
                      max={100}
                      step={5}
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>10%</span>
                      <span className="font-medium">{maxIntensity}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Adaptive Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Gradually increase intensity based on system response
                  </p>
                </div>
                <Switch checked={adaptive} onCheckedChange={setAdaptive} />
              </div>

              {adaptive && (
                <div className="space-y-2">
                  <Label>Step Intensity (%)</Label>
                  <div className="pt-2">
                    <Slider
                      value={[stepIntensity]}
                      onValueChange={(v) => setStepIntensity(v[0])}
                      min={5}
                      max={25}
                      step={5}
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>5%</span>
                      <span className="font-medium">{stepIntensity}%</span>
                      <span>25%</span>
                    </div>
                  </div>
                </div>
              )}

              {platform === "android" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium">Headless Emulator</p>
                      <p className="text-sm text-muted-foreground">Run without UI for CI/test stability</p>
                    </div>
                    <Switch checked={androidHeadless} onCheckedChange={setAndroidHeadless} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium">Reset App State</p>
                      <p className="text-sm text-muted-foreground">Clear app state before starting</p>
                    </div>
                    <Switch checked={androidResetAppState} onCheckedChange={setAndroidResetAppState} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expected Behavior */}
          <Card>
            <CardHeader>
              <CardTitle>Expected Behavior</CardTitle>
              <CardDescription>Define what the system should do during the test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Should Not Crash</p>
                  <p className="text-sm text-muted-foreground">
                    System should remain operational during fault injection
                  </p>
                </div>
                <Switch checked={notCrash} onCheckedChange={setNotCrash} />
              </div>
              <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Should Recover</p>
                  <p className="text-sm text-muted-foreground">
                    System should return to normal after fault is removed
                  </p>
                </div>
                <Switch checked={shouldRecover} onCheckedChange={setShouldRecover} />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            {error && <p className="text-sm text-destructive sm:mr-auto">{error}</p>}
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <PermissionGuard
              role={sessionRole ?? "viewer"}
              allow={["engineer", "admin"]}
              fallback={<Button disabled>Create & Start Experiment</Button>}
            >
              <Button
                className="w-full sm:w-auto"
                onClick={handleSubmit}
                disabled={loading || !name || targets.length === 0}
              >
                {loading ? "Creating..." : "Create & Start Experiment"}
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </div>
    </div>
  )
}
