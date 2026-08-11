import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

/* ------------------------------------------------------------------ *
 *  Minting and redeeming the links we email.
 *
 *  One rule runs through this file: the raw token exists in the URL and
 *  nowhere else. We store a SHA-256 of it, look up by that hash, and
 *  never write the token itself to the database or to a log. A dumped
 *  backup or a read-only injection therefore yields nothing redeemable,
 *  where a plaintext reset table would be a list of working skeleton
 *  keys.
 *
 *  SHA-256 with no salt or stretching is the right primitive here and
 *  not a shortcut: unlike a password, the input is 256 bits of CSPRNG
 *  output with no structure to guess, so there is no dictionary to run
 *  and nothing for bcrypt's work factor to defend against. Stretching
 *  would only make every link click slower.
 * ------------------------------------------------------------------ */

export type TokenKind = "reset" | "verify";

/** How long a link stays good, in minutes.
 *
 *  A reset gets one hour: it is the higher-value link (it changes a credential),
 *  and anyone asking for one is, by definition, sitting at their computer right
 *  now. Confirmation gets a full day, because it is often opened on a phone
 *  hours later, and the cost of an expired confirmation is a person who quietly
 *  gives up rather than asking for another. */
export const TOKEN_TTL_MINUTES: Record<TokenKind, number> = {
  reset: 60,
  verify: 60 * 24,
};

/** Ceiling on how many links of one kind a single account can trigger inside
 *  the window. Stops this from being used to flood somebody's inbox, and stops
 *  a script from burning the sending quota. Generous enough that a person who
 *  genuinely clicks "resend" a few times because nothing arrived is never the
 *  one who hits it. */
const RATE_LIMIT: Record<TokenKind, { max: number; windowMinutes: number }> = {
  reset: { max: 4, windowMinutes: 30 },
  verify: { max: 5, windowMinutes: 60 },
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * 32 bytes of CSPRNG, base64url.
 *
 * `randomBytes`, never `Math.random`: the whole security of this flow is that
 * the token cannot be guessed, and Math.random is a seeded PRNG whose output
 * is predictable from previous draws. base64url so the value survives being a
 * query parameter, an inbox's link rewriter, and a copy-paste out of a plain
 * text email without a single character needing to be escaped.
 */
function mintRaw(): string {
  return randomBytes(32).toString("base64url");
}

export type MintResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; reason: "rate-limited" };

/**
 * Create a link token for `userId`, returning the RAW token for the email.
 *
 * Every previously outstanding token of the same kind for this user is burned
 * first. Asking for a second reset link has to invalidate the first, or an old
 * mail sitting in an inbox stays a working key for its full hour after the
 * person has already used a newer one.
 */
export async function mintToken(
  userId: string,
  kind: TokenKind,
  sentTo: string,
): Promise<MintResult> {
  const limit = RATE_LIMIT[kind];
  const since = new Date(Date.now() - limit.windowMinutes * 60_000);
  const recent = await prisma.authToken.count({
    where: { userId, kind, createdAt: { gte: since } },
  });
  if (recent >= limit.max) return { ok: false, reason: "rate-limited" };

  const raw = mintRaw();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES[kind] * 60_000);

  // Burn the older ones and write the new row together, so there is no instant
  // where a user has two live links (or, if the write failed, none at all).
  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { userId, kind, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.authToken.create({
      data: { userId, kind, tokenHash: hashToken(raw), expiresAt, sentTo },
    }),
  ]);

  // Opportunistic sweep of anything long dead, so the table cannot grow without
  // bound on a project that has no cron. Rows are kept a week PAST expiry: the
  // row is what lets an expired click say "this link has run out" instead of
  // the unhelpful "we do not recognise this link", and that distinction is
  // worth more than the handful of bytes. Best-effort and not awaited, so a
  // slow delete never holds up the mail.
  void prisma.authToken
    .deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60_000) } },
    })
    .catch(() => {});

  return { ok: true, token: raw, expiresAt };
}

export type ConsumeResult =
  | { ok: true; userId: string; email: string }
  /** No row matches. A typo, a truncated link, or a token from a deleted account. */
  | { ok: false; reason: "unknown" }
  /** Matched, but past its expiry. Worth its own screen: the person did nothing
   *  wrong and just needs a fresh link, which is one button rather than a
   *  restart of the whole flow. */
  | { ok: false; reason: "expired" }
  /** Matched, but already redeemed. Usually a second click on the same mail, or
   *  a mail client prefetching the link. Also worth its own screen. */
  | { ok: false; reason: "used" }
  /** The address moved on after the link was sent. */
  | { ok: false; reason: "stale" };

/**
 * Redeem a token. On success the row is marked used in the same query that
 * checks it, so two clicks racing each other cannot both win.
 *
 * `peek` reads the token WITHOUT burning it. The reset page needs that: it has
 * to know whether the link is good before it can decide what to render, and
 * spending the token on a page view would mean the actual password submission
 * a few seconds later always failed.
 */
export async function readToken(
  raw: string,
  kind: TokenKind,
  opts: { consume: boolean },
): Promise<ConsumeResult> {
  if (!raw) return { ok: false, reason: "unknown" };

  const row = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: {
      id: true,
      kind: true,
      userId: true,
      usedAt: true,
      expiresAt: true,
      sentTo: true,
      user: { select: { email: true } },
    },
  });

  if (!row) return { ok: false, reason: "unknown" };

  // A confirmation link must never be redeemable as a password reset. The hash
  // is unique across both kinds so this cannot happen today, but the check
  // costs nothing and keeps that from being an accident waiting on a future
  // refactor.
  if (row.kind !== kind) return { ok: false, reason: "unknown" };

  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  // The address moved on after the link was sent, so redeeming it would confirm
  // (or hand over) the wrong mailbox. A plain comparison: neither side is a
  // secret, and the attacker in this branch already holds the token.
  const current = row.user.email;
  if (current !== row.sentTo) return { ok: false, reason: "stale" };

  if (opts.consume) {
    // Conditional on still being unused, so of two simultaneous clicks exactly
    // one updates a row and the other comes back with count 0.
    const claimed = await prisma.authToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return { ok: false, reason: "used" };
  }

  return { ok: true, userId: row.userId, email: current };
}

/** Burn every outstanding token of a kind for one user. Called after a
 *  password actually changes, so any other reset links already in flight stop
 *  working the moment one of them is used. */
export async function burnTokens(userId: string, kind: TokenKind): Promise<void> {
  await prisma.authToken.updateMany({
    where: { userId, kind, usedAt: null },
    data: { usedAt: new Date() },
  });
}
