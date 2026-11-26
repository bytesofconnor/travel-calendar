"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { TripNights } from "@/components/trip-nights"
import { TripStoryView, type TripStoryViewProps } from "@/components/trip-story-view"
import { tripNights } from "@/lib/trip-glance"
import { isDateInTrip } from "@/lib/trip-kind"

function reveal(panel: HTMLElement) {
  const scroller = panel.closest("[data-trip-scroll]")
  if (!(scroller instanceof HTMLElement)) {
    panel.scrollIntoView({ block: "start" })
    return
  }
  const toolbar = scroller.querySelector("[data-trip-toolbar]")
  const sticky =
    toolbar instanceof HTMLElement && getComputedStyle(toolbar).position === "sticky"
      ? toolbar.getBoundingClientRect().height
      : 0
  const visibleTop = scroller.getBoundingClientRect().top + sticky + 12
  const panelTop = panel.getBoundingClientRect().top
  scroller.scrollTo({ top: scroller.scrollTop + panelTop - visibleTop, behavior: "auto" })
}

export function TripListBody({
  home,
  ...story
}: Omit<TripStoryViewProps, "mode" | "onShowTrip" | "onShowToday" | "pinnedDate"> & {
  home?: ReactNode
}) {
  const inTrip = isDateInTrip(story.today, story.tripStart, story.tripEnd)
  const [pane, setPane] = useState<"today" | "all">(inTrip ? "today" : "all")
  const [pinnedDate, setPinnedDate] = useState<string | null>(null)
  const jumpDate = useRef<string | null>(null)
  const shown = inTrip ? pane : "all"
  const nights = useMemo(
    () => tripNights(story.items, story.tripStart, story.tripEnd),
    [story.items, story.tripEnd, story.tripStart],
  )

  useEffect(() => {
    const date = jumpDate.current
    if (!date || shown !== "all") return
    const heading = document.getElementById(`chapter-${date}`)
    if (!(heading instanceof HTMLElement)) return
    jumpDate.current = null
    reveal(heading)
    heading.focus({ preventScroll: true })
  }, [shown, pinnedDate, story.items])

  function jump(date: string) {
    jumpDate.current = date
    setPinnedDate(date)
    setPane("all")
  }

  return (
    <div className="trip-list" data-pane={shown}>
      <TripNights nights={nights} today={story.today} onSelect={jump} />
      {home}
      <TripStoryView
        {...story}
        mode={shown === "today" ? "today" : "trip"}
        pinnedDate={pinnedDate}
        onShowTrip={inTrip ? () => setPane("all") : undefined}
        onShowToday={inTrip ? () => setPane("today") : undefined}
      />
    </div>
  )
}
