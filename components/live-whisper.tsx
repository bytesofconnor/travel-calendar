"use client"

import { useEffect, useRef, useState } from "react"

import type { TripItem } from "@/lib/kanban-store"

interface LiveWhisperProps {
  items: TripItem[]
  currentUserId?: string
}

export function LiveWhisper({ items, currentUserId }: LiveWhisperProps) {
  const [message, setMessage] = useState<string | null>(null)
  const seenIdsRef = useRef<Set<string> | null>(null)
  const primedRef = useRef(false)

  useEffect(() => {
    if (!primedRef.current) {
      seenIdsRef.current = new Set(items.map((item) => item.id))
      primedRef.current = true
      return
    }

    const seen = seenIdsRef.current ?? new Set<string>()
    const newcomers = items.filter((item) => !seen.has(item.id))
    for (const item of newcomers) {
      seen.add(item.id)
      if (currentUserId && item.createdBy === currentUserId) continue
      const who = item.authorName?.trim() || "Your partner"
      setMessage(`${who} just added ${item.title}`)
      const timeout = window.setTimeout(() => setMessage(null), 3200)
      return () => window.clearTimeout(timeout)
    }
    seenIdsRef.current = seen
  }, [items, currentUserId])

  if (!message) return null

  return (
    <div className="live-whisper" role="status" aria-live="polite">
      <span className="live-whisper__dot" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
