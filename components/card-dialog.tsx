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
import type { TravelCard, CardColor, Link } from "@/lib/kanban-store"
import { cn } from "@/lib/utils"

const colorOptions: { value: CardColor; label: string; class: string }[] = [
  { value: "coral", label: "Coral", class: "bg-red-400" },
  { value: "sand", label: "Sand", class: "bg-amber-400" },
  { value: "sage", label: "Sage", class: "bg-emerald-400" },
  { value: "sky", label: "Sky", class: "bg-sky-400" },
  { value: "lavender", label: "Lavender", class: "bg-violet-400" },
]

interface CardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: TravelCard
  columnId: string
  onSave: (card: Omit<TravelCard, "id">) => void
}

export function CardDialog({
  open,
  onOpenChange,
  card,
  columnId,
  onSave,
}: CardDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState<CardColor>("coral")
  const [links, setLinks] = useState<Link[]>([])
  const [newLinkLabel, setNewLinkLabel] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description)
      setColor(card.color)
      setLinks(card.links)
    } else {
      setTitle("")
      setDescription("")
      setColor("coral")
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
      description: description.trim(),
      color,
      links,
      columnId,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{card ? "Edit Trip" : "Add New Trip"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Where are you going?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add notes, ideas, or details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all",
                    option.class,
                    color === option.value
                      ? "ring-2 ring-foreground ring-offset-2"
                      : "hover:scale-110"
                  )}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Links</Label>
            
            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 rounded-md bg-muted px-3 py-2"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{link.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.url}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleRemoveLink(link.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
              {card ? "Save Changes" : "Add Trip"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
