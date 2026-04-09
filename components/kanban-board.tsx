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
import { Search, Mountain } from "lucide-react"
import { Input } from "@/components/ui/input"
import { KanbanColumn } from "@/components/kanban-column"
import { TravelCardDragOverlay } from "@/components/travel-card"
import { CardDialog } from "@/components/card-dialog"
import {
  useKanbanStore,
  type PlannerCard,
} from "@/lib/kanban-store"

export function KanbanBoard() {
  const {
    columns,
    cards,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
  } = useKanbanStore()

  const [activeCard, setActiveCard] = useState<PlannerCard | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<PlannerCard | undefined>()
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
        card.notes.toLowerCase().includes(query)
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

  const handleEditCard = (card: PlannerCard) => {
    setEditingCard(card)
    setTargetColumnId(card.columnId)
    setDialogOpen(true)
  }

  const handleSaveCard = (cardData: Omit<PlannerCard, "id">) => {
    if (editingCard) {
      updateCard(editingCard.id, cardData)
    } else {
      addCard(cardData)
    }
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
              <p className="text-sm text-muted-foreground">April - June 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-rose-100 flex items-center justify-center text-[10px] font-medium text-rose-700">B</span>
                Brenda
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-sky-100 flex items-center justify-center text-[10px] font-medium text-sky-700">C</span>
                Connor
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-9"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div 
            className="grid h-full gap-3"
            style={{ 
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` 
            }}
          >
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={filteredCards.filter((c) => c.columnId === column.id)}
                onAddCard={() => handleAddCard(column.id)}
                onEditCard={handleEditCard}
                onDeleteCard={deleteCard}
              />
            ))}
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
