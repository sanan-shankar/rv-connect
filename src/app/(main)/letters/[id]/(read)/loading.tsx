/* The reading page runs an auth check, a post fetch, an audience check and a
   view record before it can paint. Without this the member sat on the letters
   index staring at nothing while all four happened (audit M06). Shaped like
   the letter itself, so the wait reads as the page arriving rather than as a
   different screen: the measure, the 40px title with its cinnamon rule and
   the 64px bird on the byline, all off page.tsx. The hairline that used to
   close the byline band went on 2026-09-16; it goes from both files or the
   skeleton draws a line the letter then removes on arrival. */
export default function LetterLoading() {
  return (
    /* The article's own reading measure (page.tsx: 680px inside the 768px
       column). Without it the skeleton laid its lines out 88px wider than the
       prose that replaced them, and every one of them moved on arrival. */
    <div className="mx-auto w-full max-w-[680px]">
      <div className="skeleton-warm h-5 w-28 rounded-md" />
      <header className="mt-6">
        <div className="skeleton-warm h-3 w-32 rounded-md" />
        <div className="skeleton-warm mt-2 h-10 w-4/5 rounded-md" />
        <div className="skeleton-warm mt-2 h-[2px] w-24 rounded-sm" />
        <div className="mt-5 flex items-center gap-3">
          <div className="skeleton-warm h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton-warm h-3.5 w-32 rounded-md" />
            <div className="skeleton-warm h-3 w-40 rounded-md" />
          </div>
        </div>
      </header>
      {/* Uneven widths on the last line of each block: a stack of identical
          full-width bars reads as a table, not as prose. The 28px rhythm is
          the body's own (16px at leading 1.8). */}
      <div className="mt-7 space-y-7">
        {["w-full", "w-11/12", "w-full", "w-4/5"].map((tail, i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton-warm h-4 w-full rounded-md" />
            <div className="skeleton-warm h-4 w-full rounded-md" />
            <div className={`skeleton-warm h-4 rounded-md ${tail}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
