import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Experiments Guide | FailSafe Documentation",
  description: "Guide to running chaos experiments on backend, frontend, and Android platforms",
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  )
}

export default function ExperimentsPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="secondary">Experiments Guide</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Running Experiments</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Detailed guides for chaos testing across all supported platforms.
        </p>
      </div>

      {/* Backend Testing */}
      <section id="backend" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Backend Testing
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Backend testing targets Docker containers running your services. FailSafe injects faults
          directly into container processes and network stacks.
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Docker Targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Specify targets using container names or labels. FailSafe will discover all matching containers.
            </p>
            <CodeBlock>{`# By container name
"targets": ["api-service", "database"]

# By label selector
"targets": ["app=myapp", "env=staging"]`}</CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dependency Graph</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              FailSafe can automatically detect service dependencies and calculate blast radius.
              This helps you understand the cascade impact of failures.
            </p>
            <CodeBlock>{`# Response includes dependency information
{
  "targets": ["api-service"],
  "dependencies": ["database", "cache"],
  "blast_radius": 3,
  "cascade_depth": 2
}`}</CodeBlock>
          </CardContent>
        </Card>

        <div className="space-y-4 mt-6">
          <h3 className="font-semibold">Available Fault Types</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium font-mono">cpu_stress</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Consumes CPU cycles. Intensity = percentage of CPU to use.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium font-mono">memory_stress</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Allocates memory. Intensity = percentage of available memory.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium font-mono">kill</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Terminates processes. Intensity = percentage of containers to kill.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium font-mono">network_delay</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Adds latency. Intensity = milliseconds of delay.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium font-mono">packet_loss</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Drops packets. Intensity = percentage of packets to drop.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Frontend Testing */}
      <section id="frontend" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Frontend Testing
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Frontend testing injects faults into web applications through a service worker or proxy.
          This allows testing user-facing behavior under degraded conditions.
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Metrics Collector Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Add the FailSafe metrics collector to your web application:
            </p>
            <CodeBlock>{`<script src="https://failsafe.io/collector.js"></script>
<script>
  FailSafe.init({
    apiKey: 'fs_your_key',
    endpoint: 'http://localhost:8000'
  });
</script>`}</CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Web Vitals Monitoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              FailSafe automatically collects Core Web Vitals during experiments:
            </p>
            <div className="space-y-3 mt-4">
              <div>
                <p className="font-medium">LCP (Largest Contentful Paint)</p>
                <p className="text-muted-foreground">
                  Measures loading performance. Good: &lt;2.5s
                </p>
              </div>
              <div>
                <p className="font-medium">CLS (Cumulative Layout Shift)</p>
                <p className="text-muted-foreground">
                  Measures visual stability. Good: &lt;0.1
                </p>
              </div>
              <div>
                <p className="font-medium">INP (Interaction to Next Paint)</p>
                <p className="text-muted-foreground">
                  Measures interactivity. Good: &lt;200ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Android Testing */}
      <section id="android" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Android Testing
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Android testing runs your app in an emulator and injects faults through ADB commands
          and network interception.
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">APK Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Upload your debug APK to begin testing:
            </p>
            <CodeBlock>{`curl -X POST http://localhost:8000/android/upload \\
  -H "x-api-key: fs_your_key" \\
  -F "apk=@app-debug.apk"`}</CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Emulator Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Configure the Android emulator for testing:
            </p>
            <CodeBlock>{`{
  "emulator": {
    "name": "Pixel_6_API_33",
    "sdk_version": 33,
    "screen_density": 420
  },
  "network_profile": "LTE"
}`}</CodeBlock>
            <p className="text-muted-foreground mt-4">
              Available network profiles: LTE, 3G, EDGE, GPRS, Full
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4 mt-6">
          <h3 className="font-semibold">Android-Specific Faults</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium font-mono">network_throttle</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Degrades network speed. Intensity = bandwidth reduction %.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium font-mono">battery_drain</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Simulates low battery. Intensity = battery level %.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium font-mono">memory_pressure</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Triggers low memory conditions. Intensity = memory pressure level.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="font-medium font-mono">airplane_mode</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Toggles airplane mode on/off during test.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
