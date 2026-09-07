"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { BadgeCheck, Ban, MailX, Shield, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { FacetSelect } from "@/components/common/filters/facet-select";
import { type SentenceToken } from "@/components/common/filters/sentence-line";
import { AdminFilterBar, useAdminFilterParams } from "@/components/admin/admin-filter-bar";
import { AdminPersonRow } from "@/components/admin/admin-person-row";
import { Chip } from "@/components/admin/admin-chip";
import { ADMIN_GRID_3, AdminEmpty } from "@/components/admin/admin-chrome";
import { adminVerifyUser } from "@/app/(main)/admin/people/actions";
import { loadMorePeople } from "@/app/(main)/admin/people/actions";
import {
  KIND_OPTIONS,
  STATE_OPTIONS,
  kindLabel,
  stateLabel,
  type PersonRow,
} from "@/lib/admin-people";

/* ------------------------------------------------------------------ *
 *  Everyone here, in one list.
 *
 *  THE CHIP RULE, which is what makes this readable at 51 people and would
 *  have made the old panel readable too: a row shows AT MOST ONE chip, and
 *  only when something is unsettled. Somebody who has confirmed their address
 *  and is a verified member shows nothing at all.
 *
 *  The surface this replaces did the opposite: two chips on every row saying
 *  "Confirmed" and "Verified" 47 times, so that the two rows which needed
 *  something could say otherwise. That is 94 pieces of ink to carry two
 *  facts, and it trains the eye to skip exactly the column the section exists
 *  for. Silence means settled, and a page of quiet rows is what a healthy
 *  membership should look like.
 * ------------------------------------------------------------------ */

