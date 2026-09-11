import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server"
import { NextResponse } from "next/server"

/**
 * Next 16 proxy middleware.
 * Convex Auth refreshes auth cookies (required for @convex-dev/auth).
 */
export const proxy = convexAuthNextjsMiddleware(
  async () => {
    // Login UI owns gated UX; middleware only refreshes cookies.
    return NextResponse.next()
  },
  {
    cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
  },
)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
