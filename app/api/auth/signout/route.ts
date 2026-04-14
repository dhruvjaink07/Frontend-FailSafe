import { NextRequest, NextResponse } from "next/server"

export async function POST(_request: NextRequest) {
  const res = NextResponse.json({ ok: true })
  // clear cookie by setting maxAge=0
  res.cookies.set("failsafe_auth", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  })
  return res
}
