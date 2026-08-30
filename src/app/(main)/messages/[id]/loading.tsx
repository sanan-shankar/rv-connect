/* The real thread (page.tsx) is a plain block at the centered column's full
   768px, and this drew it at max-w-2xl -- so the card narrowed by 96px the
   instant it arrived. It also carried auto side margins with no `w-full`,
   which in a flex column means shrink-to-fit rather than stretch, so it never
   reached even the 672 it asked for. */
export default function ThreadLoading() {
  return (
    <div>
      <div className="skeleton-warm mb-6 h-5 w-36 rounded-md" />

      <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="flex items-center gap-3 bg-canopy px-5 py-4 sm:px-6 sm:py-5">
          <div className="size-9 shrink-0 rounded-full bg-white/15" />
          <div className="h-4 w-56 rounded-md bg-white/15" />
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton-warm size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton-warm h-3.5 w-40 rounded-md" />
                <div className="skeleton-warm h-16 w-full rounded-[var(--radius)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
