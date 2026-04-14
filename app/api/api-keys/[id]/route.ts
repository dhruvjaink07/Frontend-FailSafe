import { NextRequest, NextResponse } from "next/server"
import { apiKeys } from "@/lib/server/api-key-registry"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"
const BACKEND_API_KEYS_PATH = process.env.BACKEND_API_KEYS_PATH

function getApiKeyByIdCandidates(id: string) {
  const baseCandidates = [
    BACKEND_API_KEYS_PATH,
    "/api-keys",
    "/auth/api-keys",
    "/keys",
  ].filter((value): value is string => Boolean(value))

  return baseCandidates.map((base) => `${base.replace(/\/$/, "")}/${encodeURIComponent(id)}`)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = getForwardedApiKey(_request)
    const authorization = _request.headers.get("authorization") || _request.cookies.get("failsafe_auth")?.value

    for (const path of getApiKeyByIdCandidates(id)) {
      const backendResponse = await fetch(`${BACKEND_BASE_URL}${path}`, {
        method: "DELETE",
        cache: "no-store",
        headers: {
          ...(authorization ? { Authorization: `Bearer ${authorization}` } : { "x-api-key": apiKey }),
        },
      })

      if (backendResponse.ok) {
        apiKeys.delete(id)
        return new NextResponse(null, { status: 204 })
      }
    }

    return NextResponse.json(
      { error: "Backend API key delete endpoint not available" },
      { status: 503 },
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = getForwardedApiKey(_request)
    const authorization = _request.headers.get("authorization") || _request.cookies.get("failsafe_auth")?.value

    for (const path of getApiKeyByIdCandidates(id)) {
      const backendResponse = await fetch(`${BACKEND_BASE_URL}${path}`, {
        cache: "no-store",
        headers: {
          ...(authorization ? { Authorization: `Bearer ${authorization}` } : { "x-api-key": apiKey }),
        },
      })

      if (!backendResponse.ok) continue

      const key = (await backendResponse.json()) as Record<string, unknown>
      const keyValue = typeof key.key === "string" ? key.key : ""
      const masked = keyValue.length > 12 ? `${keyValue.substring(0, 8)}...${keyValue.substring(keyValue.length - 4)}` : keyValue
      return NextResponse.json({
        id: typeof key.id === "string" ? key.id : id,
        name: typeof key.name === "string" ? key.name : "API Key",
        key: masked,
        role: typeof key.role === "string" ? key.role : "viewer",
        createdAt: typeof key.createdAt === "string" ? key.createdAt : new Date().toISOString(),
        lastUsed: typeof key.lastUsed === "string" ? key.lastUsed : undefined,
      })
    }

    return NextResponse.json(
      { error: "Backend API key get endpoint not available" },
      { status: 503 },
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = getForwardedApiKey(request)
    const authorization = request.headers.get("authorization") || request.cookies.get("failsafe_auth")?.value
    // determine action from pathname: rotate or revoke
    const url = new URL(request.url)
    const parts = url.pathname.split("/").filter(Boolean)
    const action = parts[parts.length - 1]

    const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"
    const BACKEND_ENVIRONMENT = process.env.BACKEND_ENVIRONMENT ?? "dev"

    if (action === "rotate") {
      const backendResp = await fetch(`${BACKEND_BASE_URL}/internal/api-keys/rotate`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          ...(authorization ? { Authorization: `Bearer ${authorization}` } : { "x-api-key": apiKey }),
        },
        body: JSON.stringify({ id, environment: BACKEND_ENVIRONMENT }),
      })

      const payload = await backendResp.json().catch(() => ({}))
      if (!backendResp.ok) {
        return NextResponse.json({ error: payload.error || payload.message || "Failed to rotate key" }, { status: backendResp.status || 503 })
      }

      const keyValue = (typeof payload.key === "string" && payload.key) || (typeof payload.api_key === "string" && payload.api_key) || (typeof payload.token === "string" && payload.token) || ""

      if (!keyValue) {
        return NextResponse.json({ error: "Backend did not return a new key" }, { status: 502 })
      }

      return NextResponse.json({ key: keyValue })
    }

    if (action === "revoke") {
      const backendResp = await fetch(`${BACKEND_BASE_URL}/internal/api-keys/revoke`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          ...(authorization ? { Authorization: `Bearer ${authorization}` } : { "x-api-key": apiKey }),
        },
        body: JSON.stringify({ id, environment: process.env.BACKEND_ENVIRONMENT ?? "dev" }),
      })

      if (!backendResp.ok) {
        const payload = await backendResp.json().catch(() => ({}))
        return NextResponse.json({ error: payload.error || payload.message || "Failed to revoke key" }, { status: backendResp.status || 503 })
      }

      // If revoked, also remove from local registry if present
      try {
        apiKeys.delete(id)
      } catch {}

      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 })
  }
}
