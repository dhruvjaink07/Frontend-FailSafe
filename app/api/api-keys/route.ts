import { NextRequest, NextResponse } from "next/server"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"
const BACKEND_API_KEY = process.env.BACKEND_API_KEY
const BACKEND_ENVIRONMENT = process.env.BACKEND_ENVIRONMENT ?? "dev"
const CREATE_KEY_PATH = "/internal/api-keys/create"

export async function GET() {
  // There is no backend fetch/list endpoint for keys.
  return NextResponse.json([])
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, role } = body as { name?: string; role?: string }

    if (!name || !role) {
      return NextResponse.json(
        { error: "Name and role are required" },
        { status: 400 }
      )
    }

    if (!["viewer", "engineer", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    const backendResponse = await fetch(`${BACKEND_BASE_URL}${CREATE_KEY_PATH}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(BACKEND_API_KEY ? { "x-api-key": BACKEND_API_KEY } : {}),
      },
      body: JSON.stringify({
        environment: BACKEND_ENVIRONMENT,
        role,
        name,
      }),
    })

    const payload = (await backendResponse.json().catch(() => ({}))) as Record<string, unknown>

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          error:
            (typeof payload.error === "string" && payload.error) ||
            (typeof payload.message === "string" && payload.message) ||
            "Failed to create API key",
        },
        { status: backendResponse.status || 503 },
      )
    }

    const keyValue =
      (typeof payload.key === "string" && payload.key) ||
      (typeof payload.api_key === "string" && payload.api_key) ||
      (typeof payload.token === "string" && payload.token) ||
      ""

    if (!keyValue) {
      return NextResponse.json(
        { error: "Backend key response did not include a key field" },
        { status: 502 },
      )
    }

    return NextResponse.json(
      {
        id:
          (typeof payload.id === "string" && payload.id) ||
          (typeof payload.key_id === "string" && payload.key_id) ||
          crypto.randomUUID(),
        name,
        role,
        key: keyValue,
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 503 }
    )
  }
}
