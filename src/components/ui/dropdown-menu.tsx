"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"
import { MENU_PANEL_CLASS } from "@/components/ui/menu-material"
import { ChevronRightIcon, CheckIcon } from "lucide-react"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  // The menu material's one placement: below the trigger, aligned to its
  // leading edge, 6px off it. Flipping happens only on viewport collision
  // (the Positioner's default collision handling).
  sideOffset = 6,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        {/* Surface + motion come from MENU_PANEL_CLASS (the one menu
            material); this popup only adds its sizing and the 4px inset. */}
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(MENU_PANEL_CLASS, "z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 overflow-x-hidden overflow-y-auto p-1", className )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        // Menu-material row: radius --radius-sm (8.8px, concentric with the
        // 12px panel through its 4px inset).
        //
        // NO min-height. It carried `min-h-9` between 74feaa2 and 2026-08-02,
        // which took every row from 28px (py-1 on a 20px line box) to 36px and
        // made the sidebar account menu 40px taller than the content in it:
        // the owner's "before it was nicely sized ... the last few updates have
        // made it really stretched". Reverted to the natural row. If a touch
        // target ever needs to grow, grow the PADDING so the panel stays
        // proportional to its contents.
        "group/dropdown-menu-item relative flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1.5 py-1 text-sm outline-hidden select-none data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // The highlight. A destructive row keeps its own red wash (a semantic
        // colour, deliberately not the neutral state layer); everything else
        // gets `state-layer`, which is the ONE hover treatment in the app.
        // What was here before was `focus:bg-accent`, inherited from shadcn's
        // Radix build where the library moves DOM focus onto the highlighted
        // row. Base UI does not: it marks rows with `data-highlighted` and
        // leaves focus on the popup, so the `focus:` half never matched, and
        // the `bg-accent` half was invisible on a white panel anyway
        // (-2.42 dL*). Two independent reasons the same hover did nothing.
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10 data-highlighted:bg-destructive/10 dark:hover:bg-destructive/20 dark:data-highlighted:bg-destructive/20 *:[svg]:text-destructive"
          : "state-layer",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        // Same row spec as DropdownMenuItem: no min-height, state-layer for
        // the highlight. state-layer already covers data-open /
        // data-popup-open, which is what keeps this trigger lit while its
        // submenu is showing, so the bg-accent pair that used to do that is
        // gone along with the focus: pair that never fired.
        "state-layer flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1.5 py-1 text-sm outline-hidden select-none data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    // Surface comes from DropdownMenuContent (the menu material); a submenu
    // only narrows the sizing.
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("w-auto min-w-[96px]", className )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        // rounded-[var(--radius-sm)], not rounded-md: a row highlight is
        // concentric with its panel (12px panel - 4px padding = 8.8px). At
        // rounded-md the row and the panel shared a radius and the highlight
        // read as cutting its own corner.
        "state-layer relative flex items-center gap-1.5 rounded-[var(--radius-sm)] py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          {/* Selection is a canopy check, never a fill: the accent wash is
              the hover state, and a selected row reusing it would read as
              two rows hovered at once. */}
          <CheckIcon className="text-canopy" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        // rounded-[var(--radius-sm)], not rounded-md: a row highlight is
        // concentric with its panel (12px panel - 4px padding = 8.8px). At
        // rounded-md the row and the panel shared a radius and the highlight
        // read as cutting its own corner.
        "state-layer relative flex items-center gap-1.5 rounded-[var(--radius-sm)] py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon className="text-canopy" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        // group-data-highlighted, not group-focus: the row it keys off is
        // marked by Base UI with data-highlighted and never receives DOM
        // focus, so the focus variant here could not match either.
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-highlighted/dropdown-menu-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
