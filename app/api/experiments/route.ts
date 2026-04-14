import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

async function forwardToBackend(path: string, init?: RequestInit) {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
  })

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const payload = await response.json()
    return NextResponse.json(payload, { status: response.status })
  }

  const text = await response.text()
  return new NextResponse(text, {
    status: response.status,
    headers: contentType ? { "content-type": contentType } : undefined,
  })
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = getForwardedApiKey(request)
    const response = await fetch(`${BACKEND_BASE_URL}/experiments`, {
      cache: "no-store",
      headers: {
        "x-api-key": apiKey,
      },
    })
    if (response.status === 404) {
      return NextResponse.json([])
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      return NextResponse.json(await response.json(), { status: response.status })
    }

    return NextResponse.json([], { status: response.ok ? 200 : 503 })
  } catch {
    return NextResponse.json({ error: "Failed to fetch experiments" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getForwardedApiKey(request)
    const body = await request.text()

    return await forwardToBackend("/experiments", {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to create experiment" }, { status: 503 })
  }
}
