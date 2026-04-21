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

          

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>Essential settings only — simplified for reliability.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Link href="/settings/api-keys">
                    <Card className="cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-primary" />
                            <div>
                              <div className="font-medium">API Keys</div>
                              <div className="text-xs text-muted-foreground">Manage programmatic access</div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>

                  <Link href="/settings/notifications">
                    <Card className="cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-primary" />
                            <div>
                              <div className="font-medium">Notifications</div>
                              <div className="text-xs text-muted-foreground">Slack & Email routing</div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                  
                  <Link href="/settings/dev-workflow">
                    <Card className="cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TerminalSquare className="h-5 w-5 text-primary" />
                            <div>
                              <div className="font-medium">Dev Workflow</div>
                              <div className="text-xs text-muted-foreground">Local dev tooling & runner</div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
