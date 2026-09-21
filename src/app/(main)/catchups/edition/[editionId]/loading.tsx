import { LoveAndCommentsSkeleton } from "@/components/posts/post-card-skeleton";

/* ------------------------------------------------------------------ *
 *  The shape the reader arrives in.
 *
 *  It mirrors `components/catchups/edition/reader.tsx` at all three
 *  widths, because a holding scene that draws a different page is worse
 *  than none: the eye settles on a layout and then everything moves.
 *
 *  Every number is that file's, reader-parts.tsx's and navigator.tsx's.
 *  The page: the phone's 44px strip welded under the green bar and its
 *  64px spacer, the laptop's 30px name and the date under it from 1180,
 *  the 280px rail from 1180px up, 60px between questions on a phone and
 *  72 on a laptop, and the same middle-range bounding, because Tailwind
 *  emits `md:` after `min-[1180px]:` and an unbounded `md:` rule wins at
 *  1440. A question: the cinnamon mark, the heading's 28.8px line (24px
 *  at 1.2) -- TWO of them on a phone, where a question is nearly always
 *  longer than the 27 characters a line holds, and one on a laptop -- the
 *  asker's line, then the answers 16px under it. An answer: the bird,
 *  flush in its 40px box, and the name's 17px line, the words in their
 *  24.8px line boxes (15.5px at 1.6), the heart and the comments in their
 *  32px row. The rail: the
 *  2px spine, and each question's rows at 14px serif on 18.9px, 11px of
 *  air above and below, one to three lines as the real ones are.
 *
 *  Warm shimmer, never a grey pulse (CLAUDE.md).
 * ------------------------------------------------------------------ */
export default function EditionLoading() {
  return (
    <div className="relative -m-5 md:m-0">
      {/* The strip, welded under the green bar. A phone only: on a laptop it
          is invisible until you have scrolled past the first question, so
          there is nothing to hold a place for. */}
      <div className="absolute inset-x-0 top-0 flex min-h-[44px] items-center border-b border-border bg-card/90 px-5 md:hidden">
        <div className="skeleton-warm h-3 w-[82px] rounded-md" />
      </div>

      <div className="grid grid-cols-1 items-start min-[1180px]:grid-cols-[minmax(0,1fr)_280px] min-[1180px]:gap-x-[48px]">
        <div className="min-w-0 px-5 md:max-w-[900px] md:px-0">
          <div className="max-md:h-16" />

          {/* The name and its date. Only a laptop draws them; on a phone the
              green bar has the name and the strip has the date. */}
          <div className="hidden md:block">
            <div className="flex h-9 items-center">
              <div className="skeleton-warm h-6 w-48 rounded-md" />
            </div>
            <div className="mt-2.5 hidden h-[21px] items-center min-[1180px]:flex">
              <div className="skeleton-warm h-3 w-24 rounded-md" />
            </div>
          </div>

          <div className="space-y-[60px] pb-16 md:space-y-[72px] md:max-[1179px]:pt-9 md:pb-20 min-[1180px]:pt-6">
            {SECTIONS.map((answers, s) => (
              <div key={s}>
                <div className="skeleton-warm h-[2px] w-8 rounded-full" />
                <div className="mt-3">
                  <div className="flex h-[28.8px] items-center">
                    <div className="skeleton-warm h-5 w-full rounded-md md:w-3/5" />
                  </div>
                  <div className="flex h-[28.8px] items-center md:hidden">
                    <div className="skeleton-warm h-5 w-2/5 rounded-md" />
                  </div>
                </div>
                <div className="mt-2 flex h-[20.25px] items-center">
                  <div className="skeleton-warm h-2.5 w-40 rounded-md" />
                </div>
                <div className="mt-4 space-y-3">
                  {answers.map((lines, a) => (
                    <div
                      key={a}
                      className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card"
                    >
                      <div className="px-4 pt-3.5 md:px-5 md:pt-4">
                        {/* FlushAvatar: a bird's ink is about 32px of its 40px
                            box, slid flush left, with the slack given back so
                            the name sits 12px from the ink. */}
                        <div className="flex items-center gap-3">
                          <div className="-mr-2 flex size-10 shrink-0 items-center">
                            <div className="skeleton-warm size-8 rounded-full" />
                          </div>
                          <div className="flex h-[17px] items-center">
                            <div className="skeleton-warm h-3 w-32 rounded-md" />
                          </div>
                        </div>
                        <div className="mt-2.5">
                          {Array.from({ length: lines }, (_, i) => (
                            <div key={i} className="flex h-[24.8px] items-center">
                              <div
                                className={`skeleton-warm h-3 rounded-md ${i === lines - 1 ? "w-2/3" : "w-full"}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="px-4 pb-1.5 pt-1 md:px-5 md:pb-2 md:pt-1.5">
                        <div className="-ml-2.5 flex h-8 items-center gap-1">
                          <LoveAndCommentsSkeleton />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The question list, which only exists where there is room for it. */}
        <aside className="hidden self-start min-[1180px]:block">
          <div className="relative">
            <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[2px] rounded-full bg-border" />
            {RAIL.map((lines, i) => (
              <div key={i} className="py-[11px] pl-[22px] pr-5">
                {Array.from({ length: lines }, (_, l) => (
                  <div key={l} className="flex h-[18.9px] items-center">
                    <div className={`skeleton-warm h-2.5 rounded-md ${l === lines - 1 ? "w-3/5" : "w-full"}`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* Two questions, their answers' line counts. */
const SECTIONS = [
  [3, 4],
  [2, 3],
];
/* The rail's questions, in lines. */
const RAIL = [2, 3, 3, 2, 2, 3];
