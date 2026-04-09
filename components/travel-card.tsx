"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, ExternalLink, Pencil, Trash2 } from "lucide-react"
import type { TravelCard as TravelCardType } from "@/lib/kanban-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const colorClasses: Record<TravelCardType["color"], string> = {
  coral: "bg-red-50 border-red-200/60 hover:border-red-300",
  sand: "bg-amber-50 border-amber-200/60 hover:border-amber-300",
  sage: "bg-emerald-50 border-emerald-200/60 hover:border-emerald-300",
  sky: "bg-sky-50 border-sky-200/60 hover:border-sky-300",
  lavender: "bg-violet-50 border-violet-200/60 hover:border-violet-300",
}

const colorAccents: Record<TravelCardType["color"], string> = {
  coral: "bg-red-400",
  sand: "bg-amber-400",
  sage: "bg-emerald-400",
  sky: "bg-sky-400",
  lavender: "bg-violet-400",
}

interface TravelCardProps {
  card: TravelCardType
  onEdit: () => void
  onDelete: () => void
}

export function TravelCard({ card, onEdit, onDelete }: TravelCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border p-4 transition-all duration-200",
        colorClasses[card.color],
        isDragging && "opacity-50 shadow-lg ring-2 ring-ring/20"
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1 rounded-l-lg",
          colorAccents[card.color]
        )}
      />

      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground leading-tight text-balance">
            {card.title}
          </h3>
          {card.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {card.description}
            </p>
          )}

          {card.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {card.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TravelCardDragOverlay({ card }: { card: TravelCardType }) {
  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 shadow-xl",
        colorClasses[card.color]
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1 rounded-l-lg",
          colorAccents[card.color]
        )}
      />
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 text-muted-foreground opacity-60" />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground leading-tight">
            {card.title}
          </h3>
          {card.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
              {card.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
