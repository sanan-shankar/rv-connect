export default function MessagesLoading() {
  return (
    <div>
      <header className="mb-6 space-y-2.5">
        <div className="skeleton-warm h-8 w-64 rounded-md" />
        <div className="skeleton-warm h-4 w-80 rounded-md" />
      </header>

      <div className="mb-8 rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
        <div className="skeleton-warm h-[76px] w-full rounded-xl" />
        <div className="mt-3 flex items-center gap-2">
          <div className="skeleton-warm h-7 w-32 rounded-full" />
          <div className="skeleton-warm h-7 w-20 rounded-full" />
          <div className="skeleton-warm ml-auto h-9 w-24 rounded-full" />
        </div>
      </div>

      <div className="skeleton-warm mb-3 h-3 w-36 rounded-md" />
      <div className="flex flex-col gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-warm h-[104px] w-full rounded-[var(--radius)]" />
        ))}
      </div>
    </div>
  );
}
