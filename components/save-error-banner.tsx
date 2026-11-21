"use client"

import { StatusBanner } from "@/components/ds/status-banner"
import { Button } from "@/components/ui/button"

export const SAVE_ERROR_MESSAGE = "Couldn't save that plan. Try again."

export function SaveErrorBanner({ onRetry, pending = false }: { onRetry: () => void; pending?: boolean }) {
  return (
    <StatusBanner tone="error">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-foreground">{SAVE_ERROR_MESSAGE}</p>
        <Button type="button" size="lg" onClick={onRetry} disabled={pending}>
          Retry
        </Button>
      </div>
    </StatusBanner>
  )
}
