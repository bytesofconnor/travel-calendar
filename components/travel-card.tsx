"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, ExternalLink, Pencil, Trash2 } from "lucide-react"
import type { PlannerCard } from "@/lib/kanban-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const priorityColors: Record<number, string> = {
  1: "border-l-red-400",
  2: "border-l-orange-400",
  3: "border-l-yellow-400",
  4: "border-l-sky-400",
  5: "border-l-slate-300",
}

const authorInitials: Record<string, { label: string; bg: string }> = {
  brenda: { label: "B", bg: "bg-rose-100 text-rose-700" },
  connor: { label: "C", bg: "bg-sky-100 text-sky-700" },
}

interface TravelCardProps {
  card: PlannerCard
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
        "group relative rounded-lg border border-border/60 bg-card p-3 transition-all duration-200 hover:border-border",
        card.priority && `border-l-[3px] ${priorityColors[card.priority]}`,
        isDragging && "opacity-50 shadow-lg ring-2 ring-ring/20"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground leading-tight text-sm">
              {card.title}
            </h3>
            {card.author && (
              <span
                className={cn(
                  "shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
                  authorInitials[card.author].bg
                )}
                title={card.author === "brenda" ? "Brenda" : "Connor"}
              >
                {authorInitials[card.author].label}
              </span>
            )}
          </div>

          {card.notes && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {card.notes}
            </p>
          )}

          {card.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {card.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TravelCardDragOverlay({ card }: { card: PlannerCard }) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-border/60 bg-card p-3 shadow-xl",
        card.priority && `border-l-[3px] ${priorityColors[card.priority]}`
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 text-muted-foreground opacity-60" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground leading-tight text-sm">
              {card.title}
            </h3>
            {card.author && (
              <span
                className={cn(
                  "shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
                  authorInitials[card.author].bg
                )}
              >
                {authorInitials[card.author].label}
              </span>
            )}
          </div>
          {card.notes && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {card.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
