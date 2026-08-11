"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Clock, MailCheck, MailX, MailQuestion, ShieldQuestion } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { batchLine, metaLine } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Who has confirmed what.
 *
 *  Two different facts get confused constantly, so this puts them side
 *  by side and names them:
 *
 *    EMAIL   did this address answer? Set by clicking a link we mailed.
 *            Gates posting, uploads and other people's contacts.
 *    MEMBER  is this really a Rishi Valley person? Decided by an admin
 *            off the office list, or by community vouching. Drives the
 *            leaf glyph beside a name.
 *
 *  An account can have either without the other, and the two rows in
 *  the admin panel that used to describe them never appeared together.
 *
 *  The mail strip on top is here rather than in a settings page because
 *  it is the number the owner will actually want on launch day: Resend
 *  sends 100 a day, and "how many are still waiting" is the difference
 *  between a queue working and a queue stuck.
 * ------------------------------------------------------------------ */

export type EmailState = "confirmed" | "waiting" | "queued" | "failed" | "none";

export interface VerificationRow {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  birdOverride: string | null;
  accountType: string | null;
  batchType: string | null;
  batchYear: number | null;
  /** Community standing: unverified | pending | verified | flagged. */
  verifyState: string;
  emailState: EmailState;
  /** When they confirmed, ISO, for the confirmed rows only. */
  confirmedAt: string | null;
}

export interface MailHealth {
  sentToday: number;
  dailyCap: number;
  waiting: number;
  failed: number;
}

const EMAIL_CHIP: Record<
  EmailState,
  { label: string; icon: typeof MailCheck; tone: "good" | "warn" | "bad" | "idle" }
> = {
  confirmed: { label: "Confirmed", icon: MailCheck, tone: "good" },
  // Sent and not acted on. The commonest state, and not a problem: most
  // people confirm within a day.
  waiting: { label: "Link sent", icon: Clock, tone: "idle" },
  // Written down but not yet sent, because the day's budget ran out. Worth
  // seeing, because this person genuinely cannot confirm yet.
  queued: { label: "Queued to send", icon: MailQuestion, tone: "warn" },
  // Gave up after four tries. Almost always a mistyped address, and the only
  // state here that needs a human.
  failed: { label: "Send failed", icon: MailX, tone: "bad" },
  none: { label: "No link sent", icon: MailQuestion, tone: "warn" },
};

const MEMBER_CHIP: Record<string, { label: string; tone: "good" | "warn" | "bad" | "idle" }> = {
  verified: { label: "Verified", tone: "good" },
  pending: { label: "Pending", tone: "warn" },
  unverified: { label: "Unverified", tone: "idle" },
  flagged: { label: "Flagged", tone: "bad" },
};

/* The colour protocol's chip trio (rule 4), plus the destructive red for the
   one state that is actually wrong. No green-on-green decorative wash. */
const TONE: Record<"good" | "warn" | "bad" | "idle", string> = {
  good: "border-leaf/30 bg-leaf/[0.07] text-leaf",
  warn: "border-cinnamon/30 bg-cinnamon/[0.07] text-cinnamon",
  bad: "border-destructive/30 bg-destructive/[0.08] text-destructive",
  idle: "border-border bg-secondary text-muted-foreground",
};

type Filter = "all" | "email-pending" | "member-pending" | "needs-attention";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "needs-attention", label: "Needs a look" },
  { key: "email-pending", label: "Email not confirmed" },
  { key: "member-pending", label: "Not yet a verified member" },
  { key: "all", label: "Everyone" },
];

