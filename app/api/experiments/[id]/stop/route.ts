import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getForwardedApiKey, hasAnyRole } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthContext(request)
    if (!hasAnyRole(auth, ["engineer", "admin"])) {
      return NextResponse.json(
        { error: "Not allowed to stop experiments" },
        { status: 403 }
      )
    }

    const { id } = await params
  const apiKey = getForwardedApiKey(request)

    for (const platform of ["backend", "frontend", "android"] as const) {
      const response = await fetch(
        `${BACKEND_BASE_URL}/experiments/${platform}/stop?id=${encodeURIComponent(id)}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "x-api-key": apiKey,
          },
        },
      )

      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? ""
        if (contentType.includes("application/json")) {
          return NextResponse.json(await response.json())
        }
        return new NextResponse(await response.text(), { status: response.status })
      }
    }

    return NextResponse.json(
      { error: "Experiment not found" },
      { status: 404 }
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to stop experiment" },
      { status: 503 }
    )
  }
}
