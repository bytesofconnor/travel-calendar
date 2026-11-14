"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function EditTripDialog({
  open,
  onOpenChange,
  tripName,
  onTripNameChange,
  tripStart,
  onTripStartChange,
  tripEnd,
  onTripEndChange,
  onCancel,
  onSave,
  saveDisabled,
  isSaving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripName: string
  onTripNameChange: (value: string) => void
  tripStart: string
  onTripStartChange: (value: string) => void
  tripEnd: string
  onTripEndChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
  saveDisabled: boolean
  isSaving: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md overflow-hidden rounded-3xl p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-medium">Edit trip details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Trip name</label>
            <Input
              value={tripName}
              onChange={(event) => onTripNameChange(event.target.value)}
              placeholder="Trip name"
              className="h-11 border-0 bg-secondary/50 text-base"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start date</label>
              <Input
                type="date"
                value={tripStart}
                onChange={(event) => onTripStartChange(event.target.value)}
                className="h-11 border-0 bg-secondary/50 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End date</label>
              <Input
                type="date"
                value={tripEnd}
                min={tripStart}
                onChange={(event) => onTripEndChange(event.target.value)}
                className="h-11 border-0 bg-secondary/50 text-base"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-background/96 px-5 py-4">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving} className="h-11 rounded-xl">
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saveDisabled || isSaving} className="h-11 rounded-xl">
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
