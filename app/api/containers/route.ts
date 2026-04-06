import { NextRequest, NextResponse } from "next/server"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"
const BACKEND_API_KEY = process.env.BACKEND_API_KEY

type BackendContainer = {
  id?: string
  name?: string
  image?: string
  state?: string
  status?: string
  ports?: string | string[]
  running?: boolean
}

function normalizePorts(ports: string | string[] | undefined): string[] {
  if (!ports) return []
  if (Array.isArray(ports)) return ports.filter((value): value is string => typeof value === "string" && value.length > 0)
  return ports
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

function normalizeContainers(payload: unknown) {
  const source =
    payload && typeof payload === "object" && Array.isArray((payload as { containers?: unknown[] }).containers)
      ? (payload as { containers: unknown[] }).containers
      : Array.isArray(payload)
        ? payload
        : []

  return source.map((item, index) => {
    const container = (item ?? {}) as BackendContainer
    const isRunning =
      typeof container.running === "boolean"
        ? container.running
        : (container.state ?? "").toLowerCase() === "running"

    return {
      id: container.id ?? `${container.name ?? "container"}-${index}`,
      name: container.name ?? `container-${index + 1}`,
      image: container.image ?? "unknown",
      status: isRunning ? "running" : "stopped",
      ports: normalizePorts(container.ports),
      createdAt: new Date().toISOString(),
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    const requestHeaders = {
      ...(apiKey ? { "x-api-key": apiKey } : BACKEND_API_KEY ? { "x-api-key": BACKEND_API_KEY } : {}),
    }

    const candidates = [
      "/environment/containers",
      "/containers",
      "/containers/list",
      "/docker/containers",
      "/engine/containers",
    ]

    for (const path of candidates) {
      const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
        cache: "no-store",
        headers: requestHeaders,
      })
      const contentType = response.headers.get("content-type") ?? ""

      if (response.ok && contentType.includes("application/json")) {
        const payload = await response.json()
        return NextResponse.json(normalizeContainers(payload))
      }

      if (response.status !== 404) {
        if (contentType.includes("application/json")) {
          return NextResponse.json(await response.json(), { status: response.status })
        }
        return NextResponse.json({ error: `Backend responded with status ${response.status}` }, { status: response.status })
      }
    }

    return NextResponse.json([], { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch containers" },
      { status: 503 }
    )
  }
}
