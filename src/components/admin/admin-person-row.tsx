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
 *    name       always, and always the link to the public profile
 *    subtitle   always batch then email, and nothing else, ever
 *    right      chips. THIS is what varies between sections. Identity does not.
 *
 *  Why the email: in admin it IS the identity. It is the login, the thing
 *  that gets confirmed, and the thing you search by. Everywhere else in the
 *  app it is private, which is why this rule belongs to admin and is not the
 *  app's.
 *
 *  `batchLine`, never `formatBatch`: the latter returns "" for anyone with no
 *  batch year, so every teacher in the old users table read blank (flagged in
 *  progress.md round 3 as "an admin surface the owner did not name").
 * ------------------------------------------------------------------ */

export interface AdminPerson {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  birdOverride?: string | null;
  accountType?: string | null;
  batchType?: string | null;
  batchYear?: number | null;
}

export function AdminPersonRow({
  person,
  chips,
  action,
  href,
  className,
}: {
  person: AdminPerson;
  /** The section's own truth, on the right. The only thing that varies. */
  chips?: ReactNode;
  /** The one thing this section lets you do without leaving the list. */
  action?: ReactNode;
  /**
   * Where the ROW goes, usually /admin/people/<id>. The NAME always goes to
   * the public profile regardless, because the owner asked for exactly that:
   * "I should just be able to click on their name to view profile."
   */
  href?: string;
  className?: string;
}) {
  const subtitle = metaLine(batchLine(person), person.email);

  const body = (
    <IdentityRow
      user={person}
      className="min-w-0 flex-1 gap-3"
      textClassName="flex-1"
      name={
        <Link
          href={`/profile/${person.id}`}
          // stopPropagation is not enough and not needed: this is a real <a>
          // inside another real <a> only if the row wraps one, which is why
          // the row is a Link SIBLING below rather than a parent. Nested
          // anchors are invalid HTML and Safari resolves them by dropping the
          // inner one, which would silently break exactly the click the owner
          // asked for.
          className="block truncate rounded-sm text-[13.5px] font-semibold leading-none text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {person.name}
        </Link>
      }
      meta={subtitle}
      // The kit's default meta is 10.5px uppercase tracked muted, which is
      // the register this rebuild is removing (below the type scale's
      // smallest step, and 53% of the old panel's text). 12.5px, sentence
      // case, one muted line under a foreground name.
      metaClassName="truncate text-[12.5px] font-normal normal-case tracking-normal text-muted-foreground"
    />
  );

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3",
        href && "state-layer",
        className
      )}
    >
      {href && (
        // The row's own target, as a stretched overlay rather than a wrapper.
        // Keeps the name link and the action button real, clickable, and
        // focusable in their own right (z-[1] lifts them above it).
        <Link
          href={href}
          aria-label={`Manage ${person.name}`}
          className="absolute inset-0 z-0 rounded-[var(--radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      )}
      <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 items-center gap-3">
        {/* Only the name inside re-enables pointer events, so clicking the
            avatar or the subtitle still hits the row overlay behind them. */}
        <div className="min-w-0 flex-1 [&_a]:pointer-events-auto">{body}</div>
      </div>
      {chips && (
        <div className="relative z-[1] flex shrink-0 flex-col items-end gap-1">{chips}</div>
      )}
      {action && <div className="relative z-[1] shrink-0">{action}</div>}
    </div>
  );
}
