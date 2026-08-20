import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { IS_DEMO } from "./demo";

/* ------------------------------------------------------------------ *
 *  The one rate limiter (audit H6, M2, M3, M7 — Phase 4).
 *
 *  Every throttle in the app comes through this file, backed by one
 *  Upstash Redis database, because limits held in process memory reset
 *  on every serverless cold start and are private to each instance —
 *  which is exactly how the trivia gate's old in-process Map ended up
 *  being both bypassable and a denial-of-service primitive (M7).
 *
 *  Posture on failure: OPEN. If the Upstash keys are absent (the demo
 *  project deliberately has none) or Redis is unreachable, requests
 *  pass and the miss is logged. A rate limiter that can take down
 *  sign-in when Redis blinks would be a worse availability bug than
 *  the abuse it prevents; the demo, additionally, must never be locked
 *  out (its own default-deny Prisma allowlist is its real wall).
 * ------------------------------------------------------------------ */

import { RATE_LIMITED } from "./rate-limit-message";

/**
 * Every limit in the app, with the argument for its number. All windows
 * are sliding, so nobody is ever "locked out until midnight" — the
 * Phase 2 probe's permanent-lockout bug is the cautionary tale, and a
 * sliding window is the shape that cannot reproduce it.
 *
 * The write limits are generous on purpose: Stage 2 verification is the
 * real wall against strangers, so these only need to cap what a hijacked
 * or misbehaving VERIFIED account can do per unit time.
 */
const LIMITS = {
  /** Failures only, per IP. 30 wrong passwords from one address in a
   *  quarter hour is credential stuffing, not fat fingers — but a reunion
   *  crowd on one hotel wifi stays comfortably under it because their
   *  successes never count. */
  "login-ip": { tokens: 30, window: "15 m" },
  /** Failures only, per account, so a stuffing run against one member is
   *  stopped by the tenth guess no matter how many IPs it rotates. An
   *  attacker hammering a victim's address on purpose inconveniences them
   *  for at most the tail of the window — it slides shut behind them. */
  "login-account": { tokens: 10, window: "15 m" },
  /** Per IP. Ten allows for the launch-day case of a reunion table or an
   *  office NAT signing up together; a bot farm burning 240 accounts a day
   *  per IP is still pointless, because every account it mints is Stage 0,
   *  which can write nothing until a human verifies it. */
  signup: { tokens: 10, window: "1 h" },
  /** Per IP (audit M3). The mail budget is ~95 messages a day; before
   *  this, one address could burn the whole day's budget in minutes by
   *  cycling known member emails through the reset form. */
  reset: { tokens: 5, window: "15 m" },
  /** Per IP (audit M7). Same intent as the old in-process limit — eight
   *  guesses at the entry question per ten minutes — but keyed on the
   *  connection, which an attacker cannot discard the way they could the
   *  old cookie. */
  trivia: { tokens: 8, window: "10 m" },
  /** Per user. Ten posts in ten minutes is a paste-bot, not a person
   *  writing to their old school friends. */
  posts: { tokens: 10, window: "10 m" },
  /** Per user. Commenting runs hotter than posting — a lively thread is
   *  the product working — so triple the allowance. */
  comments: { tokens: 30, window: "10 m" },
  /** Per user, across all three upload routes and both Collection
   *  contribution paths. Caps what one account can push into R2 in an
   *  hour until M17's real per-account quota lands in Phase 5. */
  uploads: { tokens: 40, window: "1 h" },
  /** Per user. Reporting is for summoning a human, and ten summonses a
   *  day is already a campaign; Phase 7 adds the per-pair dedupe. */
  reports: { tokens: 10, window: "24 h" },
  /** Per user. Catch-ups fan out invitations, so creation is the one
   *  community write kept deliberately slow. */
  catchups: { tokens: 5, window: "1 h" },
  /** Failures only, per account. Confirming deletion re-asks for the
   *  password (audit M35), which hands an attacker who stole a SESSION a
   *  quiet place to guess the password itself — the login limiter never
   *  sees these attempts, so this one must. Five wrong guesses an hour is
   *  fat fingers; fifty is a dictionary. */
  reauth: { tokens: 5, window: "1 h" },
  /** Per account. A data export (audit M35) reads every row the member
   *  owns in one request; three a day serves any real need, and a script
   *  polling it is just load with no new information. */
  export: { tokens: 3, window: "24 h" },
} as const;

export type LimitName = keyof typeof LIMITS;

/* ------------------------------------------------------------ plumbing */

let redis: Redis | null | undefined;
const limiters = new Map<LimitName, Ratelimit>();

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // The demo project has no keys on purpose; anywhere else this is a
    // misconfiguration worth one loud line per boot, not a crash.
    if (!IS_DEMO) console.warn("[rate-limit] Upstash env missing; every limit is OPEN");
    redis = null;
    return redis;
  }
  redis = new Redis({ url, token });
  return redis;
}

function limiterFor(name: LimitName): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    const { tokens, window } = LIMITS[name];
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(tokens, window),
      // Dev and prod share one Upstash database (same .env pattern as the
      // one Supabase database), so the keyspace carries the environment:
      // a probe hammering localhost must never spend production's budget.
      prefix: `rl:${process.env.NODE_ENV === "production" ? "p" : "d"}:${name}`,
      // If Redis does not answer promptly, the request proceeds (fail-open,
      // see the header comment) rather than holding sign-in hostage.
      timeout: 3000,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

/* ------------------------------------------------------------ the API */

/**
 * Count this event against the limit and say whether it may proceed.
 * The default call for write actions: one line after the member gate.
 */
export async function rateLimit(
  name: LimitName,
  key: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (IS_DEMO) return { ok: true };
  const limiter = limiterFor(name);
  if (!limiter) return { ok: true };
  try {
    const { success } = await limiter.limit(key);
    return success ? { ok: true } : { ok: false, error: RATE_LIMITED };
  } catch (err) {
    console.error(`[rate-limit] ${name} check failed open`, err);
    return { ok: true };
  }
}

/**
 * Is there budget left, WITHOUT spending any? The login path uses this at
 * the door and spends via `consume` only when the attempt fails, so
 * successful sign-ins — a member's, or a QA script's hundredth of the
 * day — never eat into anyone's allowance.
 */
export async function hasBudget(name: LimitName, key: string): Promise<boolean> {
  if (IS_DEMO) return true;
  const limiter = limiterFor(name);
  if (!limiter) return true;
  try {
    const { remaining } = await limiter.getRemaining(key);
    return remaining > 0;
  } catch (err) {
    console.error(`[rate-limit] ${name} read failed open`, err);
    return true;
  }
}

/** Spend one token, verdict ignored — the failure-counting half of the
 *  `hasBudget`/`consume` pair. Never throws. */
export async function consume(name: LimitName, key: string): Promise<void> {
  if (IS_DEMO) return;
  const limiter = limiterFor(name);
  if (!limiter) return;
  try {
    await limiter.limit(key);
  } catch (err) {
    console.error(`[rate-limit] ${name} consume failed`, err);
  }
}

/* ------------------------------------------------------------ identity */

/**
 * The caller's IP as Vercel reports it, for use inside server actions.
 * On Vercel `x-forwarded-for`'s first hop is set by the platform and not
 * spoofable from outside; locally the QA probes set it themselves, which
 * is precisely how they simulate many callers against one dev server.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return ipFromHeaders(h);
}

/** Same, from a Request the framework hands us (the NextAuth authorize
 *  path, which runs before next/headers has a request scope). */
export function ipFromRequest(req: Request): string {
  return ipFromHeaders(req.headers);
}

function ipFromHeaders(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}
