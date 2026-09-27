"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { MODAL_CLOSE, MODAL_SCRIM, MODAL_TITLE, useBackClosableRoot } from "@/components/ui/dialog"
import { XIcon } from "lucide-react"

function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...useBackClosableRoot(props)} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        // The dialog material's warm-ink scrim (see ui/dialog.tsx, which owns
        // the #241a12 reasoning): the sheet is the edge-anchored variant of
        // that material, so it shares the same backdrop instead of the old
        // colder bg-black/10 wash. Only opacity animates.
        `fixed inset-0 z-50 ${MODAL_SCRIM} backdrop-blur-md transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0`,
        className
      )}
      {...props}
    />
  )
}

/** A drawer pinned to the left or right edge: the phone menu and the
 *  directory map's city list. Anything that rises from the bottom is a
 *  `BottomSheet` below, never this with a side. */
function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "right" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          // The edge-anchored variant of the dialog material: Float white
          // surface (bg-popover) by default, behind the warm-ink scrim above. A
          // sheet that is a content region rather than a floating menu
          // overrides bg-popover with bg-card (see the directory's city
          // drilldown). card-elevated, not shadow-lg: the system's shadow is
          // layered and ink-tinted, never a flat Tailwind step.
          "fixed inset-y-0 z-50 flex h-full w-3/4 flex-col gap-4 card-elevated bg-popover bg-clip-padding text-sm transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 sm:max-w-sm data-[side=left]:left-0 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:right-0 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem]",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            aria-label="Close"
            className={cn(MODAL_CLOSE, "absolute top-3 right-3")}
          >
            <XIcon aria-hidden="true" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(MODAL_TITLE, className)}
      {...props}
    />
  )
}

/* ── the bottom sheet ──────────────────────────────────────────────── *
 *  Every panel that rises from the foot of the screen is this one
 *  component: the Directory's and the admin lists' filters, the guide,
 *  the house picker on a profile, a Catch-up's Settings and People.
 *  They were five shapes (three title sizes, a hairline under two of
 *  them, a tan footer tray under one, three radii, two engines), and the
 *  owner's words for all of them, 2026-09-09:
 *
 *    "Anytime we have this dialogue that pops up from the bottom, I don't
 *     want it to be controlled by that pill on that very thin pill on
 *     top. I want it to be controlled by an x. [...] I'd like it to say
 *     Settings on the top left and then have the x on the top right."
 *
 *    "And also I'd like you to be able to bring it down by swiping down
 *     on it if you were at the top."
 *
 *  So: the title at the leading edge, the X at the trailing one, the same
 *  title and the same X a dialog wears on a laptop (MODAL_TITLE and
 *  MODAL_CLOSE in ui/dialog.tsx). Sections are separated by space, never a
 *  line, and the footer sits on the sheet's own surface: the tan tray it
 *  used to have read as a brown smear behind the button on a phone.
 * ------------------------------------------------------------------ */

/** How long the sheet takes to rise and to fall. Exported because the guide
 *  waits exactly this long before letting go of its store. */
export const BOTTOM_SHEET_MS = 300

/** Below this a tap's own jitter would start the drag, and the sheet would
 *  twitch under a press. */
const SLOP = 6
/** Let go past this far down, or faster than FLICK px/s, and it closes. */
const DISTANCE = 90
const FLICK = 600
/** The inline transition while the sheet is NOT under a finger. It names
 *  translate as well as transform because an inline transition replaces the
 *  class one outright, and translate is what Base UI's exit rides on: leave
 *  it out and the X would snap the sheet shut with no fall at all. */
const SETTLE = `transform 240ms var(--ease-out-smooth), translate ${BOTTOM_SHEET_MS}ms var(--ease-out-smooth), opacity ${BOTTOM_SHEET_MS}ms var(--ease-out-smooth)`

/** Swipe down to close.
 *
 *  Read from touch events directly, non-passively, and NOT framer's `drag`:
 *  the sheet's body is a scroller, and the moment a finger moves on a
 *  scrollable box Chrome claims the gesture and fires `pointercancel`, so a
 *  pointer-driven drag never starts (measured on the Catch-up settings
 *  sheet, where this was first built). The rule:
 *
 *    nothing under the finger is scrolled down AND it travels SLOP px DOWN
 *      -> preventDefault, and the sheet follows the finger
 *    it travels up first, or something under it is scrolled
 *      -> not ours; the content scrolls and the sheet never moves
 *
 *  The finger's offset is written to `transform`; the enter and exit ride on
 *  `translate`. Two properties, so the drag and Base UI never fight over one,
 *  and a dismissed sheet falls on from wherever the finger left it. */
