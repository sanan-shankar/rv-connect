"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Canopy is the ONE fill for every CTA/button (docs/spec/DESIGN-SYSTEM.md sec 2).
// Its focus ring is canopy-based too, never the leaf `--ring` token, so a
// canopy button never wears a mismatched leaf halo. Inputs keep the leaf ring.
const CANOPY_FILL =
  "bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)] hover:brightness-[1.08] focus-visible:border-canopy focus-visible:ring-canopy/50"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none transition-transform transition-shadow duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 hover:-translate-y-px active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline hover:translate-y-0 active:translate-y-0 active:scale-100",
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
