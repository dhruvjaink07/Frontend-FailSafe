import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const apiKey = getForwardedApiKey(request)

    const headers = {
      "x-api-key": apiKey,
      "content-type": "application/json",
    }

    // Prefer the body-based start endpoints (many backends expect POST /environment/containers/start)
    const candidates: Array<{ path: string; body?: string }> = [
      { path: "/environment/containers/start", body: JSON.stringify({ name }) },
      { path: "/environment/containers/start", body: JSON.stringify({ name, container: name }) },
      { path: "/containers/start", body: JSON.stringify({ name }) },
      { path: "/docker/containers/start", body: JSON.stringify({ name }) },
      { path: "/engine/containers/start", body: JSON.stringify({ name }) },
      { path: `/environment/containers/${encodeURIComponent(name)}/start` },
      { path: `/containers/${encodeURIComponent(name)}/start` },
    ]

    for (const candidate of candidates) {
      const target = `${BACKEND_BASE_URL}${candidate.path}`
      try {
        const response = await fetch(target, {
          method: "POST",
          cache: "no-store",
          headers,
          body: candidate.body,
        })
        const contentType = response.headers.get("content-type") ?? ""

        // Log each attempt for easier debugging in server logs
        // eslint-disable-next-line no-console
        console.debug(`[proxy] POST ${target} -> ${response.status} (${contentType})`)

        if (!response.ok) {
          if (response.status === 404) continue
          if (contentType.includes("application/json")) {
            return NextResponse.json(await response.json(), { status: response.status })
          }
          const text = await response.text().catch(() => `Backend responded with status ${response.status}`)
          return NextResponse.json({ error: text }, { status: response.status })
        }

        if (contentType.includes("application/json")) {
          return NextResponse.json(await response.json(), { status: response.status })
        }

        // Proxy non-JSON streaming bodies directly
        const proxiedHeaders: Record<string, string> = {}
        response.headers.forEach((v, k) => (proxiedHeaders[k] = v))
        return new Response(response.body, { status: response.status, headers: proxiedHeaders })
      } catch (err) {
        // Log the network error and try the next candidate
        // eslint-disable-next-line no-console
        console.error(`[proxy] Error POST ${target}:`, err)
        continue
      }
    }

    return NextResponse.json({ error: "Container start endpoint not available" }, { status: 503 })
  } catch {
    return NextResponse.json(
      { error: "Failed to start container" },
      { status: 503 }
    )
  }
}
