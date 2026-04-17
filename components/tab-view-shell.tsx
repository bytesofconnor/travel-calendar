"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface TabViewShellProps {
  children: ReactNode
  className?: string
  innerClassName?: string
}

export function TabViewShell({ children, className, innerClassName }: TabViewShellProps) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-hidden px-3 py-2.5 md:px-6 md:pb-6 md:pt-5", className)}>
      <div className={cn("flex min-h-full w-full max-w-5xl flex-col gap-4 md:h-full md:min-h-0", innerClassName)}>
        {children}
      </div>
    </div>
  )
}
