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
        <div className="skeleton-warm h-10 w-32 rounded-md" />
        <div className="skeleton-warm h-10 w-[150px] rounded-full" />
      </header>

      <div className="space-y-5">
        <div className="rounded-[var(--radius)] border border-border bg-card p-6">
          <div className="skeleton-warm h-20 w-full rounded-md" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-5">
              <div className="skeleton-warm h-3 w-20 rounded-md" />
              <div className="skeleton-warm mt-3 h-6 w-3/4 rounded-md" />
              <div className="skeleton-warm mt-2 h-4 w-full rounded-md" />
              <div className="skeleton-warm mt-1 h-4 w-1/2 rounded-md" />
              <div className="mt-3.5 flex items-center gap-2.5">
                <div className="skeleton-warm h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <div className="skeleton-warm h-3 w-24 rounded-md" />
                  <div className="skeleton-warm h-3 w-32 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
