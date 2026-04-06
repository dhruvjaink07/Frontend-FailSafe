import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Frontend Testing | FailSafe Documentation",
  description: "Detailed guide to frontend chaos testing with FailSafe",
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  )
}

export default function FrontendPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="secondary">Frontend Testing</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Frontend Chaos Testing</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Test your web application&apos;s resilience to network issues and API failures.
        </p>
      </div>

      {/* Metrics Collector */}
      <section id="collector" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Metrics Collector
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          The FailSafe metrics collector is a lightweight JavaScript library that captures
          performance data from your web application during chaos experiments.
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Installation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Add the collector script to your HTML:
            </p>
            <CodeBlock>{`<script src="https://failsafe.io/collector.js"></script>
<script>
  FailSafe.init({
    apiKey: 'fs_your_key',
    endpoint: 'http://localhost:8000',
    sampleRate: 1.0,  // 100% sampling
    debug: false
  });
</script>`}</CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="font-medium font-mono">apiKey</p>
                <p className="text-muted-foreground">Your FailSafe API key for authentication.</p>
              </div>
              <div>
                <p className="font-medium font-mono">endpoint</p>
                <p className="text-muted-foreground">FailSafe server URL. Default: http://localhost:8000</p>
              </div>
              <div>
                <p className="font-medium font-mono">sampleRate</p>
                <p className="text-muted-foreground">Percentage of sessions to collect (0.0 - 1.0). Default: 1.0</p>
              </div>
              <div>
                <p className="font-medium font-mono">debug</p>
                <p className="text-muted-foreground">Enable console logging for debugging. Default: false</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Collected Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>The collector automatically captures:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Page load times and navigation timing</li>
              <li>Core Web Vitals (LCP, CLS, INP)</li>
              <li>XHR/Fetch request timing and errors</li>
              <li>JavaScript errors and unhandled rejections</li>
              <li>Resource loading performance</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Web Vitals */}
      <section id="vitals" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Web Vitals Explained
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Core Web Vitals are Google&apos;s metrics for measuring user experience. FailSafe monitors
          these during experiments to understand how faults affect perceived performance.
        </p>

        <div className="grid gap-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">LCP - Largest Contentful Paint</CardTitle>
                <Badge variant="outline">Loading</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Measures how long it takes for the largest content element to become visible.
                This is typically a hero image, video, or large text block.
              </p>
              <div className="flex gap-4 mt-4">
                <div className="flex-1 p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="font-medium text-success">Good</p>
                  <p className="text-sm text-muted-foreground">&lt; 2.5s</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="font-medium text-warning">Needs Improvement</p>
                  <p className="text-sm text-muted-foreground">2.5s - 4s</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="font-medium text-destructive">Poor</p>
                  <p className="text-sm text-muted-foreground">&gt; 4s</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">CLS - Cumulative Layout Shift</CardTitle>
                <Badge variant="outline">Visual Stability</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Measures visual stability by tracking unexpected layout shifts. High CLS means
                elements are moving around, causing poor user experience.
              </p>
              <div className="flex gap-4 mt-4">
                <div className="flex-1 p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="font-medium text-success">Good</p>
                  <p className="text-sm text-muted-foreground">&lt; 0.1</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="font-medium text-warning">Needs Improvement</p>
                  <p className="text-sm text-muted-foreground">0.1 - 0.25</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="font-medium text-destructive">Poor</p>
                  <p className="text-sm text-muted-foreground">&gt; 0.25</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">INP - Interaction to Next Paint</CardTitle>
                <Badge variant="outline">Interactivity</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Measures responsiveness by tracking the time from user interaction (click, tap, keypress)
                to the next visual update. Replaced FID in March 2024.
              </p>
              <div className="flex gap-4 mt-4">
                <div className="flex-1 p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="font-medium text-success">Good</p>
                  <p className="text-sm text-muted-foreground">&lt; 200ms</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="font-medium text-warning">Needs Improvement</p>
                  <p className="text-sm text-muted-foreground">200ms - 500ms</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="font-medium text-destructive">Poor</p>
                  <p className="text-sm text-muted-foreground">&gt; 500ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
