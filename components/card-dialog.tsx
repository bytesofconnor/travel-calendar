"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { PlannerCard, Author, Priority, Link } from "@/lib/kanban-store"
import { cn } from "@/lib/utils"

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
]

const authorOptions: { value: Author; label: string }[] = [
  { value: "brenda", label: "Brenda" },
  { value: "connor", label: "Connor" },
]

interface CardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: PlannerCard
  columnId: string
  onSave: (card: Omit<PlannerCard, "id">) => void
}

export function CardDialog({
  open,
  onOpenChange,
  card,
  columnId,
  onSave,
}: CardDialogProps) {
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [priority, setPriority] = useState<Priority>(null)
  const [author, setAuthor] = useState<Author | null>(null)
  const [links, setLinks] = useState<Link[]>([])
  const [newLinkLabel, setNewLinkLabel] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setNotes(card.notes)
      setPriority(card.priority)
      setAuthor(card.author)
      setLinks(card.links)
    } else {
      setTitle("")
      setNotes("")
      setPriority(null)
      setAuthor(null)
      setLinks([])
    }
    setNewLinkLabel("")
    setNewLinkUrl("")
  }, [card, open])

  const handleAddLink = () => {
    if (newLinkLabel.trim() && newLinkUrl.trim()) {
      let url = newLinkUrl.trim()
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url
      }
      setLinks([...links, { id: crypto.randomUUID(), label: newLinkLabel.trim(), url }])
      setNewLinkLabel("")
      setNewLinkUrl("")
    }
  }

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter((link) => link.id !== id))
  }

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      notes: notes.trim(),
      priority,
      author,
      links,
      columnId,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{card ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex gap-6">
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex gap-1">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriority(priority === option.value ? null : option.value)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-all",
                      priority === option.value
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Added by</Label>
              <div className="flex gap-1">
                {authorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAuthor(author === option.value ? null : option.value)}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-all",
                      author === option.value
                        ? option.value === "brenda"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-sky-100 text-sky-700"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Links</Label>
            
            {links.length > 0 && (
              <div className="space-y-1.5">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{link.label}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleRemoveLink(link.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Label"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="URL"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddLink()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddLink}
                disabled={!newLinkLabel.trim() || !newLinkUrl.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {card ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
