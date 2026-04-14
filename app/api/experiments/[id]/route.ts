import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = getForwardedApiKey(request)
    const headers = { "x-api-key": apiKey }

    const backend = await (async () => {
      const response = await fetch(
        `${BACKEND_BASE_URL}/experiments/backend/status?id=${encodeURIComponent(id)}`,
        { cache: "no-store", headers },
      )
      if (!response.ok) return null
      const payload = (await response.json()) as { experiment?: Record<string, unknown> } | Record<string, unknown>
      const experiment = "experiment" in payload ? payload.experiment : payload
      return experiment && typeof experiment === "object" ? { ...experiment, platform: "backend" } : null
    })()
    if (backend) return NextResponse.json(backend)

    const frontend = await (async () => {
      const response = await fetch(
        `${BACKEND_BASE_URL}/experiments/frontend/status?id=${encodeURIComponent(id)}`,
        { cache: "no-store", headers },
      )
      if (!response.ok) return null
      const payload = (await response.json()) as { experiment?: Record<string, unknown> } | Record<string, unknown>
      const experiment = "experiment" in payload ? payload.experiment : payload
      return experiment && typeof experiment === "object" ? { ...experiment, platform: "frontend" } : null
    })()
    if (frontend) return NextResponse.json(frontend)

    const android = await (async () => {
      const response = await fetch(
        `${BACKEND_BASE_URL}/experiments/android/status?id=${encodeURIComponent(id)}`,
        { cache: "no-store", headers },
      )
      if (!response.ok) return null
      const payload = (await response.json()) as { experiment?: Record<string, unknown> } | Record<string, unknown>
      const experiment = "experiment" in payload ? payload.experiment : payload
      return experiment && typeof experiment === "object" ? { ...experiment, platform: "android" } : null
    })()
    if (android) return NextResponse.json(android)

    return NextResponse.json(
      { error: "Experiment not found" },
      { status: 404 }
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch experiment" },
      { status: 503 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = getForwardedApiKey(request)
    const headers = { "x-api-key": apiKey }

    for (const platform of ["backend", "frontend", "android"] as const) {
      const response = await fetch(
        `${BACKEND_BASE_URL}/experiments/${platform}/stop?id=${encodeURIComponent(id)}`,
        { method: "POST", cache: "no-store", headers },
      )

      if (response.ok) {
        return new NextResponse(null, { status: 204 })
      }
    }

    return NextResponse.json(
      { error: "Experiment not found" },
      { status: 404 }
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to delete experiment" },
      { status: 503 }
    )
  }
}