function Chip({
  label,
  tone,
  icon: Icon,
}: {
  label: string;
  tone: "good" | "warn" | "bad" | "idle";
  icon?: typeof MailCheck;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${TONE[tone]}`}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden />}
      {label}
    </span>
  );
}

export function VerificationOverview({
  rows,
  mail,
}: {
  rows: VerificationRow[];
  mail: MailHealth;
}) {
  const [filter, setFilter] = useState<Filter>("needs-attention");

  const shown = useMemo(() => {
    switch (filter) {
      case "email-pending":
        return rows.filter((r) => r.emailState !== "confirmed");
      case "member-pending":
        return rows.filter((r) => r.verifyState !== "verified");
      case "needs-attention":
        // The two states a human has to do something about: a link that could
        // not be delivered, and somebody the community flagged.
        return rows.filter(
          (r) =>
            r.emailState === "failed" ||
            r.emailState === "none" ||
            r.verifyState === "flagged",
        );
      default:
        return rows;
    }
  }, [rows, filter]);

  const counts = useMemo(
    () => ({
      emailPending: rows.filter((r) => r.emailState !== "confirmed").length,
      memberPending: rows.filter((r) => r.verifyState !== "verified").length,
    }),
    [rows],
  );

  return (
    <div className="space-y-3">
      {/* The mail strip. Three numbers, each with its own reason to exist:
          what today's budget has spent, what is still waiting on it, and what
          gave up. */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
            Sent today
          </p>
          <p className="mt-0.5 text-[19px] font-semibold leading-none text-foreground">
            {mail.sentToday}
            <span className="text-[13px] font-normal text-muted-foreground">
              {" "}
              / {mail.dailyCap}
            </span>
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
            Waiting to send
          </p>
          <p
            className={`mt-0.5 text-[19px] font-semibold leading-none ${
              mail.waiting > 0 ? "text-cinnamon" : "text-foreground"
            }`}
          >
            {mail.waiting}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
            Gave up
          </p>
          <p
            className={`mt-0.5 text-[19px] font-semibold leading-none ${
              mail.failed > 0 ? "text-destructive" : "text-foreground"
            }`}
          >
            {mail.failed}
          </p>
        </div>
      </div>

      {mail.waiting > 0 && (
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Resend allows {mail.dailyCap} messages a day on this plan. The rest go
          out tomorrow, resets first. Nobody in the queue is asked to check an
          inbox we have not written to yet.
        </p>
      )}

      {/* Filters as the app's own pill row, idle until set, canopy when active,
          same as the directory and collection facets. */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const badge =
            f.key === "email-pending"
              ? counts.emailPending
              : f.key === "member-pending"
                ? counts.memberPending
                : null;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`state-layer rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                active
                  ? "border-transparent bg-canopy text-white"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {/* The count as its own chip, not a bare number after a space.
                  Run together, "Not yet a verified member 1" reads as the end
                  of the sentence rather than as a quantity. */}
              {badge != null && badge > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-px text-[11px] tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="px-1 py-1 text-[13px] text-muted-foreground">
          {filter === "needs-attention"
            ? // Deliberately not "every link went out": on a fresh install
              // nothing has been sent at all, and the members who predate this
              // feature were grandfathered rather than mailed. This sentence is
              // true in both cases.
              "Nothing to deal with. No failed sends, nobody flagged."
            : "Nobody here."}
        </p>
      ) : (
        /* Two to a line, matching the message and verification queues beside
           it, so the admin page stays one rhythm down its whole length. */
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shown.map((r) => {
            const email = EMAIL_CHIP[r.emailState];
            const member = MEMBER_CHIP[r.verifyState] ?? MEMBER_CHIP.unverified;
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3"
              >
                <BirdAvatar
                  user={{
                    id: r.id,
                    name: r.name,
                    photoUrl: r.photoUrl,
                    birdOverride: r.birdOverride,
                  }}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${r.id}`}
                    className="block truncate rounded-sm text-[13.5px] font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {r.name}
                  </Link>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {metaLine(r.email, batchLine(r))}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Chip label={email.label} tone={email.tone} icon={email.icon} />
                  <Chip
                    label={member.label}
                    tone={member.tone}
                    icon={r.verifyState === "verified" ? BadgeCheck : ShieldQuestion}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
