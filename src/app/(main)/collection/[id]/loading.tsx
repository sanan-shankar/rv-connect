/* A photo page fetches the row, its uploader and its love count before it can
   paint, and the image itself is the slowest thing on it (audit M06). The tall
   block is the picture's own place held open, so the page does not jump when
   it arrives. */
export default function PhotoLoading() {
  return (
    <div>
      <div className="skeleton-warm h-4 w-32 rounded-md" />
      <div className="skeleton-warm mt-6 aspect-[4/3] w-full rounded-[var(--radius)]" />
      <div className="mt-5 space-y-3">
        <div className="skeleton-warm h-6 w-1/2 rounded-md" />
        <div className="skeleton-warm h-4 w-full rounded-md" />
        <div className="skeleton-warm h-4 w-2/3 rounded-md" />
        <div className="flex items-center gap-2.5 pt-1">
          <div className="skeleton-warm h-8 w-8 rounded-full" />
          <div className="skeleton-warm h-3.5 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}
