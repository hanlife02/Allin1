import { NextRequest, NextResponse } from "next/server"
import {
  AUTH_COOKIE_NAME,
  buildAuthToken,
  getAuthCredentials,
  isValidLoginInput,
  sanitizeRedirectPath,
} from "@/lib/auth"

interface LoginBody {
  username?: string
  password?: string
  redirectTo?: string
}

export async function POST(request: NextRequest) {
  const auth = getAuthCredentials()
  if (!auth) {
    return NextResponse.json(
      { error: "Server auth credentials are not configured." },
      { status: 500 },
    )
  }

  let body: LoginBody
  try {
    body = (await request.json()) as LoginBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!isValidLoginInput(body.username, body.password)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 })
  }

  const redirectTo = sanitizeRedirectPath(body.redirectTo)
  const response = NextResponse.json({ ok: true, redirectTo })
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: buildAuthToken(auth),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
