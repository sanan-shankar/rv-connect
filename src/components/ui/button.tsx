"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Canopy is the ONE fill for every CTA/button (docs/spec/DESIGN-SYSTEM.md sec 2).
// Its focus ring is canopy-based too, never the leaf `--ring` token, so a
// canopy button never wears a mismatched leaf halo. Inputs keep the leaf ring.
//
// The filled CTA is the one control that does NOT take `state-layer`: the state
// layer is an ink tint, and tinting a dark green with more ink SINKS it, while
// a hover has to read as lit. So this variant keeps a brightness change, sized
// to land in the same perceptual register as the state layer everywhere else.
// Measured on canopy #235C49 (L* 34.98):
//   brightness 1.08 -> #26634F, L* 37.78, dL* +2.80  (~the 2.0 JND; too close
//                      to invisible, which is the "not everywhere" the owner hit)
//   brightness 1.14 -> #286953, L* 39.85, dL* +4.87  (matches state-layer's
//                      -4.19..-4.72 band, so a CTA and a menu row hover by the
//                      same visible amount)
// White-on-fill contrast only moves 7.78:1 -> 6.50:1, still clear of AA.
//   brightness 0.88 -> L* 30.74, dL* -4.25 vs REST (9.10:1 white)
// The press deliberately goes BELOW the resting fill, not merely below the
// hover. It was `active:brightness-100`, which returned the button to its exact
// idle colour, so a pressed CTA and an untouched one were the same green and
// only the scale sink told them apart. --state-press is ~8 dL* under REST for
// every neutral control, so a filled CTA has to sink against rest too or the
// two registers disagree about what a press means.
const CANOPY_FILL =
  "bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)] hover:brightness-[1.14] active:brightness-[0.88] focus-visible:border-canopy focus-visible:ring-canopy/50"

const buttonVariants = cva(
  // OWNER RULE (2026-07-25): hover NEVER moves a control. No lift, no grow.
  // Hover is a colour change and nothing else; the only transform left is the
  // press sink on :active, which is direct feedback for a click rather than a
  // control drifting under an idle cursor. Do not reintroduce
  // `hover:-translate-y-*` or `hover:scale-*` on any button, pill, chip, tab,
  // or card anywhere in the app.
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none transition-[colors,box-shadow,transform] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: CANOPY_FILL,
        // The one filled CTA variant, explicitly named for what it is (was
        // misleadingly called "leaf" though it always filled canopy).
        primary: CANOPY_FILL,
        // Deprecated alias for "primary", kept only so the held-off
        // src/components/catchups/* (separate GSD rebuild, do not touch) keeps
        // compiling against its existing variant="leaf" call sites. Renders
        // identically to "primary". Do not add new "leaf" call sites; use
        // "primary" everywhere else.
        leaf: CANOPY_FILL,
        // The three neutral variants all hover through `state-layer` (globals.css).
        // They used to hover to --accent #FAF8F2, an OPAQUE hex, which cannot be
        // one hover across surfaces that span ~10 dL*: it measured +8.12 dL* on
        // the page, +2.06 on a paper card and -2.42 on a white dialog, where it
        // inverted and vanished. That is why an outline "Cancel" inside a dialog
        // and a ghost icon button on a card both looked dead. The state layer is
        // a translucent tint composited over whatever surface is underneath, so
        // it lands at -4.19..-4.72 dL* on every one of them. It also carries the
        // :active press, so these variants get colour feedback on click and not
        // only the base scale sink. The dark: hover overrides are gone with it:
        // .dark flips --state-ink to white, so one class covers both themes.
        outline:
          /* bg-transparent, not bg-background: on the tan page they render
             identically, but on the white dialog material a bg-background
             Cancel read as a filled tan pill instead of an outline. */
          "state-layer border-border bg-transparent hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30",
        // aria-expanded is deliberately NOT folded into the state layer here or
        // on ghost: our expanding triggers (post-feed filters, directory "More
        // filters", the search pill) set the ARIA attribute by hand and are not
        // Base UI popup triggers, so they never get the data-open/data-popup-open
        // the state layer keys off. A held-open control stays a background-COLOUR
        // change, which then composites with the hover tint rather than fighting
        // it. `secondary` carried the same pair restating its own resting fill,
        // which painted nothing; dropped.
        secondary: "state-layer bg-secondary text-secondary-foreground",
        ghost:
          "state-layer hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        // Destructive keeps its own red wash: a semantic colour, deliberately
        // not the neutral state layer. Verified visible on a paper card, where
        // /10 -> /20 is -5.3 dL* plus a chroma jump, deeper than the neutral
        // layer's -4.2.
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        // Optical centering: an icon glyph carries less ink than its box and
        // lucide/phosphor icons are drawn with internal whitespace, so with
        // symmetric padding the icon side READS looser than the text side. We
        // shave a fixed ~4px optical step off whichever side holds an icon.
        // Triggered by data-leading-icon / data-trailing-icon, which the Button
        // sets automatically from its children (see below) so every icon+label
        // pill is corrected with zero per-call tuning. Icon-only sizes below
        // deliberately omit these classes (nothing to optically balance).
        default:
          "h-10 gap-2 px-4 data-[leading-icon]:pl-3 data-[trailing-icon]:pr-3",
        xs: "h-8 gap-1 px-3 text-xs data-[leading-icon]:pl-2 data-[trailing-icon]:pr-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3.5 text-[0.8rem] data-[leading-icon]:pl-2.5 data-[trailing-icon]:pr-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-6 text-base data-[leading-icon]:pl-5 data-[trailing-icon]:pr-5",
        icon: "size-10",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// An icon child is either a raw <svg> host element or a *component* element
// (lucide/phosphor). Both forms occur: a client component passes the live
// <Plus/> element (its `type` is the component object), while a Server
// Component renders the icon before it reaches this client Button, so it
// arrives as an already-rendered <svg> whose `type` is the string "svg".
// Treating both as icons is what makes the correction fire on server AND
// client pages. A label is a string, a number, or a non-svg host element
// (<span> etc.). We avoid CSS :first-child/:last-child because they cannot see
// the bare text node beside a lone <svg> (the svg is then both first and last
// element child, so position selectors can't tell leading from trailing).
function isIconChild(child: React.ReactNode): boolean {
  if (!React.isValidElement(child)) return false
  const type = child.type
  return type === "svg" || typeof type !== "string"
}

/**
 * Detects whether the button leads and/or trails with an icon, so the shared
 * optical-centering correction fires automatically. Requires a non-icon
 * sibling (the label) so a bare icon-only button is never shifted.
 */
function detectIconSides(children: React.ReactNode): {
  leading: boolean
  trailing: boolean
} {
  const items = React.Children.toArray(children)
  if (items.length < 2) return { leading: false, trailing: false }
  const first = items[0]
  const last = items[items.length - 1]
  return {
    leading: isIconChild(first) && items.slice(1).some((c) => !isIconChild(c)),
    trailing:
      isIconChild(last) && items.slice(0, -1).some((c) => !isIconChild(c)),
  }
}

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const { leading, trailing } = detectIconSides(children)
  return (
    <ButtonPrimitive
      data-slot="button"
      data-leading-icon={leading ? "" : undefined}
      data-trailing-icon={trailing ? "" : undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
