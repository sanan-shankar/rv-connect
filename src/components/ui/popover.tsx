"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

/**
 * Thin shadcn-style wrapper around Base UI's Popover primitive, following the
 * same Portal -> Positioner -> Popup shape as select.tsx / combobox.tsx. The
 * panel is the one floating-panel material from DESIGN-SYSTEM "Menus &
 * dropdowns": Float white, 12px --radius-md, hairline border, the layered ink
 * shadow. Used for anything that needs a floating panel anchored to a trigger
 * that ISN'T itself a listbox/select (e.g. RangeFacetPill's From/To picker).
 */

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />
}

function PopoverPositioner({
  className,
  sideOffset = 8,
  align = "start",
  ...props
}: PopoverPrimitive.Positioner.Props) {
  return (
    <PopoverPrimitive.Positioner
      data-slot="popover-positioner"
      sideOffset={sideOffset}
      align={align}
      className={cn("isolate z-50", className)}
      {...props}
    />
  )
}

function PopoverContent({ className, ...props }: PopoverPrimitive.Popup.Props) {
  return (
    <PopoverPrimitive.Popup
      data-slot="popover-content"
      className={cn(
        // --radius-md (12px) is the protocol's floating-panel radius: the old
        // rounded-2xl computed to 27.2px here, rounder than the 16px card the
        // panel floats over, which inverts the radius ladder. The hairline
        // border + layered ink shadow are the shared menu-material treatment.
        "relative w-72 origin-(--transform-origin) rounded-[var(--radius-md)] border border-border bg-popover p-4 text-popover-foreground shadow-[0_18px_38px_-16px_rgba(35,36,30,0.28)] outline-none duration-150 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className
      )}
      {...props}
    />
  )
}

function PopoverClose({ ...props }: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />
}

export {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverContent,
  PopoverClose,
}