export function PeopleList({
  initial,
  initialCursor,
  total,
}: {
  initial: PersonRow[];
  initialCursor: string | null;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  /** Rows whose Verify press is still in the air; see verify() below. */
  const [verifying, setVerifying] = useState<ReadonlySet<string>>(new Set());
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  const filters = useAdminFilterParams("/admin/people");
  const { setParam } = filters;
  const state = searchParams.get("state") ?? "";
  const kind = searchParams.get("kind") ?? "";

  const tokens: SentenceToken[] = useMemo(() => {
    const out: SentenceToken[] = [];
    if (state) out.push({ key: "state", label: stateLabel(state), onClear: () => setParam("state", "") });
    if (kind) out.push({ key: "kind", label: kindLabel(kind), onClear: () => setParam("kind", "") });
    return out;
  }, [state, kind, setParam]);

  const activeCount = (state ? 1 : 0) + (kind ? 1 : 0);
  const hasFilter = activeCount > 0 || Boolean(filters.q);

  async function showMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      searchParams.forEach((v, k) => (params[k] = v));
      const result = await callAction(() => loadMorePeople(params, cursor));
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setRows((prev) => [...prev, ...result.rows]);
      setCursor(result.nextCursor);
    } finally {
      // finally, not a trailing statement: a rejected page used to leave
      // "Show more" disabled for the rest of the session (audit B-042).
      setLoading(false);
    }
  }

  async function verify(id: string) {
    // No method argument: an admin pressing this HAS checked by hand, and
    // saying "off the office list" was a claim about how it was done that was
    // not true (audit Low 6). The in-flight set stops a double press sending
    // the member two identical notifications (Low 5); the server refuses the
    // second one anyway, and this keeps the button from inviting it.
    if (verifying.has(id)) return;
    setVerifying((prev) => new Set(prev).add(id));
    const result = await callAction(() => adminVerifyUser(id));
    setVerifying((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Verified");
    // Optimistic, so the chip clears without a round trip and the row stops
    // offering an action it has already taken.
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, verifyState: "verified" } : r))
    );
    router.refresh();
  }

  function facets(fullWidth: boolean, compact = false) {
    const className = fullWidth ? (compact ? "w-full h-9" : "w-full") : undefined;
    return (
      <>
        <FacetSelect
          label="Standing"
          value={state}
          onChange={(v) => setParam("state", v)}
          options={STATE_OPTIONS}
          anyLabel="Anyone"
          className={className}
        />
        <FacetSelect
          label="Kind"
          value={kind}
          onChange={(v) => setParam("kind", v)}
          options={KIND_OPTIONS}
          anyLabel="Any kind"
          className={className}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminFilterBar
        filters={filters}
        searchPlaceholder="Search a name or an email"
        searchAriaLabel="Search people"
        facets={facets}
        tokens={tokens}
        activeCount={activeCount}
        count={total}
        singular="person"
        plural="people"
        maxTokens={2}
        sheetShowLabel={`Show ${total} ${total === 1 ? "person" : "people"}`}
      />

      {rows.length === 0 ? (
        <AdminEmpty>
          {hasFilter ? "Nobody matches that." : "Nobody here yet."}
        </AdminEmpty>
      ) : (
        <>
          <div ref={listRef} className={ADMIN_GRID_3}>
            {rows.map((p) => (
              <PersonCard
                key={p.id}
                person={p}
                onVerify={() => verify(p.id)}
                verifying={verifying.has(p.id)}
              />
            ))}
          </div>
          {cursor && (
            <div className="flex justify-center pt-1">
              <Button variant="outline" size="sm" onClick={showMore} disabled={loading}>
                {loading ? "Loading..." : "Show more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * A chip ONLY for something a human has to do something about.
 *
 * Three cuts got here. The first stacked an email chip and a member chip on
 * every row, plus a role chip and a note icon. The second collapsed those to
 * one chip. That was better and still wrong: "Email not confirmed" then
 * appeared on seven of the eighteen rows on screen, which is a lot of ink for
 * a state this file's own taxonomy calls "the commonest state, and not a
 * problem". Somebody who has not clicked their link yet is not your job. It
 * resolves itself, and if it does not, the send FAILING is the thing worth
 * saying.
 *
 * What is left is the four states that genuinely want a person:
 *
 *   Blocked     you did this, and it is worth seeing that you did
 *   Flagged     somebody in the community raised a hand
 *   Bounced     the address is wrong and they cannot confirm at all
 *   Admin       not a problem, but worth knowing at a glance
 *
 * Deliberately NOT here: "Unverified". The row already carries a Verify
 * button when that is true, and a chip beside it saying the same word is the
 * label and the button both claiming the same job. The button IS the
 * indicator. To see them as a group, the Standing filter has "Not a verified
 * member".
 *
 * The result is a page of quiet rows with two or three marks on it, which is
 * the honest picture of a healthy membership, and it means a mark actually
 * catches the eye when one appears.
 */
function statusChip(p: PersonRow) {
  if (p.isBlocked) return <Chip label="Blocked" tone="bad" icon={Ban} />;
  if (p.verifyState === "flagged") return <Chip label="Flagged" tone="bad" icon={ShieldQuestion} />;
  if (p.emailState === "failed") return <Chip label="Email bounced" tone="bad" icon={MailX} />;
  // Last, because it is a fact rather than a problem: it only ever shows on a
  // row that has nothing more pressing to say.
  if (p.role === "admin") return <Chip label="Admin" tone="info" icon={Shield} />;
  return null;
}

function PersonCard({
  person,
  onVerify,
  verifying,
}: {
  person: PersonRow;
  onVerify: () => void;
  /** True while this row's Verify press is still in the air (audit Low 5). */
  verifying: boolean;
}) {
  return (
    <AdminPersonRow
      person={person}
      href={`/admin/people/${person.id}`}
      chip={statusChip(person)}
      action={
        !person.isBlocked && person.verifyState !== "verified" ? (
          <Button size="xs" variant="primary" onClick={onVerify} disabled={verifying}>
            <BadgeCheck className="size-3" strokeWidth={2} />
            Verify
          </Button>
        ) : undefined
      }
    />
  );
}
