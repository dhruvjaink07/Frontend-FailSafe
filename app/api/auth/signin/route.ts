import { NextRequest, NextResponse } from "next/server"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const backendResp = await fetch(`${BACKEND_BASE_URL}/internal/auth/signin`, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

    const payload = await backendResp.json().catch(() => ({}))

    if (!backendResp.ok) {
      return NextResponse.json({ error: payload.error || payload.message || "Sign-in failed" }, { status: backendResp.status || 503 })
    }

    // If backend returned a token, set it as an httpOnly cookie
    const token = typeof payload.token === "string" ? payload.token : (typeof payload.jwt === "string" ? payload.jwt : null)

    const res = NextResponse.json(payload)
    if (token) {
      const secure = process.env.NODE_ENV === "production"
      res.cookies.set("failsafe_auth", token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    return res
  } catch (err) {
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 })
  }
}
