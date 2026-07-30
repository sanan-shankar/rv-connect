export default function RoundLoading() {
  return (
    <div className="pb-4">
      {/* Masthead skeleton. It sits in the shell's own gutter, matching
          RoundMasthead: no full-bleed negative margins, so nothing runs
          flush against the sidebar. */}
      <div className="border-b border-border pb-[var(--space-l)]">
        <div className="skeleton-warm h-9 w-2/3 max-w-md rounded-md" />
        <div className="skeleton-warm mt-3 h-4 w-52 rounded-md" />
        <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-x-[var(--space-s)] gap-y-[var(--space-xs)]">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-warm h-7 w-7 rounded-full" />
            ))}
          </div>
          <div className="skeleton-warm h-4 w-40 rounded-md" />
        </div>
      </div>

      <div className="mt-[var(--space-l)] grid grid-cols-1 gap-x-[30px] gap-y-[var(--space-xl)] lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 space-y-[var(--space-xl)]">
          {[1, 2].map((section) => (
            <div key={section}>
              <div className="skeleton-warm h-3 w-6 rounded-full" />
              <div className="skeleton-warm mt-2 h-7 w-3/4 rounded-md" />
              <div className="mt-[var(--space-l)] space-y-[var(--space-l)]">
                {[1, 2].map((card) => (
                  <div
                    key={card}
                    className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="skeleton-warm h-10 w-10 rounded-full" />
                      <div className="space-y-1.5">
                        <div className="skeleton-warm h-3 w-24 rounded-md" />
                        <div className="skeleton-warm h-2.5 w-16 rounded-md" />
                      </div>
                    </div>
                    <div className="skeleton-warm mt-4 h-4 w-full rounded-md" />
                    <div className="skeleton-warm mt-1.5 h-4 w-5/6 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="skeleton-warm h-3 w-20 rounded-full" />
          <div className="mt-4 space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-warm h-3 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
