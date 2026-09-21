import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pieces the loading screens share, for the few shapes that recur across
 * them. Everything else in a skeleton is the page's own markup with the ink
 * taken out, written beside the page it stands in for.
 */

/**
 * A Button before its page arrives: the real Button, rendered as an inert div
 * with its label set invisible and its colour taken off.
 *
 * The real component rather than a copy of its classes, because the point of
 * a placeholder is to be the box the button will be -- its height, its
 * padding, the 4px optical correction it takes beside a leading icon, and the
 * width of its words -- at every breakpoint and in every font. A hand-sized
 * pill is right at the one width somebody measured it at and wrong at the
 * others, which is how the directory's Filters pill came to be 88px on a
 * phone that draws a 48px one.
 *
 * `variant={null}` drops the variant's colours (cva's own opt-out); the empty
 * svg is what Button reads as a leading icon, so the correction fires exactly
 * as it does for the real one. Disabled and aria-hidden, so the stand-in is
 * never a focus stop or something a screen reader announces.
 */
export function ButtonSkeleton({
  label,
  icon = false,
  size,
  className,
}: {
  label: string;
  icon?: boolean;
  size?: "default" | "xs" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Button
      render={<div aria-hidden />}
      nativeButton={false}
      disabled
      variant={null}
      size={size}
      className={cn("skeleton-warm pointer-events-none", className)}
    >
      {icon && <svg className="size-4" aria-hidden />}
      <span className="invisible">{label}</span>
    </Button>
  );
}
