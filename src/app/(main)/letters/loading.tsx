export default function LettersLoading() {
  return (
    <div>
      <header className="mb-6 space-y-2">
        <div className="skeleton-warm h-8 w-32 rounded-md" />
        <div className="skeleton-warm h-4 w-80 rounded-md" />
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
