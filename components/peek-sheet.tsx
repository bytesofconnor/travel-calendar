"use client"

import type { ReactNode } from "react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface PeekSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  meta?: string
  contentClassName?: string
  children: ReactNode
}

export function PeekSheet({ open, onOpenChange, title, meta, contentClassName, children }: PeekSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex h-[min(86svh,40rem)] flex-col gap-0 rounded-t-2xl border-border p-0",
          contentClassName,
        )}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border py-4 pl-5 pr-14 text-left">
          <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
          {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
