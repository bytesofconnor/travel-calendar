"use client"

import { useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { parseThemePack, THEME_PACKS, type ThemePackId } from "@/lib/theme-packs"

export function ThemePackPickerMenuItems({
  tripId,
  themePack,
  onError,
}: {
  tripId: Id<"trips">
  themePack: ThemePackId | null
  onError: (message: string) => void
}) {
  const setThemePack = useMutation(api.trips.setThemePack)

  function apply(next: ThemePackId | null) {
    if (next === themePack) return
    void setThemePack({ tripId, themePack: next }).catch((error: unknown) => {
      onError(error instanceof Error ? error.message : "Could not set the theme.")
    })
  }

  return (
    <>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        aria-label="Theme"
        value={themePack ?? ""}
        onValueChange={(value) => {
          if (value === "") {
            apply(null)
            return
          }
          const next = parseThemePack(value)
          if (!next) return
          apply(next)
        }}
      >
        <DropdownMenuRadioItem value="">Default</DropdownMenuRadioItem>
        {THEME_PACKS.map((pack) => (
          <DropdownMenuRadioItem key={pack.id} value={pack.id}>
            <span aria-hidden="true" className="pack-swatch" data-pack-swatch={pack.id} />
            {pack.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
}
