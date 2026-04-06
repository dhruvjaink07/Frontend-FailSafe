import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = {
  title: "Core Concepts | FailSafe Documentation",
  description: "Understanding experiment lifecycles, fault types, and adaptive testing in FailSafe",
}

export default function ConceptsPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="secondary">Core Concepts</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Understanding FailSafe</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Master the fundamental concepts behind chaos engineering with FailSafe.
        </p>
      </div>

      {/* Experiment Lifecycle */}
      <section id="lifecycle" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Experiment Lifecycle
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Every FailSafe experiment progresses through four distinct phases. Understanding these phases
          is crucial for designing effective resilience tests.
        </p>

        <div className="grid gap-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-info text-info-foreground">baseline</Badge>
                <CardTitle className="text-lg">Baseline Collection</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                The system operates normally while FailSafe collects performance metrics. This establishes
                a reference point for comparing behavior during fault injection. Duration is typically
                10-30 seconds.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Response times are measured</li>
                <li>Error rates are recorded</li>
                <li>Resource utilization is tracked</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-warning text-warning-foreground">injecting</Badge>
                <CardTitle className="text-lg">Fault Injection</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Faults are actively being injected into the system. In adaptive mode, intensity
                increases gradually based on system response. Metrics continue to be collected.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Intensity starts at configured step value</li>
                <li>Adaptive mode adjusts based on thresholds</li>
                <li>Manual stop available at any time</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-info text-info-foreground">recovering</Badge>
                <CardTitle className="text-lg">Recovery Period</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                All faults are removed and the system is monitored to ensure it returns to normal
                operation. This phase validates the system&apos;s ability to recover gracefully.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Fault injection stops immediately</li>
                <li>Metrics compared against baseline</li>
                <li>Recovery time is measured</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-success text-success-foreground">completed</Badge>
                <CardTitle className="text-lg">Completion</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                The experiment has finished. Results are compiled including resilience scores,
                failure points, and recommendations for improvement.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Fault Types */}
      <section id="fault-types" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Fault Types
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          FailSafe supports various fault types across different platforms. Each fault type simulates
          specific failure scenarios.
        </p>

        <div className="rounded-lg border border-border overflow-hidden mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fault Type</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-sm">cpu_stress</TableCell>
                <TableCell><Badge variant="outline">Backend</Badge></TableCell>
                <TableCell className="text-muted-foreground">Consumes CPU cycles to simulate high load</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">memory_stress</TableCell>
                <TableCell><Badge variant="outline">Backend</Badge></TableCell>
                <TableCell className="text-muted-foreground">Allocates memory to simulate memory pressure</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">kill</TableCell>
                <TableCell><Badge variant="outline">Backend</Badge></TableCell>
                <TableCell className="text-muted-foreground">Terminates container processes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">network_delay</TableCell>
                <TableCell><Badge variant="outline">Backend</Badge></TableCell>
                <TableCell className="text-muted-foreground">Adds latency to network packets</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">packet_loss</TableCell>
                <TableCell><Badge variant="outline">Backend</Badge></TableCell>
                <TableCell className="text-muted-foreground">Drops a percentage of network packets</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">latency</TableCell>
                <TableCell><Badge variant="outline">Frontend</Badge></TableCell>
                <TableCell className="text-muted-foreground">Delays API responses</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">error</TableCell>
                <TableCell><Badge variant="outline">Frontend</Badge></TableCell>
                <TableCell className="text-muted-foreground">Returns error responses</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">network</TableCell>
                <TableCell><Badge variant="outline">Frontend</Badge></TableCell>
                <TableCell className="text-muted-foreground">Simulates network failures</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Intensity Model */}
      <section id="intensity" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Intensity Model
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Intensity controls the severity of fault injection on a scale of 0-100. The interpretation
          varies by fault type.
        </p>

        <div className="grid gap-4 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">Step Intensity</p>
                <p className="text-sm text-muted-foreground">
                  How much intensity increases per interval in adaptive mode. Default: 10
                </p>
              </div>
              <div>
                <p className="font-medium">Max Intensity</p>
                <p className="text-sm text-muted-foreground">
                  Upper limit for intensity. Injection stops when reached. Default: 100
                </p>
              </div>
              <div>
                <p className="font-medium">Current Intensity</p>
                <p className="text-sm text-muted-foreground">
                  Real-time intensity level during injection phase.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Intensity Meanings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">CPU/Memory Stress</p>
                <p className="text-sm text-muted-foreground">
                  Percentage of resources to consume (e.g., 50 = 50% CPU)
                </p>
              </div>
              <div>
                <p className="font-medium">Latency</p>
                <p className="text-sm text-muted-foreground">
                  Milliseconds of delay (e.g., 100 = 100ms added latency)
                </p>
              </div>
              <div>
                <p className="font-medium">Packet Loss/Errors</p>
                <p className="text-sm text-muted-foreground">
                  Percentage of affected requests (e.g., 30 = 30% error rate)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Adaptive Testing */}
      <section id="adaptive" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Adaptive Testing
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Adaptive mode automatically adjusts fault intensity based on system response, finding the
          exact point where your system begins to degrade.
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How Adaptive Mode Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              When enabled, FailSafe monitors key metrics during injection and makes intelligent decisions:
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-medium text-foreground">Start Low:</span> Begin at the configured step intensity
              </li>
              <li>
                <span className="font-medium text-foreground">Monitor:</span> Track response times, error rates, and throughput
              </li>
              <li>
                <span className="font-medium text-foreground">Increase:</span> If metrics stay within thresholds, increase intensity by step value
              </li>
              <li>
                <span className="font-medium text-foreground">Hold:</span> If metrics approach thresholds, maintain current intensity
              </li>
              <li>
                <span className="font-medium text-foreground">Stop:</span> If metrics exceed thresholds or max intensity is reached, begin recovery
              </li>
            </ol>
            <div className="bg-muted rounded-lg p-4 mt-4">
              <p className="font-medium text-foreground">Default Thresholds</p>
              <ul className="mt-2 space-y-1">
                <li>Response time: &gt;2x baseline triggers hold</li>
                <li>Error rate: &gt;5% triggers hold, &gt;20% triggers stop</li>
                <li>Throughput: &lt;50% baseline triggers stop</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
