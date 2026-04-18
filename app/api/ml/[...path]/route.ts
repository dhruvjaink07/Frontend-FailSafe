import { NextRequest, NextResponse } from "next/server"

const ML_API_BASE = process.env.ML_API_BASE_URL ?? "http://127.0.0.1:5000"

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathParams = params.path || []
    const targetPath = pathParams.join("/")
    const targetUrl = new URL(`/api/${targetPath}`, ML_API_BASE)
    targetUrl.search = request.nextUrl.search

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeout)

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "ML API is unreachable or timed out." },
      { status: 503 }
    )
  }
}
