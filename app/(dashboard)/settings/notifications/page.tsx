"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Topbar } from "@/components/topbar"
import { Badge } from "@/components/ui/badge"
import { Bell, Webhook, Mail, TerminalSquare, ShieldCheck, TestTube2 } from "lucide-react"

const STORAGE_KEY = "failsafe:notification-config"

type NotificationConfig = {
  slackEnabled: boolean
  slackWebhookUrl: string
  slackChannel: string
  slackMentions: string
  emailEnabled: boolean
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
  fromAddress: string
  recipients: string
  incidentOnly: boolean
  sendOnComplete: boolean
}

const defaultConfig: NotificationConfig = {
  slackEnabled: false,
  slackWebhookUrl: "",
  slackChannel: "",
  slackMentions: "",
  emailEnabled: false,
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPassword: "",
  fromAddress: "",
  recipients: "",
  incidentOnly: true,
  sendOnComplete: true,
}

export default function NotificationsPage() {
  const [config, setConfig] = useState<NotificationConfig>(defaultConfig)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [testingSlack, setTestingSlack] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      setConfig({ ...defaultConfig, ...JSON.parse(raw) })
    } catch {
      // ignore malformed local storage
    }
  }, [])

  const recipientList = useMemo(
    () => config.recipients.split(",").map((item) => item.trim()).filter(Boolean),
    [config.recipients],
  )

  const saveConfig = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setSavedAt(new Date().toLocaleTimeString())
    toast.success("Notification config saved")
  }

  const testSlack = async () => {
    setTestingSlack(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    setTestingSlack(false)
    toast.success("Slack test payload queued", {
      description: config.slackWebhookUrl ? `Channel: ${config.slackChannel}` : "Webhook URL is empty; save config first.",
    })
  }

  const testEmail = async () => {
    setTestingEmail(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    setTestingEmail(false)
    toast.success("Email test prepared", {
      description: recipientList.length ? `Recipients: ${recipientList.join(", ")}` : "Add at least one recipient.",
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar title="Notifications" description="Slack and email routing for incident workflows" />

      <div className="flex-1 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">Dev / QA</p>
                <p className="text-xs text-muted-foreground">Config-first alert routing</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Slack</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{config.slackEnabled ? "On" : "Off"}</p>
                <p className="text-xs text-muted-foreground">Webhook alerts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Email</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{config.emailEnabled ? "On" : "Off"}</p>
                <p className="text-xs text-muted-foreground">SMTP notifications</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{savedAt ?? "No"}</p>
                <p className="text-xs text-muted-foreground">Local config state</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  <CardTitle>Slack Configuration</CardTitle>
                </div>
                <CardDescription>
                  Route experiment failures and recovery events to a Slack channel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">Enable Slack</p>
                    <p className="text-sm text-muted-foreground">Send alerts to Slack</p>
                  </div>
                  <Switch checked={config.slackEnabled} onCheckedChange={(checked) => setConfig((current) => ({ ...current, slackEnabled: checked }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slack-webhook">Webhook URL</Label>
                  <Input id="slack-webhook" placeholder="https://hooks.slack.com/services/..." value={config.slackWebhookUrl} onChange={(e) => setConfig((current) => ({ ...current, slackWebhookUrl: e.target.value }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="slack-channel">Channel</Label>
                    <Input id="slack-channel" value={config.slackChannel} onChange={(e) => setConfig((current) => ({ ...current, slackChannel: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slack-mentions">Mentions</Label>
                    <Input id="slack-mentions" value={config.slackMentions} onChange={(e) => setConfig((current) => ({ ...current, slackMentions: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Slack configs are stored locally for quick dev/test iteration.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={testSlack} disabled={testingSlack}>
                    <TestTube2 className="mr-2 h-4 w-4" />
                    {testingSlack ? "Testing..." : "Send Slack Test"}
                  </Button>
                  <Button onClick={saveConfig}>Save Slack</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-info" />
                  <CardTitle>Email Configuration</CardTitle>
                </div>
                <CardDescription>
                  Send incident summaries and experiment completion reports by email.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">Enable Email</p>
                    <p className="text-sm text-muted-foreground">Send alerts by SMTP</p>
                  </div>
                  <Switch checked={config.emailEnabled} onCheckedChange={(checked) => setConfig((current) => ({ ...current, emailEnabled: checked }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input id="smtp-host" value={config.smtpHost} onChange={(e) => setConfig((current) => ({ ...current, smtpHost: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input id="smtp-port" value={config.smtpPort} onChange={(e) => setConfig((current) => ({ ...current, smtpPort: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">SMTP User</Label>
                    <Input id="smtp-user" value={config.smtpUser} onChange={(e) => setConfig((current) => ({ ...current, smtpUser: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">SMTP Password</Label>
                    <Input id="smtp-password" type="password" value={config.smtpPassword} onChange={(e) => setConfig((current) => ({ ...current, smtpPassword: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-address">From Address</Label>
                  <Input id="from-address" value={config.fromAddress} onChange={(e) => setConfig((current) => ({ ...current, fromAddress: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients</Label>
                  <Textarea id="recipients" value={config.recipients} onChange={(e) => setConfig((current) => ({ ...current, recipients: e.target.value }))} placeholder="dev-team@local.dev, qa@local.dev" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium">Incident Only</p>
                      <p className="text-sm text-muted-foreground">Only send on failures/degradation</p>
                    </div>
                    <Switch checked={config.incidentOnly} onCheckedChange={(checked) => setConfig((current) => ({ ...current, incidentOnly: checked }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium">Send On Complete</p>
                      <p className="text-sm text-muted-foreground">Send completion summary</p>
                    </div>
                    <Switch checked={config.sendOnComplete} onCheckedChange={(checked) => setConfig((current) => ({ ...current, sendOnComplete: checked }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={testEmail} disabled={testingEmail}>
                    <TestTube2 className="mr-2 h-4 w-4" />
                    {testingEmail ? "Testing..." : "Send Email Test"}
                  </Button>
                  <Button onClick={saveConfig}>Save Email</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Routing Summary</CardTitle>
              <CardDescription>
                Useful defaults for teams running experiments and test suites.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Slack</p>
                <p className="mt-1 text-muted-foreground">{config.slackChannel || "No channel set"}</p>
                <Badge className="mt-3" variant={config.slackEnabled ? "default" : "secondary"}>{config.slackEnabled ? "Enabled" : "Disabled"}</Badge>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Email</p>
                <p className="mt-1 text-muted-foreground">{recipientList.length ? recipientList.join(", ") : "No recipients"}</p>
                <Badge className="mt-3" variant={config.emailEnabled ? "default" : "secondary"}>{config.emailEnabled ? "Enabled" : "Disabled"}</Badge>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Delivery Rules</p>
                <p className="mt-1 text-muted-foreground">{config.incidentOnly ? "Incident only" : "All events"}</p>
                <p className="mt-1 text-muted-foreground">{config.sendOnComplete ? "Includes summaries" : "No completion summary"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
