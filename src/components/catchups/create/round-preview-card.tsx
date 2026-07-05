/* ------------------------------------------------------------------ *
 *  <RoundPreviewCard> — the create flow's right column: a live preview
 *  of Round 1 (spec 3.2) so the setup sheet never feels like an empty
 *  form in a void. Purely presentational; the parent form re-renders
 *  it on every state change.
 *
 *  Rendered inside the "use client" `CreateCatchupForm`, so this file
 *  is part of the client bundle too. It takes the already-resolved
 *  `cadenceLabel` string rather than importing `CADENCE_LABELS` from
 *  `@/lib/catchups` itself, because that module also drags in the
 *  server-only Prisma `pg` driver (see cadence-control.tsx).
 * ------------------------------------------------------------------ */

export function RoundPreviewCard({
  groupName,
  cadenceLabel,
  seedPrompts,
}: {
  groupName: string;
  cadenceLabel: string;
  seedPrompts: { text: string }[];
}) {
  return (
    <div className="card-elevated sticky top-7 rounded-[var(--radius)] border border-border bg-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-leaf">Preview</p>
      <h3 className="mt-1.5 font-heading text-lg font-semibold tracking-tight text-foreground">
        Round 1 &middot; {groupName}
      </h3>
      <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
        {cadenceLabel} rhythm
      </p>

      <div className="mt-4 space-y-2.5">
        {seedPrompts.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border p-3 text-[13px] text-muted-foreground">
            Add a question to see it here.
          </p>
        ) : (
          seedPrompts.map((p, i) => (
            <div
              key={`${p.text}-${i}`}
              className="rounded-[var(--radius-md)] border border-border/70 bg-background/50 p-3"
            >
              <p className="text-[13.5px] leading-relaxed text-foreground">{p.text}</p>
            </div>
          ))
        )}
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
        Members will add their own questions once this opens.
      </p>
    </div>
  );
}
