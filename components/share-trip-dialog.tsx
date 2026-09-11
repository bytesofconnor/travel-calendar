"use client"

import { Check, Copy, Users } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TripMember } from "@/lib/kanban-store"

interface ShareTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripName: string
  inviteCode: string
  inviteUrl: string
  members: TripMember[]
  currentUserId?: string
}

export function ShareTripDialog({
  open,
  onOpenChange,
  tripName,
  inviteCode,
  inviteUrl,
  members,
  currentUserId,
}: ShareTripDialogProps) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null)

  async function copy(value: string, kind: "link" | "code") {
    await navigator.clipboard.writeText(value)
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 1800)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:max-w-md">
        <DialogHeader className="space-y-2 border-b border-border px-6 py-5 text-left">
          <DialogTitle className="trip-title text-2xl font-normal tracking-tight text-foreground">
            This trip needs a second heartbeat.
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted-foreground">
            Share {tripName} with your partner — they see every plan the moment you add it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="invite-link">Invite link</Label>
            <div className="flex gap-2">
              <Input
                id="invite-link"
                readOnly
                value={inviteUrl}
                className="h-11 min-w-0 flex-1 truncate rounded-xl bg-secondary"
              />
              <Button
                type="button"
                size="pill"
                className="btn-together h-11 shrink-0 rounded-xl px-3.5 shadow-none"
                onClick={() => void copy(inviteUrl, "link")}
                aria-label={copied === "link" ? "Invite link copied" : "Copy invite link"}
              >
                {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1.5">{copied === "link" ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite code</Label>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary px-4 py-2">
              <code id="invite-code" className="font-mono text-lg tracking-[0.18em] text-foreground uppercase">
                {inviteCode}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-lg px-3"
                onClick={() => void copy(inviteCode, "code")}
                aria-label={copied === "code" ? "Invite code copied" : "Copy invite code"}
              >
                {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "code" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Travelers ({members.length})
            </div>
            <ul className="space-y-2" aria-label="Trip travelers">
              {members.map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        member.userId === currentUserId ? "avatar-you" : "avatar-partner"
                      }`}
                      aria-hidden="true"
                    >
                      {member.displayName.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {member.displayName}
                        {member.userId === currentUserId ? " (you)" : ""}
                      </div>
                      <div className="text-xs capitalize text-muted-foreground">{member.role}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
