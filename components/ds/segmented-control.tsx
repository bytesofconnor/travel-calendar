"use client"

import { cn } from "@/lib/utils"

interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: ReadonlyArray<SegmentedControlOption<T>>
  onChange: (value: T) => void
  label: string
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("mara-segment", className)}
    >
      {options.map((option) => {
        const pressed = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.value)}
            className="mara-segment__btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
