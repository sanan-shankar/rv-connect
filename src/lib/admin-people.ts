import type { Prisma } from "@/generated/prisma/client";
import type { FacetOption } from "@/components/common/filters/types";
import { escapeLike } from "@/lib/db-text";

/* ------------------------------------------------------------------ *
 *  One list of people, and the one place its filters are defined.
 *
 *  This replaces THREE sections of the old panel. `Users`, `Verification`
 *  and `Email & verification` were three surfaces over one population of 49,
 *  and the third one's fourth filter was labelled "Everyone" and listed all
 *  49, two inches above a section that listed all 49 (owner, 2026-08-18:
 *  "there's an email and verification, and under that there's an everyone.
 *  And we also have an everyone below that").
 *
 *  The `where` builder lives here rather than in the page because the page
 *  and the load-more action both need it, and a filter that means one thing
 *  on the first page and another on the second is the exact bug this shape
 *  invites.
 * ------------------------------------------------------------------ */

export const PEOPLE_PAGE_SIZE = 60;

/* ---------------------------------------------------------------- *
 *  The two facets
 * ---------------------------------------------------------------- */

/** Standing: what this person has or has not settled. */
export type PeopleState =
  | "any"
  | "attention"
  | "email-pending"
  | "unverified"
  | "blocked";

/** Kind: what sort of account this is. */
export type PeopleKind = "any" | "admins" | "teachers" | "alumni";

export const STATE_OPTIONS: FacetOption[] = [
  { value: "attention", label: "Needs a look" },
  { value: "email-pending", label: "Email not confirmed" },
  { value: "unverified", label: "Not a verified member" },
  { value: "blocked", label: "Blocked" },
];

export const KIND_OPTIONS: FacetOption[] = [
  { value: "alumni", label: "Alumni" },
  { value: "teachers", label: "Teachers" },
  { value: "admins", label: "Admins" },
];

export function stateLabel(v: string): string {
  return STATE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function kindLabel(v: string): string {
  return KIND_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export interface PeopleFilters {
  q: string;
  state: PeopleState;
  kind: PeopleKind;
}

export function readPeopleFilters(sp: Record<string, string | string[] | undefined>): PeopleFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  // Anything unrecognised falls back to "any" rather than throwing: these
  // arrive from a URL a person can type, and a filtered list is not worth a
  // 500. `includes` on a readonly string[] so an unknown value narrows here
  // instead of being asserted into the union.
  const STATES: readonly string[] = ["attention", "email-pending", "unverified", "blocked"];
  const KINDS: readonly string[] = ["admins", "teachers", "alumni"];
  const state = one("state");
  const kind = one("kind");
  return {
    q: one("q").trim(),
    state: STATES.includes(state) ? (state as PeopleState) : "any",
    kind: KINDS.includes(kind) ? (kind as PeopleKind) : "any",
  };
}

/**
 * Filters to a Prisma `where`.
 *
 * "Needs a look" is the only compound one: a person the community flagged, or
 * a person whose confirmation mail gave up after four tries. Those are the
 * two states a human actually has to do something about; everything else on
 * this list resolves itself when somebody clicks a link in their inbox. The
 * mail half rides the `outboundMail` relation rather than a second query,
 * which is what keeps it a filter rather than a post-fetch sieve.
 */
export function peopleWhere(f: PeopleFilters): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];

  if (f.q) {
    const q = escapeLike(f.q);
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  switch (f.state) {
    case "attention":
      and.push({
        isBlocked: false,
        OR: [
          { verifyState: "flagged" },
          { outboundMail: { some: { kind: "verify", status: "failed" } } },
        ],
      });
      break;
    case "email-pending":
      and.push({ emailVerified: null });
      break;
    case "unverified":
      and.push({ verifyState: { not: "verified" } });
      break;
    case "blocked":
      and.push({ isBlocked: true });
      break;
  }

  switch (f.kind) {
    case "admins":
      and.push({ role: "admin" });
      break;
    case "teachers":
      and.push({ accountType: { in: ["teacher", "ex_teacher"] } });
      break;
    case "alumni":
      and.push({ accountType: "alumnus" });
      break;
  }

  return and.length ? { AND: and } : {};
}

/* ---------------------------------------------------------------- *
 *  The row
 * ---------------------------------------------------------------- */

/**
 * How far a confirmation email has got. Kept verbatim from the old
 * `verification-overview`, whose taxonomy was the good part of it:
 *
 *   confirmed  they clicked the link
 *   waiting    sent and not acted on. The commonest state, and not a problem
 *   queued     written down but not sent, because the day's budget ran out.
 *              Worth seeing: this person genuinely cannot confirm yet
 *   failed     gave up after four tries. Almost always a mistyped address,
 *              and the only state here that needs a human
 *   none       nothing was ever sent
 */
export type EmailState = "confirmed" | "waiting" | "queued" | "failed" | "none";

export interface PersonRow {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  birdOverride: string | null;
  accountType: string | null;
  batchType: string | null;
  batchYear: number | null;
  role: string;
  verifyState: string;
  isBlocked: boolean;
  emailState: EmailState;
  createdAt: string;
}

export interface PeoplePage {
  rows: PersonRow[];
  /** Cursor for the next page: the last row's id. Null when the list is done. */
  nextCursor: string | null;
}
