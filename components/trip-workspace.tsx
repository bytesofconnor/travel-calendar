"use client"

import { useEffect, useRef, type ReactNode } from "react"

import { PageInset, PageShell } from "@/components/page-shell"
import { SpectrumHairline, TripCover } from "@/components/trip-cover"

/**
 * Trip chrome that List and Month share. The cover and toolbar are the same
 * in both views. On a tall screen the toolbar sticks and the cover scrolls
 * away. On a short screen the whole mast scrolls, so it cannot eat the page.
 * Switching views swaps the stage and returns the scroller to the top.
 */
export function TripWorkspace({
  mode,
  tripName,
  meta,
  coverImageUrl,
  onOpenTrips,
  tripsOpen,
  toolbar,
  banners,
  composer,
  aside,
  extra,
  children,
}: {
  mode: "list" | "month"
  tripName: string
  meta: string
  coverImageUrl?: string
  onOpenTrips?: () => void
  tripsOpen?: boolean
  toolbar: ReactNode
  banners?: ReactNode
  composer?: ReactNode
  aside?: ReactNode
  extra?: ReactNode
  children: ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef(mode)

  useEffect(() => {
    if (modeRef.current === mode) return
    modeRef.current = mode
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" })
  }, [mode])

  return (
    <PageShell className="together-story page-frame">
      <div className="page-frame__row">
        <div className={composer ? "page-frame__column page-frame__column--add" : "page-frame__column"}>
          <div ref={scrollRef} className="story-scroll" data-trip-scroll>
            <header className="trip-mast" data-trip-mast>
              <TripCover
                className="trip-cover--compact"
                tripName={tripName}
                meta={meta}
                coverImageUrl={coverImageUrl}
                showHairline={false}
                onOpenTrips={onOpenTrips}
                tripsOpen={tripsOpen}
              />
            </header>
            <div className="story-chrome-sticky trip-toolbar" data-trip-toolbar>
              <SpectrumHairline />
              <div className="border-b border-border/80 bg-background">
                <PageInset>{toolbar}</PageInset>
              </div>
              {banners}
            </div>
            <PageInset className="trip-stage-inset">
              <div className="trip-stage" data-story-mode={mode}>
                <div key={mode} className="trip-stage__panel">
                  {children}
                </div>
              </div>
            </PageInset>
          </div>
          {composer}
        </div>
        {aside}
      </div>
      {extra}
    </PageShell>
  )
}
