"use client"

import { useEffect, type ReactNode } from "react"
import { ChevronDown, UserPlus } from "lucide-react"

import { SegmentedControl } from "@/components/ds"

export function StoryChrome({
  mode,
  onModeChange,
  onOpenTrips,
  onInvite,
  youInitial,
  partnerInitial,
  partnerName,
  menu,
}: {
  mode: "list" | "month"
  onModeChange: (mode: "list" | "month") => void
  onOpenTrips: () => void
  onInvite: () => void
  youInitial: string
  partnerInitial?: string | null
  partnerName?: string | null
  menu: ReactNode
}) {
  useEffect(() => {
    document.documentElement.dataset.uiReady = "true"
  }, [])

  return (
    <div className="story-chrome">
      <SegmentedControl
        label="Calendar view"
        value={mode}
        onChange={onModeChange}
        className="story-segment"
        options={[
          { value: "list", label: "List" },
          { value: "month", label: "Month" },
        ]}
      />
      <button
        type="button"
        className="story-chrome__hit shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="All trips"
        onClick={onOpenTrips}
      >
        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
      <div className="story-chrome__cluster ml-auto flex shrink-0 items-center gap-1.5 max-[430px]:gap-1">
        <div
          className="story-chrome__travelers flex items-center pl-1 max-[374px]:hidden"
          role="group"
          aria-label="Travelers"
        >
          <span className="avatar-you flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold" aria-label="You">
            {youInitial}
          </span>
          {partnerInitial ? (
            <span
              className="avatar-partner -ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background text-[12px] font-bold max-[430px]:-ml-3"
              aria-label={partnerName ?? "Partner"}
            >
              {partnerInitial}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="story-chrome__invite btn-together inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-0 text-[13px] font-bold tracking-tight max-[374px]:w-11 min-[375px]:px-2.5 min-[431px]:min-w-[4.75rem] min-[431px]:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--together)]"
          onClick={onInvite}
          aria-label="Invite your partner"
        >
          <UserPlus className="hidden size-4 max-[430px]:block" aria-hidden="true" />
          <span className="max-[374px]:sr-only">Invite</span>
        </button>
        {menu}
      </div>
    </div>
  )
}
