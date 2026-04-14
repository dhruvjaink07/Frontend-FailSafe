import { NextRequest, NextResponse } from "next/server"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

async function forward(request: NextRequest, path: string[], method: string) {
  const url = new URL(request.url)
  const query = url.search ? url.search : ""
  const target = `${BACKEND_BASE_URL}/${path.join("/")}${query}`
  console.log(`🔴 [BACKEND PROXY] ${method} ${target}`)

  const headers = new Headers()
  const contentType = request.headers.get("content-type")
  const accept = request.headers.get("accept")
  const apiKey = getForwardedApiKey(request)

  if (contentType) headers.set("content-type", contentType)
  headers.set("x-api-key", apiKey)
  console.log(`📋 Forwarding with x-api-key: ${apiKey}`)
  if (accept) headers.set("accept", accept)

  const hasBody = method !== "GET" && method !== "HEAD"
  const body = hasBody ? await request.arrayBuffer() : undefined

  const response = await fetch(target, {
    method,
    headers,
    body,
    cache: "no-store",
  })
  console.log(`🟢 [BACKEND RESPONSE] ${response.status} ${target}`)

  const responseContentType = response.headers.get("content-type") ?? ""
  if (responseContentType.includes("application/json")) {
    return NextResponse.json(await response.json(), { status: response.status })
  }

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: responseContentType ? { "content-type": responseContentType } : undefined,
  })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    return await forward(request, path, "GET")
  } catch {
    return NextResponse.json({ error: "Backend request failed" }, { status: 503 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    return await forward(request, path, "POST")
  } catch {
    return NextResponse.json({ error: "Backend request failed" }, { status: 503 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    return await forward(request, path, "PUT")
  } catch {
    return NextResponse.json({ error: "Backend request failed" }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    return await forward(request, path, "PATCH")
  } catch {
    return NextResponse.json({ error: "Backend request failed" }, { status: 503 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    return await forward(request, path, "DELETE")
  } catch {
    return NextResponse.json({ error: "Backend request failed" }, { status: 503 })
  }
}
