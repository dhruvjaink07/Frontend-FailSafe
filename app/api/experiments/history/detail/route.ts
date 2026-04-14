import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim()
    if (!id) {
      return NextResponse.json({ error: "Missing history detail id" }, { status: 400 })
    }

    const apiKey = getForwardedApiKey(request)
    const response = await fetch(
      `${BACKEND_BASE_URL}/experiments/history/detail?id=${encodeURIComponent(id)}`,
      {
        cache: "no-store",
        headers: {
          "x-api-key": apiKey,
        },
      },
    )

    const contentType = response.headers.get("content-type") ?? ""
    if (!response.ok) {
      const message = await response.text().catch(() => "")
      return NextResponse.json(
        { error: message || `Backend responded with status ${response.status}` },
        { status: response.status || 502 },
      )
    }

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as Record<string, unknown>
      const item = payload.item && typeof payload.item === "object" ? payload.item : payload
      return NextResponse.json(item)
    }

    return NextResponse.json({ error: "Backend returned non-JSON history detail" }, { status: 502 })
  } catch {
    return NextResponse.json({ error: "Failed to fetch history detail" }, { status: 503 })
  }
}
