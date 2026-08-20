/**
 * The typographic pieces the three policy documents share, so the documents
 * read as one material and the pages hold only words. Long-form reading
 * follows the letters register: serif headings on the design-system scale,
 * body at 15.5/1.7, and nothing boxed unless it is genuinely tabular.
 */

export function DocTitle({ children, updated }: { children: React.ReactNode; updated: string }) {
  return (
    <header className="mb-8">
      <h1 className="font-heading text-[2rem] font-bold leading-tight tracking-[-0.025em] text-foreground">
        {children}
      </h1>
      <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Last updated {updated}
      </p>
    </header>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 first:mt-0">
      <h2 className="font-heading text-[1.35rem] font-bold leading-snug tracking-[-0.025em] text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15.5px] leading-[1.7] text-foreground/90">{children}</p>;
}

/** A bulleted list in the same measure as P. */
export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 ps-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc text-[15.5px] leading-[1.7] text-foreground/90 marker:text-canopy">
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * A two-column fact table (retention windows, processors). One of the few
 * places a table genuinely is the content, so it earns its hairlines.
 */
export function FactTable({
  headers,
  rows,
}: {
  headers: [string, string];
  rows: [React.ReactNode, React.ReactNode][];
}) {
  return (
    <table className="w-full border-collapse text-[14.5px] leading-relaxed">
      <thead>
        <tr className="border-b border-border text-left">
          <th className="py-2 pe-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {headers[0]}
          </th>
          <th className="py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {headers[1]}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b], i) => (
          <tr key={i} className="border-b border-border/60 align-top">
            <td className="py-2.5 pe-4 font-medium text-foreground">{a}</td>
            <td className="py-2.5 text-foreground/90">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
