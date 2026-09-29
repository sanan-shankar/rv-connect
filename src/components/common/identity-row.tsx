import type { ComponentProps, ReactNode } from "react";
import Link from "@/components/common/link";
import { BirdAvatar, SIZE_TOKENS, type AvatarUser } from "@/components/common/bird-avatar";
import { cn } from "@/lib/utils";

type AvatarSize = ComponentProps<typeof BirdAvatar>["size"];

// Edit these two numbers to tune every avatar/name/batch row in one place.
const IDENTITY_STACK_GAP_PX = 5; // Space between the name and batch/time rows.
const IDENTITY_COPY_NUDGE_Y_PX = 0; // Negative moves text up; positive moves it down.

/* The byline register: small caps under a name, used by the feed, the letters
   index and reader, a Collection photo, the map drilldown and the feed rail.

   DO NOT "FIX" THIS TO 12px. It is 1.5px under the type scale's smallest
   documented step (`label 0.75rem` at 0.08-0.16em, DESIGN-SYSTEM.md section
   5), and that is a deliberate exception, not drift.

   It was raised to 12px / 0.08em / weight 500 on 2026-08-19, on the strength
   of the scale alone, and the owner reverted it on sight the same day: "it's
   fine how it was before." The rule it appeared to break is a floor for text
   that has to be READ. This line is not read, it is glanced at: it sits under
   a name that has already told you who somebody is, and at this size it stays
   a texture rather than becoming a second line competing with the name above
   it. Anyone re-deriving this from the scale will arrive at 12px again, which
   is why the reasoning is written here rather than in a changelog. */
const META_CLASS =
  "text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";

type IdentityRowProps = {
  user: AvatarUser;
  name: ReactNode;
  meta?: ReactNode;
  avatarHref?: string;
  avatarLabel?: string;
  avatarSize?: AvatarSize;
  className?: string;
  avatarClassName?: string;
  avatarLinkClassName?: string;
  textClassName?: string;
  nameClassName?: string;
  metaClassName?: string;
};

/**
 * Shared geometry for horizontal identity rows. Callers can vary typography and
 * horizontal spacing, but the vertical-centering contract stays here.
 */
export function IdentityRow({
  user,
  name,
  meta,
  avatarHref,
  avatarLabel,
  avatarSize = "sm",
  className,
  avatarClassName,
  avatarLinkClassName,
  textClassName,
  nameClassName,
  metaClassName,
}: IdentityRowProps) {
  const avatar = (
    <BirdAvatar
      user={user}
      size={avatarSize}
      className={avatarClassName}
    />
  );

  return (
    <div className={cn("flex min-w-0 gap-3", className, "items-center")}>
      {avatarHref ? (
        <Link
          href={avatarHref}
          aria-label={avatarLabel ?? user.name ?? "Member profile"}
          className={cn(
            "inline-flex shrink-0 rounded-full transition-opacity duration-150 hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            avatarLinkClassName
          )}
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div
        className={cn("flex min-w-0 flex-col", textClassName, "justify-center")}
        style={{
          gap: IDENTITY_STACK_GAP_PX,
          transform: `translateY(${IDENTITY_COPY_NUDGE_Y_PX}px)`,
        }}
      >
        {/* overflow-y-visible fights a real clip: `truncate` callers (admin's
            person row, at least) bring `overflow: hidden` for the ellipsis,
            and at `leading-none` (line-height: 1) Source Sans's descenders
            -- the tail of a g, y, p, j, q -- sit below that line box. Paired
            with overflow-hidden that shaved the bottom off exactly the
            emails containing one of those letters and nothing else (owner,
            2026-08-22: "the bottom half of some people's emails getting cut
            off ... it's as if there's a rectangle put over it"). Splitting
            the axis keeps the ellipsis: text-overflow only ever needed the
            horizontal axis clipped to fire.

            CLIP, not hidden, and that is the whole of it. `overflow-y:
            visible` beside `overflow-x: hidden` is not a state CSS has: one
            axis visible and the other hidden computes the visible one to
            AUTO (CSS Overflow 3, section 3). So every name and byline in the
            app became a scroll container one pixel taller than itself -- and
            an engine that draws classic scrollbars rather than overlay ones
            painted a stepper inside the row. Reported on Android as "two
            toggle things ... click the lower button it moves the spacing up"
            (2026-08-27): a real scrollbar, scrolling a real 1px overflow.
            `clip` is exempt from that rule, so the pair survives as written
            and nothing scrolls. Measured before and after in
            chrome-devtools; pinned by identity-row-overflow-rule.test.mjs.

            `descender-room` is the second guard, for what the axis split
            cannot reach: a caller's own clipping child inside `name` (the
            feed rail's truncating Link), and any engine that treats a
            one-axis clip as both. See tailwind-theme.css. */}
        <div className={cn(nameClassName, "descender-room min-w-0 overflow-x-clip overflow-y-visible leading-none")}>
          {name}
        </div>
        {meta ? (
          <div
            className={cn(META_CLASS, metaClassName, "descender-room min-w-0 overflow-x-clip overflow-y-visible leading-none")}
          >
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * IdentityRow before its person arrives, for the skeletons that draw one.
 *
 * Here rather than in each skeleton so the two cannot drift: the same avatar
 * size, the name's line box over the byline's 10.5px one, IDENTITY_STACK_GAP_PX
 * apart and centred on the avatar, which is exactly the stack the real row
 * builds. `nameSize` is the name's font size, because every caller sets the
 * name at `leading-none` and its line box is therefore the size itself (14px
 * on a post, 13.5px in the feed rail).
 */
export function IdentityRowSkeleton({
  avatarSize = "sm",
  nameSize = 14,
  metaSize = 10.5,
  nameWidth = "w-28",
  metaWidth = "w-20",
  className,
}: {
  avatarSize?: keyof typeof SIZE_TOKENS;
  nameSize?: number;
  /** The byline's size, which is its line box for the same reason: 10.5px
   *  by default, 12.5px where admin sets an email under the name. */
  metaSize?: number;
  nameWidth?: string;
  metaWidth?: string;
  className?: string;
}) {
  const disc = SIZE_TOKENS[avatarSize];
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="skeleton-warm shrink-0 rounded-full" style={{ width: disc, height: disc }} />
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: IDENTITY_STACK_GAP_PX }}>
        <div className="flex items-center" style={{ height: nameSize }}>
          <div className={cn("skeleton-warm h-2.5 max-w-full rounded-md", nameWidth)} />
        </div>
        <div className="flex items-center" style={{ height: metaSize }}>
          <div className={cn("skeleton-warm h-2 max-w-full rounded-md", metaWidth)} />
        </div>
      </div>
    </div>
  );
}
