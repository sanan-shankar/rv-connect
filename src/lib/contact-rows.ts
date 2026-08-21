/* ------------------------------------------------------------------ *
 *  The contact list's shape, and the round trip between it and the row
 *  list the editor shows.
 *
 *  Pure and JSX-free, in its own module, so this can be unit-tested: the
 *  editor is a .tsx client component and node:test cannot strip JSX. The
 *  round trip is worth a test in its own right -- getting it wrong is how
 *  removing an email row came to publish the member's private sign-in
 *  address (audit B-050).
 * ------------------------------------------------------------------ */

export type ContactKind = "email" | "phone" | "instagram" | "linkedin" | "facebook" | "link";

export interface ContactRow {
  id: string;
  kind: ContactKind;
  value: string;
  /** only "link" carries one: the short name shown instead of the URL */
  label?: string;
}

let seq = 0;
/** A row key that is stable for the row's lifetime and unique across the list. */
export const newId = () => `c${seq++}`;

/** The stored shape the server action wants, rebuilt from the row list. */
export function rowsToPayload(rows: ContactRow[]) {
  const first = (k: ContactKind) => rows.find((r) => r.kind === k)?.value.trim() || null;
  const email = first("email");
  return {
    displayEmail: email,
    /* Removing the email row means "show no email", and it has to be said out
     * loud. `displayEmail: null` alone cannot say it -- null is also what every
     * member who never chose a custom address has, and their profile must keep
     * showing their sign-in one. Without this flag the X on that row wrote
     * null, and the profile answered by publishing the member's private login
     * address instead (audit B-050). */
    showEmail: email !== null,
    phones: rows.filter((r) => r.kind === "phone").map((r) => r.value),
    instagram: first("instagram"),
    linkedin: first("linkedin"),
    facebook: first("facebook"),
    links: rows
      .filter((r) => r.kind === "link")
      .map((r) => ({ label: r.label ?? "", url: r.value })),
  };
}

export function buildRows(
  source: {
  displayEmail: string | null;
  /** whether the profile offers an email at all; false = the member removed it */
  showEmail: boolean;
  /** the account address, used when no display address has been chosen */
  email: string;
  phones: string[];
  instagram: string | null;
  linkedin: string | null;
  facebook: string | null;
    links: { label: string; url: string }[];
  },
  /* Injected rather than imported. This module has to stay free of relative
     VALUE imports so `node:test` can load it: node cannot resolve an
     extensionless "./utils", and tsc refuses "./utils.ts" without
     allowImportingTsExtensions. Type-only imports are fine (node strips them),
     which is why every other testable module here gets away with one. The real
     caller passes `formatPhoneDisplay`; the default keeps a test honest without
     making it care about phone formatting. */
  formatPhone: (p: string) => string = (p) => p
): ContactRow[] {
  const rows: ContactRow[] = [];
  /* The email people ACTUALLY see. The profile's Get in touch falls back to
     the account address when displayEmail is unset, so seeding this list from
     displayEmail alone showed nothing at all to everyone who never set one
     (owner, 2026-08-07: "it only shows my phone number, but I'm pretty sure
     that if people get in touch with me it'll also show my email"). Showing
     the effective address is the honest thing: it is what is on the profile,
     and editing it is how you change what is on the profile. */
  /* ...but only while the member still wants one shown. A removed email row
     used to come straight back on the next edit, re-seeded from the account
     address, so removing it did not even appear to have worked (audit B-050).
     `showEmail` is what remembers the removal. */
  if (source.showEmail && (source.displayEmail || source.email)) {
    rows.push({ id: newId(), kind: "email", value: source.displayEmail || source.email });
  }
  /* Spaced the way the profile prints it. Numbers are stored normalised (no
     spaces), so the raw value reads "+919940055940" in a field the profile
     shows as "+91 99400 55940". Saving re-normalises whatever is typed, so
     showing the formatted form round-trips cleanly. */
  for (const p of source.phones)
    rows.push({ id: newId(), kind: "phone", value: formatPhone(p) });
  if (source.instagram) rows.push({ id: newId(), kind: "instagram", value: source.instagram });
  if (source.linkedin) rows.push({ id: newId(), kind: "linkedin", value: source.linkedin });
  if (source.facebook) rows.push({ id: newId(), kind: "facebook", value: source.facebook });
  for (const l of source.links)
    rows.push({ id: newId(), kind: "link", value: l.url, label: l.label });
  return rows;
}
