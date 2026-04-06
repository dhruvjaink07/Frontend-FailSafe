import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const metadata = {
  title: "API Reference | FailSafe Documentation",
  description: "Verified FailSafe endpoints for frontend, backend, android, and utility flows",
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  )
}

function Endpoint({ method, path, title, children }: { method: string; path: string; title: string; children: React.ReactNode }) {
  const methodClass =
    method === "POST"
      ? "bg-success text-success-foreground"
      : method === "GET"
        ? "bg-info text-info-foreground"
        : "bg-destructive text-destructive-foreground"

  return (
    <Card className="scroll-mt-20">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={methodClass}>{method}</Badge>
          <code className="text-sm font-mono">{path}</code>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

export default function ApiPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="secondary">API Reference</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Verified FailSafe Endpoints</h1>
        <p className="text-xl leading-relaxed text-muted-foreground">
          Tested endpoint contracts for frontend, backend, android, and utility flows. These are the
          exact routes used for integration and polling.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Base Configuration</h2>
        <CodeBlock>{`BASE_URL = http://localhost:8000
HEADERS = {
  "Content-Type": "application/json"
}`}</CodeBlock>
      </section>

      <section className="space-y-4" id="errors">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Error Format</h2>
        <CodeBlock>{`{
  "error": "string (error message)",
  "code": "string (error code)",
  "status": 400,
  "details": "string (optional)"
}`}</CodeBlock>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Meaning</TableHead>
              <TableHead>Example</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-mono">200</TableCell><TableCell>Success</TableCell><TableCell className="text-muted-foreground">Experiment fetched</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">201</TableCell><TableCell>Created</TableCell><TableCell className="text-muted-foreground">Experiment started</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">202</TableCell><TableCell>Accepted</TableCell><TableCell className="text-muted-foreground">Metrics accepted</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">400</TableCell><TableCell>Bad Request</TableCell><TableCell className="text-muted-foreground">Invalid payload</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">401</TableCell><TableCell>Unauthorized</TableCell><TableCell className="text-muted-foreground">Missing API key</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">404</TableCell><TableCell>Not Found</TableCell><TableCell className="text-muted-foreground">Experiment ID invalid</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">500</TableCell><TableCell>Server Error</TableCell><TableCell className="text-muted-foreground">Backend error</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">503</TableCell><TableCell>Unavailable</TableCell><TableCell className="text-muted-foreground">Docker not running</TableCell></TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="space-y-6">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Frontend Experiments</h2>

        <Endpoint method="POST" path="/experiments/frontend/start" title="Start Frontend Experiment">
          <p>Starts a browser/frontend experiment and returns the experiment record.</p>
          <CodeBlock>{`{
  "fault_type": "latency",
  "targets": ["dhruvjain-portfolio"],
  "target_type": "frontend",
  "duration_seconds": 20,
  "frontend_run": {
    "base_url": "https://dhruvjain.xyz/",
    "metrics_endpoint": "http://localhost:8000/frontend/metrics",
    "target_urls": ["dhruvjain.xyz"]
  }
}`}</CodeBlock>
          <CodeBlock>{`{
  "id": "exp-uuid-here",
  "state": "running",
  "phase": "baseline",
  "fault_type": "latency",
  "target_type": "frontend",
  "targets": ["dhruvjain-portfolio"],
  "duration_seconds": 20,
  "frontend_run": {
    "base_url": "https://dhruvjain.xyz/",
    "metrics_endpoint": "http://localhost:8000/frontend/metrics",
    "target_urls": ["dhruvjain.xyz"]
  },
  "created_at": "2026-04-06T12:00:00Z",
  "updated_at": "2026-04-06T12:00:00Z"
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="GET" path="/experiments/frontend/status?id={experiment_id}" title="Get Frontend Experiment Status">
          <p>Poll every 2 to 3 seconds until the experiment reaches <code className="font-mono text-xs">completed</code> or <code className="font-mono text-xs">failed</code>.</p>
          <CodeBlock>{`{
  "experiment": {
    "id": "exp-uuid-here",
    "state": "running",
    "phase": "injecting",
    "fault_type": "latency",
    "target_type": "frontend",
    "duration_seconds": 20,
    "current_intensity": 45,
    "created_at": "2026-04-06T12:00:00Z",
    "updated_at": "2026-04-06T12:00:05Z"
  }
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="POST" path="/frontend/metrics" title="Ingest Frontend Metrics">
          <p>Browser collectors post phase-tagged metric batches here.</p>
          <CodeBlock>{`{
  "metrics": [
    {
      "experiment_id": "exp-uuid-here",
      "phase": "baseline",
      "page": "/",
      "metrics": {
        "lcp": 1200,
        "cls": 0.04,
        "inp": 85,
        "long_tasks": 0,
        "errors": 0,
        "unhandled_rejections": 0
      },
      "api_calls": [
        {
          "url": "https://dhruvjain.xyz/",
          "duration": 280,
          "status": 200
        }
      ],
      "timestamp": 1712400000000
    }
  ]
}`}</CodeBlock>
          <CodeBlock>{`{
  "status": "accepted",
  "message": "Metrics ingested successfully",
  "count": 3
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="GET" path="/experiments/frontend/metrics?id={experiment_id}" title="Get Frontend Metrics Report">
          <p>Returns phase-comparison metrics, vitals, stability, API quality, and score summaries.</p>
          <CodeBlock>{`{
  "experiment_id": "exp-uuid-here",
  "state": "completed",
  "phase": "completed",
  "total_metrics": 3,
  "phases": {
    "baseline": { "avg_lcp": 1200, "avg_cls": 0.04, "avg_inp": 85, "avg_errors": 0, "avg_long_tasks": 0 },
    "injecting": { "avg_lcp": 1650, "avg_cls": 0.08, "avg_inp": 120, "avg_errors": 1, "avg_long_tasks": 2 },
    "recovery": { "avg_lcp": 1300, "avg_cls": 0.05, "avg_inp": 95, "avg_errors": 0, "avg_long_tasks": 0 }
  },
  "vitals": {
    "lcp": { "baseline": 1200, "injecting": 1650, "recovery": 1300 },
    "cls": { "baseline": 0.04, "injecting": 0.08, "recovery": 0.05 },
    "inp": { "baseline": 85, "injecting": 120, "recovery": 95 }
  },
  "stability": {
    "long_tasks": { "baseline": 0, "injecting": 2, "recovery": 0 },
    "errors": { "baseline": 0, "injecting": 1, "recovery": 0 },
    "unhandled_rejections": { "baseline": 0, "injecting": 0, "recovery": 0 }
  },
  "api_quality": {
    "success_rate": 0.95,
    "avg_latency": 596.67,
    "error_count": 1
  },
  "failsafe_index": {
    "score": 78,
    "status": "degraded",
    "summary": "Performance degradation detected during fault injection"
  },
  "frontend_score": {
    "status": "degraded",
    "score": 78
  }
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="POST" path="/experiments/frontend/stop?id={experiment_id}" title="Stop Frontend Experiment">
          <p>Stops the running frontend experiment and marks it completed.</p>
          <CodeBlock>{`{
  "id": "exp-uuid-here",
  "state": "completed",
  "message": "Experiment stopped successfully"
}`}</CodeBlock>
        </Endpoint>
      </section>

      <section className="space-y-6">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Backend Experiments</h2>

        <Endpoint method="POST" path="/experiments/backend/start" title="Start Backend Experiment">
          <p>Starts a Docker-targeted backend experiment. Both camelCase and snake_case payloads are seen in the tested collection.</p>
          <CodeBlock>{`{
  "faultType": "network_delay",
  "targets": ["svc-c"],
  "targetType": "docker",
  "observationType": "http",
  "observedEndpoints": ["http://svc-a", "http://svc-b", "http://svc-c"],
  "duration": 60,
  "adaptive": true,
  "stepIntensity": 20,
  "maxIntensity": 100,
  "dependencyGraph": {
    "http://svc-a": ["http://svc-b"],
    "http://svc-b": ["http://svc-c"],
    "http://svc-c": []
  },
  "targetEndpointMap": {
    "svc-a": ["http://svc-a"],
    "svc-b": ["http://svc-b"],
    "svc-c": ["http://svc-c"]
  }
}`}</CodeBlock>
          <CodeBlock>{`{
  "fault_type": "kill",
  "targets": ["svc-c"],
  "target_type": "docker",
  "observation_type": "http",
  "observed_endpoints": ["http://svc-a", "http://svc-b", "http://svc-c"],
  "duration_seconds": 75,
  "scenarios": [
    { "type": "kill", "at": 8, "duration_seconds": 1 },
    { "type": "cpu_stress", "at": 20, "duration_seconds": 25 },
    { "type": "memory_stress", "at": 50, "duration_seconds": 15 }
  ],
  "expected": { "running": true }
}`}</CodeBlock>
          <CodeBlock>{`{
  "id": "exp-backend-uuid",
  "state": "running",
  "phase": "baseline",
  "fault_type": "network_delay",
  "target_type": "docker",
  "targets": ["svc-c"],
  "duration_seconds": 60,
  "current_intensity": 0,
  "created_at": "2026-04-06T12:00:00Z"
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="GET" path="/experiments/backend/status?id={experiment_id}" title="Get Backend Status">
          <CodeBlock>{`{
  "experiment": {
    "id": "exp-backend-uuid",
    "state": "running",
    "phase": "injecting",
    "fault_type": "network_delay",
    "current_intensity": 45,
    "max_stable_intensity": 40,
    "breaking_intensity": 85
  }
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="GET" path="/experiments/backend/metrics?id={experiment_id}" title="Get Backend Metrics">
          <CodeBlock>{`{
  "experiment_id": "exp-backend-uuid",
  "state": "completed",
  "baseline_metrics": {
    "avg_latency": 45.5,
    "p95": 120,
    "error_rate": 0.001
  },
  "max_impact_metrics": {
    "avg_latency": 850.3,
    "p95": 2100,
    "error_rate": 0.25
  },
  "recovery_metrics": {
    "avg_latency": 52.1,
    "p95": 140,
    "error_rate": 0.002
  },
  "insights": {
    "degradation_factor": 18.7,
    "recovery_time_seconds": 3,
    "critical_endpoints": ["http://svc-c"]
  }
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="POST" path="/experiments/backend/stop?id={experiment_id}" title="Stop Backend Experiment">
          <p>Stops the backend experiment.</p>
        </Endpoint>
      </section>

      <section className="space-y-6">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Android Experiments</h2>

        <Endpoint method="POST" path="/upload/apk" title="Upload APK">
          <p>Upload an APK using multipart form data. Either <code className="font-mono text-xs">file</code> or <code className="font-mono text-xs">apk</code> is accepted in the tested flow.</p>
          <CodeBlock>{`{
  "id": "apk-uuid-here",
  "apk": "apk-uuid-here",
  "path": "D:\\FailSafe\\uploads\\apks\\apk-uuid-here.apk",
  "package": "com.example.code",
  "activity": "com.example.code.MainActivity"
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="POST" path="/experiments/android/start" title="Start Android Experiment">
          <CodeBlock>{`{
  "fault_type": "kill_app",
  "targets": ["com.example.code"],
  "target_type": "android",
  "observation_type": "android",
  "duration_seconds": 70,
  "apk": "apk-uuid-here",
  "android_run": {
    "avd_name": "Pixel_8a",
    "headless": true,
    "reset_app_state": true
  },
  "scenarios": [
    { "type": "kill_app", "at": 20, "duration_seconds": 1 },
    { "type": "foreground_app", "at": 30, "duration_seconds": 2 }
  ],
  "expected": {
    "running": true,
    "not_crash": true,
    "not_anr": true,
    "should_recover": true
  }
}`}</CodeBlock>
          <CodeBlock>{`{
  "fault_type": "network_disable",
  "targets": ["com.example.code"],
  "target_type": "android",
  "observation_type": "android",
  "duration_seconds": 85,
  "apk": "apk-uuid-here",
  "android_run": {
    "avd_name": "Pixel_8a",
    "headless": true
  },
  "scenarios": [
    { "type": "network_disable", "at": 8, "duration_seconds": 7 },
    { "type": "network_enable", "at": 18, "duration_seconds": 1 },
    { "type": "network_flaky", "at": 28, "duration_seconds": 10 },
    { "type": "network_latency", "at": 44, "duration_seconds": 8 }
  ],
  "expected": {
    "running": true,
    "not_crash": true,
    "not_anr": true,
    "should_recover": true
  }
}`}</CodeBlock>
          <CodeBlock>{`{
  "id": "exp-android-uuid",
  "state": "running",
  "phase": "baseline",
  "fault_type": "kill_app",
  "package": "com.example.code"
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="GET" path="/experiments/android/status?id={experiment_id}" title="Get Android Status">
          <p>Returns the running, completed, or failed state for the Android experiment.</p>
        </Endpoint>

        <Endpoint method="GET" path="/experiments/android/metrics?id={experiment_id}" title="Get Android Metrics">
          <p>Returns the Android metrics report for a completed experiment.</p>
        </Endpoint>

        <Endpoint method="POST" path="/experiments/android/stop?id={experiment_id}" title="Stop Android Experiment">
          <p>Stops the Android experiment and begins recovery handling.</p>
        </Endpoint>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Utility Endpoints</h2>
        <Endpoint method="GET" path="/health" title="Health Check">
          <CodeBlock>{`OK`}</CodeBlock>
        </Endpoint>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Postman Variables</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reference Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Frontend Collection</p>
              <CodeBlock>{`{{experiment_id}}
{{base_url}}
{{metrics_endpoint}}`}</CodeBlock>
            </div>
            <div>
              <p className="font-medium text-foreground">Docker Collection</p>
              <CodeBlock>{`{{baseUrl}}
{{experimentId}}`}</CodeBlock>
            </div>
            <div>
              <p className="font-medium text-foreground">Android Collection</p>
              <CodeBlock>{`{{baseUrl}}
{{apkId}}
{{experimentId}}`}</CodeBlock>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
