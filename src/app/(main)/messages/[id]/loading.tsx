import { ButtonSkeleton } from "@/components/common/skeleton";

/* A conversation before it arrives, at page.tsx's, conversation.tsx's and
   message-composer.tsx's own measurements.

   The thread is a plain block at the centered column's full 768px (it was
   once drawn at max-w-2xl, and narrowed by 96px the instant it arrived). The
   back link's 20px line and its 24px margin; the card's canopy header, drawn
   as itself because it is the card and not its contents, with the 36px mark
   and the subject's 17px bold line in white placeholders; then two messages
   the way a thread nearly always opens -- the member's question and the reply
   -- each a 36px bird beside the name's line and a bubble of 15px lines at
   1.7, 20px apart; the reply composer under its hairline, at the height its
   two-line field and its row come to; and the line under the card, which
   never changes, drawn as the words it is. */
export default function ThreadLoading() {
  return (
    <div>
      <div className="mb-6 flex h-5 items-center">
        <div className="skeleton-warm h-3 w-[132px] rounded-md" />
      </div>

      <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="flex items-center gap-3 bg-canopy px-5 py-4 sm:px-6 sm:py-5">
          <div className="size-9 shrink-0 rounded-full bg-white/15" />
          {/* The subject: two lines on a phone, where 254px of 17px bold
              serif holds about 26 characters and even "Notes from the
              admins" wraps; one from sm. */}
          <div className="min-w-0 flex-1">
            <div className="flex h-[21.25px] items-center">
              <div className="h-3.5 w-56 max-w-full rounded-md bg-white/15" />
            </div>
            <div className="flex h-[21.25px] items-center sm:hidden">
              <div className="h-3.5 w-24 rounded-md bg-white/15" />
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            {[2, 1].map((lines, i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton-warm size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex h-[20.25px] items-center">
                    <div className="skeleton-warm h-2.5 w-36 rounded-md" />
                  </div>
                  {/* The bubble shimmers whole: bars of mist inside a bubble
                      of mist would not show. Its height is its lines'. */}
                  <div
                    className="skeleton-warm mt-1.5 rounded-[var(--radius)] py-3"
                    style={{ height: 24 + lines * 25.5 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex gap-3">
              <div className="skeleton-warm mt-0.5 size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="skeleton-warm h-16 rounded-[var(--radius-input)]" />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="skeleton-warm inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium">
                    <span className="size-3.5" />
                    <span className="invisible">Screenshot</span>
                  </span>
                  <div className="ml-auto flex items-center gap-2.5">
                    <ButtonSkeleton size="sm" icon label="Reply" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[12.5px] text-muted-foreground">
        Only you and the admins can read this.
      </p>
    </div>
  );
}
