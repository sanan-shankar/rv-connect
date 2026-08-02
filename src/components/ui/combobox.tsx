"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"
import { MENU_PANEL_CLASS } from "@/components/ui/menu-material"

/**
 * Thin shadcn-style wrapper around Base UI's Combobox primitive, following
 * the same Portal -> Positioner -> Popup shape as select.tsx, with the
 * dropdown surface drawn in the shared menu material (ui/menu-material.ts).
 * Accessibility, keyboard navigation, and positioning all come from the
 * primitive; this file only carries the visual language.
 *
 * This is a generic list/search primitive -- domain composition (server
 * search wiring, chips, the free-text fallback) lives in the feature
 * component that uses it (src/components/common/location-picker.tsx).
 */

const Combobox = ComboboxPrimitive.Root

// The input group is the 12px-radius "input" shape from the design system
// (radius-input matches Input/Select). Its ring lights leaf on focus/open,
// never canopy -- canopy is reserved for buttons.
function ComboboxInputGroup({
  className,
  ...props
}: ComboboxPrimitive.InputGroup.Props) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-[var(--radius-input)] border border-input bg-transparent px-3 transition-colors outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-[input:disabled]:pointer-events-none has-[input:disabled]:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        "h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

function ComboboxIcon({ className, ...props }: ComboboxPrimitive.Icon.Props) {
  return (
    <ComboboxPrimitive.Icon
      data-slot="combobox-icon"
      className={cn("shrink-0 text-muted-foreground [&_svg]:size-4", className)}
      {...props}
    />
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      className={cn(
        // `state-layer` for the neutral hover/press tint (it replaces a
        // hover:bg-accent that was invisible on the Float-white input group it
        // sits in); the text still darkens to foreground on top of it, and
        // active:scale-90 stays because a press MAY move, only hover may not.
        "state-layer grid shrink-0 place-items-center rounded-full p-1 text-muted-foreground outline-none transition-transform duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90 [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  )
}

function ComboboxPortal(props: ComboboxPrimitive.Portal.Props) {
  return <ComboboxPrimitive.Portal data-slot="combobox-portal" {...props} />
}

function ComboboxPositioner({
  className,
  sideOffset = 6,
  // Base UI's own default is align="center", which floated this one popup
  // centred under its trigger while every other menu opened from the leading
  // edge. The menu material has ONE placement: below the trigger, leading
  // edge, 6px offset, flipping only on viewport collision.
  align = "start",
  ...props
}: ComboboxPrimitive.Positioner.Props) {
  return (
    <ComboboxPrimitive.Positioner
      data-slot="combobox-positioner"
      sideOffset={sideOffset}
      align={align}
      className={cn("isolate z-(--z-floating)", className)}
      {...props}
    />
  )
}

// The dropdown surface: the shared menu material (Float white, 12px panel,
// warm hairline, layered ink shadow, one origin scale/fade) plus this
// popup's own sizing and the material's 4px inset. The old class list here
// claimed rounded-2xl was the "16px card radius"; in this repo's scale it is
// actually 27.2px, the oversized arc behind the Directory dropdown bug.
function ComboboxPopup({ className, ...props }: ComboboxPrimitive.Popup.Props) {
  return (
    <ComboboxPrimitive.Popup
      data-slot="combobox-popup"
      className={cn(
        MENU_PANEL_CLASS,
        "relative max-h-80 w-(--anchor-width) min-w-64 overflow-x-hidden overflow-y-auto p-1",
        className
      )}
      {...props}
    />
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  )
}

// Menu-material row: --radius-sm (8.8px) -- one rung under the 12px panel and
// concentric with it through the 4px inset, so the highlight can never read as
// cutting the panel corner.
//
// NO min-height. `min-h-9` arrived in 74feaa2 and, on top of px-3 py-2, forced
// a one-line result past its natural height; that is the same stretch the owner
// called out in the menus. The row's own padding sets its size, so a two-line
// result (label + sublabel, the location picker's shape) still grows honestly.
//
// Highlight is `state-layer`, the one hover treatment. It replaces
// `data-highlighted:bg-accent`, which pointed at the right attribute (Base UI
// marks the pointed-at row with data-highlighted -- confirmed against the
// installed ComboboxItem data attributes) but painted --accent, and --accent on
// this Float-white panel measures -2.42 dL*: inverted, invisible.
function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "state-layer flex cursor-pointer scroll-my-1 flex-col justify-center gap-0.5 rounded-[var(--radius-sm)] px-3 py-2 outline-none transition-transform duration-100 select-none active:scale-[0.99] data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-3 py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function ComboboxStatus({ className, ...props }: ComboboxPrimitive.Status.Props) {
  return (
    <ComboboxPrimitive.Status
      data-slot="combobox-status"
      className={cn("sr-only", className)}
      {...props}
    />
  )
}

function ComboboxCollection(props: ComboboxPrimitive.Collection.Props) {
  return <ComboboxPrimitive.Collection {...props} />
}

export {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxIcon,
  ComboboxClear,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxStatus,
  ComboboxCollection,
}
