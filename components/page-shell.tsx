import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ShellWidth = "wide" | "read"

/**
 * Shared page column. Wide is the trip shell (hero, toolbar, list, month, composer).
 * Read is legal copy and other long text, still on the same gutter.
 */
export function PageInset({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode
  width?: ShellWidth
  className?: string
}) {
  return <div className={cn("page-inset", width === "read" && "page-inset--read", className)}>{children}</div>
}

/** Landmark wrapper. Every route hangs its content on this shell. */
export function PageShell({
  children,
  className,
  id = "main-content",
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <main id={id} className={cn("page-shell", className)}>
      {children}
    </main>
  )
}
