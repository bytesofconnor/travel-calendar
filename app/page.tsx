"use client"

import { useEffect, useState } from "react"
import { useTripStore } from "@/lib/kanban-store"
import { WeekView } from "@/components/week-view"
import { MonthView } from "@/components/month-view"

export default function Page() {
  const { viewMode } = useTripStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <main className="flex h-svh flex-col overflow-hidden">
        <div className="flex h-full items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </main>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(100%)",
          opacity: 0.09,
        }}
      />
      <main className="relative z-10 flex h-svh flex-col overflow-hidden">
        {viewMode === "week" ? <WeekView /> : <MonthView />}
      </main>
    </>
  )
}
