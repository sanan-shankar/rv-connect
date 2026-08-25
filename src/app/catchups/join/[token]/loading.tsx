import Link from "next/link";
import { Wordmark } from "@/components/layout/peaks-mark";

/* The invite link's first paint.
 *
 * This route sits OUTSIDE the (main) group, so none of the Catch-up loading
 * boundaries reach it, and there is no static shell either -- every page
 * renders dynamically for the theme cookie. Without this, a stranger opening a
 * forwarded link on a cold function watched a blank tab for the whole invite
 * lookup, on the one page whose entire job is a first impression on somebody
 * who may not even have an account (audit C-139).
 *
 * The frame is the page's own `Shell`, mark and all -- the wordmark needs no
 * data, so it is real from the first frame -- and each block below is the real
 * element's own height: the 44px keeper avatar and its two 15px/snug lines,
 * the 28px heading, the three lines the explanatory paragraph wraps to at this
 * width, and the two stacked h-11 buttons that both the signed-in and
 * signed-out branches render. So the card is the size it will be, and nothing
 * moves when the invitation lands. */
export default function JoinCatchupLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-[var(--space-l)] py-[var(--space-xl)]">
      <Link
        href="/"
        className="mb-[var(--space-l)] inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Wordmark />
      </Link>
      <div className="card-elevated w-full max-w-[420px] rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
        {/* "<keeper> invited you to a Catch-up": 44px avatar, two 15px/snug
            lines. Each bar sits inside its real LINE BOX rather than being
            sized to the glyphs, so the block is the height the text will be. */}
        <div className="mb-5 flex items-center gap-3">
          <div className="skeleton-warm h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="flex h-[21px] items-center">
              <div className="skeleton-warm h-[13px] w-44 rounded-md" />
            </div>
            <div className="flex h-[21px] items-center">
              <div className="skeleton-warm h-[13px] w-24 rounded-md" />
            </div>
          </div>
        </div>
        {/* The Catch-up's name, in the h1's 28px/tight line box. */}
        <div className="flex h-[35px] items-center">
          <div className="skeleton-warm h-[24px] w-3/5 rounded-md" />
        </div>
        {/* "A Catch-up is a letter this group writes together...", each line in
            its real 15px/relaxed line box. It wraps to THREE at the card's full
            420px and to five on a phone, and 472px is where the card stops
            shrinking and the wrap settles -- measured, not guessed. The two
            extra lines therefore go away at exactly that width. */}
        <div className="mt-2">
          <div className="flex h-[24px] items-center">
            <div className="skeleton-warm h-[13px] w-full rounded-md" />
          </div>
          <div className="flex h-[24px] items-center">
            <div className="skeleton-warm h-[13px] w-full rounded-md" />
          </div>
          <div className="flex h-[24px] items-center min-[472px]:hidden">
            <div className="skeleton-warm h-[13px] w-full rounded-md" />
          </div>
          <div className="flex h-[24px] items-center min-[472px]:hidden">
            <div className="skeleton-warm h-[13px] w-full rounded-md" />
          </div>
          <div className="flex h-[24px] items-center">
            <div className="skeleton-warm h-[13px] w-4/5 rounded-md" />
          </div>
        </div>
        {/* Create an account / I already have one. */}
        <div className="mt-6 flex flex-col gap-2.5">
          <div className="skeleton-warm h-11 w-full rounded-full" />
          <div className="skeleton-warm h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
