"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  BadgeCheck,
  Ban,
  Clock,
  MailCheck,
  MailQuestion,
  MailX,
  Search,
  Shield,
  ShieldQuestion,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FacetSelect,
  FilterButton,
  FilterPopover,
  FilterSheet,
  SentenceLine,
  type SentenceToken,
} from "@/components/common/filters";
import { AdminPersonRow } from "@/components/admin/admin-person-row";
import { Chip, type ChipTone } from "@/components/admin/admin-chip";
import { ADMIN_GRID, AdminEmpty } from "@/components/admin/admin-chrome";
import { adminVerifyUser } from "@/components/profile/admin-actions";
import { loadMorePeople } from "@/app/(main)/admin/people/actions";
import {
  KIND_OPTIONS,
  STATE_OPTIONS,
  kindLabel,
  stateLabel,
  type EmailState,
  type PersonRow,
} from "@/lib/admin-people";

/* ------------------------------------------------------------------ *
 *  Everyone here, in one list.
 *
 *  THE CHIP RULE, which is what makes this readable at 49 people and would
 *  have made the old panel readable too: a chip appears only when the state
 *  is NOT the settled one. Somebody who has confirmed their address and is a
 *  verified member shows no chips at all.
 *
 *  The alternative, which the surface this replaces used, is two chips on
 *  every row saying "Confirmed" and "Verified" 47 times so that the two rows
 *  that need something can say otherwise. That is 94 pieces of ink to carry
 *  two facts, it makes every row 76px instead of 54, and it trains the eye to
 *  skip exactly the column the section exists for. Silence means settled.
 * ------------------------------------------------------------------ */

const EMAIL_CHIP: Record<
  Exclude<EmailState, "confirmed">,
  { label: string; tone: ChipTone; icon: typeof MailCheck }
> = {
  waiting: { label: "Link sent", tone: "idle", icon: Clock },
  queued: { label: "Queued to send", tone: "warn", icon: MailQuestion },
  failed: { label: "Send failed", tone: "bad", icon: MailX },
  none: { label: "No link sent", tone: "warn", icon: MailQuestion },
};

const MEMBER_CHIP: Record<string, { label: string; tone: ChipTone }> = {
  pending: { label: "Pending", tone: "warn" },
  unverified: { label: "Unverified", tone: "idle" },
  flagged: { label: "Flagged", tone: "bad" },
};

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
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  const q = searchParams.get("q") ?? "";
  const state = searchParams.get("state") ?? "";
  const kind = searchParams.get("kind") ?? "";
  const [draftQ, setDraftQ] = useState(q);

  /* The server owns the filtering, so a change is a navigation. Everything
     that reads from `searchParams` therefore stays in one place: the URL is
     the state, which also makes any filtered view linkable. */
  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      startTransition(() => {
        router.replace(next.toString() ? `/admin/people?${next}` : "/admin/people", {
          scroll: false,
        });
      });
    },
    [router, searchParams]
  );

  const clearAll = useCallback(() => {
    setDraftQ("");
    startTransition(() => router.replace("/admin/people", { scroll: false }));
  }, [router]);

  const tokens: SentenceToken[] = useMemo(() => {
    const out: SentenceToken[] = [];
    if (state) out.push({ key: "state", label: stateLabel(state), onClear: () => setParam("state", "") });
    if (kind) out.push({ key: "kind", label: kindLabel(kind), onClear: () => setParam("kind", "") });
    if (q) out.push({ key: "q", label: `"${q}"`, onClear: () => { setDraftQ(""); setParam("q", ""); } });
    return out;
  }, [state, kind, q, setParam]);

  const activeCount = (state ? 1 : 0) + (kind ? 1 : 0);
  const hasFilter = activeCount > 0 || Boolean(q);

  async function showMore() {
    if (!cursor || loading) return;
    setLoading(true);
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => (params[k] = v));
    const result = await loadMorePeople(params, cursor);
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setRows((prev) => [...prev, ...result.rows]);
    setCursor(result.nextCursor);
  }

  async function verify(id: string) {
    const result = await adminVerifyUser(id, "office_list");
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <Input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setParam("q", draftQ.trim())}
              onBlur={() => draftQ.trim() !== q && setParam("q", draftQ.trim())}
              placeholder="Search a name or an email"
              aria-label="Search people"
              className="pl-9"
            />
          </div>
          <div className="hidden lg:block">
            <FilterPopover
              open={panelOpen}
              onOpenChange={setPanelOpen}
              trigger={
                <FilterButton count={activeCount} onClick={() => setPanelOpen((v) => !v)} />
              }
            >
              {facets(true, true)}
            </FilterPopover>
          </div>
          <FilterButton
            count={activeCount}
            onClick={() => setSheetOpen(true)}
            className="lg:hidden"
          />
        </div>

        {/* The count row absorbs the active filters, so adding one costs no
            extra row. Same control the Directory and the Collection use. */}
        <SentenceLine
          count={total}
          singular={hasFilter ? "match" : "person"}
          plural={hasFilter ? "matches" : "people"}
          tokens={tokens}
          onClearAll={clearAll}
          onOpenPanel={() =>
            window.innerWidth >= 1024 ? setPanelOpen(true) : setSheetOpen(true)
          }
          max={2}
        />
      </div>

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClearAll={clearAll}
        hasActive={hasFilter}
        showLabel={`Show ${total} ${total === 1 ? "person" : "people"}`}
      >
        {facets(true)}
      </FilterSheet>

      {rows.length === 0 ? (
        <AdminEmpty>
          {hasFilter ? "Nobody matches that." : "Nobody here yet."}
        </AdminEmpty>
      ) : (
        <>
          <div ref={listRef} className={ADMIN_GRID}>
            {rows.map((p) => (
              <PersonCard key={p.id} person={p} onVerify={() => verify(p.id)} />
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

function PersonCard({
  person,
  onVerify,
}: {
  person: PersonRow;
  onVerify: () => void;
}) {
  const email = person.emailState === "confirmed" ? null : EMAIL_CHIP[person.emailState];
  const member = person.verifyState === "verified" ? null : MEMBER_CHIP[person.verifyState];

  return (
    <AdminPersonRow
      person={person}
      href={`/admin/people/${person.id}`}
      chips={
        <div className="flex flex-wrap items-center justify-end gap-1">
          {person.hasNote && (
            <StickyNote
              className="size-3.5 text-muted-foreground"
              strokeWidth={2}
              aria-label="Has an admin note"
            />
          )}
          {person.role === "admin" && <Chip label="Admin" tone="info" icon={Shield} />}
          {/* Blocked supersedes the verification chips: what a blocked account
              has or has not confirmed is moot, and three chips on one row is
              the noise this rule exists to prevent. */}
          {person.isBlocked ? (
            <Chip label="Blocked" tone="bad" icon={Ban} />
          ) : (
            <>
              {email && <Chip label={email.label} tone={email.tone} icon={email.icon} />}
              {member && (
                <Chip label={member.label} tone={member.tone} icon={ShieldQuestion} />
              )}
            </>
          )}
        </div>
      }
      action={
        !person.isBlocked && person.verifyState !== "verified" ? (
          <Button size="xs" variant="primary" onClick={onVerify}>
            <BadgeCheck className="size-3" strokeWidth={2} />
            Verify
          </Button>
        ) : undefined
      }
    />
  );
}
