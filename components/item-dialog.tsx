"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useTripStore, LOCATIONS, type TripItem, type Author, type Location } from "@/lib/kanban-store"
import { Trash2, Link as LinkIcon, X, Plane } from "lucide-react"

interface ItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: string | null
  editItem: TripItem | null
}

export function ItemDialog({ open, onOpenChange, defaultDate, editItem }: ItemDialogProps) {
  const { addItem, updateItem, deleteItem } = useTripStore()
  
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [location, setLocation] = useState<Location>("cusco")
  const [locationTo, setLocationTo] = useState<Location | undefined>(undefined)
  const [isTravel, setIsTravel] = useState(false)
  const [author, setAuthor] = useState<Author | undefined>(undefined)
  const [linkLabel, setLinkLabel] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [showLink, setShowLink] = useState(false)

  useEffect(() => {
    if (open) {
      if (editItem) {
        setTitle(editItem.title)
        setNotes(editItem.notes || "")
        setStartDate(editItem.startDate)
        setEndDate(editItem.endDate)
        setLocation(editItem.location)
        setLocationTo(editItem.locationTo)
        setIsTravel(!!editItem.locationTo)
        setAuthor(editItem.author)
        if (editItem.link) {
          setLinkLabel(editItem.link.label)
          setLinkUrl(editItem.link.url)
          setShowLink(true)
        } else {
          setLinkLabel("")
          setLinkUrl("")
          setShowLink(false)
        }
      } else {
        setTitle("")
        setNotes("")
        setStartDate(defaultDate || "")
        setEndDate(defaultDate || "")
        setLocation("cusco")
        setLocationTo(undefined)
        setIsTravel(false)
        setAuthor(undefined)
        setLinkLabel("")
        setLinkUrl("")
        setShowLink(false)
      }
    }
  }, [open, editItem, defaultDate])

  const handleSave = () => {
    if (!title.trim() || !startDate || !endDate) return

    const itemData = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      startDate,
      endDate,
      location,
      locationTo: isTravel ? locationTo : undefined,
      author,
      link: showLink && linkUrl.trim() 
        ? { label: linkLabel.trim() || "Link", url: linkUrl.trim() }
        : undefined
    }

    if (editItem) {
      updateItem(editItem.id, itemData)
    } else {
      addItem(itemData)
    }

    onOpenChange(false)
  }

  const handleDelete = () => {
    if (editItem) {
      deleteItem(editItem.id)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-base font-medium">
            {editItem ? "Edit Item" : "Add Item"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4">
          {/* Title */}
          <Input
            placeholder="What's the plan?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-0 bg-secondary/50 text-base placeholder:text-muted-foreground focus-visible:ring-1"
            autoFocus
          />

          {/* Notes */}
          <Textarea
            placeholder="Add notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] resize-none border-0 bg-secondary/50 text-sm placeholder:text-muted-foreground focus-visible:ring-1"
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Start</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (!endDate || e.target.value > endDate) {
                    setEndDate(e.target.value)
                  }
                }}
                className="border-0 bg-secondary/50 text-sm focus-visible:ring-1"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">End</label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-0 bg-secondary/50 text-sm focus-visible:ring-1"
              />
            </div>
          </div>

          {/* Travel toggle */}
          <div>
            <button
              type="button"
              onClick={() => {
                setIsTravel(!isTravel)
                if (!isTravel && !locationTo) {
                  setLocationTo("cusco")
                }
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                isTravel
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plane className="h-4 w-4" />
              {isTravel ? "Travel between locations" : "Add travel/transit"}
            </button>
          </div>

          {/* Location(s) */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              {isTravel ? "From" : "Location"}
            </label>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {LOCATIONS.filter(l => l.id !== "travel").map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setLocation(loc.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-all ${
                    location === loc.id 
                      ? "bg-secondary ring-2 ring-primary ring-offset-1 ring-offset-background" 
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <div 
                    className="h-5 w-5 rounded-full"
                    style={{ backgroundColor: loc.color }}
                  />
                  <span className="text-[9px] leading-tight text-foreground">{loc.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Destination (for travel) */}
          {isTravel && (
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">To</label>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {LOCATIONS.filter(l => l.id !== "travel" && l.id !== location).map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setLocationTo(loc.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-all ${
                      locationTo === loc.id 
                        ? "bg-secondary ring-2 ring-primary ring-offset-1 ring-offset-background" 
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <div 
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: loc.color }}
                    />
                    <span className="text-[9px] leading-tight text-foreground">{loc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Author */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Added by</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAuthor(author === "brenda" ? undefined : "brenda")}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
                  author === "brenda"
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-medium text-white">B</span>
                Brenda
              </button>
              <button
                type="button"
                onClick={() => setAuthor(author === "connor" ? undefined : "connor")}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
                  author === "connor"
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-medium text-white">C</span>
                Connor
              </button>
            </div>
          </div>

          {/* Link */}
          {showLink ? (
            <div className="space-y-2 rounded-lg bg-secondary/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Link</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowLink(false)
                    setLinkLabel("")
                    setLinkUrl("")
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                placeholder="Label (e.g., Airbnb)"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                className="h-9 border-0 bg-secondary/50 text-sm focus-visible:ring-1"
              />
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="h-9 border-0 bg-secondary/50 text-sm focus-visible:ring-1"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLink(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LinkIcon className="h-4 w-4" />
              Add link
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          {editItem ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!title.trim() || !startDate || !endDate}>
              {editItem ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
