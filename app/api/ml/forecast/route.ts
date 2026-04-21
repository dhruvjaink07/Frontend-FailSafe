import { NextResponse } from "next/server"

const ML_API_BASE = process.env.ML_API_BASE_URL ?? "http://localhost:8000"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const steps = url.searchParams.get("steps") || "5"
    
    const controller = new AbortController()
    const timeoutMs = 90000
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    let response = await fetch(`${ML_API_BASE}/api/forecast?steps=${steps}`, { 
      cache: "no-store",
      signal: controller.signal
    })
    if (response.status >= 500) {
      await new Promise((res) => setTimeout(res, 300))
      clearTimeout(timeout)
      const controller2 = new AbortController()
      const timeout2 = setTimeout(() => controller2.abort(), timeoutMs)
      response = await fetch(`${ML_API_BASE}/api/forecast?steps=${steps}`, { 
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
      const txt = await response.text()
      console.error('[forecast route] backend returned non-JSON:', txt)
      return NextResponse.json({ error: txt }, { status: response.status || 502 })
    }

    if (!response.ok) return NextResponse.json(data, { status: response.status })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "ML API unreachable" }, { status: 503 })
  }
}
