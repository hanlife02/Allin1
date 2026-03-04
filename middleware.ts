import { NextResponse, type NextRequest } from "next/server"
import {
  AUTH_COOKIE_NAME,
  getAuthCredentials,
  isAuthenticatedByToken,
} from "@/lib/auth"

const PUBLIC_PATHS = new Set<string>(["/login", "/api/auth/login"])

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Skip static assets and Next internals.
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon")
  ) {
    return NextResponse.next()
  }

  if (!getAuthCredentials()) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Auth is not configured. Set ALLIN1_AUTH_USERNAME and ALLIN1_AUTH_PASSWORD." },
        { status: 500 },
      )
    }
    return new NextResponse(
      "Auth is not configured. Set ALLIN1_AUTH_USERNAME and ALLIN1_AUTH_PASSWORD.",
      { status: 500 },
    )
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const authed = isAuthenticatedByToken(token)

  if (PUBLIC_PATHS.has(pathname)) {
    if (authed && pathname === "/login") {
      const url = request.nextUrl.clone()
      url.pathname = "/daily"
      url.search = ""
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (authed) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = "/login"
  loginUrl.searchParams.set("redirect", `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/:path*"],
}
