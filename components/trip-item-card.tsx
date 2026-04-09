"use client"

import type { TripItem } from "@/lib/kanban-store"
import { ExternalLink } from "lucide-react"

const colorClasses = {
  violet: "bg-violet-500/15 border-violet-500/30 hover:bg-violet-500/25",
  blue: "bg-blue-500/15 border-blue-500/30 hover:bg-blue-500/25",
  emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25",
  amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25",
  rose: "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/25",
}

const authorColors = {
  brenda: "bg-rose-500",
  connor: "bg-blue-500",
}

interface TripItemCardProps {
  item: TripItem
  onEdit: () => void
}

export function TripItemCard({ item, onEdit }: TripItemCardProps) {
  return (
    <button
      onClick={onEdit}
      className={`flex h-full w-full flex-col justify-between rounded-lg border p-2 text-left transition-colors md:p-2.5 ${colorClasses[item.color]}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <h3 className="truncate text-xs font-medium leading-tight text-foreground md:text-sm">
            {item.title}
          </h3>
          {item.link && (
            <a
              href={item.link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {item.notes && (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground md:text-xs">
            {item.notes}
          </p>
        )}
      </div>
      {item.author && (
        <div className="mt-1.5 flex items-center gap-1">
          <div className={`h-4 w-4 shrink-0 rounded-full ${authorColors[item.author]} flex items-center justify-center`}>
            <span className="text-[9px] font-medium text-white">
              {item.author === "brenda" ? "B" : "C"}
            </span>
          </div>
        </div>
      )}
    </button>
  )
}
