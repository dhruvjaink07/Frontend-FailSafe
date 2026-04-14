import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Android Testing | FailSafe Documentation",
  description: "Verified Android experiment endpoints and upload flow",
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  )
}

export default function AndroidPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="secondary">Android Testing</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Android Chaos Testing</h1>
        <p className="text-xl leading-relaxed text-muted-foreground">
          Upload an APK, start an Android experiment, then poll status and metrics from the verified endpoints.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">APK Upload</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Upload Endpoint</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <CodeBlock>{`POST http://localhost:8000/upload/apk
Content-Type: multipart/form-data

file: <binary APK file> OR apk: <binary APK file>`}</CodeBlock>
            <CodeBlock>{`{
  "id": "apk-uuid-here",
  "apk": "apk-uuid-here",
  "path": "D:\\FailSafe\\uploads\\apks\\apk-uuid-here.apk",
  "package": "com.example.code",
  "activity": "com.example.code.MainActivity"
}`}</CodeBlock>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Start Experiment</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Start Android Experiment</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <CodeBlock>{`POST http://localhost:8000/experiments/android/start`}</CodeBlock>
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
  "id": "exp-android-uuid",
  "state": "running",
  "phase": "baseline",
  "fault_type": "kill_app",
  "package": "com.example.code"
}`}</CodeBlock>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Status and Metrics</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Verified Polling Routes</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <CodeBlock>{`GET http://localhost:8000/experiments/android/status?id={experiment_id}`}</CodeBlock>
            <CodeBlock>{`{
  "experiment": {
    "id": "exp-android-uuid",
    "state": "running",
    "phase": "injecting",
    "fault_type": "kill_app",
    "current_intensity": 45
  }
}`}</CodeBlock>
            <CodeBlock>{`GET http://localhost:8000/experiments/android/metrics?id={experiment_id}`}</CodeBlock>
            <CodeBlock>{`POST http://localhost:8000/experiments/android/stop?id={experiment_id}`}</CodeBlock>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
