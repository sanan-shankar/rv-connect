"use client";

import { useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Leaf } from "lucide-react";

/**
 * A quiet verified marker: a small leaf next to the name, no label until hover
 * or focus. Leaf-green for alumni, office-blue for teachers. Nothing at all for
 * unverified, pending, or flagged users (absence is the signal).
 *
 * The label sits to the RIGHT of the leaf (owner: below covered other elements
 * like the meta line on the profile header). If there is not enough room to the
 * right, it flips to the left instead.
 *
 * PORTALLED, and that is the fix for "the verified tag gets cut off in feed"
 * (owner, 2026-09-15). The label used to be an absolute child of the leaf, so
 * it lived inside every box around the name: IdentityRow's `overflow-x-clip`
 * (kept for the ellipsis) and the post card's `overflow-hidden` (kept for its
 * radius). Its own flip only measured the viewport, so it could decide there
 * was room and still be sliced by a card edge it could not see. Rendered into
 * the body, no ancestor can clip it, and the positioner flips it against the
 * viewport alone -- it shows wherever there is space.
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
  // Controlled so a TAP opens it too: a touch screen has no hover, and Base
  // UI's tooltip only listens for hover and keyboard focus. The tabIndex makes
  // the leaf focusable, so a tap focuses it and focus opens the label. Base UI
  // also closes a tooltip when its trigger is pressed, which on a phone shut
  // the label in the same tap that opened it; that one close is ignored, and
  // tapping anywhere else blurs the leaf and closes it.
  const [open, setOpen] = useState(false);

  return (
    <Tooltip.Root
      open={open}
      onOpenChange={(next, details) => {
        if (!next && details.reason === "trigger-press") return;
        setOpen(next);
      }}
    >
      <Tooltip.Trigger
        delay={0}
        closeDelay={0}
        render={<span />}
        className="inline-flex shrink-0 cursor-default rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        tabIndex={0}
        role="img"
        aria-label={label}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Leaf
          style={{ width: size, height: size }}
          className={isTeacher ? "text-sky" : "text-leaf"}
          aria-hidden
          strokeWidth={2.2}
        />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        {/* 8px from the leaf and 8px from the viewport edge: the same two
            numbers the hand-rolled flip used (ml-2, margin 8). */}
        <Tooltip.Positioner side="right" sideOffset={8} collisionPadding={8} className="isolate z-50">
          <Tooltip.Popup
            /* This sits beside everything from a 14.5px directory h3 to a 40px
               profile h1, so it owns every type metric rather than inheriting.
               The calibrated nudge below optically centres Libre Baskerville's
               ink inside its line box. Opacity only, per the motion rule. */
            className="pointer-events-none inline-flex items-center whitespace-nowrap rounded-md bg-foreground px-[var(--space-m)] py-[var(--space-xs)] font-heading text-[0.6875rem] leading-[1.25] font-normal tracking-[0.02em] text-background transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
            style={{
              boxShadow:
                "0 1px 2px rgba(35,36,30,0.24), 0 8px 20px -12px rgba(35,36,30,0.65)",
            }}
          >
            <span className="translate-y-px">{label}</span>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
