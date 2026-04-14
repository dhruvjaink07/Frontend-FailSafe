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

    for (const path of getApiKeyByIdCandidates(id)) {
      const backendResponse = await fetch(`${BACKEND_BASE_URL}${path}`, {
        method: "DELETE",
        cache: "no-store",
        headers: {
          "x-api-key": apiKey,
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

    for (const path of getApiKeyByIdCandidates(id)) {
      const backendResponse = await fetch(`${BACKEND_BASE_URL}${path}`, {
        cache: "no-store",
        headers: {
          "x-api-key": apiKey,
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
