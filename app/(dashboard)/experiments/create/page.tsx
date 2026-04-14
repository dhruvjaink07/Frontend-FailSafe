"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
// Draggable scenario step wrapper for dnd-kit
function DraggableScenarioStep({ id, children }: { id: string, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Topbar } from "@/components/topbar"
import { features } from "@/lib/config/features"
import { saveLastExperimentConfig } from "@/lib/storage/session-cache"
import { validateExperimentForm } from "@/lib/validators/experiment-validator"
import {
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

type RequestMode = "form" | "json"

type AndroidScenarioStep = {
  type: string
  at: number
  duration_seconds: number
}

const androidScenarioTypeOptions = [
  "kill_app",
  "foreground_app",
  "network_disable",
  "network_enable",
  "network_flaky",
  "network_latency",
  "revoke_camera",
  "revoke_location",
  "battery_drain",
] as const

const androidScenarioTypeMeta: Record<(typeof androidScenarioTypeOptions)[number], { label: string; description: string }> = {
  kill_app: { label: "Kill App", description: "Force stop the app process." },
  foreground_app: { label: "Foreground App", description: "Bring the app back to foreground." },
  network_disable: { label: "Disable Network", description: "Turn off network connectivity." },
  network_enable: { label: "Enable Network", description: "Restore network connectivity." },
  network_flaky: { label: "Flaky Network", description: "Introduce intermittent packet drop and jitter." },
  network_latency: { label: "High Latency", description: "Inject latency into network traffic." },
  revoke_camera: { label: "Revoke Camera", description: "Remove camera permission during runtime." },
  revoke_location: { label: "Revoke Location", description: "Remove location permission during runtime." },
  battery_drain: { label: "Battery Drain", description: "Simulate low battery pressure." },
}

function getAndroidScenarioMeta(type: string): { label: string; description: string } {
  const known = androidScenarioTypeMeta[type as keyof typeof androidScenarioTypeMeta]
  if (known) return known

  return {
    label: type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    description: "Custom scenario step",
  }
}

function buildAndroidScenarioPreset(fault: FaultType, totalDuration: number): AndroidScenarioStep[] {
  const cap = Math.max(totalDuration, 30)

  if (fault === "network_disable") {
    return [
      { type: "network_disable", at: 8, duration_seconds: 8 },
      { type: "network_enable", at: 18, duration_seconds: 1 },
      { type: "network_flaky", at: 28, duration_seconds: 12 },
      { type: "network_latency", at: 46, duration_seconds: 8 },
    ].filter((step) => step.at < cap)
  }

  if (fault === "network_latency") {
    return [
      { type: "network_latency", at: 10, duration_seconds: 10 },
      { type: "network_latency", at: 28, duration_seconds: 12 },
      { type: "kill_app", at: 46, duration_seconds: 1 },
      { type: "foreground_app", at: 52, duration_seconds: 2 },
    ].filter((step) => step.at < cap)
  }

  if (fault === "revoke_camera") {
    return [
      { type: "revoke_camera", at: 8, duration_seconds: 12 },
      { type: "foreground_app", at: 24, duration_seconds: 2 },
      { type: "network_latency", at: 36, duration_seconds: 8 },
    ].filter((step) => step.at < cap)
  }

  if (fault === "revoke_location") {
    return [
      { type: "revoke_location", at: 8, duration_seconds: 12 },
      { type: "network_disable", at: 24, duration_seconds: 6 },
      { type: "network_enable", at: 31, duration_seconds: 1 },
    ].filter((step) => step.at < cap)
  }

  if (fault === "battery_drain") {
    return [
      { type: "battery_drain", at: 10, duration_seconds: 24 },
      { type: "network_latency", at: 38, duration_seconds: 10 },
      { type: "kill_app", at: 54, duration_seconds: 1 },
      { type: "foreground_app", at: 60, duration_seconds: 2 },
    ].filter((step) => step.at < cap)
  }

  return [
    { type: "kill_app", at: 20, duration_seconds: 1 },
    { type: "foreground_app", at: 30, duration_seconds: 2 },
    { type: "network_latency", at: 42, duration_seconds: 8 },
  ].filter((step) => step.at < cap)
}

function buildRequestTemplate(values: {
  name: string
  platform: Platform
  faultType: FaultType
  targets: string[]
  duration: number
  adaptive: boolean
  stepIntensity: number
  maxIntensity: number
  notCrash: boolean
  shouldRecover: boolean
  frontendBaseUrl: string
  frontendMetricsEndpoint: string
  frontendTargetUrl: string
  frontendOpenPlaywrightWindow: boolean
  frontendBrowserProject: string
  backendObservedEndpoints: string
  androidApkId: string
  androidAvdName: string
  androidHeadless: boolean
  androidResetAppState: boolean
  androidScenarios: AndroidScenarioStep[]
}) {
  const frontendTargets = values.frontendTargetUrl
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  const base = {
    name: values.name || "API Latency Test",
    platform: values.platform,
    faultType: values.faultType,
    targets: values.targets,
    duration: values.duration,
    adaptive: values.adaptive,
    stepIntensity: values.stepIntensity,
    maxIntensity: values.maxIntensity,
    expectedBehavior: {
      notCrash: values.notCrash,
      shouldRecover: values.shouldRecover,
    },
  }

  if (values.platform === "frontend") {
    return JSON.stringify(
      {
        ...base,
        targets: frontendTargets,
        frontendRun: {
          baseUrl: values.frontendBaseUrl,
          metricsEndpoint: values.frontendMetricsEndpoint,
          targetUrls: frontendTargets,
          headless: !values.frontendOpenPlaywrightWindow,
          browser: values.frontendBrowserProject,
        },
      },
      null,
      2,
    )
  }

  if (values.platform === "backend") {
    return JSON.stringify(
      {
        ...base,
        observedEndpoints: values.backendObservedEndpoints.split(",").map((item) => item.trim()).filter(Boolean),
      },
      null,
      2,
    )
  }

  return JSON.stringify(
    {
      ...base,
      apk: values.androidApkId,
      androidRun: {
        avdName: values.androidAvdName,
        headless: values.androidHeadless,
        resetAppState: values.androidResetAppState,
      },
      scenarios: values.androidScenarios,
    },
    null,
    2,
  )
}

export default function CreateExperimentPage() {
  // dnd-kit sensors for Android scenario drag-and-drop
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestMode, setRequestMode] = useState<RequestMode>("form")
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
  const [frontendOpenPlaywrightWindow, setFrontendOpenPlaywrightWindow] = useState(true)
  const [frontendBrowserProject, setFrontendBrowserProject] = useState("chromium")
  const [backendObservedEndpoints, setBackendObservedEndpoints] = useState("http://svc-a,http://svc-b,http://svc-c")
  const [androidApkId, setAndroidApkId] = useState("")
  const [androidAvdName, setAndroidAvdName] = useState("Pixel_8a")
  const [androidHeadless, setAndroidHeadless] = useState(true)
  const [androidResetAppState, setAndroidResetAppState] = useState(true)
  const [androidScenarios, setAndroidScenarios] = useState<AndroidScenarioStep[]>(
    buildAndroidScenarioPreset("kill_app", 300),
  )
  const [androidUploading, setAndroidUploading] = useState(false)
  const [androidUploadLabel, setAndroidUploadLabel] = useState<string | null>(null)
  const [androidUploadedPackage, setAndroidUploadedPackage] = useState("")
  const [androidUploadedActivity, setAndroidUploadedActivity] = useState("")
  const [rawRequestJson, setRawRequestJson] = useState("")
  const androidFileInputRef = useRef<HTMLInputElement | null>(null)
  const backendContainers = useAppStore((state) => state.backendContainers ?? [])
  const backendContainersStatus = useAppStore((state) => state.backendContainersStatus)
  const backendContainersError = useAppStore((state) => state.backendContainersError)
  const backendContainersUnavailable = useAppStore((state) => state.backendContainersUnavailable)
  const loadBackendContainers = useAppStore((state) => state.loadBackendContainers)

  useEffect(() => {
    if (platform !== "backend") return

    loadBackendContainers().catch((fetchError) => {
      console.error("Failed to fetch backend containers:", fetchError)
    })
  }, [platform, loadBackendContainers])

  const faultTypes = useMemo(() => faultTypeSets[platform], [platform])
  const isFrontendFlow = platform === "frontend"
  const selectedBackendContainerNames = new Set(targets)
  const availableBackendContainers = backendContainers.filter((container) => container.status === "running")
  const frontendTargetUrls = useMemo(
    () => frontendTargetUrl.split(",").map((item) => item.trim()).filter(Boolean),
    [frontendTargetUrl],
  )
  const formTargets = platform === "frontend" ? frontendTargetUrls : targets

  useEffect(() => {
    if (platform !== "android") return
    if (androidScenarios.length > 0) return
    setAndroidScenarios(buildAndroidScenarioPreset(faultType, duration))
  }, [platform, androidScenarios.length, faultType, duration])

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

  const addAndroidScenario = () => {
    setAndroidScenarios((current) => [
      ...current,
      {
        type: androidScenarioTypeOptions[0],
        at: Math.min(Math.max(5, current.length * 10 + 10), Math.max(duration - 1, 5)),
        duration_seconds: 5,
      },
    ])
  }

  const removeAndroidScenario = (index: number) => {
    setAndroidScenarios((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const updateAndroidScenario = (index: number, patch: Partial<AndroidScenarioStep>) => {
    setAndroidScenarios((current) => current.map((step, currentIndex) => (currentIndex === index ? { ...step, ...patch } : step)))
  }

  const applyAndroidScenarioPreset = () => {
    setAndroidScenarios(buildAndroidScenarioPreset(faultType, duration))
  }

  const sortAndroidScenarios = () => {
    setAndroidScenarios((current) => [...current].sort((left, right) => left.at - right.at))
  }

  const requestTemplate = useMemo(
    () =>
      buildRequestTemplate({
        name,
        platform,
        faultType,
        targets,
        duration,
        adaptive,
        stepIntensity,
        maxIntensity,
        notCrash,
        shouldRecover,
        frontendBaseUrl,
        frontendMetricsEndpoint,
        frontendTargetUrl,
        frontendOpenPlaywrightWindow,
        frontendBrowserProject,
        backendObservedEndpoints,
        androidApkId,
        androidAvdName,
        androidHeadless,
        androidResetAppState,
        androidScenarios,
      }),
    [
      name,
      platform,
      faultType,
      targets,
      duration,
      adaptive,
      stepIntensity,
      maxIntensity,
      notCrash,
      shouldRecover,
      frontendBaseUrl,
      frontendMetricsEndpoint,
      frontendTargetUrl,
      frontendOpenPlaywrightWindow,
      frontendBrowserProject,
      backendObservedEndpoints,
      androidApkId,
      androidAvdName,
      androidHeadless,
      androidResetAppState,
      androidScenarios,
    ],
  )

  useEffect(() => {
    if (requestMode !== "json" || rawRequestJson.trim()) return
    setRawRequestJson(requestTemplate)
  }, [requestMode, rawRequestJson, requestTemplate])

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
      setAndroidUploadedPackage(uploaded.package)
      setAndroidUploadedActivity(uploaded.activity)
      setAndroidUploadLabel(`${uploaded.package} (${uploaded.activity})`)
      const uploadedPackage = uploaded.package?.trim()
      if (uploadedPackage) {
        setTargets((current) => (current.includes(uploadedPackage) ? current : [...current, uploadedPackage]))
      }
      setTargetInput("")
    } catch (uploadError) {
      console.error("Failed to upload APK:", uploadError)
      setError("Failed to upload APK")
    } finally {
      setAndroidUploading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const experiment = await (
        requestMode === "json"
          ? (() => {
              const parsed = JSON.parse(rawRequestJson) as unknown
              if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Request JSON must be an object")
              }

              return platform === "frontend"
                ? startFrontendExperiment(parsed as unknown as Parameters<typeof startFrontendExperiment>[0])
                : platform === "backend"
                  ? startBackendExperiment(parsed as unknown as Parameters<typeof startBackendExperiment>[0])
                  : startAndroidExperiment(parsed as unknown as Parameters<typeof startAndroidExperiment>[0])
            })()
          : (() => {
              const commonPayload = {
                name,
                platform,
                faultType,
                targets: formTargets,
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
                        headless: !frontendOpenPlaywrightWindow,
                        browser: frontendBrowserProject,
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
                        scenarios: androidScenarios.map((scenario) => ({
                          type: scenario.type,
                          at: scenario.at,
                          duration_seconds: scenario.duration_seconds,
                        })),
                      }

              const validation = validateExperimentForm(payload)
              if (!validation.success) {
                throw new Error(validation.error.issues[0]?.message ?? "Invalid experiment configuration")
              }

              saveLastExperimentConfig(payload)

              return platform === "frontend"
                ? startFrontendExperiment({
                    fault_type: faultType as "latency" | "error" | "network",
                    targets: formTargets,
                    target_type: "frontend",
                    duration_seconds: duration,
                    frontend_run: {
                      base_url: frontendBaseUrl,
                      metrics_endpoint: frontendMetricsEndpoint,
                      target_urls: frontendTargetUrls,
                      headless: !frontendOpenPlaywrightWindow,
                      browser: frontendBrowserProject,
                    },
                  })
                : platform === "backend"
                  ? startBackendExperiment({
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
                  : startAndroidExperiment({
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
                      scenarios: androidScenarios
                        .map((scenario) => ({
                          type: scenario.type,
                          at: Math.max(0, Math.min(duration - 1, Math.floor(scenario.at))),
                          duration_seconds: Math.max(1, Math.floor(scenario.duration_seconds)),
                        }))
                        .sort((a, b) => a.at - b.at),
                      expected: {
                        running: true,
                        not_crash: notCrash,
                        not_anr: true,
                        should_recover: shouldRecover,
                      },
                    })
            })()
      )

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
        title={isFrontendFlow ? "Create Frontend Test Run" : "Create Experiment"}
        description={isFrontendFlow ? "Define scenario, pages, browser mode, and frontend metrics source" : "Configure a new fault injection test"}
      />
      
      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-5xl space-y-6">
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
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {isFrontendFlow && <Badge variant="outline">1</Badge>}
                  {isFrontendFlow ? "Frontend Test Plan" : "Experiment Details"}
                </CardTitle>
                <CardDescription>
                  {isFrontendFlow
                    ? "Set up scenario name and user-facing pages, or switch to raw payload mode."
                    : "Switch between the guided form and a raw JSON request body."}
                </CardDescription>
              </div>
              <Tabs value={requestMode} onValueChange={(value) => setRequestMode(value as RequestMode)}>
                <TabsList>
                  <TabsTrigger value="form">Form</TabsTrigger>
                  <TabsTrigger value="json">Raw JSON</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-4">
              {requestMode === "json" ? (
                <div className="space-y-4">
                  {platform === "android" ? (
                    <>
                      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Step 1</Badge>
                          <p className="text-sm font-medium">Upload APK</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Android upload uses multipart form data. Upload here to get APK id and package, then use them in start payload.
                        </p>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="android-apk-file-raw">APK File</Label>
                            <Input id="android-apk-file-raw" ref={androidFileInputRef} type="file" accept=".apk" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="android-apk-id-raw">Uploaded APK ID</Label>
                            <Input id="android-apk-id-raw" value={androidApkId} onChange={(e) => setAndroidApkId(e.target.value)} placeholder="Upload or paste APK ID" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleAndroidApkUpload} disabled={androidUploading}>
                            {androidUploading ? "Uploading..." : "Upload APK"}
                          </Button>
                          {androidUploadLabel && <Badge variant="outline">{androidUploadLabel}</Badge>}
                        </div>
                        {(androidUploadedPackage || androidUploadedActivity) && (
                          <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                            <p>package: {androidUploadedPackage || "-"}</p>
                            <p>activity: {androidUploadedActivity || "-"}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Step 2</Badge>
                          <p className="text-sm font-medium">Start Experiment Payload (JSON)</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Paste the exact start payload. This section sends JSON to the Android start endpoint.
                        </p>
                        <Textarea
                          value={rawRequestJson}
                          onChange={(event) => setRawRequestJson(event.target.value)}
                          className="min-h-[420px] font-mono text-xs"
                          placeholder={requestTemplate}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" variant="outline" onClick={() => setRawRequestJson(requestTemplate)}>
                            Load current form as JSON
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setRawRequestJson("")}>Clear</Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Paste the exact start payload. The selected platform decides which backend start endpoint receives it.
                      </div>
                      <Textarea
                        value={rawRequestJson}
                        onChange={(event) => setRawRequestJson(event.target.value)}
                        className="min-h-[420px] font-mono text-xs"
                        placeholder={requestTemplate}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" onClick={() => setRawRequestJson(requestTemplate)}>
                          Load current form as JSON
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setRawRequestJson("")}>Clear</Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <Label htmlFor="name">{isFrontendFlow ? "Scenario Name" : "Experiment Name"}</Label>
                        <Input
                          id="name"
                          placeholder={isFrontendFlow ? "e.g., Checkout Flow Latency Test" : "e.g., API Latency Test"}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      {platform === "frontend" ? (
                        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
                          <Label htmlFor="frontend-target-url">Pages and Flows Under Test</Label>
                          <Input
                            id="frontend-target-url"
                            value={frontendTargetUrl}
                            onChange={(e) => setFrontendTargetUrl(e.target.value)}
                            placeholder="/,/checkout,/pricing"
                          />
                          <p className="text-xs text-muted-foreground">
                            Comma-separated paths or URLs the frontend runner should navigate.
                          </p>
                        </div>
                      ) : platform === "android" ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Target App Package(s)</Label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Input
                                placeholder="e.g., com.example.code"
                                value={targetInput}
                                onChange={(e) => setTargetInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTarget())}
                              />
                              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={addTarget}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Add one or more Android package names to monitor during the run.
                            </p>
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
                        </div>
                      ) : (
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
                      )}

                      {platform === "backend" && (
                        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                          ) : backendContainersUnavailable ? (
                            <div className="rounded-md border border-dashed border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning">
                              Backend containers are temporarily unavailable. You can still configure the experiment, but no live container list is shown.
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
                    </div>
              )}
            </CardContent>
          </Card>

          {requestMode === "form" && (
            <>
              {/* Fault Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isFrontendFlow && <Badge variant="outline">2-4</Badge>}
                    {isFrontendFlow ? "Runner and Injection Profile" : "Fault Configuration"}
                  </CardTitle>
                  <CardDescription>
                    {isFrontendFlow ? "Choose scenario profile, browser execution mode, and metrics wiring" : "Configure the type and intensity of the fault"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isFrontendFlow && (
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
                              <p className="font-medium">{isFrontendFlow ? `${ft.label} Profile` : `${ft.label} Fault`}</p>
                              <p className="text-sm text-muted-foreground">{ft.description}</p>
                            </div>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}

                  {platform === "frontend" && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline">2</Badge>
                          <p className="text-sm font-medium">Browser Mode</p>
                        </div>
                        <p className="mb-3 text-xs text-muted-foreground">Choose how the runner launches and which engine to use.</p>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="flex items-center justify-between rounded-lg border border-border p-4">
                            <div>
                              <p className="font-medium">Run with Browser Window</p>
                              <p className="text-sm text-muted-foreground">Turn off headless mode for visual frontend run verification.</p>
                            </div>
                            <Switch checked={frontendOpenPlaywrightWindow} onCheckedChange={setFrontendOpenPlaywrightWindow} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="frontend-browser-project">Browser Engine</Label>
                            <Input
                              id="frontend-browser-project"
                              value={frontendBrowserProject}
                              onChange={(e) => setFrontendBrowserProject(e.target.value)}
                              placeholder="chromium"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline">3</Badge>
                          <p className="text-sm font-medium">Injection Profile</p>
                        </div>
                        <p className="mb-3 text-xs text-muted-foreground">Select the fault profile and intensity behavior for this run.</p>
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
                                  <p className="font-medium">{`${ft.label} Profile`}</p>
                                  <p className="text-sm text-muted-foreground">{ft.description}</p>
                                </div>
                              </div>
                            </TabsContent>
                          ))}
                        </Tabs>
                      </div>

                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline">4</Badge>
                          <p className="text-sm font-medium">Metrics Source</p>
                        </div>
                        <p className="mb-3 text-xs text-muted-foreground">Provide app and telemetry endpoints used for run scoring.</p>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="frontend-base-url">Application Base URL</Label>
                            <Input id="frontend-base-url" value={frontendBaseUrl} onChange={(e) => setFrontendBaseUrl(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="frontend-metrics-endpoint">Metrics Source Endpoint</Label>
                            <Input id="frontend-metrics-endpoint" value={frontendMetricsEndpoint} onChange={(e) => setFrontendMetricsEndpoint(e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Metrics source is used to validate frontend behavior during and after injection.</p>
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

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {isFrontendFlow ? "Test Duration (seconds)" : "Duration (seconds)"}
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
                      <Label>{isFrontendFlow ? "Injection Intensity Cap (%)" : "Max Intensity (%)"}</Label>
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
                      <p className="font-medium">{isFrontendFlow ? "Adaptive Ramp" : "Adaptive Mode"}</p>
                      <p className="text-sm text-muted-foreground">
                        {isFrontendFlow ? "Gradually increase injection intensity while monitoring frontend stability" : "Gradually increase intensity based on system response"}
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
                    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">Scenario Timeline</p>
                          <p className="text-sm text-muted-foreground">Design a multi-step mobile chaos sequence with ordered events.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={applyAndroidScenarioPreset}>
                            Apply Creative Preset
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={sortAndroidScenarios}>
                            Sort by Time
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={addAndroidScenario}>
                            Add Step
                          </Button>
                        </div>
                      </div>

                      {androidScenarios.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No scenario steps yet. Add one or apply a preset.</p>
                      ) : (
                        <DndContext
                          sensors={dndSensors}
                          collisionDetection={closestCenter}
                          onDragEnd={({ active, over }) => {
                            if (over && active.id !== over.id) {
                              const oldIndex = androidScenarios.findIndex((_, i) => `${androidScenarios[i].type}-${i}` === active.id);
                              const newIndex = androidScenarios.findIndex((_, i) => `${androidScenarios[i].type}-${i}` === over.id);
                              if (oldIndex !== -1 && newIndex !== -1) {
                                setAndroidScenarios((current) => arrayMove(current, oldIndex, newIndex));
                              }
                            }
                          }}
                        >
                          <SortableContext
                            items={androidScenarios.map((_, i) => `${androidScenarios[i].type}-${i}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {androidScenarios.map((scenario, index) => (
                                <DraggableScenarioStep key={`${scenario.type}-${index}`} id={`${scenario.type}-${index}`}>
                                  <div className="grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-[auto_2fr_1fr_1fr_auto] md:items-end cursor-move">
                                    <div className="flex items-center md:pb-2">
                                      <Badge variant="outline">#{index + 1}</Badge>
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Step Type</Label>
                                      <select
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        value={scenario.type}
                                        onChange={(event) => updateAndroidScenario(index, { type: event.target.value })}
                                      >
                                        {androidScenarioTypeOptions.map((option) => (
                                          <option key={option} value={option}>{androidScenarioTypeMeta[option].label}</option>
                                        ))}
                                      </select>
                                      <p className="text-xs text-muted-foreground">{getAndroidScenarioMeta(scenario.type).description}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <Label>At (sec)</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={Math.max(duration - 1, 0)}
                                        value={scenario.at}
                                        onChange={(event) => updateAndroidScenario(index, { at: Number(event.target.value) || 0 })}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label>Step Duration (sec)</Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={Math.max(duration, 1)}
                                        value={scenario.duration_seconds}
                                        onChange={(event) => updateAndroidScenario(index, { duration_seconds: Number(event.target.value) || 1 })}
                                      />
                                    </div>
                                    <div className="flex items-end md:justify-end">
                                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAndroidScenario(index)} aria-label={`Remove step ${index + 1}`}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </DraggableScenarioStep>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Steps are sent in timeline order and automatically normalized to fit inside the test duration.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expected Behavior */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isFrontendFlow && <Badge variant="outline">5</Badge>}
                    {isFrontendFlow ? "Frontend Pass Criteria" : "Expected Behavior"}
                  </CardTitle>
                  <CardDescription>
                    {isFrontendFlow ? "Define what a healthy frontend run should maintain and recover" : "Define what the system should do during the test"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{isFrontendFlow ? "UI Stays Responsive" : "Should Not Crash"}</p>
                      <p className="text-sm text-muted-foreground">
                        {isFrontendFlow ? "Frontend should remain interactive during injected faults" : "System should remain operational during fault injection"}
                      </p>
                    </div>
                    <Switch checked={notCrash} onCheckedChange={setNotCrash} />
                  </div>
                  <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{isFrontendFlow ? "Recovers After Fault" : "Should Recover"}</p>
                      <p className="text-sm text-muted-foreground">
                        {isFrontendFlow ? "Frontend metrics and UX should recover after injection stops" : "System should return to normal after fault is removed"}
                      </p>
                    </div>
                    <Switch checked={shouldRecover} onCheckedChange={setShouldRecover} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            {error && <p className="text-sm text-destructive sm:mr-auto">{error}</p>}
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={
                loading ||
                (requestMode === "form"
                  ? !name ||
                    (platform === "frontend"
                      ? frontendTargetUrls.length === 0
                      : platform === "android"
                        ? targets.length === 0 || !androidApkId.trim() || androidScenarios.length === 0
                        : targets.length === 0)
                  : !rawRequestJson.trim())
              }
            >
              {loading ? "Creating..." : isFrontendFlow ? "Start Frontend Test Run" : "Create & Start Experiment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
