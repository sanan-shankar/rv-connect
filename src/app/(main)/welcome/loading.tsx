export default function WelcomeLoading() {
  return (
    <div className="mx-auto w-full max-w-[440px] space-y-6 py-10">
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-warm h-2 w-2 rounded-full" />
        ))}
      </div>
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="skeleton-warm mx-auto h-16 w-16 rounded-full" />
        <div className="skeleton-warm mx-auto h-6 w-48 rounded-md" />
        <div className="skeleton-warm mx-auto h-4 w-64 rounded-md" />
        <div className="skeleton-warm h-10 w-full rounded-full" />
      </div>
    </div>
  );
}
