import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/metrics/system`, {
      cache: "no-store",
      headers: {
        "x-api-key": getForwardedApiKey(request),
      },
    })
    const contentType = response.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      return NextResponse.json(await response.json(), { status: response.status })
    }

    return NextResponse.json(
      { error: "Backend returned non-JSON metrics response" },
      { status: 502 },
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch system metrics" },
      { status: 503 }
    )
  }
}
