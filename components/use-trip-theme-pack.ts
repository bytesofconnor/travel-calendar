"use client"

import { useLayoutEffect } from "react"

import type { ThemePackId } from "@/lib/theme-packs"

export function useTripThemePack(pack: ThemePackId | null): void {
  useLayoutEffect(() => {
    const root = document.documentElement
    if (pack === null) {
      delete root.dataset.theme
    } else {
      root.dataset.theme = pack
    }
    return () => {
      delete root.dataset.theme
    }
  }, [pack])
}
