"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface TabViewHeaderProps {
  kicker: string
  title: string
  description: string
  actions?: ReactNode
  className?: string
}

export function TabViewHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: TabViewHeaderProps) {
  return (
    <div className={cn("hidden items-start justify-between gap-4 md:flex", className)}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:text-sm md:tracking-[0.2em]">
          {kicker}
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-3 self-start">{actions}</div> : null}
    </div>
  )
}
