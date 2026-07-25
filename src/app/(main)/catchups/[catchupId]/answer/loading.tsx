export default function AnswerLoading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <div className="skeleton-warm h-3.5 w-40 rounded-full" />
        <div className="skeleton-warm h-8 w-52 rounded-md" />
      </div>

      <div className="skeleton-warm mb-[var(--space-l)] h-4 w-56 rounded-full" />

      <div className="grid grid-cols-1 gap-[var(--space-xl)] lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-7 space-y-[var(--space-m)]">
            <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
              <div className="flex items-center gap-3.5">
                <div className="skeleton-warm h-11 w-11 rounded-full" />
                <div className="space-y-1.5">
                  <div className="skeleton-warm h-3.5 w-24 rounded-md" />
                  <div className="skeleton-warm h-3 w-32 rounded-md" />
                </div>
              </div>
            </div>
            <div className="space-y-1 rounded-[var(--radius)] border border-border bg-card p-[var(--space-s)]">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
                  <div className="skeleton-warm mt-0.5 h-4 w-4 shrink-0 rounded-full" />
                  <div className="skeleton-warm h-3 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:p-[var(--space-l)]">
            <div className="skeleton-warm h-8 w-3/4 rounded-md" />
            <div className="skeleton-warm mt-[var(--space-m)] h-[168px] w-full rounded-[var(--radius-input)]" />
            <div className="mt-[var(--space-m)] flex gap-2.5">
              <div className="skeleton-warm h-20 w-20 rounded-[var(--radius-md)]" />
              <div className="skeleton-warm h-20 w-20 rounded-[var(--radius-md)]" />
            </div>
            <div className="mt-[var(--space-m)] flex items-center justify-between border-t border-border/70 pt-[var(--space-m)]">
              <div className="skeleton-warm h-3 w-16 rounded-full" />
              <div className="skeleton-warm h-10 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
