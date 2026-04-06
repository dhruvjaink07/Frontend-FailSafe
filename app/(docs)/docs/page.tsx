import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, FlaskConical, Server, Monitor, Smartphone, ArrowRight } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Getting Started | FailSafe Documentation",
  description: "Learn how to use FailSafe for chaos engineering and resilience testing",
}

export default function DocsPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="space-y-4">
        <Badge variant="secondary">Documentation</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Getting Started with FailSafe</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          FailSafe is a chaos engineering control system that enables you to test system resilience
          through controlled fault injection across backend, frontend, and mobile platforms.
        </p>
      </div>

      {/* What is FailSafe */}
      <section id="what-is-failsafe" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          What is FailSafe?
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          FailSafe is an adaptive chaos engineering platform designed to systematically test your
          system&apos;s resilience. It enables controlled fault injection with real-time monitoring and
          automatic rollback capabilities.
        </p>
        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <Server className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Backend Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Test Docker containers with CPU stress, memory pressure, network delays, and service kills.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Monitor className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Frontend Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Inject latency and errors into web applications while monitoring Core Web Vitals.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Smartphone className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Android Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Test mobile applications with network faults, battery drain, and resource constraints.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          How It Works
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          FailSafe operates through a systematic experiment lifecycle that ensures safe and controlled
          chaos injection:
        </p>
        <div className="grid gap-4 mt-6">
          <div className="flex gap-4 items-start p-4 rounded-lg border border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              1
            </div>
            <div>
              <h3 className="font-semibold">Baseline Phase</h3>
              <p className="text-sm text-muted-foreground">
                System metrics are collected to establish normal behavior patterns before any faults are injected.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-4 rounded-lg border border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              2
            </div>
            <div>
              <h3 className="font-semibold">Injecting Phase</h3>
              <p className="text-sm text-muted-foreground">
                Faults are progressively injected according to the configured intensity model. In adaptive mode,
                intensity adjusts based on system response.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-4 rounded-lg border border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              3
            </div>
            <div>
              <h3 className="font-semibold">Recovering Phase</h3>
              <p className="text-sm text-muted-foreground">
                Faults are removed and the system is monitored to ensure it returns to baseline behavior.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-4 rounded-lg border border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              4
            </div>
            <div>
              <h3 className="font-semibold">Completed Phase</h3>
              <p className="text-sm text-muted-foreground">
                Experiment results are compiled and resilience scores are calculated based on system behavior.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* First Experiment */}
      <section id="first-experiment" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Your First Experiment
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Follow these steps to run your first chaos experiment with FailSafe:
        </p>
        
        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Configure your environment</h3>
            <p className="text-sm text-muted-foreground">
              Ensure Docker is running for backend tests, or configure the metrics collector for frontend tests.
            </p>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <code>docker ps  # Verify Docker is running</code>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">2. Create an API key</h3>
            <p className="text-sm text-muted-foreground">
              Generate an API key from the Settings page to authenticate your requests.
            </p>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <code>curl -X POST http://localhost:8000/api-keys \{"\n"}  -H &quot;Content-Type: application/json&quot; \{"\n"}  -d &apos;{`{"name": "my-key", "role": "engineer"}`}&apos;</code>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">3. Start an experiment</h3>
            <p className="text-sm text-muted-foreground">
              Use the API or dashboard to create and start your first experiment.
            </p>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <code>curl -X POST http://localhost:8000/experiments/backend/start \{"\n"}  -H &quot;x-api-key: fs_your_key_here&quot; \{"\n"}  -H &quot;Content-Type: application/json&quot; \{"\n"}  -d &apos;{`{
    "targets": ["api-service"],
    "fault_type": "latency",
    "duration": 60,
    "adaptive": true
  }`}&apos;</code>
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2">
          Next Steps
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/docs/concepts" className="group">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Zap className="h-6 w-6 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-lg">Core Concepts</CardTitle>
                <CardDescription>
                  Learn about experiment lifecycles, fault types, and adaptive testing
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/docs/api" className="group">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <FlaskConical className="h-6 w-6 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-lg">API Reference</CardTitle>
                <CardDescription>
                  Explore the complete API documentation for programmatic control
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  )
}