function useSwipeDownToClose(
  ref: React.RefObject<HTMLElement | null>,
  mounted: HTMLElement | null,
  onClose: () => void
) {
  /* The node is read off the ref, not the `mounted` state: the compiler
     treats a write through a state value as mutating it. `mounted` is only
     the signal that there is now a node to listen to. */
  React.useEffect(() => {
    const el = ref.current
    if (!el || !mounted) return
    el.style.transition = SETTLE

    let startY = 0
    let lastY = 0
    let lastT = 0
    let speed = 0
    let armed = false
    let dragging = false

    const scrolledDown = (target: EventTarget | null) => {
      for (let n = target instanceof Element ? target : null; n && n !== el; n = n.parentElement) {
        if (n.scrollTop > 0) return true
      }
      return false
    }

    const start = (e: TouchEvent) => {
      dragging = false
      armed = e.touches.length === 1 && !scrolledDown(e.target)
      startY = lastY = e.touches[0]?.clientY ?? 0
      lastT = e.timeStamp
      speed = 0
    }

    const move = (e: TouchEvent) => {
      if (!armed) return
      const y = e.touches[0]?.clientY ?? lastY
      const dy = y - startY
      if (!dragging) {
        if (dy < -SLOP) {
          armed = false
          return
        }
        if (dy < SLOP) return
        dragging = true
        el.style.transition = "none"
      }
      e.preventDefault()
      if (e.timeStamp > lastT) speed = ((y - lastY) / (e.timeStamp - lastT)) * 1000
      lastY = y
      lastT = e.timeStamp
      el.style.transform = `translateY(${Math.max(0, dy - SLOP)}px)`
    }

    const end = () => {
      armed = false
      if (!dragging) return
      dragging = false
      el.style.transition = SETTLE
      if (lastY - startY > DISTANCE || speed > FLICK) onClose()
      else el.style.transform = ""
    }

    el.addEventListener("touchstart", start, { passive: true })
    el.addEventListener("touchmove", move, { passive: false })
    el.addEventListener("touchend", end)
    el.addEventListener("touchcancel", end)
    return () => {
      el.removeEventListener("touchstart", start)
      el.removeEventListener("touchmove", move)
      el.removeEventListener("touchend", end)
      el.removeEventListener("touchcancel", end)
    }
  }, [ref, mounted, onClose])
}

function SheetColumn({
  wrap,
  inert,
  children,
}: {
  wrap: boolean
  inert?: boolean
  children: React.ReactNode
}) {
  return wrap ? (
    <div inert={inert} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {children}
    </div>
  ) : (
    <>{children}</>
  )
}

function BottomSheet({
  open,
  onOpenChange,
  title,
  footer,
  children,
  className,
  bodyClassName,
  bodyRef,
  media,
  overlay,
  overlayed = false,
  headerClassName,
  footerClassName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  /** A persistent action row under the scrolling body, e.g. "Show 12 people". */
  footer?: React.ReactNode
  children: React.ReactNode
  /** The panel: height and width only. The anatomy is not per-sheet. */
  className?: string
  bodyClassName?: string
  /** The scrolling body, for a sheet that swaps what it shows and has to
   *  start the new content at its top (the guide's Next). */
  bodyRef?: React.Ref<HTMLDivElement>
  /** A photograph beside the column on a laptop, the way the sign-in page
   *  stands its valley photo beside the form (the guide). The sheet is a
   *  row there: this on the left, header, body and footer on the right.
   *  Below lg it is not rendered; a sheet that wants a picture on a phone
   *  puts one in its own body. */
  media?: React.ReactNode
  /** A layer over the whole sheet, positioned by its own classes (the guide's
   *  cover page). Always rendered as given, so an exit animation inside it
   *  can finish; `overlayed` says whether it is up, and while it is, every-
   *  thing under it is inert: Tab and a screen reader meet only the layer. */
  overlay?: React.ReactNode
  overlayed?: boolean
  /** The header's and the footer's insets, for the one sheet that is read
   *  rather than scanned (the guide) and so takes a page's margins. */
  headerClassName?: string
  footerClassName?: string
}) {
  /* A callback ref as state, because the popup mounts inside a portal a beat
     after `open` flips, and an effect reading a plain ref would find null. */
  const [node, setNode] = React.useState<HTMLDivElement | null>(null)
  const focusRef = React.useRef<HTMLDivElement | null>(null)
  const attach = React.useCallback((n: HTMLDivElement | null) => {
    focusRef.current = n
    setNode(n)
  }, [])
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])
  useSwipeDownToClose(focusRef, node, close)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Popup
          ref={attach}
          data-slot="bottom-sheet"
          /* Focus the panel, not its first control: a filter search field
             would otherwise raise the keyboard over half the sheet the moment
             it opened. */
          initialFocus={focusRef}
          className={cn(
            /* max-w-xl only matters on a tablet, where a full-width sheet
               would stretch 1000px of rows edge to edge. svh, not dvh: the
               dynamic unit changes as iOS's toolbar shows and hides, and the
               sheet would resize under the finger scrolling it. */
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85svh] w-full max-w-xl flex-col rounded-t-xl bg-popover text-sm text-popover-foreground card-elevated outline-none duration-300 data-starting-style:translate-y-full data-ending-style:translate-y-full",
            media && "lg:flex-row",
            className
          )}
          style={footer ? undefined : { paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {media && (
            <div inert={overlayed} className="relative hidden shrink-0 overflow-hidden lg:block lg:w-[44%]">
              {media}
            </div>
          )}
          {/* With a photograph beside it, or a layer over it, the column is its
              own flex box; otherwise it is not, so every other sheet keeps the
              DOM it always had. */}
          <SheetColumn wrap={Boolean(media || overlay)} inert={overlayed}>
            <div className={cn("flex shrink-0 items-center gap-3 pt-3 pr-3 pb-2 pl-4", headerClassName)}>
              <SheetTitle className="min-w-0 flex-1">{title}</SheetTitle>
              <SheetPrimitive.Close data-slot="sheet-close" aria-label="Close" className={MODAL_CLOSE}>
                <XIcon aria-hidden="true" />
              </SheetPrimitive.Close>
            </div>
            {/* overscroll-contain so a flick that runs out of content does not
                hand the scroll to the page behind the sheet. */}
            <div ref={bodyRef} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-4", bodyClassName)}>
              {children}
            </div>
            {footer && (
              /* max(16px, the home indicator): viewport-fit=cover in the root
                 layout makes that strip real, and a button flush against it
                 cannot be pressed without dragging the app switcher up. */
              <div
                className={cn("flex shrink-0 items-center gap-3 px-4 pt-3", footerClassName)}
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                {footer}
              </div>
            )}
          </SheetColumn>
          {overlay}
        </SheetPrimitive.Popup>
      </SheetPortal>
    </Sheet>
  )
}

export {
  BottomSheet,
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
}
