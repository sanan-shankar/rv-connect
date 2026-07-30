export default function SettingsLoading() {
  /* Mirrors the real page's shape: one 16px sheet with section-label bands
     and hairline field rows (the page is a single card now, not a stack of
     boxes), so the loaded page lands exactly where the skeleton stood. */
  return (
    <div className="space-y-6">
      <div className="skeleton-warm h-9 w-40 rounded-[var(--radius-input)]" />

      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card pb-4">
        {[0, 1, 2].map((section) => (
          <div key={section}>
            <div className={section === 0 ? "px-4 pb-2 pt-4" : "px-4 pb-2 pt-7"}>
              <div className="skeleton-warm h-3 w-20 rounded-[var(--radius-sm)]" />
            </div>
            <div className="divide-y divide-border">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-6 px-4 py-3.5">
                  <div className="skeleton-warm h-3.5 w-[140px] shrink-0 rounded-[var(--radius-sm)]" />
                  <div className="skeleton-warm h-10 w-full max-w-[280px] rounded-[var(--radius-input)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
