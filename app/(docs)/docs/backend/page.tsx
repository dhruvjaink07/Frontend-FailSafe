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
  title: "Backend Testing | FailSafe Documentation",
  description: "Detailed guide to backend chaos testing with Docker containers",
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  )
}

export default function BackendPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="secondary">Backend Testing</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Backend Chaos Testing</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Test your backend services running in Docker containers.
        </p>
      </div>

      {/* Docker Targets */}
      <section id="docker" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Docker Targets
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          FailSafe connects to your Docker daemon to discover and target running containers.
          You can specify targets by name, ID, or label selectors.
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Prerequisites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Docker Engine running and accessible</li>
              <li>FailSafe has access to Docker socket</li>
              <li>Target containers are running</li>
            </ul>
            <CodeBlock>{`# Verify Docker is accessible
docker ps

# Run FailSafe with Docker socket access
docker run -v /var/run/docker.sock:/var/run/docker.sock failsafe/agent`}</CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Targeting Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div>
              <p className="font-medium">By Container Name</p>
              <p className="text-muted-foreground mt-1">
                Target specific containers by their name.
              </p>
              <CodeBlock>{`"targets": ["api-service", "postgres-db"]`}</CodeBlock>
            </div>
            
            <div>
              <p className="font-medium">By Container ID</p>
              <p className="text-muted-foreground mt-1">
                Target by full or partial container ID.
              </p>
              <CodeBlock>{`"targets": ["abc123def456", "xyz789"]`}</CodeBlock>
            </div>

            <div>
              <p className="font-medium">By Label Selector</p>
              <p className="text-muted-foreground mt-1">
                Target all containers matching label criteria.
              </p>
              <CodeBlock>{`"targets": ["app=myapp", "env=staging"]`}</CodeBlock>
            </div>

            <div>
              <p className="font-medium">Wildcard Patterns</p>
              <p className="text-muted-foreground mt-1">
                Use wildcards to match multiple containers.
              </p>
              <CodeBlock>{`"targets": ["api-*", "*-service"]`}</CodeBlock>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Fault Types */}
      <section id="faults" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Fault Types
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Backend fault types simulate various infrastructure failures.
        </p>

        <div className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="font-mono">cpu_stress</Badge>
                <CardTitle className="text-lg">CPU Stress</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Consumes CPU cycles to simulate high CPU load on a container.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intensity</TableHead>
                    <TableHead>Effect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>10</TableCell>
                    <TableCell className="text-muted-foreground">10% CPU usage</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>50</TableCell>
                    <TableCell className="text-muted-foreground">50% CPU usage</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>100</TableCell>
                    <TableCell className="text-muted-foreground">100% CPU usage (all cores)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <CodeBlock>{`{
  "fault_type": "cpu_stress",
  "targets": ["api-service"],
  "duration": 60,
  "max_intensity": 80
}`}</CodeBlock>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="font-mono">memory_stress</Badge>
                <CardTitle className="text-lg">Memory Stress</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Allocates memory to simulate memory pressure.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intensity</TableHead>
                    <TableHead>Effect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>25</TableCell>
                    <TableCell className="text-muted-foreground">Allocate 25% of available memory</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>50</TableCell>
                    <TableCell className="text-muted-foreground">Allocate 50% of available memory</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>90</TableCell>
                    <TableCell className="text-muted-foreground">Allocate 90% - may trigger OOM</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="font-mono">kill</Badge>
                <CardTitle className="text-lg">Process Kill</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Terminates container processes to simulate crashes.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intensity</TableHead>
                    <TableHead>Effect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>10</TableCell>
                    <TableCell className="text-muted-foreground">10% chance to kill per interval</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>50</TableCell>
                    <TableCell className="text-muted-foreground">50% chance to kill per interval</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>100</TableCell>
                    <TableCell className="text-muted-foreground">Guaranteed kill</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="font-mono">network_delay</Badge>
                <CardTitle className="text-lg">Network Delay</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Adds latency to network packets using tc (traffic control).
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intensity</TableHead>
                    <TableHead>Effect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>50</TableCell>
                    <TableCell className="text-muted-foreground">50ms added latency</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>200</TableCell>
                    <TableCell className="text-muted-foreground">200ms added latency</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>1000</TableCell>
                    <TableCell className="text-muted-foreground">1 second added latency</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="font-mono">packet_loss</Badge>
                <CardTitle className="text-lg">Packet Loss</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Drops a percentage of network packets.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intensity</TableHead>
                    <TableHead>Effect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>5</TableCell>
                    <TableCell className="text-muted-foreground">5% packet loss</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>20</TableCell>
                    <TableCell className="text-muted-foreground">20% packet loss</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>50</TableCell>
                    <TableCell className="text-muted-foreground">50% packet loss - severe degradation</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
