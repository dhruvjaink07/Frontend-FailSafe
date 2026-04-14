import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.toString()
    const target = `${BACKEND_BASE_URL}/logs${query ? `?${query}` : ""}`
    const response = await fetch(target, {
      cache: "no-store",
      headers: {
        "x-api-key": getForwardedApiKey(request),
      },
    })

    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      return NextResponse.json(await response.json(), { status: response.status })
    }

    return NextResponse.json([], { status: response.ok ? 200 : 503 })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 503 }
    )
  }
}
