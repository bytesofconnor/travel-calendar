"use client"

import { useEffect, useRef, type ReactNode } from "react"

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
  onCloseAutoFocus?: (event: Event) => void
  children: ReactNode
}

export function PeekSheet({ open, onOpenChange, title, meta, contentClassName, onCloseAutoFocus, children }: PeekSheetProps) {
  const returnFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) return
    function remember() {
      const current = document.activeElement
      if (current instanceof HTMLElement && !current.closest("[data-slot=sheet-content]")) {
        returnFocus.current = current
      }
    }
    document.addEventListener("focusin", remember)
    return () => document.removeEventListener("focusin", remember)
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex h-[min(86svh,40rem)] flex-col gap-0 rounded-t-2xl border-border p-0",
          contentClassName,
        )}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (event.defaultPrevented) return
          const target = returnFocus.current
          if (!target?.isConnected) return
          event.preventDefault()
          target.focus()
        }}
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
