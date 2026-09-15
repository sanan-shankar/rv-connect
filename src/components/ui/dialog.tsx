"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { useBackCloses } from "@/lib/back-closes"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/** Root props with the back gesture wired in: while open, back closes it
 *  through Base UI's own close, so the caller's `onOpenChange` still decides
 *  (a dialog that refuses to close mid-save keeps refusing). Shared with
 *  ui/sheet, which is the same primitive. See src/lib/back-closes.ts. */
export function useBackClosableRoot(props: DialogPrimitive.Root.Props): DialogPrimitive.Root.Props {
  const { open, defaultOpen, onOpenChange, actionsRef } = props
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const ownActions = React.useRef<DialogPrimitive.Root.Actions>(null)
  const actions = actionsRef ?? ownActions
  useBackCloses(open ?? uncontrolledOpen, () => actions.current?.close())
  return {
    ...props,
    actionsRef: actions,
    onOpenChange: (next, details) => {
      onOpenChange?.(next, details)
      if (!details.isCanceled) setUncontrolledOpen(next)
    },
  }
}

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...useBackClosableRoot(props)} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/* THE dialog material (owner, 2026-07-30: edit post / report post / get in
 * touch / flag person "should be reusing the same template"; the report
 * register won). Backdrop: a constant warm-ink tint + blur whose OPACITY is
 * the only animated property, so the fade reads as the background gradually
 * blurring rather than a hard cut. Panel: Float white (the one sanctioned
 * pure-white surface), 20.8px floating-modal radius, layered ink shadow,
 * entering a beat (80ms) after the backdrop on a spring-ish curve; the exit
 * runs immediately (no delay) so closing never lags. Every dialog in the app
 * comes through this file - divergence is a bug, not a choice. */
/** The modal scrim, as a class, so nothing outside this file has to write
 *  the hex again. `ui/sheet.tsx` is the edge-anchored variant of this
 *  material and the Catch-up settings sheet is a hand-driven one (it reads
 *  its own touch events, so it cannot use Base UI's backdrop) -- all three
 *  are the same wash, and the protocol audit fails a raw hex in production
 *  code precisely so it stays that way. */
export const MODAL_SCRIM = "bg-[#241a12]/55"

/** The title every dialog and bottom sheet wears. 18px in the heading face:
 *  a size between the 16px dialogs and the 20px filter sheet that used to
 *  disagree with each other, and regular weight because Libre Baskerville
 *  ships 400 and 700 only -- the "medium" this replaced was rendering at 400
 *  all along. */
export const MODAL_TITLE = "font-heading text-[18px] leading-snug tracking-[-0.01em] text-foreground"

/** The one way out of a modal, top right: a 32px filled circle with a bold
 *  glyph, the iOS sheet close, rather than a bare ghost X that disappears into
 *  the title row. The ::after grows the target to 44px for a thumb without
 *  growing the drawing. */
export const MODAL_CLOSE =
  "relative grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 ease-out after:absolute after:-inset-1.5 after:content-[''] hover:bg-border hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf [&_svg]:size-4 [&_svg]:stroke-[2.5]"

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        `fixed inset-0 isolate z-50 ${MODAL_SCRIM} backdrop-blur-md opacity-100 transition-[opacity] duration-[220ms] ease-out-smooth data-starting-style:opacity-0 data-ending-style:opacity-0 data-closed:opacity-0 data-closed:duration-[180ms]`,
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          /* -translate-y-1/2 centres; the enter/exit y-drift rides ON TOP of it
             via calc so the two never fight over one transform. Enter: rise 12px
             + scale from 0.94, delayed 80ms behind the backdrop (the delay lives
             on the OPEN state so the exit reads a 0ms delay from the closed
             state and leaves immediately). */
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-float p-4 text-sm shadow-[0_1px_2px_rgba(30,28,22,0.06),0_24px_48px_-24px_rgba(30,28,22,0.55)] opacity-100 scale-100 transition-[opacity,scale,translate] duration-[260ms] ease-spring outline-none sm:max-w-sm",
          "data-open:delay-[80ms]",
          "data-starting-style:opacity-0 data-starting-style:scale-94 data-starting-style:translate-y-[calc(-50%+12px)]",
          "data-ending-style:opacity-0 data-ending-style:scale-96 data-ending-style:translate-y-[calc(-50%+8px)] data-closed:opacity-0 data-closed:duration-[200ms]",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            aria-label="Close"
            className={cn(MODAL_CLOSE, "absolute top-3 right-3")}
          >
            <XIcon aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        /* A plain right-aligned row, not a recessed tray: the dialog material
           has ONE surface (Float) and a box must earn its border. */
        "flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(MODAL_TITLE, className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
