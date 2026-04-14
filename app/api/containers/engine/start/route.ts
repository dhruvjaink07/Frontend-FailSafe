import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const headers = {
      "x-api-key": getForwardedApiKey(request),
      "content-type": "application/json",
    }

    const candidates = [
      "/containers/engine/start",
      "/docker/engine/start",
      "/engine/start",
      "/docker/start",
    ]

    for (const path of candidates) {
      const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
        method: "POST",
        cache: "no-store",
        headers,
      })

      if (!response.ok) continue

      const contentType = response.headers.get("content-type") ?? ""
      if (contentType.includes("application/json")) {
        return NextResponse.json(await response.json(), { status: response.status })
      }

      return NextResponse.json({ status: "started" }, { status: response.status })
    }

    // Some backends do not expose a dedicated engine-start endpoint.
    // Return a non-error status so the UI can continue using list/start/stop container APIs.
    return NextResponse.json(
      {
        status: "connected",
        supported: false,
        message: "Engine start is managed by backend; no explicit start endpoint.",
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ error: "Failed to start Docker engine" }, { status: 503 })
  }
}
