import { LoadingCompanion } from "@/components/mascot/moments/loading-companion";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <LoadingCompanion />
      <div className="skeleton-warm h-9 w-40 rounded-md" />

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="skeleton-warm h-20 w-20 rounded-full" />
          <div className="skeleton-warm h-9 w-32 rounded-full" />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton-warm h-3 w-24 rounded-md" />
            <div className="skeleton-warm h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
