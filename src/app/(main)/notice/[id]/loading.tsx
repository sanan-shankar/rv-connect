/* /notice/<id> resolves a legacy notice into an admin thread before it can
   redirect, which is a read and sometimes a write (audit M06). Nothing here
   is ever on screen for long, so it is one calm block rather than a mock of a
   page the visitor is about to leave. */
export default function NoticeLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-3 py-10">
      <div className="skeleton-warm h-6 w-40 rounded-md" />
      <div className="skeleton-warm h-4 w-full rounded-md" />
      <div className="skeleton-warm h-4 w-3/4 rounded-md" />
    </div>
  );
}
