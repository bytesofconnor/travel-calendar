"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TravelCard } from "@/components/travel-card"
import type { Column, PlannerCard } from "@/lib/kanban-store"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  column: Column
  cards: PlannerCard[]
  onAddCard: () => void
  onEditCard: (card: PlannerCard) => void
  onDeleteCard: (cardId: string) => void
}

export function KanbanColumn({
  column,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  })

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-2 px-1">
        <h2 className="text-sm font-semibold text-foreground">
          {column.title}
        </h2>
        <p className="text-xs text-muted-foreground">{column.dateRange}</p>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-2 transition-colors scrollbar-thin",
          isOver && "bg-muted/70 ring-2 ring-ring/20"
        )}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <TravelCard
              key={card.id}
              card={card}
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card.id)}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <button
            onClick={onAddCard}
            className="flex h-16 w-full items-center justify-center rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card/50"
          >
            Add item
          </button>
        )}
      </div>

      {cards.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={onAddCard}
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      )}
    </div>
  )
}
