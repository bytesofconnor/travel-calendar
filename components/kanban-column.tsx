"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TravelCard } from "@/components/travel-card"
import type { Column, TravelCard as TravelCardType } from "@/lib/kanban-store"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  column: Column
  cards: TravelCardType[]
  onAddCard: () => void
  onEditCard: (card: TravelCardType) => void
  onDeleteCard: (cardId: string) => void
  onUpdateColumn: (title: string) => void
  onDeleteColumn: () => void
}

export function KanbanColumn({
  column,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onUpdateColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(column.title)

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  })

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      onUpdateColumn(editTitle.trim())
    } else {
      setEditTitle(column.title)
    }
    setIsEditing(false)
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-3 flex items-center justify-between">
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle()
              if (e.key === "Escape") {
                setEditTitle(column.title)
                setIsEditing(false)
              }
            }}
            className="h-8 text-sm font-semibold"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {column.title}
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {cards.length}
            </span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDeleteColumn}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-3 overflow-y-auto rounded-xl bg-muted/50 p-3 transition-colors scrollbar-thin",
          isOver && "bg-muted ring-2 ring-ring/20"
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
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border/50">
            <p className="text-sm text-muted-foreground">Drop cards here</p>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        className="mt-3 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={onAddCard}
      >
        <Plus className="h-4 w-4" />
        Add trip
      </Button>
    </div>
  )
}
