"use client"

import { ExternalLink } from "lucide-react"

import { getLocationById, type TripItem } from "@/lib/kanban-store"

interface TripItemCardProps {
  item: TripItem
  onEdit: () => void
  compact?: boolean
}

export function TripItemCard({ item, onEdit, compact = false }: TripItemCardProps) {
  const location = getLocationById(item.location)
  const locationTo = item.locationTo ? getLocationById(item.locationTo) : null
  const authorLabel = item.authorName ?? "Shared"
  const initials = authorLabel
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return (
    <button
      onClick={onEdit}
      className={`flex h-full w-full flex-col justify-between overflow-hidden rounded-xl border text-left transition-all hover:brightness-110 ${
        compact ? "p-2" : "p-2.5 md:p-2.5"
      }`}
      style={{
        borderColor: `${location.color}66`,
        background: locationTo
          ? `linear-gradient(135deg, ${location.color}25 0%, ${location.color}25 50%, ${locationTo.color}25 50%, ${locationTo.color}25 100%)`
          : `${location.color}20`,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <h3 className={`truncate font-medium leading-tight text-foreground ${
            compact ? "text-xs" : "text-sm md:text-sm"
          }`}>
            {item.title}
          </h3>
          {item.link && !compact && (
            <a
              href={item.link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {item.notes && !compact && (
          <p className="mt-1 line-clamp-2 text-xs leading-tight text-muted-foreground">
            {item.notes}
          </p>
        )}
      </div>

      {!compact && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: location.color }} />
            {locationTo && (
              <>
                <span className="text-[10px] text-muted-foreground">to</span>
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: locationTo.color }} />
              </>
            )}
            <span className="truncate text-[10px] text-muted-foreground">
              {locationTo ? `${location.name} → ${locationTo.name}` : location.name}
            </span>
          </div>

          {item.authorName && (
            <div
              className="hidden h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 px-1.5 text-[10px] font-medium text-foreground/90 sm:flex"
              title={item.authorName}
            >
              <span className="leading-none">{initials}</span>
            </div>
          )}
        </div>
      )}
    </button>
  )
}
