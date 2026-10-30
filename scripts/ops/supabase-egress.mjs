/* ------------------------------------------------------------------ *
 *  Supabase's own egress meter, for the nightly snapshot (bug audit 3,
 *  L5-07).
 *
 *  WHY: the Free plan includes 5 GB of egress a billing cycle for the whole
 *  organisation, every query result through the pooler counts, and past it
 *  Supabase warns, grants a grace period, then may pause the project, make it
 *  read-only or refuse requests until the cycle resets. It is the first
 *  limit ordinary growth reaches, and until this nothing in the project
 *  watched it: Supabase's own e-mail was the only alarm.
 *
 *  WHAT: the number on Organization -> Usage -> Egress, read from the same
 *  place the dashboard reads it, so it is Supabase's billing meter and not a
 *  figure worked out from page views (the owner's rule: measure, never
 *  estimate). Anything missing from the answer is an error, never a zero.
 *
 *  HOW, and its one weakness: the documented Management API (/v1) has no
 *  usage endpoint, so the organisation's slug comes from /v1/projects/<ref>
 *  and the meter from /platform/organizations/<slug>/usage, which is the
 *  dashboard's own and not part of the documented API. It may refuse a
 *  personal access token, or change shape. Either way the reading fails
 *  with the reason, and the snapshot fails the job rather than looking like
 *  an alarm that has nothing to say.
 *
 *  Needs SUPABASE_ACCESS_TOKEN, a personal access token; without it the
 *  snapshot skips this and records nothing. docs/OPERATIONS.md, "Egress".
 * ------------------------------------------------------------------ */

const API = "https://api.supabase.com";

/** The share of the cycle's included egress at which the job fails, so the
 *  owner hears about it from GitHub's e-mail with the cycle not yet spent.
 *  The same 70% the database-size alarm sits at; Supabase's own dashboard
 *  starts warning at 80%. */
export const EGRESS_ALARM_SHARE = 0.7;

/** The project ref inside a Supabase connection string: the pooler's user
 *  name (`postgres.<ref>`) or the direct host (`db.<ref>.supabase.co`). */
export function projectRefOf(url) {
  try {
    const u = new URL(url);
    const m =
      /^postgres\.([a-z]{20})$/.exec(decodeURIComponent(u.username)) ??
      /^db\.([a-z]{20})\.supabase\.co$/.exec(u.hostname);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * This billing cycle's egress so far, in GB, and how much the plan includes.
 *
 * `includedGb` is null when the plan has no line to measure against (an
 * unlimited or uncapped allowance). Throws with a sentence on anything else
 * missing; the sentence never carries the token, the ref or the slug, because
 * the snapshot's log is public with the repository.
 */
export async function readEgress({ token, databaseUrl, fetchImpl = fetch }) {
  const ref = projectRefOf(databaseUrl ?? "");
  if (!ref) throw new Error("the database URL names no Supabase project");

  let org = null;
  const redact = (text) =>
    [token, ref, org].filter(Boolean).reduce((t, secret) => t.split(secret).join("<redacted>"), text);
  const get = async (path, what) => {
    const res = await fetchImpl(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const said = redact((await res.text().catch(() => "")).slice(0, 160)).trim();
      throw new Error(`Supabase answered ${res.status} for ${what}${said ? `: ${said}` : ""}`);
    }
    return res.json();
  };

  const project = await get(`/v1/projects/${ref}`, "the project");
  org = project?.organization_slug ?? project?.organization_id;
  if (typeof org !== "string" || !org) throw new Error("Supabase named no organisation for the project");

  const usage = await get(`/platform/organizations/${encodeURIComponent(org)}/usage`, "the organisation's usage");
  const egress = Array.isArray(usage?.usages) ? usage.usages.find((u) => u?.metric === "EGRESS") : undefined;
  if (!egress || typeof egress.usage !== "number" || !Number.isFinite(egress.usage)) {
    throw new Error("Supabase's usage answer carries no EGRESS reading");
  }

  /* The dashboard shows both as GB ("1.23 GB of 5 GB") and warns on their
     ratio, so this compares the same two numbers it does. */
  const included = Number(egress.pricing_free_units);
  return {
    gb: egress.usage,
    includedGb: !egress.unlimited && Number.isFinite(included) && included > 0 ? included : null,
  };
}

/** The alarm's sentence once a reading crosses the line, else null. */
export function egressAlarm({ gb, includedGb }) {
  if (!includedGb || gb / includedGb < EGRESS_ALARM_SHARE) return null;
  return (
    `Supabase egress is ${gb.toFixed(2)} of ${includedGb} GB this billing cycle ` +
    `(${Math.round((gb / includedGb) * 100)}%). Past the plan's line Supabase may pause the database, ` +
    `make it read-only or refuse requests until the cycle resets. Look at docs/OPERATIONS.md, "Egress".`
  );
}
