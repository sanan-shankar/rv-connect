import { IdentityRowSkeleton } from "@/components/common/identity-row";

/* The reading page runs an auth check, a post fetch, an audience check and a
   view record before it can paint. Without this the member sat on the letters
   index staring at nothing while all four happened (audit M06). Shaped like
   the letter itself, so the wait reads as the page arriving rather than as a
   different screen.

   Line for line off page.tsx and letter-title.tsx, inside the article's own
   680px reading measure (without it the lines were laid out 88px wider than
   the prose that replaced them): the 20px back link and its 24px margin; the
   kicker's 16px row; the title's line at leading-tight, 37.5px on a phone and
   45px from sm; the byline 20px under it, a 64px bird with the name's 16px
   line over the date's; and the body 28px under that, in the body's own 28.8px
   line boxes (16px at leading 1.8), a blank line between paragraphs exactly as
   the prose sets them.

   The title is TWO lines on a phone and one from sm, which is the letter
   rather than a guess at it: at 30px bold a 350px column holds about sixteen
   characters, so nearly every title wraps there, and at 36px across 680 nearly
   none do. Drawn as one line on a phone, the skeleton put the byline 37px above
   where it lands. The cinnamon rule under the title is not drawn: it grows in
   on arrival, and a stand-in for it would vanish and redraw. */
export default function LetterLoading() {
  return (
    <div className="mx-auto w-full max-w-[680px]">
      <div className="mb-6 flex h-5 items-center">
        <div className="skeleton-warm h-3 w-[78px] rounded-md" />
      </div>
      <div className="flex h-4 items-center">
        <div className="skeleton-warm h-2.5 w-36 rounded-md" />
      </div>
      <div className="mt-2">
        <div className="flex h-[37.5px] items-center sm:h-[45px]">
          <div className="skeleton-warm h-6 w-full rounded-md sm:h-7 sm:w-4/5" />
        </div>
        <div className="flex h-[37.5px] items-center sm:hidden">
          <div className="skeleton-warm h-6 w-1/2 rounded-md" />
        </div>
      </div>
      <IdentityRowSkeleton className="mt-5" avatarSize="md" nameSize={16} nameWidth="w-32" metaWidth="w-36" />
      {/* Uneven widths on the last line of each paragraph: a stack of
          identical full-width bars reads as a table, not as prose. */}
      <div className="mt-7">
        {PARAGRAPHS.map((tail, p) => (
          <div key={p} className={p > 0 ? "mt-[28.8px]" : undefined}>
            {Array.from({ length: tail.lines }, (_, i) => (
              <div key={i} className="flex h-[28.8px] items-center">
                <div className={`skeleton-warm h-3 rounded-md ${i === tail.lines - 1 ? tail.width : "w-full"}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const PARAGRAPHS = [
  { lines: 2, width: "w-3/5" },
  { lines: 4, width: "w-11/12" },
  { lines: 5, width: "w-2/3" },
  { lines: 3, width: "w-4/5" },
];
