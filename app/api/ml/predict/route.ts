import { NextResponse } from "next/server"

const ML_API_BASE = process.env.ML_API_BASE_URL ?? "http://localhost:5000"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") || "15"
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    
    const response = await fetch(`${ML_API_BASE}/api/predict/latest?limit=${limit}`, { 
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
