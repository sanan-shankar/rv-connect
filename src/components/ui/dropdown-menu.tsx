"use client"

import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"
import { MENU_PANEL_CLASS } from "@/components/ui/menu-material"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
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

/* The divider above a menu's destructive group. This primitive simply did
   not exist until 2026-08-29, which is why no menu in the app drew one --
   Apple, Carbon and Radix's own examples all put a rule above Delete (Carbon
   states it: significant-change actions "are separated by a divider and live
   below the primary set of actions"). -mx-1 bleeds it across the popup's 4px
   inset so it spans the panel, not the row width; the hairline is the same
   warm `--border` as every other hairline. */
function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
