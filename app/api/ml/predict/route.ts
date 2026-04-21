import { NextResponse } from "next/server"

const ML_API_BASE = process.env.ML_API_BASE_URL ?? "http://localhost:8000"
console.log("[predict route] ML_API_BASE =", ML_API_BASE)

export const maxDuration = 90;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") || "15"

    const controller = new AbortController()
    const timeoutMs = 90000
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    // Try once, if server returns 5xx we'll retry a single time after 500ms
    let response = await fetch(`${ML_API_BASE}/api/predict/latest?limit=${limit}`, {
      cache: "no-store",
      signal: controller.signal
    })
    if (response.status >= 500) {
      // small backoff, then retry (new timeout)
      await new Promise((res) => setTimeout(res, 500))
      // extend overall timeout by recreating controller
      clearTimeout(timeout)
      const controller2 = new AbortController()
      const timeout2 = setTimeout(() => controller2.abort(), timeoutMs)
      response = await fetch(`${ML_API_BASE}/api/predict/latest?limit=${limit}`, {
        cache: "no-store",
        signal: controller2.signal
      })
      clearTimeout(timeout2)
    } else {
      clearTimeout(timeout)
    }

    let data: any
    try {
      data = await response.json()
    } catch (e) {
      // Backend returned non-JSON (plain text error). Read as text and return as error.
      const txt = await response.text()
      console.error('[predict route] backend returned non-JSON:', txt)
      return NextResponse.json({ error: txt }, { status: response.status || 502 })
    }

    if (!response.ok) return NextResponse.json(data, { status: response.status })
    return NextResponse.json(data)

  } catch (error: any) {
    // Distinguish timeout from other failures
    if (error?.name === "AbortError") {
      console.error("[predict route] Request timed out after 30s")
      return NextResponse.json({ error: "ML API timed out" }, { status: 504 })
    }
    console.error("[predict route] Fetch failed:", error?.message ?? error)
    return NextResponse.json({ error: "ML API unreachable", detail: error?.message }, { status: 503 })
  }
}
