export default function LettersLoading() {
  return (
    <div>
      {/* PageHeader's own shape (title left, one canopy button right) --
          a lone title bar with nothing opposite it left this looking like a
          much smaller header than the one it flashes into, which is what
          read as "so tiny" (owner, 2026-08-29). Same fix as directory's
          skeleton: match the real control's height and rough width rather
          than a single generic bar. */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="skeleton-warm h-10 w-28 rounded-md" />
        <div className="skeleton-warm h-10 w-32 rounded-full" />
      </header>

      {/* No drafts card here. DraftsStrip returns null for anyone with no
          drafts, which is nearly everyone, so shimmering a box above the
          letters promised a surface that then vanished on arrival. A skeleton
          draws what is always there. */}
      {/* Each card carries the real one's measurements (page.tsx): p-5, the
          kicker, a 24px title at leading-snug, the two-line clamp of the
          opening at leading-relaxed, then the byline. 202px against the 208
          it lands at. */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
            <div className="skeleton-warm h-3.5 w-20 rounded-md" />
            <div className="skeleton-warm mt-2 h-8 w-3/4 rounded-md" />
            <div className="mt-2 space-y-3.5">
              <div className="skeleton-warm h-4 w-full rounded-md" />
              <div className="skeleton-warm h-4 w-11/12 rounded-md" />
            </div>
            <div className="mt-3.5 flex items-center gap-2.5">
              <div className="skeleton-warm h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <div className="skeleton-warm h-3 w-24 rounded-md" />
                <div className="skeleton-warm h-3 w-32 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
