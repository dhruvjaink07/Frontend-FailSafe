import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Response Structures | FailSafe Documentation",
  description: "Verified response formats for FailSafe experiments and reports",
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  )
}

export default function ResponsesPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="secondary">Response Structures</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Verified Response Formats</h1>
        <p className="text-xl leading-relaxed text-muted-foreground">
          Response shapes used by the tested frontend, backend, Android, and utility endpoints.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Frontend Experiment</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Start / Status / Stop</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Frontend Metrics Report</CardTitle></CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Backend Experiment</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Start / Status / Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Android Experiment</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Upload / Start / Status / Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <CodeBlock>{`{
  "id": "apk-uuid-here",
  "apk": "apk-uuid-here",
  "path": "D:\\FailSafe\\uploads\\apks\\apk-uuid-here.apk",
  "package": "com.example.code",
  "activity": "com.example.code.MainActivity"
}`}</CodeBlock>
            <CodeBlock>{`{
  "id": "exp-android-uuid",
  "state": "running",
  "phase": "baseline",
  "fault_type": "kill_app",
  "package": "com.example.code"
}`}</CodeBlock>
            <CodeBlock>{`{
  "experiment": {
    "id": "exp-android-uuid",
    "state": "running",
    "phase": "injecting",
    "fault_type": "kill_app",
    "current_intensity": 45
  }
}`}</CodeBlock>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Utility</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Health Check</CardTitle></CardHeader>
          <CardContent>
            <CodeBlock>{`OK`}</CodeBlock>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
