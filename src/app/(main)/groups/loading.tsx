import { LoadingCompanion } from "@/components/mascot/moments/loading-companion";

export default function GroupsLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      <LoadingCompanion />
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="skeleton-warm h-8 w-32 rounded-md" />
          <div className="skeleton-warm h-4 w-72 rounded-md" />
        </div>
        <div className="skeleton-warm h-10 w-32 shrink-0 rounded-full" />
      </header>

      <div className="space-y-3">
        <div className="skeleton-warm h-3 w-24 rounded-md" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="skeleton-warm h-12 w-12 rounded-full" />
              <div className="skeleton-warm mt-3 h-5 w-32 rounded-md" />
              <div className="skeleton-warm mt-2 h-4 w-full rounded-md" />
              <div className="skeleton-warm mt-1 h-4 w-2/3 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-9 space-y-3">
        <div className="skeleton-warm h-3 w-40 rounded-md" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="skeleton-warm h-12 w-12 rounded-full" />
              <div className="skeleton-warm mt-3 h-5 w-32 rounded-md" />
              <div className="skeleton-warm mt-2 h-4 w-full rounded-md" />
              <div className="skeleton-warm mt-1 h-4 w-2/3 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
