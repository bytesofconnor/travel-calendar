"use client"

import { useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Plus, Search, Mountain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KanbanColumn } from "@/components/kanban-column"
import { TravelCardDragOverlay } from "@/components/travel-card"
import { CardDialog } from "@/components/card-dialog"
import {
  useKanbanStore,
  type TravelCard,
} from "@/lib/kanban-store"

export function KanbanBoard() {
  const {
    columns,
    cards,
    addColumn,
    updateColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
  } = useKanbanStore()

  const [activeCard, setActiveCard] = useState<TravelCard | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<TravelCard | undefined>()
  const [targetColumnId, setTargetColumnId] = useState<string>("")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards
    const query = searchQuery.toLowerCase()
    return cards.filter(
      (card) =>
        card.title.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query)
    )
  }, [cards, searchQuery])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const card = cards.find((c) => c.id === active.id)
    if (card) {
      setActiveCard(card)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeCard = cards.find((c) => c.id === activeId)
    if (!activeCard) return

    const overColumn = columns.find((c) => c.id === overId)
    const overCard = cards.find((c) => c.id === overId)

    if (overColumn) {
      if (activeCard.columnId !== overColumn.id) {
        const targetCards = cards.filter((c) => c.columnId === overColumn.id)
        moveCard(activeId, overColumn.id, targetCards.length)
      }
    } else if (overCard && activeCard.columnId !== overCard.columnId) {
      const targetCards = cards.filter((c) => c.columnId === overCard.columnId)
      const overIndex = targetCards.findIndex((c) => c.id === overId)
      moveCard(activeId, overCard.columnId, overIndex)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeCard = cards.find((c) => c.id === activeId)
    const overCard = cards.find((c) => c.id === overId)

    if (activeCard && overCard && activeCard.columnId === overCard.columnId) {
      const columnCards = cards.filter((c) => c.columnId === activeCard.columnId)
      const overIndex = columnCards.findIndex((c) => c.id === overId)
      moveCard(activeId, activeCard.columnId, overIndex)
    }
  }

  const handleAddCard = (columnId: string) => {
    setEditingCard(undefined)
    setTargetColumnId(columnId)
    setDialogOpen(true)
  }

  const handleEditCard = (card: TravelCard) => {
    setEditingCard(card)
    setTargetColumnId(card.columnId)
    setDialogOpen(true)
  }

  const handleSaveCard = (cardData: Omit<TravelCard, "id">) => {
    if (editingCard) {
      updateCard(editingCard.id, cardData)
    } else {
      addCard(cardData)
    }
  }

  const handleAddColumn = () => {
    addColumn("New List")
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="shrink-0 border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground">
              <Mountain className="h-5 w-5 text-background" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Peru Adventure</h1>
              <p className="text-sm text-muted-foreground">Machu Picchu & Beyond</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            <Button onClick={handleAddColumn} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add List
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-6">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={filteredCards.filter((c) => c.columnId === column.id)}
                onAddCard={() => handleAddCard(column.id)}
                onEditCard={handleEditCard}
                onDeleteCard={deleteCard}
                onUpdateColumn={(title) => updateColumn(column.id, title)}
                onDeleteColumn={() => deleteColumn(column.id)}
              />
            ))}

            <button
              onClick={handleAddColumn}
              className="flex h-12 w-80 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/50 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Add another list
            </button>
          </div>

          <DragOverlay>
            {activeCard && <TravelCardDragOverlay card={activeCard} />}
          </DragOverlay>
        </DndContext>
      </main>

      <CardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        card={editingCard}
        columnId={targetColumnId}
        onSave={handleSaveCard}
      />
    </div>
  )
}
