/* ------------------------------------------------------------------ *
 *  /lab loading state, and every room under it (no deeper loading.tsx
 *  exists, so this is the boundary for the whole tree).
 *
 *  This is a reliability fix, not decoration: the lab tree is ~28k
 *  lines of TSX and rooms compile on demand in dev, so before this
 *  boundary existed a first click on a heavy room painted NOTHING for
 *  seconds and read as "the lab doesn't load" (the owner's 60%
 *  complaint). The skeleton mirrors the index's own shape so /lab
 *  lands where the shimmer stood; for rooms it is simply an instant,
 *  honest "something is coming".
 *
 *  The index line for line (_lab-client.tsx): the eyebrow, the 34px
 *  title, the three lines the intro wraps to in its 62ch measure; the
 *  Active/Archived pill and the search field as their own boxes; then a
 *  group's label and its cards three up, each a title, a note and the
 *  address line along the foot. Placeholders, not the words: the index
 *  rises in on arrival, and drawn words would vanish and rise in again.
 * ------------------------------------------------------------------ */
export default function LabLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8 sm:py-12">
        <div className="flex h-[16.5px] items-center">
          <div className="skeleton-warm h-2 w-14 rounded-md" />
        </div>
        <div className="mt-2 flex h-[34px] items-center">
          <div className="skeleton-warm h-6 w-16 rounded-md" />
        </div>
        <div className="mt-3 max-w-[62ch]">
          {["w-full", "w-full", "w-2/5"].map((w, i) => (
            <div key={i} className="flex h-[25.5px] items-center">
              <div className={`skeleton-warm h-3 rounded-md ${w}`} />
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="skeleton-warm inline-flex items-center gap-1 rounded-full border border-transparent p-1">
            {["Active 00", "Archived 00"].map((label) => (
              <span key={label} className="invisible rounded-full px-4 py-1.5 text-[13px] font-semibold">
                {label}
              </span>
            ))}
          </div>
          <div className="skeleton-warm h-10 min-w-[240px] flex-1 rounded-full sm:max-w-sm" />
        </div>

        <div className="mt-9">
          <div className="flex h-[19.5px] items-center">
            <div className="skeleton-warm h-2.5 w-20 rounded-md" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[4, 3, 5, 3, 4, 3].map((lines, i) => (
              <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-[18px]">
                <div className="flex h-[22.7px] items-center pr-9">
                  <div className="skeleton-warm h-3.5 w-3/5 rounded-md" />
                </div>
                <div className="mt-2">
                  {Array.from({ length: lines }, (_, l) => (
                    <div key={l} className="flex h-[20.15px] items-center">
                      <div className={`skeleton-warm h-2.5 rounded-md ${l === lines - 1 ? "w-1/2" : "w-full"}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 flex items-center justify-between">
                  <div className="skeleton-warm h-2 w-24 rounded-md" />
                  <div className="skeleton-warm h-2.5 w-10 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
