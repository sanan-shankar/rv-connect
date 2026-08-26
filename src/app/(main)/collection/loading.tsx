export default function CollectionLoading() {
  return (
    <div>
      <header className="mb-6">
        <div className="skeleton-warm h-8 w-64 rounded-md" />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="skeleton-warm aspect-square rounded-[var(--radius)]" />
        ))}
      </div>
    </div>
  );
}
