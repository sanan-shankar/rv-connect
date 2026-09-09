/* ------------------------------------------------------------------ *
 *  The shape the reader arrives in.
 *
 *  It mirrors `components/catchups/edition/reader.tsx` at all three
 *  widths, because a holding scene that draws a different page is worse
 *  than none: the eye settles on a layout and then everything moves. The
 *  numbers here are that file's -- the strip's 44px, the phone's 20px
 *  gutter, the 280px rail from 1180px up, 60px between questions on a
 *  phone and 72 on a laptop -- and the same middle-range bounding, because
 *  Tailwind emits `md:` after `min-[1180px]:` and an unbounded `md:` rule
 *  wins at 1440.
 *
 *  Warm shimmer, never a grey pulse (CLAUDE.md).
 * ------------------------------------------------------------------ */
export default function EditionLoading() {
  return (
    <div className="relative -m-5 md:m-0">
      {/* The strip, welded under the green bar. A phone only: on a laptop it
          is invisible until you have scrolled past the first question, so
          there is nothing to hold a place for. */}
      <div className="absolute inset-x-0 top-0 border-b border-border bg-card/90 px-5 py-2.5 md:hidden">
        <div className="skeleton-warm h-[19px] w-40 rounded-md" />
      </div>

      <div className="grid grid-cols-1 items-start min-[1180px]:grid-cols-[minmax(0,1fr)_280px] min-[1180px]:gap-x-[48px]">
        <div className="min-w-0 px-5 md:max-w-[900px] md:px-0">
          <div className="max-md:h-16" />

          {/* The name and its date. Only a laptop draws them; on a phone the
              green bar has the name and the strip has the date. */}
          <div className="hidden md:block">
            <div className="skeleton-warm h-9 w-64 rounded-md" />
            <div className="skeleton-warm mt-2.5 hidden h-[21px] w-36 rounded-md min-[1180px]:block" />
          </div>

          <div className="space-y-[60px] pb-16 md:space-y-[72px] md:max-[1179px]:pt-9 md:pb-20 min-[1180px]:pt-6">
            {[1, 2].map((section) => (
              <div key={section}>
                {/* The cinnamon mark, the heading, then the tiles. */}
                <div className="skeleton-warm h-[2px] w-8 rounded-full" />
                <div className="skeleton-warm mt-3 h-[29px] w-4/5 rounded-md md:max-w-[26ch]" />
                <div className="skeleton-warm mt-2 h-[18px] w-32 rounded-md" />
                <div className="mt-4 space-y-3">
                  {[1, 2].map((card) => (
                    <div
                      key={card}
                      className="card-elevated rounded-[var(--radius)] border border-border bg-card px-4 pb-1.5 pt-3.5 md:px-5 md:pb-2 md:pt-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="skeleton-warm h-10 w-10 rounded-full" />
                        <div className="skeleton-warm h-[17px] w-32 rounded-md" />
                      </div>
                      <div className="skeleton-warm mt-2.5 h-4 w-full rounded-md" />
                      <div className="skeleton-warm mt-2 h-4 w-11/12 rounded-md" />
                      <div className="skeleton-warm mt-2 h-4 w-2/3 rounded-md" />
                      <div className="skeleton-warm mb-1 mt-3 h-8 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The question list, which only exists where there is room for it. */}
        <aside className="hidden self-start min-[1180px]:block">
          <div className="relative space-y-[22px] py-[11px] pl-[22px]">
            <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[2px] rounded-full bg-border" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-warm h-[19px] rounded-md" style={{ width: `${90 - i * 6}%` }} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
