import { NextResponse } from "next/server"

const ML_API_BASE = process.env.ML_API_BASE_URL ?? "http://localhost:5000"

export async function GET(request: Request) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(`${ML_API_BASE}/api/explain/global`, { 
      cache: "no-store",
      signal: controller.signal
    })
    clearTimeout(timeout)
    
    const data = await response.json()
    
    if (!response.ok) return NextResponse.json(data, { status: response.status })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "ML API unreachable" }, { status: 503 })
  }
}
