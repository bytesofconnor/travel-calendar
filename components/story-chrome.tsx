"use client"

import { useEffect, type ReactNode } from "react"
import { ChevronDown, UserPlus } from "lucide-react"

import { SegmentedControl } from "@/components/ds"
import { TravelerStack } from "@/components/traveler-stack"
import type { TravelerName } from "@/lib/travelers"

export function StoryChrome({
  mode,
  onModeChange,
  onOpenTrips,
  onInvite,
  travelers,
  currentUserId,
  onOpenMembers,
  selectedUserId,
  onSelectPerson,
  menu,
}: {
  mode: "list" | "month"
  onModeChange: (mode: "list" | "month") => void
  onOpenTrips: () => void
  onInvite: () => void
  travelers: readonly TravelerName[]
  currentUserId?: string
  onOpenMembers?: () => void
  selectedUserId?: string | null
  onSelectPerson?: (userId: string) => void
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
        <button
          type="button"
          className="story-chrome__invite btn-together inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-[13px] font-bold tracking-tight min-[375px]:px-2.5 min-[431px]:min-w-[4.75rem] min-[431px]:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--together)]"
          onClick={onInvite}
          aria-label="Invite"
        >
          <UserPlus className="hidden size-4 max-[430px]:block" aria-hidden="true" />
          <span className="max-[374px]:sr-only">Invite</span>
        </button>
        {menu}
      </div>
      <TravelerStack
        travelers={travelers}
        currentUserId={currentUserId}
        onOpen={onOpenMembers}
        selectedUserId={selectedUserId}
        onSelectPerson={onSelectPerson}
        className="story-chrome__travelers"
      />
    </div>
  )
}
