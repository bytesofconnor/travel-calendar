"use client"

import type { TripItem } from "@/lib/kanban-store"
import { getLocationById } from "@/lib/kanban-store"
import { ExternalLink } from "lucide-react"

const authorColors = {
  brenda: "bg-rose-500",
  connor: "bg-blue-500",
}

interface TripItemCardProps {
  item: TripItem
  onEdit: () => void
  compact?: boolean
}

export function TripItemCard({ item, onEdit, compact = false }: TripItemCardProps) {
  const location = getLocationById(item.location)
  const locationTo = item.locationTo ? getLocationById(item.locationTo) : null

  return (
    <button
      onClick={onEdit}
      className={`flex h-full w-full flex-col justify-between overflow-hidden rounded-lg border text-left transition-all hover:brightness-110 ${
        compact ? "p-1.5" : "p-2 md:p-2.5"
      }`}
      style={{
        borderColor: locationTo ? `${location.color}66` : `${location.color}66`,
        background: locationTo 
          ? `linear-gradient(135deg, ${location.color}25 0%, ${location.color}25 50%, ${locationTo.color}25 50%, ${locationTo.color}25 100%)`
          : `${location.color}20`,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <h3 className={`truncate font-medium leading-tight text-foreground ${
            compact ? "text-[10px]" : "text-xs md:text-sm"
          }`}>
            {item.title}
          </h3>
          {item.link && !compact && (
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
        {item.notes && !compact && (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground md:text-xs">
            {item.notes}
          </p>
        )}
      </div>
      
      {!compact && (
        <div className="mt-1.5 flex items-center justify-between gap-1">
          {/* Location badge(s) */}
          <div className="flex items-center gap-1 overflow-hidden">
            <div 
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: location.color }}
            />
            {locationTo && (
              <>
                <span className="text-[9px] text-muted-foreground">to</span>
                <div 
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: locationTo.color }}
                />
              </>
            )}
            <span className="truncate text-[9px] text-muted-foreground">
              {locationTo ? `${location.name} → ${locationTo.name}` : location.name}
            </span>
          </div>
          
          {/* Author badge */}
          {item.author && (
            <div className={`h-4 w-4 shrink-0 rounded-full ${authorColors[item.author]} flex items-center justify-center`}>
              <span className="text-[9px] font-medium text-white">
                {item.author === "brenda" ? "B" : "C"}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  )
}
