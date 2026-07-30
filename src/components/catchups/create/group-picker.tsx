/* ------------------------------------------------------------------ *
 *  <GroupPicker> — step 0 of the create flow when no `group` query
 *  param is present and the viewer belongs to groups (spec 3.2). Only
 *  groups where the viewer is a member AND no Catch-up exists yet are
 *  pickable; picking one reloads the page with `?group=<id>` so the
 *  setup sheet takes over. If every one of the viewer's groups already
 *  has a Catch-up, this is not a dead end: it points at the existing
 *  ones instead.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";

export type PickableGroup = {
  id: string;
  name: string;
  memberCount: number;
};

export type ExistingGroupCatchup = {
  id: string;
  name: string;
  catchupId: string;
};

export function GroupPicker({
  groups,
  existingGroups,
}: {
  groups: PickableGroup[];
  existingGroups: ExistingGroupCatchup[];
}) {
  return (
    <div className="card-elevated space-y-5 rounded-[var(--radius)] border border-border bg-card p-6 sm:p-7">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Which group is this for?
        </h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
          A Catch-up always belongs to a group. Pick one to start its first Round.
        </p>
      </div>

      {groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/catchups/new?group=${g.id}`}
              className="group flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-background/50 p-4 transition-colors duration-150 hover:border-canopy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-foreground">{g.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Users className="h-3 w-3" aria-hidden />
                  {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-canopy" aria-hidden />
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border p-5 text-center">
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            Every group you belong to already has a Catch-up.
          </p>
          {existingGroups.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {existingGroups.map((g) => (
                <Link
                  key={g.id}
                  href={`/catchups/${g.catchupId}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3.5 py-1.5 text-[12.5px] font-semibold text-leaf transition-colors duration-150 hover:bg-leaf/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-leaf/15"
                >
                  Open {g.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
