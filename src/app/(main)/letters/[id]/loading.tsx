/* The reading page runs an auth check, a post fetch, an audience check and a
   view record before it can paint. Without this the member sat on the letters
   index staring at nothing while all four happened (audit M06). Shaped like
   the letter itself, so the wait reads as the page arriving rather than as a
   different screen. */
export default function LetterLoading() {
  return (
    <div>
      <div className="skeleton-warm h-4 w-28 rounded-md" />
      <header className="mt-6 space-y-3">
        <div className="skeleton-warm h-3 w-24 rounded-md" />
        <div className="skeleton-warm h-9 w-3/4 rounded-md" />
        <div className="flex items-center gap-2.5 pt-1">
          <div className="skeleton-warm h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <div className="skeleton-warm h-3.5 w-32 rounded-md" />
            <div className="skeleton-warm h-3 w-40 rounded-md" />
          </div>
        </div>
      </header>
      {/* Uneven widths on the last line of each block: a stack of identical
          full-width bars reads as a table, not as prose. */}
      <div className="mt-8 space-y-6">
        {["w-full", "w-11/12", "w-full", "w-4/5"].map((tail, i) => (
          <div key={i} className="space-y-2.5">
            <div className="skeleton-warm h-4 w-full rounded-md" />
            <div className="skeleton-warm h-4 w-full rounded-md" />
            <div className={`skeleton-warm h-4 rounded-md ${tail}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
