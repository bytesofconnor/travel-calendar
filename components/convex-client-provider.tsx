"use client"

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs"
import { ConvexReactClient } from "convex/react"
import { useMemo, type ReactNode } from "react"

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const convex = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  )

  if (!convex) {
    return (
      <main id="main-content" className="flex min-h-dvh items-center justify-center px-6">
        <p className="max-w-md text-center text-sm leading-6 text-muted-foreground">
          Travel Calendar needs <code>NEXT_PUBLIC_CONVEX_URL</code> in this environment.
        </p>
      </main>
    )
  }

  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>
}
