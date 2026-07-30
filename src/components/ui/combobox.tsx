"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"

/**
 * Thin shadcn-style wrapper around Base UI's Combobox primitive, following
 * the same Portal -> Positioner -> Popup shape as select.tsx and the same
 * warm-popover / ring-1 treatment as dialog.tsx. Accessibility, keyboard
 * navigation, and positioning all come from the primitive; this file only
 * carries the visual language (radii, colour, motion-safe animate-in/out).
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
        "grid shrink-0 place-items-center rounded-full p-1 text-muted-foreground outline-none transition-transform duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90 [&_svg]:size-3.5",
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
  ...props
}: ComboboxPrimitive.Positioner.Props) {
  return (
    <ComboboxPrimitive.Positioner
      data-slot="combobox-positioner"
      sideOffset={sideOffset}
      className={cn("isolate z-(--z-floating)", className)}
      {...props}
    />
  )
}

// The dropdown surface: pure white (--popover), the one place a floating
// layer is allowed to depart from the warm-dimmed rule (sec. 4, "Float"
// token), 16px card radius (one step up from the 12px input beneath it, per
// the nesting rule), a layered ink-tinted shadow (never flat shadow-md), and
// a real opacity/scale entrance via tw-animate-css -- transform + opacity
// only, matching the app-wide animation rule.
function ComboboxPopup({ className, ...props }: ComboboxPrimitive.Popup.Props) {
  return (
    <ComboboxPrimitive.Popup
      data-slot="combobox-popup"
      className={cn(
        "relative max-h-80 w-(--anchor-width) min-w-64 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl bg-popover p-1.5 text-popover-foreground ring-1 ring-foreground/10 shadow-[0_18px_38px_-16px_rgba(35,36,30,0.28)] duration-150 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
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

// Item radius (10px) is intentionally a notch under the 16px popup it nests
// inside (the "inner box is never the same radius as its container" rule).
// Highlighted (keyboard/hover) state uses the leaf-tinted accent, matching
// every other list-hover surface in the app.
function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "flex cursor-pointer scroll-my-1 flex-col gap-0.5 rounded-[10px] px-3 py-2 outline-none transition-transform duration-100 select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground active:scale-[0.99] data-disabled:pointer-events-none data-disabled:opacity-50",
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
