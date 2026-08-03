"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A quiet verified marker: a small leaf next to the name, no label until hover
 * or focus. Leaf-green for alumni, office-blue for teachers. Nothing at all for
 * unverified, pending, or flagged users (absence is the signal).
 *
 * The label sits to the RIGHT of the leaf (owner: below covered other elements
 * like the meta line on the profile header). If there is not enough room to the
 * right, it flips to the left instead.
 *
 * SIZES: exactly two are sanctioned (owner, 2026-07-30: one pill, used the
 * same way everywhere). The default 13 beside body-size names (feed rows,
 * directory cards); 16 beside a page-title name (profile headers). Never a
 * third value; the hover label is identical at both.
 */
export function VerifiedMark({
  user,
  size = 13,
}: {
  user: { verifyState?: string | null; accountType?: string | null };
  size?: number;
}) {
  if (user.verifyState !== "verified") return null;

  const isTeacher = user.accountType === "teacher" || user.accountType === "ex_teacher";
  const label =
    user.accountType === "teacher"
      ? "Verified teacher"
      : user.accountType === "ex_teacher"
        ? "Verified former teacher"
        : "Verified";

  return <VerifiedMarkInner label={label} isTeacher={isTeacher} size={size} />;
}

function VerifiedMarkInner({
  label,
  isTeacher,
  size,
}: {
  label: string;
  isTeacher: boolean;
  size: number;
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"right" | "left">("right");
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  // When the label shows, keep it to the right unless it would run off the
  // viewport, in which case flip it to the left. Measured after layout so the
  // tip's real width is known; the opacity fade hides the one-frame correction.
  useLayoutEffect(() => {
    if (!open) return;
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!wrap || !tip) return;
    const wrapRect = wrap.getBoundingClientRect();
    const margin = 8;
    const wouldOverflowRight =
      wrapRect.right + 6 + tip.offsetWidth > window.innerWidth - margin;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Measures the tooltip against the viewport and flips it to the other side if it would overflow. Pure measure-then-position; the opacity fade hides the one-frame correction.
    setSide(wouldOverflowRight ? "left" : "right");
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex shrink-0 cursor-default rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      tabIndex={0}
      role="img"
      aria-label={label}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <Leaf
        style={{ width: size, height: size }}
        className={isTeacher ? "text-sky" : "text-leaf"}
        aria-hidden
        strokeWidth={2.2}
      />
      <span
        ref={tipRef}
        className={cn(
          /* This sits inside everything from a 14.5px directory h3 to a 40px
             profile h1, so it must own every type metric. Inheriting the
             parent's unitless line-height made the same pill 22.38px tall in
             the directory and 20.06px on a profile. The calibrated nudge below
             optically centres Libre Baskerville's ink inside its line box. */
          "pointer-events-none absolute top-1/2 z-30 inline-flex items-center -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-[var(--space-m)] py-[var(--space-xs)] font-heading text-[0.6875rem] leading-[1.25] font-normal tracking-[0.02em] text-background transition-opacity duration-150",
          side === "right" ? "left-full ml-2" : "right-full mr-2",
          open ? "opacity-100" : "opacity-0"
        )}
        style={{
          boxShadow:
            "0 1px 2px rgba(35,36,30,0.24), 0 8px 20px -12px rgba(35,36,30,0.65)",
        }}
      >
        <span className="translate-y-px">{label}</span>
      </span>
    </span>
  );
}
