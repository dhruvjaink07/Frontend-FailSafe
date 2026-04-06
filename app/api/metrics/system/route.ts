import { NextResponse } from "next/server"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/metrics/system`, { cache: "no-store" })
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
