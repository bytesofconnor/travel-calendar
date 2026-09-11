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
  const placeLabel = locationTo ? `${location.name} to ${locationTo.name}` : location.name
  const dateLabel =
    item.startDate === item.endDate
      ? item.startDate
      : `${item.startDate} to ${item.endDate}`

  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`Edit plan: ${item.title}, ${placeLabel}, ${dateLabel}`}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        compact ? "justify-between p-1.5 pl-2" : "justify-between p-3 pl-3.5"
      }`}
      style={{
        boxShadow: `inset 3px 0 0 ${location.color}`,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <h3 className={`${compact ? "truncate text-[11px]" : "truncate text-[13px]"} font-medium leading-tight text-foreground`}>
            {item.title}
          </h3>
          {item.link && !compact && (
            <a
              href={item.link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              aria-label={`Open link for ${item.title}`}
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
        {item.notes && !compact && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {item.notes}
          </p>
        )}
      </div>

      {compact ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 overflow-hidden">
            <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: location.color }} aria-hidden="true" />
            <span className="truncate text-[10px] text-muted-foreground">
              {locationTo ? `${location.name} → ${locationTo.name}` : location.name}
            </span>
          </div>
          {item.authorName ? (
            <div
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-border bg-card px-1 text-[9px] font-medium text-foreground/90"
              title={item.authorName}
              aria-hidden="true"
            >
              <span className="leading-none">{initials}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: location.color }} aria-hidden="true" />
            <span className="truncate text-xs text-muted-foreground">
              {locationTo ? `${location.name} → ${locationTo.name}` : location.name}
            </span>
          </div>
          {item.authorName ? (
            <div
              className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card px-1.5 text-[10px] font-medium"
              title={item.authorName}
              aria-label={`Added by ${item.authorName}`}
            >
              <span className="leading-none">{initials}</span>
            </div>
          ) : null}
        </div>
      )}
    </button>
  )
}
