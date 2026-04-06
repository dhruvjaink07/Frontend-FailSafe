import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/server/request-auth"

export async function GET(request: NextRequest) {
  const auth = getAuthContext(request)
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  return NextResponse.json({
    role: auth.role,
    keyId: auth.keyId,
  })
}
