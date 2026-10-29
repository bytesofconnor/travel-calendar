"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ConfirmQueueRow = {
  proposalId: string
  text: string
  glanceUrl: string
}

interface ConfirmQueueProps {
  rows: ConfirmQueueRow[]
  highlightedId?: string | null
  onConfirm: (proposalId: string) => void
  onReject: (proposalId: string) => void
}

export function ConfirmQueue({ rows, highlightedId, onConfirm, onReject }: ConfirmQueueProps) {
  useEffect(() => {
    if (!highlightedId) {
      return
    }
    document.getElementById(`proposal-${highlightedId}`)?.scrollIntoView({ block: "center" })
  }, [highlightedId, rows])

  if (rows.length === 0) {
    return null
  }

  return (
    <section aria-label="Waiting for confirm" className="border-b border-border bg-card">
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const highlighted = highlightedId === row.proposalId
          return (
            <li
              key={row.proposalId}
              id={`proposal-${row.proposalId}`}
              className={cn(
                "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                highlighted && "bg-secondary",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm text-foreground">{row.text}</p>
                <a
                  href={row.glanceUrl}
                  className="mt-1 block truncate text-[11px] text-muted-foreground underline-offset-4 hover:underline"
                >
                  {row.glanceUrl}
                </a>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" size="sm" onClick={() => onConfirm(row.proposalId)}>
                  Confirm
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onReject(row.proposalId)}>
                  Reject
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
