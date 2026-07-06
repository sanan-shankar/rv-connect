import { LoadingCompanion } from "@/components/mascot/moments/loading-companion";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <LoadingCompanion />
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center sm:flex-row sm:items-start">
          <div className="skeleton-warm h-24 w-24 rounded-full" />
          <div className="mt-4 sm:ml-6 sm:mt-0">
            <div className="skeleton-warm h-7 w-48 rounded-md" />
            <div className="skeleton-warm mt-2 h-4 w-24 rounded-md" />
            <div className="skeleton-warm mt-4 h-16 w-full max-w-sm rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
