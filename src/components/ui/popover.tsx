"use client"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"
import { MENU_PANEL_CLASS } from "@/components/ui/menu-material"

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
  sideOffset = 6,
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
        // The surface IS the menu material -- same radius, hairline, ink
        // shadow and the one origin animation every other popup uses. This
        // used to restate all of it by hand and animate with tw-animate-css's
        // slide-in/zoom family instead, which made the popover the single
        // exception to "no slide-downs on one page and pops on another".
        // Only the sizing and padding are the popup's own.
        MENU_PANEL_CLASS,
        "relative w-72 p-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverContent,
}
