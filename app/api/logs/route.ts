import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.toString()
    // backend logs endpoint lives under /experiments/backend/logs
    const target = `${BACKEND_BASE_URL}/experiments/backend/logs${query ? `?${query}` : ""}`
    const response = await fetch(target, {
      cache: "no-store",
      headers: {
        "x-api-key": getForwardedApiKey(request),
      },
    })

    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      // pass through JSON responses
      return NextResponse.json(await response.json(), { status: response.status })
    }

    // Handle plain text log streams from backend -> convert to structured LogEntry[]
    if (contentType.includes("text/plain") || contentType.includes("text/")) {
      const text = await response.text()

      // If backend returned non-OK (400/404/etc), provide a synthetic entry describing it
      if (!response.ok) {
        const bodySnippet = text ? text.slice(0, 400) : "<no body>"
        const synthetic = [{
          id: `backend-status-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'error',
          endpoint: 'backend',
          message: `Backend returned ${response.status}: ${bodySnippet}`,
          metadata: null,
        }]
        return NextResponse.json(synthetic, { status: response.status })
      }

      // Split into lines and map to LogEntry-like objects
      const lines = text.split(/\r?\n/).filter(Boolean)
      const entries = lines.map((line, idx) => {
        // Expected line format: [2026-04-14T07:50:12Z] svc-a: message...
        const m = line.match(/^\s*\[(.*?)\]\s*(\S+?)\s*:\s*(.*)$/)
        let timestamp = new Date().toISOString()
        let endpoint = "unknown"
        let message = line
        if (m) {
          timestamp = m[1]
          endpoint = m[2]
          message = m[3]
        }
        const lower = message.toLowerCase()
        const level = lower.includes('error') || lower.includes('exception') ? 'error' : lower.includes('warn') ? 'warn' : lower.includes('debug') ? 'debug' : 'info'
        return {
          id: `${Date.now()}-${idx}`,
          timestamp,
          level,
          endpoint,
          message,
          metadata: null,
        }
      })

      return NextResponse.json(entries, { status: 200 })
    }

    // For other content types, if response not ok surface a synthetic message
    if (!response.ok) {
      const txt = await response.text().catch(() => '')
      return NextResponse.json([{ id: `backend-status-${Date.now()}`, timestamp: new Date().toISOString(), level: 'error', endpoint: 'backend', message: `Backend returned ${response.status}: ${txt.slice(0,400)}`, metadata: null }], { status: response.status })
    }

    return NextResponse.json([], { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 503 }
    )
  }
}
