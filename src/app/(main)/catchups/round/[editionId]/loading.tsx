export default function RoundLoading() {
  return (
    <div className="pb-4">
      {/* Masthead band skeleton, matching RoundMasthead's full-bleed shape. */}
      <div className="-mx-5 border-b border-border/70 px-5 pb-9 pt-8 sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="skeleton-warm h-3 w-24 rounded-full" />
        <div className="skeleton-warm mt-4 h-9 w-2/3 max-w-md rounded-md" />
        <div className="skeleton-warm mt-3 h-4 w-40 rounded-md" />
        <div className="mt-8 flex gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-warm h-7 w-7 rounded-full" />
          ))}
        </div>
        <div className="skeleton-warm mt-3 h-4 w-56 rounded-md" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-[30px] gap-y-12 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 space-y-12">
          {[1, 2].map((section) => (
            <div key={section}>
              <div className="skeleton-warm h-3 w-6 rounded-full" />
              <div className="skeleton-warm mt-2 h-7 w-3/4 rounded-md" />
              <div className="mt-6 space-y-4">
                {[1, 2].map((card) => (
                  <div key={card} className="rounded-[var(--radius)] border border-border bg-card p-5">
                    <div className="flex items-center gap-2.5">
                      <div className="skeleton-warm h-9 w-9 rounded-full" />
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
