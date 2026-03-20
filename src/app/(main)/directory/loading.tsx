import { Skeleton } from "@/components/ui/skeleton";

export default function DirectoryLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      <Skeleton className="mb-6 h-9 w-48" />
      <Skeleton className="mb-3 h-10 w-full" />
      <div className="mb-6 flex gap-3">
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[160px]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col items-center">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="mt-3 h-5 w-24" />
              <Skeleton className="mt-1 h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
