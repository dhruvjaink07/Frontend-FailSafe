"use client"

import Link from "next/link"
import { Topbar } from "@/components/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TerminalSquare, Play, ServerCog, FileText, ArrowRight } from "lucide-react"

export default function DevWorkflowPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar title="Dev Workflow" description="Tools and quick helpers for local development" />

      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dev Workflow</CardTitle>
              <CardDescription>Quick links and tools to help with local dev and testing.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <TerminalSquare className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Local Runner</div>
                        <div className="text-xs text-muted-foreground">Run and debug the local backend and helpers</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button asChild>
                        <Link href="/settings/api-keys">Open Runner</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/api/_dev/container-start-stream">Test Stream</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <ServerCog className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Streaming Test</div>
                        <div className="text-xs text-muted-foreground">Endpoint that emits a demo stream for UI testing</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button asChild>
                        <Link href="/api/_dev/container-start-stream">Open Stream</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/docs">Docs</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Developer Notes</div>
                        <div className="text-xs text-muted-foreground">Tips for testing streaming, pagination and logs locally</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                      <li>Use the <b>Test Stream</b> endpoint to exercise the UI streaming flows.</li>
                      <li>For pagination tests, use the History page with `?limit=` to change page size.</li>
                      <li>Logs follow uses SSE; try `?follow=true&format=sse` against `/api/experiments/backend/logs`.</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
