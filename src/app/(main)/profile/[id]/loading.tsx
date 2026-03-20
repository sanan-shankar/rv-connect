import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center sm:flex-row sm:items-start">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="mt-4 sm:ml-6 sm:mt-0">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-4 w-24" />
            <Skeleton className="mt-4 h-16 w-full max-w-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
