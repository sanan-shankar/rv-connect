export default function DirectoryLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="skeleton-warm mb-6 h-9 w-48 rounded-md" />
      <div className="skeleton-warm mb-3 h-10 w-full rounded-md" />
      <div className="mb-6 flex gap-3">
        <div className="skeleton-warm h-10 w-[140px] rounded-md" />
        <div className="skeleton-warm h-10 w-[140px] rounded-md" />
        <div className="skeleton-warm h-10 w-[160px] rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col items-center">
              <div className="skeleton-warm h-16 w-16 rounded-full" />
              <div className="skeleton-warm mt-3 h-5 w-24 rounded-md" />
              <div className="skeleton-warm mt-1 h-4 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
