import Link from "next/link";
import type { ReactNode } from "react";
import { IdentityRow } from "@/components/common/identity-row";
import { batchLine, cn, metaLine } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  How a person renders in admin. One way, everywhere.
 *
 *  Owner, 2026-08-18: "throughout the UI we use the bird and the name and a
 *  subtitle... sometimes it's the batch instead of the profession, sometimes
 *  it's the location. It just keeps on changing... totally inconsistent from
 *  the content to the design of it."
 *
 *  The audit behind this (docs/spec/person-row-audit.md) found four different
 *  components and ten subtitle formulas across the app, and the old admin
 *  panel was the worst of it: two hand-rolled avatar rows, two tables with no
 *  avatar at all, and four different subtitles over the same 49 people.
 *
 *  THE POINT OF THIS COMPONENT IS WHAT IT DOES NOT ACCEPT. There is no `meta`
 *  prop. `IdentityRow` is shared GEOMETRY and every one of its callers passes
 *  its own content, which is why adopting it did not, by itself, make two
 *  screens agree. An admin surface cannot diverge here because it has nowhere
 *  to put a different subtitle.
 *
 *  The rule:
 *
 *    avatar     always, the bird or the photo
 *    name       always, and never truncated to nothing
 *    subtitle   always batch then email, and nothing else, ever
 *    right      at most ONE chip and at most ONE button
 *
 *  Why the email: in admin it IS the identity. It is the login, the thing
 *  that gets confirmed, and the thing you search by. Everywhere else in the
 *  app it is private, which is why this rule belongs to admin and is not the
 *  app's.
 *
 *  `batchLine`, never `formatBatch`: the latter returns "" for anyone with no
 *  batch year, so every teacher in the old users table read blank (flagged in
 *  progress.md round 3 as "an admin surface the owner did not name").
 *
 *  ---
 *
 *  ONE CLICK TARGET PER ROW (owner, 2026-08-19: "clear what's clickable and
 *  what not").
 *
 *  The first cut had two overlapping targets: the whole card went to the
 *  admin record and the name, sitting on top of it, went to the public
 *  profile. That is a coin toss with a thumb and it needed a stretched
 *  overlay, a pointer-events dance and a breakpoint to be even half honest.
 *
 *  So the row is one link to the person's admin record, and the public
 *  profile is reached from there, where a real button says so. The owner's
 *  original complaint holds either way: what he objected to was an Actions
 *  column with an eye ICON duplicating the name ("why is there that view
 *  profile thing when I should just be able to click on their name"). The
 *  name IS the target now. It just leads somewhere more useful to an admin
 *  than the public profile does.
 * ------------------------------------------------------------------ */

export interface AdminPerson {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  birdOverride?: string | null;
  accountType?: string | null;
  batchType?: string | null;
  batchYear?: number | null;
}

export function AdminPersonRow({
  person,
  chip,
  action,
  href,
  className,
}: {
  person: AdminPerson;
  /** At most one. The section's own truth; identity never varies. */
  chip?: ReactNode;
  /** At most one. The thing this section lets you do without leaving. */
  action?: ReactNode;
  /** Where the row goes. Omit for a row that is a label, not a link. */
  href?: string;
  className?: string;
}) {
  const body = (
    <IdentityRow
      user={person}
      className="min-w-0 flex-1 gap-3"
      textClassName="flex-1"
      name={person.name}
      nameClassName="truncate text-[13.5px] font-semibold leading-none text-foreground"
      meta={metaLine(batchLine(person), person.email)}
      // The kit's default meta is 10.5px uppercase tracked muted, which is
      // the register this rebuild removed (below the type scale's smallest
      // step, and 53% of the old panel's text). 12.5px, sentence case, one
      // muted line under a foreground name.
      metaClassName="truncate text-[12.5px] font-normal normal-case tracking-normal text-muted-foreground"
    />
  );

  const chipNode = chip ? <div className="shrink-0">{chip}</div> : null;

  /* A row with no link is a label, e.g. the member's identity inside a
     message card, where the CARD is the target. */
  if (!href) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3.5",
          className
        )}
      >
        {body}
        {chipNode}
      </div>
    );
  }

  return (
    /* Two targets, and they LOOK like two targets.
       An <a> may not contain a <button>, so the action cannot sit inside the
       row link, and hiding it under a stretched overlay is what made the
       first cut ambiguous. Instead the link owns the identity and the chip,
       the button sits beside it as its own thing, and the hover tint stops
       exactly where the link stops. What lights up is what you are about to
       click. */
    <div
      className={cn(
        "flex items-center rounded-[var(--radius)] border border-border bg-card",
        className
      )}
    >
      <Link
        href={href}
        className="state-layer flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius)] p-3.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        {body}
        {chipNode}
      </Link>
      {action && <div className="shrink-0 py-3.5 pr-3.5 pl-2">{action}</div>}
    </div>
  );
}
