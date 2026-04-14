import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const apiKey = getForwardedApiKey(request)

    const headers = {
      "x-api-key": apiKey,
      "content-type": "application/json",
    }

    const candidates: Array<{ path: string; body?: string }> = [
      { path: `/environment/containers/${encodeURIComponent(name)}/start` },
      { path: "/environment/containers/start", body: JSON.stringify({ name }) },
      { path: `/containers/${encodeURIComponent(name)}/start` },
      { path: "/containers/start", body: JSON.stringify({ name }) },
      { path: "/environment/containers/start", body: JSON.stringify({ name, container: name }) },
      { path: "/docker/containers/start", body: JSON.stringify({ name }) },
      { path: "/engine/containers/start", body: JSON.stringify({ name }) },
    ]

    for (const candidate of candidates) {
      const response = await fetch(`${BACKEND_BASE_URL}${candidate.path}`, {
        method: "POST",
        cache: "no-store",
        headers,
        body: candidate.body,
      })
      const contentType = response.headers.get("content-type") ?? ""
      if (!response.ok) {
        if (response.status === 404) continue
        if (contentType.includes("application/json")) {
          return NextResponse.json(await response.json(), { status: response.status })
        }
        return NextResponse.json({ error: `Backend responded with status ${response.status}` }, { status: response.status })
      }

      if (contentType.includes("application/json")) {
        return NextResponse.json(await response.json(), { status: response.status })
      }

      return NextResponse.json({ name, status: "running" }, { status: response.status })
    }

    return NextResponse.json({ error: "Container start endpoint not available" }, { status: 503 })
  } catch {
    return NextResponse.json(
      { error: "Failed to start container" },
      { status: 503 }
    )
  }
}
