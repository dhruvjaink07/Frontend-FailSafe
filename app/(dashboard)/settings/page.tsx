"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Topbar } from "@/components/topbar"
import { Key, Settings2, Bell, Shield, ArrowRight, Webhook, Mail, TerminalSquare, SlidersHorizontal } from "lucide-react"
import { ConnectionStatusCard } from "@/components/core/connection-status-card"

const settingsSections = [
  {
    title: "API Keys",
    description: "Manage API access credentials for programmatic access",
    icon: Key,
    href: "/settings/api-keys",
    status: "ready",
  },
  {
    title: "Notifications",
    description: "Slack, email, and routing rules for runtime alerts",
    icon: Bell,
    href: "/settings/notifications",
    status: "ready",
  },
  {
    title: "Security",
    description: "Access controls, roles, and auth hardening",
    icon: Shield,
    href: "/settings/security",
    disabled: true,
  },
  {
    title: "General",
    description: "Application preferences and configuration",
    icon: Settings2,
    href: "/settings/general",
    disabled: true,
  },
]

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar
        title="Settings"
        description="Manage your FailSafe configuration"
      />

      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <ConnectionStatusCard title="Runtime Connection" />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Surface</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">DevOps</p>
                <p className="text-xs text-muted-foreground">Built for testers and engineers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Runtime</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">Config-first</p>
                <p className="text-xs text-muted-foreground">Local state + shareable docs</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">Slack + Email</p>
                <p className="text-xs text-muted-foreground">Notification routing</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">API Keys</p>
                <p className="text-xs text-muted-foreground">Role-based controls</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration Surface</CardTitle>
              <CardDescription>
                Quick access to the settings areas used most by developers and testers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {settingsSections.map((section) => (
                  <Card
                    key={section.title}
                    className={section.disabled ? "opacity-60" : "cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"}
                  >
                    {section.disabled ? (
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <section.icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <Badge variant="outline">Coming Soon</Badge>
                        </div>
                        <CardTitle className="mt-4 flex items-center gap-2">{section.title}</CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                      </CardHeader>
                    ) : (
                      <Link href={section.href}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <section.icon className="h-5 w-5 text-primary" />
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <CardTitle className="mt-4 flex items-center gap-2">{section.title}</CardTitle>
                          <CardDescription>{section.description}</CardDescription>
                        </CardHeader>
                      </Link>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Slack Alerts</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Route experiment failures, degradations, and recoveries to Slack channels.</p>
                <Button asChild variant="outline" className="w-full transition-all duration-200 ease-out hover:shadow-md">
                  <Link href="/settings/notifications">Configure Slack</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-info/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-info" />
                  <CardTitle className="text-lg">Email Alerts</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Send incident summaries and test results to distribution lists or owners.</p>
                <Button asChild variant="outline" className="w-full transition-all duration-200 ease-out hover:shadow-md">
                  <Link href="/settings/notifications">Configure Email</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-warning/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TerminalSquare className="h-5 w-5 text-warning" />
                  <CardTitle className="text-lg">Dev Workflow</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Keep experiment configs, alert routing, and access control in sync with local workflows.</p>
                <Button asChild variant="outline" className="w-full transition-all duration-200 ease-out hover:shadow-md">
                  <Link href="/settings/api-keys">Manage Access</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
