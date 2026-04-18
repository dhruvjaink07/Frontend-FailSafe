import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(`${BACKEND_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "text/plain, application/json",
        "x-api-key": getForwardedApiKey(request),
      },
    })

    clearTimeout(timeout)

    const bodyText = await response.text()
    const normalized = bodyText.trim().toLowerCase()
    const healthy = response.ok && (normalized === "ok" || normalized === "healthy" || normalized.length > 0)

    return NextResponse.json(
      {
        healthy,
        status: response.status,
        target: `${BACKEND_BASE_URL}/health`,
        body: bodyText,
      },
      { status: healthy ? 200 : 503 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed"

    return NextResponse.json(
      {
        healthy: false,
        status: 0,
        target: `${BACKEND_BASE_URL}/health`,
        error: message,
      },
      { status: 503 },
    )
  }
}
