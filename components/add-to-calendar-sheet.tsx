"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CALENDAR_LABELS, calendarOrder, preferredCalendar, subscribeLinks, type CalendarApp } from "@/lib/calendar/links"
import { cn } from "@/lib/utils"

type AddToCalendarSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripName: string
  token: string | null
  origin?: string
  busy?: boolean
  error?: string
  onReset: () => Promise<void> | void
}

async function writeClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // The browser blocked the clipboard. Fall through to a selection copy.
  }
  try {
    const area = document.createElement("textarea")
    area.value = value
    area.setAttribute("readonly", "")
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.append(area)
    area.select()
    const copied = document.execCommand("copy")
    area.remove()
    return copied
  } catch {
    return false
  }
}

function deviceCalendar(): CalendarApp {
  if (typeof navigator === "undefined") return "google"
  return preferredCalendar({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  })
}

export function AddToCalendarSheet({
  open,
  onOpenChange,
  tripName,
  token,
  origin,
  busy = false,
  error = "",
  onReset,
}: AddToCalendarSheetProps) {
  const platform = deviceCalendar()
  const [resetting, setResetting] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const site = origin ?? (typeof window === "undefined" ? "https://www.travelcalendar.space" : window.location.origin)
  const httpsUrl = token ? `${site}/cal/${token}.ics` : null
  const links = httpsUrl ? subscribeLinks(httpsUrl, tripName) : null
  const order = calendarOrder(platform)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSubscribed(false)
      setShowLink(false)
    }
    onOpenChange(next)
  }

  async function copyLink() {
    if (!httpsUrl) return
    const copied = await writeClipboard(httpsUrl)
    if (copied) {
      toast("Copied")
      return
    }
    setShowLink(true)
    toast("Select the link and copy it")
  }

  async function resetLink() {
    setResetting(true)
    try {
      await onReset()
      setSubscribed(false)
      toast("New link ready", { description: "The old one stopped working." })
    } finally {
      setResetting(false)
    }
  }

  const status = error
    ? error
    : subscribed
      ? "Subscribed? Confirm the prompt in your calendar app. You only do this once."
      : "Changes sync on their own. Google can take a few hours to catch up."

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[min(92dvh,44rem)] w-full gap-0 overflow-hidden rounded-t-3xl border-border bg-background px-0 pb-[max(1rem,env(safe-area-inset-bottom))] motion-reduce:animate-none motion-reduce:transition-none sm:max-w-md"
        aria-busy={busy || !token}
      >
        <div className="mx-auto flex max-h-[min(92dvh,44rem)] w-full max-w-md flex-col overflow-y-auto px-5 pt-3 pb-2">
          <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />
          <SheetHeader className="space-y-2 p-0 pr-12 text-left">
            <SheetTitle className="text-2xl font-normal tracking-tight text-foreground">
              Add to your calendar
            </SheetTitle>
            <SheetDescription className="text-base leading-6 text-muted-foreground">
              Your flights, stays, and plans show up in the calendar you already check. When something changes here, it changes there too.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 grid gap-2" aria-label="Calendar apps">
            {order.map((app) => {
              const href = links ? links[app] : undefined
              const primary = app === platform
              return (
                <a
                  key={app}
                  data-calendar={app}
                  href={href}
                  aria-disabled={!href}
                  target={app === "apple" ? undefined : "_blank"}
                  rel={app === "apple" ? undefined : "noopener noreferrer"}
                  onClick={(event) => {
                    if (!href) {
                      event.preventDefault()
                      return
                    }
                    setSubscribed(true)
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center rounded-2xl px-4 py-3 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    primary ? "btn-together" : "border border-border bg-background text-foreground",
                    !href && "pointer-events-none opacity-60",
                  )}
                >
                  {CALENDAR_LABELS[app]}
                </a>
              )
            })}
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full rounded-2xl text-base"
              onClick={() => void copyLink()}
              disabled={!httpsUrl}
            >
              Copy link
            </Button>
          </div>

          <p className="mt-4 min-h-16 text-base leading-6 text-muted-foreground" aria-live="polite">
            {busy && !token ? "Preparing your link." : status}
          </p>

          {showLink && httpsUrl ? (
            <p className="mb-3 break-all rounded-xl bg-secondary px-3 py-3 text-base leading-6 text-foreground" aria-label="Calendar link">
              {httpsUrl}
            </p>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full text-base"
            onClick={() => void resetLink()}
            disabled={!token || resetting}
            aria-describedby="calendar-reset-hint"
          >
            {resetting ? "Resetting link" : "Reset link"}
          </Button>
          <p id="calendar-reset-hint" className="pb-2 text-center text-base leading-6 text-muted-foreground">
            Resetting stops the old link right away.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
