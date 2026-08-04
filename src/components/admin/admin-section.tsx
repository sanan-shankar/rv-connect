/* ------------------------------------------------------------------ *
 *  Admin panel furniture.
 *
 *  The panel is a TOOL, not a reading surface: the person looking at it wants
 *  to see how much is waiting and get through it, so density is the feature
 *  (owner, 2026-08-04: "everything in the admin panel ... can be more dense,
 *  very feature rich. So sparsely populated.").
 *
 *  The five sections used to open with `h2.mb-4.font-heading.text-xl.font-bold`,
 *  which is the register of a page title, repeated five times down one page,
 *  each one costing ~44px before any content. They now use the label the
 *  settings page already uses for its groups (settings-form.tsx:176), so the
 *  two dense surfaces in the app read the same and a section costs ~20px.
 * ------------------------------------------------------------------ */

export function AdminSection({
  label,
  count,
  id,
  action,
  children,
}: {
  label: string;
  /** Rendered beside the label. Omit where a count would be noise. */
  count?: number;
  id?: string;
  /** Optional control on the label's own line, e.g. a filter toggle. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-6" : undefined}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </h2>
        {count !== undefined && (
          /* Tabular figures so a count ticking 9 -> 10 does not shift the
             label's baseline box under it. */
          <span className="text-[11px] font-bold tabular-nums text-muted-foreground/70">
            {count}
          </span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * An empty queue. One line of text, no card: an empty state does not need a
 * bordered 80px box to say nothing is waiting, and four of those boxes stacked
 * down the panel were most of its height (a box must earn its border).
 */
export function AdminEmpty({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-1 text-[13px] text-muted-foreground">{children}</p>;
}
