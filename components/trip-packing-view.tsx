"use client"

import { useMemo, useState } from "react"
import { Check, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { formatRelativeTime, type TripPackingItem } from "@/lib/kanban-store"

interface TripPackingViewProps {
  items: TripPackingItem[]
  isMutating: boolean
  onAddItem: (label: string) => Promise<void> | void
  onToggleItem: (item: TripPackingItem, nextChecked: boolean) => Promise<void> | void
  onRenameItem: (item: TripPackingItem, label: string) => Promise<void> | void
  onDeleteItem: (item: TripPackingItem) => Promise<void> | void
}

function sortPackingItems(items: TripPackingItem[]) {
  return [...items].sort((left, right) => {
    if (left.isChecked !== right.isChecked) {
      return left.isChecked ? 1 : -1
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    return left.createdAt.localeCompare(right.createdAt)
  })
}

export function TripPackingView({
  items,
  isMutating,
  onAddItem,
  onToggleItem,
  onRenameItem,
  onDeleteItem,
}: TripPackingViewProps) {
  const [newItemLabel, setNewItemLabel] = useState("")
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")

  const sortedItems = useMemo(() => sortPackingItems(items), [items])
  const uncheckedCount = sortedItems.filter((item) => !item.isChecked).length
  const checkedCount = sortedItems.length - uncheckedCount

  async function handleAdd() {
    const trimmed = newItemLabel.trim()
    if (!trimmed) {
      return
    }

    await onAddItem(trimmed)
    setNewItemLabel("")
  }

  function startEditing(item: TripPackingItem) {
    setEditingItemId(item.id)
    setEditingValue(item.label)
  }

  function cancelEditing() {
    setEditingItemId(null)
    setEditingValue("")
  }

  async function commitEditing(item: TripPackingItem) {
    const trimmed = editingValue.trim()
    if (!trimmed) {
      await onDeleteItem(item)
      cancelEditing()
      return
    }

    if (trimmed !== item.label) {
      await onRenameItem(item, trimmed)
    }

    cancelEditing()
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-2 md:px-6 md:py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:text-sm md:tracking-[0.2em]">
              Packing
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">Shared checklist</h2>
            <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
              Shared trip essentials, all in one checklist.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground md:text-sm">
            <span className="rounded-full border border-border/70 bg-secondary/55 px-3 py-1">{uncheckedCount} left</span>
            <span className="rounded-full border border-border/70 bg-secondary/40 px-3 py-1">{checkedCount} packed</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5 md:overflow-hidden md:px-4 md:py-6">
        <div className="flex w-full min-h-full max-w-5xl flex-col gap-4 md:min-h-0 md:h-full">
          <div className="rounded-[20px] border border-border/80 bg-background/92 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={newItemLabel}
                onChange={(event) => setNewItemLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handleAdd()
                  }
                }}
                placeholder="Add sunscreen, adapters, camera batteries..."
                className="h-12 rounded-[16px] border-border/80 bg-background/50 text-base"
              />
              <Button className="h-12 rounded-[16px] px-5 text-base sm:w-auto" onClick={() => void handleAdd()} disabled={isMutating || !newItemLabel.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </div>
          </div>

          <div className="overflow-visible md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
            {sortedItems.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-border/70 bg-black/20 px-6 py-14 text-center backdrop-blur">
                <h3 className="text-2xl font-semibold tracking-tight">Nothing on the list yet</h3>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  Start with the essentials and let the list grow with the trip. It stays shared for everyone automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[20px] border border-border/80 bg-black/25 backdrop-blur">
                <ul className="divide-y divide-border/70">
                  {sortedItems.map((item) => {
                    const isEditing = editingItemId === item.id

                    return (
                      <li
                        key={item.id}
                        className={`flex flex-col gap-3 px-4 py-4 transition-colors md:px-5 ${
                          item.isChecked ? "bg-white/[0.02]" : "bg-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.isChecked}
                            onCheckedChange={(checked) => void onToggleItem(item, checked === true)}
                            className="mt-1 h-5 w-5 rounded-md"
                          />
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <Input
                                value={editingValue}
                                onChange={(event) => setEditingValue(event.target.value)}
                                onBlur={() => void commitEditing(item)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault()
                                    void commitEditing(item)
                                  }

                                  if (event.key === "Escape") {
                                    event.preventDefault()
                                    cancelEditing()
                                  }
                                }}
                                autoFocus
                                className="h-11 rounded-[16px] border-border/80 bg-background/50 text-base"
                              />
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={`text-left text-lg font-medium tracking-tight transition-colors ${
                                    item.isChecked ? "text-muted-foreground line-through" : "text-foreground"
                                  }`}
                                  onClick={() => startEditing(item)}
                                >
                                  {item.label}
                                </button>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {item.authorName && (
                                    <span className="rounded-full border border-border/70 px-2 py-1">
                                      {item.authorName}
                                    </span>
                                  )}
                                  <span>Updated {formatRelativeTime(item.updatedAt)}</span>
                                </div>
                              </>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => startEditing(item)}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit {item.label}</span>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-rose-300 hover:text-rose-200" onClick={() => void onDeleteItem(item)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete {item.label}</span>
                              </Button>
                            </div>
                          )}
                          {isEditing && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => void commitEditing(item)}>
                              <Check className="h-4 w-4" />
                              <span className="sr-only">Save {item.label}</span>
                            </Button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
