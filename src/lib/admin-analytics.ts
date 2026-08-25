import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 *  Everything /admin/analytics reads.
 *
 *  TWO KINDS OF NUMBER, deliberately kept apart:
 *
 *  1. LIVE -- counted from the tables right now. Exact, and the only way
 *     to get a breakdown (which batch, which city, who wrote most). These
 *     answer "what is true".
 *
 *  2. HISTORY -- read from MetricSnapshot, one row per metric per day,
 *     written nightly by scripts/ops/snapshot.mjs. These answer "which
 *     way is it going", and they are the only numbers that survive
 *     Sentry's 30-day window or PostHog's year.
 *
 *  Money filters on `livemode` EVERYWHERE. This database is shared with
 *  local dev and a Razorpay test order is indistinguishable from a real
 *  one by its ids alone, so an unfiltered sum turns a developer's test
 *  payment into revenue on a page the owner reads as fact.
 * ------------------------------------------------------------------ */

export type Trend = { day: string; value: number }[];

const day = 86_400_000;
const ago = (n: number) => new Date(Date.now() - n * day);

/* ---------------------------------------------------------------- *
 *  History
 * ---------------------------------------------------------------- */

/**
 * Every snapshot in the window, grouped by "source.metric".
 *
 * One query for the whole page rather than one per tile: at 27 metrics a
 * day, ninety days is ~2,400 rows, which is nothing to fetch and a great
 * deal to ask for individually.
 */
export async function loadTrends(days = 90): Promise<Map<string, Trend>> {
  const rows = await prisma.metricSnapshot.findMany({
    where: { day: { gte: ago(days) } },
    orderBy: { day: "asc" },
    select: { day: true, source: true, metric: true, value: true },
  });

  const out = new Map<string, Trend>();
  for (const r of rows) {
    const key = `${r.source}.${r.metric}`;
    const list = out.get(key) ?? [];
    list.push({ day: r.day.toISOString().slice(0, 10), value: r.value });
    out.set(key, list);
  }
  return out;
}

/* ---------------------------------------------------------------- *
 *  The community
 * ---------------------------------------------------------------- */

export async function loadPeople() {
  const [
    total,
    verified,
    blocked,
    dark,
    withPhoto,
    placed,
    active7,
    active30,
    neverSeen,
    joined30,
    byType,
    byBatch,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: { not: null } } }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.user.count({ where: { theme: "dark" } }),
    prisma.user.count({ where: { photoUrl: { not: null } } }),
    prisma.userPlace.findMany({ distinct: ["userId"], select: { userId: true } }),
    prisma.user.count({ where: { lastSeenAt: { gte: ago(7) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: ago(30) } } }),
    prisma.user.count({ where: { lastSeenAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: ago(30) } } }),
    prisma.user.groupBy({ by: ["accountType"], _count: { _all: true } }),
    prisma.user.groupBy({
      by: ["batchYear"],
      _count: { _all: true },
      where: { batchYear: { not: null } },
      orderBy: { batchYear: "desc" },
    }),
  ]);

  /* Decades, not individual years. Fifty-one people spread over forty years
   * makes a bar chart of 1s; the shape only becomes readable when grouped. */
  const decades = new Map<string, number>();
  for (const b of byBatch) {
    if (!b.batchYear) continue;
    const d = `${Math.floor(b.batchYear / 10) * 10}s`;
    decades.set(d, (decades.get(d) ?? 0) + b._count._all);
  }

  return {
    total,
    verified,
    blocked,
    dark,
    withPhoto,
    placed: placed.length,
    active7,
    active30,
    neverSeen,
    joined30,
    byType: byType.map((t) => ({ label: t.accountType ?? "unset", value: t._count._all })),
    byDecade: [...decades.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.label.localeCompare(a.label)),
  };
}

/* ---------------------------------------------------------------- *
 *  Where everyone is
 * ---------------------------------------------------------------- */

export async function loadGeography() {
  /* Cities come off UserPlace, which denormalises the name for exactly this
   * kind of read. COUNTRY does not live there -- it is on the Place gazetteer
   * row behind it -- so that half is a grouped join rather than a groupBy.
   * A member with no placeId (a free-typed city that matched nothing) has no
   * country and is correctly absent from the second list rather than bucketed
   * into a wrong one. */
  const [cities, countries] = await Promise.all([
    prisma.userPlace.groupBy({
      by: ["city"],
      _count: { _all: true },
      orderBy: { _count: { city: "desc" } },
      take: 12,
    }),
    prisma.$queryRaw<{ country: string; n: bigint }[]>`
      SELECT p."country" AS country, count(*)::bigint AS n
      FROM "UserPlace" up
      JOIN "Place" p ON p."id" = up."placeId"
      GROUP BY p."country"
      ORDER BY n DESC
      LIMIT 8
    `,
  ]);

  return {
    cities: cities.map((c) => ({ label: c.city, value: c._count._all })),
    countries: countries.map((c) => ({ label: c.country, value: Number(c.n) })),
  };
}

/* ---------------------------------------------------------------- *
 *  What people make
 * ---------------------------------------------------------------- */

/* Post.status is "published" | "draft"; drafts are letters saved before
 * sending and are only ever visible to their author, so they must never be
 * counted as things the community can read. */
const PUBLISHED = { status: "published", isHidden: false } as const;

export async function loadContent() {
  const [posts, letters, drafts, comments, likes, bookmarks, photos, topAuthors] =
    await Promise.all([
      prisma.post.count({ where: { kind: "post", ...PUBLISHED } }),
      prisma.post.count({ where: { kind: "letter", ...PUBLISHED } }),
      prisma.post.count({ where: { status: "draft" } }),
      prisma.comment.count(),
      prisma.like.count(),
      prisma.bookmark.count(),
      prisma.photo.count(),
      prisma.post.groupBy({
        by: ["authorId"],
        _count: { _all: true },
        where: PUBLISHED,
        orderBy: { _count: { authorId: "desc" } },
        take: 8,
      }),
    ]);

  /* Names resolved in one follow-up rather than a join, because groupBy
   * cannot include a relation. Eight ids is one cheap `in` query. */
  const authors = await prisma.user.findMany({
    where: { id: { in: topAuthors.map((a) => a.authorId).filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(authors.map((a) => [a.id, a.name]));

  return {
    posts,
    letters,
    drafts,
    comments,
    likes,
    bookmarks,
    photos,
    /* The number that says whether anything written gets READ, which is the
     * question the owner actually asked. A letter with no comments and no
     * hearts was published into silence. */
    responsePerPost: posts + letters > 0 ? (comments + likes) / (posts + letters) : 0,
    topAuthors: topAuthors
      .filter((a) => a.authorId)
      .map((a) => ({ label: nameOf.get(a.authorId!) ?? "unknown", value: a._count._all })),
  };
}

/* ---------------------------------------------------------------- *
 *  Catch-ups: are they actually being answered
 * ---------------------------------------------------------------- */

export async function loadCatchups() {
  const [prompts, entries, loves] = await Promise.all([
    prisma.catchupPrompt.count(),
    prisma.catchupEntry.count(),
    prisma.catchupEntryLove.count(),
  ]);

  const answerers = await prisma.catchupEntry.findMany({
    distinct: ["authorId"],
    select: { authorId: true },
  });

  return {
    entries,
    loves,
    people: answerers.length,
    /* The health number: a Round with ten questions and two answers is not
     * working, and neither total on its own would say so. */
    answersPerPrompt: prompts > 0 ? entries / prompts : 0,
  };
}

/* ---------------------------------------------------------------- *
 *  Mail: is it actually arriving
 * ---------------------------------------------------------------- */

export async function loadMail() {
  const [sent, queued, delivered, bounced, complained, byKind] = await Promise.all([
    prisma.outboundEmail.count({ where: { status: "sent" } }),
    prisma.outboundEmail.count({ where: { status: { in: ["queued", "sending"] } } }),
    prisma.outboundEmail.count({ where: { deliveredAt: { not: null } } }),
    prisma.outboundEmail.count({ where: { bouncedAt: { not: null } } }),
    prisma.outboundEmail.count({ where: { complainedAt: { not: null } } }),
    prisma.outboundEmail.groupBy({ by: ["kind"], _count: { _all: true } }),
  ]);

  return {
    sent,
    queued,
    delivered,
    bounced,
    complained,
    /* "sent" only ever meant Resend accepted it. This is the share that
     * demonstrably reached a mailbox, and it stays 0 until the webhook has
     * been receiving for a while -- which is a fact about our history, not a
     * failure, so the page says so rather than showing an alarming zero. */
    deliveryRate: sent > 0 ? delivered / sent : 0,
    byKind: byKind.map((k) => ({ label: k.kind, value: k._count._all })),
  };
}

/* ---------------------------------------------------------------- *
 *  Presence: who is here, where, on what, and for how long
 *
 *  The owner asked for this explicitly, for a stated purpose: finding
 *  where older alumni get stuck. It is per-person and identifiable by
 *  design, and it belongs in the site's privacy text.
 * ---------------------------------------------------------------- */

/** A visit is "live" if it saw a page view in the last 15 minutes. */
const ONLINE_MIN = 15;

export type Presence = {
  name: string | null;
  id: string;
  /* Carried so the avatar follows the same precedence it does everywhere
     else -- photo, then manual override, then the deterministic bird. Without
     them a member with a photo would show a bird here and nowhere else. */
  photoUrl: string | null;
  birdOverride: string | null;
  batchYear: number | null;
  path: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  city: string | null;
  country: string | null;
  startedAt: Date;
  endedAt: Date;
  views: number;
};

export async function loadPresence() {
  const now = Date.now();
  const online = new Date(now - ONLINE_MIN * 60_000);

  const [live, recent, sessionAgg, byDevice, byOs, byPath, returning] = await Promise.all([
    prisma.visit.findMany({
      where: { endedAt: { gte: online } },
      orderBy: { endedAt: "desc" },
      take: 40,
      include: {
        user: {
          select: { id: true, name: true, batchYear: true, photoUrl: true, birdOverride: true },
        },
      },
    }),
    prisma.visit.findMany({
      where: { endedAt: { gte: new Date(now - 24 * 3600_000), lt: online } },
      orderBy: { endedAt: "desc" },
      take: 25,
      include: {
        user: {
          select: { id: true, name: true, batchYear: true, photoUrl: true, birdOverride: true },
        },
      },
    }),
    /* Average length and depth over the last 30 days. Computed in SQL because
     * a duration is a subtraction Postgres does far better than JavaScript
     * does over a few thousand rows pulled across the wire. */
    prisma.$queryRaw<{ visits: bigint; avg_sec: number | null; avg_views: number | null; people: bigint }[]>`
      SELECT count(*)::bigint                                            AS visits,
             avg(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")))          AS avg_sec,
             avg("views")                                                AS avg_views,
             count(DISTINCT "userId")::bigint                            AS people
      FROM "Visit"
      WHERE "startedAt" >= now() - interval '30 days'
    `,
    prisma.visit.groupBy({
      by: ["device"],
      _count: { _all: true },
      where: { startedAt: { gte: new Date(now - 30 * 86_400_000) } },
      orderBy: { _count: { device: "desc" } },
    }),
    prisma.visit.groupBy({
      by: ["os"],
      _count: { _all: true },
      where: { startedAt: { gte: new Date(now - 30 * 86_400_000) }, os: { not: null } },
      orderBy: { _count: { os: "desc" } },
    }),
    prisma.visit.groupBy({
      by: ["lastPath"],
      _count: { _all: true },
      where: { startedAt: { gte: new Date(now - 30 * 86_400_000) }, lastPath: { not: null } },
      orderBy: { _count: { lastPath: "desc" } },
      take: 10,
    }),
    /* How many people came back on more than one day. The single best signal
     * that this is a place rather than a page somebody visited once. */
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM (
        SELECT "userId" FROM "Visit"
        WHERE "startedAt" >= now() - interval '30 days'
        -- The valley's day, not UTC's; see the loyalty query below (Low 46).
        GROUP BY "userId" HAVING count(DISTINCT date_trunc('day', ("startedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')) > 1
      ) t
    `,
  ]);

  const shape = (v: (typeof live)[number]): Presence => ({
    id: v.user.id,
    name: v.user.name,
    photoUrl: v.user.photoUrl,
    birdOverride: v.user.birdOverride,
    batchYear: v.user.batchYear,
    path: v.lastPath,
    device: v.device,
    os: v.os,
    browser: v.browser,
    city: v.city,
    country: v.country,
    startedAt: v.startedAt,
    endedAt: v.endedAt,
    views: v.views,
  });

  const agg = sessionAgg[0];

  return {
    online: live.map(shape),
    recent: recent.map(shape),
    visits30d: Number(agg?.visits ?? 0),
    people30d: Number(agg?.people ?? 0),
    /* Zero is honest for a single-page visit: they arrived and left. It is not
     * a missing number, and padding it would make the average a fiction. */
    avgSessionSec: Math.round(agg?.avg_sec ?? 0),
    avgViews: agg?.avg_views ?? 0,
    returning: Number(returning[0]?.n ?? 0),
    byDevice: byDevice.map((d) => ({ label: d.device ?? "unknown", value: d._count._all })),
    byOs: byOs.map((d) => ({ label: d.os ?? "unknown", value: d._count._all })),
    byPath: byPath.map((p) => ({ label: p.lastPath ?? "unknown", value: p._count._all })),
  };
}

/* ---------------------------------------------------------------- *
 *  What people look for, and where they arrive from
 * ---------------------------------------------------------------- */

export async function loadSearches() {
  const since = new Date(Date.now() - 90 * 86_400_000);

  const [top, byScope, empty, total] = await Promise.all([
    prisma.searchLog.groupBy({
      by: ["query"],
      _count: { _all: true },
      where: { createdAt: { gte: since } },
      orderBy: { _count: { query: "desc" } },
      take: 12,
    }),
    prisma.searchLog.groupBy({
      by: ["scope"],
      _count: { _all: true },
      where: { createdAt: { gte: since } },
      orderBy: { _count: { scope: "desc" } },
    }),
    /* The list worth acting on: searches that found NOTHING. Each one is a
     * person looking for someone or somewhere this site could not show them. */
    prisma.searchLog.groupBy({
      by: ["query"],
      _count: { _all: true },
      where: { createdAt: { gte: since }, results: 0 },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
    prisma.searchLog.count({ where: { createdAt: { gte: since } } }),
  ]);

  return {
    total,
    top: top.map((r) => ({ label: r.query, value: r._count._all })),
    byScope: byScope.map((r) => ({ label: r.scope, value: r._count._all })),
    empty: empty.map((r) => ({ label: r.query, value: r._count._all })),
  };
}

/** Where visits begin, and what sent people here. */
export async function loadArrivals() {
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [entry, referrer, language, region] = await Promise.all([
    prisma.visit.groupBy({
      by: ["entryPath"],
      _count: { _all: true },
      where: { startedAt: { gte: since }, entryPath: { not: null } },
      orderBy: { _count: { entryPath: "desc" } },
      take: 10,
    }),
    prisma.visit.groupBy({
      by: ["referrer"],
      _count: { _all: true },
      where: { startedAt: { gte: since }, referrer: { not: null } },
      orderBy: { _count: { referrer: "desc" } },
      take: 8,
    }),
    prisma.visit.groupBy({
      by: ["language"],
      _count: { _all: true },
      where: { startedAt: { gte: since }, language: { not: null } },
      orderBy: { _count: { language: "desc" } },
      take: 8,
    }),
    prisma.visit.groupBy({
      by: ["region"],
      _count: { _all: true },
      where: { startedAt: { gte: since }, region: { not: null } },
      orderBy: { _count: { region: "desc" } },
      take: 10,
    }),
  ]);

  return {
    entry: entry.map((r) => ({ label: r.entryPath ?? "unknown", value: r._count._all })),
    referrer: referrer.map((r) => ({ label: r.referrer ?? "direct", value: r._count._all })),
    language: language.map((r) => ({ label: r.language ?? "unknown", value: r._count._all })),
    region: region.map((r) => ({ label: r.region ?? "unknown", value: r._count._all })),
  };
}

/* ---------------------------------------------------------------- *
 *  Rhythms: when this place is actually alive
 * ---------------------------------------------------------------- */

/** hour 0-23 x weekday 0-6 (Sunday first), counted from visits. */
export async function loadRhythm() {
  /* IST, not UTC. "When is the community awake" is a question about people,
   * and almost all of them are in India; a UTC heatmap would put the evening
   * rush at 2pm and make the whole thing meaningless.
   *
   * TWO conversions, and the first one is not decoration. Visit.endedAt is
   * `timestamp WITHOUT time zone` holding a UTC wall clock, and a single
   * `AT TIME ZONE 'Asia/Kolkata'` on such a column means "read this wall time
   * AS Kolkata local", producing an instant 5h30 EARLIER -- the opposite of
   * the intended shift. EXTRACT then read it back in the session zone (UTC on
   * Supabase), so every bucket sat about 11 hours out and the "Busiest: <day>
   * around <hour> IST" line the owner is told to schedule mail against was
   * fiction. Measured live on 2026-08-21 against a real row: a visit stored at
   * 06:46 wall (12:16 IST) bucketed at hour 1 under the old expression and at
   * hour 12 under this one (bug audit B-101).
   *
   * `AT TIME ZONE 'UTC'` first stamps the naive value as the UTC instant it
   * actually is; the second converts that instant into Kolkata wall time. */
  const rows = await prisma.$queryRaw<{ dow: number; hour: number; n: bigint }[]>`
    SELECT EXTRACT(DOW  FROM ("endedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::int AS dow,
           EXTRACT(HOUR FROM ("endedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::int AS hour,
           count(*)::bigint AS n
    FROM "Visit"
    WHERE "endedAt" >= now() - interval '90 days'
    GROUP BY 1, 2
  `;

  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let peak = { dow: 0, hour: 0, n: 0 };
  for (const r of rows) {
    const n = Number(r.n);
    grid[r.dow][r.hour] = n;
    if (n > peak.n) peak = { dow: r.dow, hour: r.hour, n };
  }
  return { grid, peak, total: rows.reduce((n, r) => n + Number(r.n), 0) };
}

/* ---------------------------------------------------------------- *
 *  Faces: the superlatives, and who is interested in whom
 * ---------------------------------------------------------------- */

/** One row of a person leaderboard, as every one of those queries returns it. */
type PersonRow = { id: string; name: string; batchYear: number | null; n: bigint };

/**
 * A leaderboard, keyed on WHO rather than on what they are called.
 *
 * Every one of these lists used to `GROUP BY u."name"`, and User.name has no
 * unique constraint -- two members called the same thing collapsed into one
 * bar carrying the sum of both their counts, under one of their identities
 * (audit C-080). At two thousand alumni a shared name is not a hypothesis. The
 * numbers were quietly wrong and nothing on the page could show it, which is
 * the worst way for an analytics room to be wrong.
 *
 * Grouping by id then makes a NEW problem visible rather than hiding it: two
 * bars reading the same name. So a name that appears twice in one list -- and
 * only then -- carries its batch as a hint, which is also how the directory
 * tells two people apart. Unhinted rows are left exactly as they were, so the
 * usual list looks the way it always did.
 */
function personList(rows: PersonRow[], value: (r: PersonRow) => number = (r) => Number(r.n)) {
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(r.name, (seen.get(r.name) ?? 0) + 1);
  return rows.map((r) => ({
    label: r.name,
    value: value(r),
    hint: (seen.get(r.name) ?? 0) > 1 && r.batchYear != null ? `'${String(r.batchYear).slice(2)}` : undefined,
  }));
}

export async function loadFaces() {
  const [heartsGiven, heartsGot, loyal, longest, deepest, mostViewed, watchers, lurkers, isolated] =
    await Promise.all([
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear", count(*)::bigint AS n
        FROM "Like" l JOIN "User" u ON u.id = l."userId"
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear", count(*)::bigint AS n
        FROM "Like" l JOIN "Post" p ON p.id = l."postId" JOIN "User" u ON u.id = p."authorId"
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
      /* Distinct DAYS present, which is loyalty. Total visits rewards one
       * frantic afternoon; distinct days rewards turning up.
       *
       * The day is the VALLEY's, not UTC's. `date_trunc('day', ...)` on a naive
       * UTC column cuts at 05:30 IST, so an evening visit and the small-hours
       * one that followed it counted as two days, while two visits either side
       * of IST midnight counted as one (audit Low 46). Same double conversion
       * the Rhythms heatmap uses, and for the same reason (B-101): stamp the
       * naive value as UTC first, then read it in Asia/Kolkata. */
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear",
               count(DISTINCT date_trunc('day', (v."startedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'))::bigint AS n
        FROM "Visit" v JOIN "User" u ON u.id = v."userId"
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear",
               max(EXTRACT(EPOCH FROM (v."endedAt" - v."startedAt")))::bigint AS n
        FROM "Visit" v JOIN "User" u ON u.id = v."userId"
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear", max(v."views")::bigint AS n
        FROM "Visit" v JOIN "User" u ON u.id = v."userId"
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
      /* Whose profile gets looked at most. Self-views are never recorded, so
       * nobody tops their own list. */
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear", sum(cv."count")::bigint AS n
        FROM "ContentView" cv JOIN "User" u ON u.id = cv."targetId"
        WHERE cv.kind = 'profile'
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
      /* And who does the looking. The pair of these two lists is the closest
       * thing this community has to a social graph. */
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear", sum(cv."count")::bigint AS n
        FROM "ContentView" cv JOIN "User" u ON u.id = cv."viewerId"
        WHERE cv.kind = 'profile'
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
      /* Present but silent: visits recorded, nothing ever written. Not a
       * criticism -- most of any community reads -- but the ratio is the
       * health of the place. */
      prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*)::bigint AS n FROM "User" u
        WHERE u."lastSeenAt" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Post" p WHERE p."authorId" = u.id)
          AND NOT EXISTS (SELECT 1 FROM "Comment" c WHERE c."authorId" = u.id)
      `,
      /* THE ACTIONABLE ONE. Members whose own posts have never been hearted or
       * commented on, and who have never been messaged. Nobody has responded to
       * them. These are the people who quietly leave, and the owner can go and
       * say hello. */
      prisma.$queryRaw<{ id: string; name: string; batchYear: number | null }[]>`
        SELECT u.id, u."name", u."batchYear"
        FROM "User" u
        WHERE u."isBlocked" = false
          AND NOT EXISTS (
            SELECT 1 FROM "Like" l JOIN "Post" p ON p.id = l."postId"
            WHERE p."authorId" = u.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM "Comment" c JOIN "Post" p ON p.id = c."postId"
            WHERE p."authorId" = u.id AND c."authorId" <> u.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM "ContentView" cv WHERE cv.kind = 'profile' AND cv."targetId" = u.id
          )
        ORDER BY u."createdAt" DESC
        LIMIT 30
      `,
    ]);

  return {
    heartsGiven: personList(heartsGiven),
    heartsGot: personList(heartsGot),
    loyal: personList(loyal),
    /* Seconds in, minutes out: an hour-long visit shown as 3,600 is a number
     * nobody reads at a glance. */
    longest: personList(longest, (r) => Math.round(Number(r.n) / 60)),
    deepest: personList(deepest),
    mostViewed: personList(mostViewed),
    watchers: personList(watchers),
    lurkers: Number(lurkers[0]?.n ?? 0),
    isolated,
  };
}

/* ---------------------------------------------------------------- *
 *  Did each joining cohort stick around
 * ---------------------------------------------------------------- */

export async function loadRetention() {
  /* By BATCH DECADE, not by join month, and that is the whole point. The
   * owner's stated reason for this room is finding where older alumni
   * struggle, and a decade cohort answers it at population scale instead of
   * by anecdote: if 90% of the 2010s came back and 20% of the 1970s did, that
   * is a usability finding, not a coincidence. */
  const rows = await prisma.$queryRaw<
    { decade: string; joined: bigint; seen: bigint; recent: bigint }[]
  >`
    SELECT (floor(u."batchYear" / 10) * 10)::text || 's'                       AS decade,
           count(*)::bigint                                                     AS joined,
           count(*) FILTER (WHERE u."lastSeenAt" IS NOT NULL)::bigint           AS seen,
           count(*) FILTER (WHERE u."lastSeenAt" >= now() - interval '30 days')::bigint AS recent
    FROM "User" u
    WHERE u."batchYear" IS NOT NULL AND u."isBlocked" = false
    GROUP BY 1
    ORDER BY 1 DESC
  `;

  return rows.map((r) => ({
    decade: r.decade,
    joined: Number(r.joined),
    seen: Number(r.seen),
    recent: Number(r.recent),
    rate: Number(r.joined) > 0 ? Number(r.recent) / Number(r.joined) : 0,
  }));
}

/* ---------------------------------------------------------------- *
 *  Everything else worth knowing
 * ---------------------------------------------------------------- */

/** How complete people's profiles are. An empty profile gets no interaction. */
export async function loadProfiles() {
  const [f] = await prisma.$queryRaw<
    {
      total: bigint; about: bigint; work: bigint; phone: bigint;
      links: bigint; houses: bigint; photo: bigint; city: bigint; social: bigint;
      admission: bigint; verified: bigint; pending: bigint;
    }[]
  >`
    SELECT count(*)::bigint                                                   AS total,
           count(*) FILTER (WHERE "about"      <> '' AND "about"      IS NOT NULL)::bigint AS about,
           count(*) FILTER (WHERE "workplace"  <> '' AND "workplace"  IS NOT NULL)::bigint AS work,
           count(*) FILTER (WHERE "phone"      <> '' AND "phone"      IS NOT NULL)::bigint AS phone,
           count(*) FILTER (WHERE "links"      <> '' AND "links"      IS NOT NULL)::bigint AS links,
           count(*) FILTER (WHERE "houses"     <> '' AND "houses"     IS NOT NULL)::bigint AS houses,
           count(*) FILTER (WHERE "photoUrl"   IS NOT NULL)::bigint           AS photo,
           count(*) FILTER (WHERE "currentCity" IS NOT NULL)::bigint          AS city,
           count(*) FILTER (WHERE "instagram" IS NOT NULL OR "linkedin" IS NOT NULL
                              OR "facebook"  IS NOT NULL)::bigint             AS social,
           count(*) FILTER (WHERE "admissionNumber" IS NOT NULL)::bigint      AS admission,
           count(*) FILTER (WHERE "verifyState" = 'verified')::bigint         AS verified,
           count(*) FILTER (WHERE "verifyState" = 'pending')::bigint          AS pending
    FROM "User" WHERE "isBlocked" = false
  `;
  const n = (v: bigint | undefined) => Number(v ?? 0);
  const total = n(f?.total);

  /* Ordered by how EMPTY each field is, so the top of the list is what most
   * people have not filled in -- which is the thing worth prompting for. */
  const fields = [
    { label: "A photo", value: n(f?.photo) },
    { label: "A city", value: n(f?.city) },
    /* `about` only. The old `bio` column is retired -- nothing in the shipped
       profile renders it, and its one remaining writer is a stale onboarding
       action -- so counting it would have shown 0 of 51 forever and taught
       nobody anything. */
    { label: "An 'about' paragraph", value: n(f?.about) },
    { label: "Where they work", value: n(f?.work) },
    { label: "Houses", value: n(f?.houses) },
    { label: "A phone number", value: n(f?.phone) },
    { label: "Social links", value: n(f?.social) },
    { label: "Other links", value: n(f?.links) },
    { label: "Admission number", value: n(f?.admission) },
  ].sort((a, b) => a.value - b.value);

  return { total, fields, verified: n(f?.verified), pending: n(f?.pending) };
}

/** Notifications: are they read, and do they bring anyone back. */
export async function loadNotifications() {
  const [total, read, byType] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { read: true } }),
    prisma.notification.groupBy({
      by: ["type"],
      _count: { _all: true },
      orderBy: { _count: { type: "desc" } },
      take: 10,
    }),
  ]);
  return {
    total,
    read,
    rate: total > 0 ? read / total : 0,
    byType: byType.map((r) => ({ label: r.type, value: r._count._all })),
  };
}

/** Joins per month: the growth curve, off createdAt in the VALLEY's month.
 *
 *  Not UTC's. `createdAt` is a naive timestamp holding UTC wall time, so
 *  truncating it directly cuts the month at 05:30 IST on the 1st -- somebody
 *  who joined at ten in the evening on the last day of a month landed in the
 *  month before (audit C-143). Every other bucket in this file already does
 *  the double conversion (the Rhythms heatmap, the loyalty count, joinedMonth
 *  below); these two were the ones that never got it. */
export async function loadGrowth() {
  const rows = await prisma.$queryRaw<{ month: string; n: bigint }[]>`
    SELECT to_char(date_trunc('month', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'), 'Mon YYYY') AS month,
           count(*)::bigint AS n
    FROM "User"
    GROUP BY date_trunc('month', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')
    ORDER BY date_trunc('month', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') DESC
    LIMIT 12
  `;
  return rows.map((r) => ({ label: r.month, value: Number(r.n) }));
}

/** Talking: comments, messages, polls, bookmarks -- the quieter interactions. */
export async function loadInteractions() {
  const [topCommenters, threads, adminMsgs, pollVotes, bookmarkers, photoLovers] =
    await Promise.all([
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear", count(*)::bigint AS n
        FROM "Comment" c JOIN "User" u ON u.id = c."authorId"
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
      prisma.adminThread.count(),
      prisma.adminMessage.count(),
      prisma.pollVote.count(),
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear", count(*)::bigint AS n
        FROM "Bookmark" b JOIN "User" u ON u.id = b."userId"
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
      prisma.$queryRaw<PersonRow[]>`
        SELECT u.id, u."name", u."batchYear", count(*)::bigint AS n
        FROM "PhotoLove" pl JOIN "User" u ON u.id = pl."userId"
        GROUP BY u.id, u."name", u."batchYear" ORDER BY n DESC LIMIT 8
      `,
    ]);
  return {
    topCommenters: personList(topCommenters),
    bookmarkers: personList(bookmarkers),
    photoLovers: personList(photoLovers),
    threads,
    adminMsgs,
    pollVotes,
  };
}

/** What actually gets opened: reads against reactions, per letter. */
export async function loadReading() {
  const [letters, photos, rounds] = await Promise.all([
    prisma.$queryRaw<{ title: string | null; reads: bigint; readers: bigint; hearts: bigint }[]>`
      SELECT p."title",
             coalesce(sum(cv."count"), 0)::bigint AS reads,
             count(DISTINCT cv."viewerId")::bigint AS readers,
             (SELECT count(*) FROM "Like" l WHERE l."postId" = p.id)::bigint AS hearts
      FROM "Post" p
      LEFT JOIN "ContentView" cv ON cv.kind = 'letter' AND cv."targetId" = p.id
      WHERE p.kind = 'letter' AND p.status = 'published'
      GROUP BY p.id, p."title"
      ORDER BY reads DESC, hearts DESC
      LIMIT 10
    `,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT coalesce(sum("count"), 0)::bigint AS n FROM "ContentView" WHERE kind = 'photo'
    `,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT coalesce(sum("count"), 0)::bigint AS n FROM "ContentView" WHERE kind = 'round'
    `,
  ]);

  return {
    letters: letters.map((l) => ({
      title: l.title ?? "Untitled",
      reads: Number(l.reads),
      readers: Number(l.readers),
      hearts: Number(l.hearts),
    })),
    photoViews: Number(photos[0]?.n ?? 0),
    roundViews: Number(rounds[0]?.n ?? 0),
  };
}

/* ---------------------------------------------------------------- *
 *  One row per member, every measure at once.
 *
 *  The point of doing it this way: with a per-member table in hand,
 *  ANY grouping ("by decade", "by device") and ANY correlation ("do
 *  people who give hearts also get them") is arithmetic in JavaScript
 *  rather than another SQL query. One trip to the database answers a
 *  question nobody has asked yet.
 *
 *  Cheap because the community is small. 2,000 members x ~20 numbers is
 *  a few hundred KB; the moment that stops being true, this becomes a
 *  materialised table refreshed by the nightly snapshot instead.
 * ---------------------------------------------------------------- */

export type MemberRow = {
  id: string;
  name: string;
  batchYear: number | null;
  decade: string;
  accountType: string;
  verifyState: string;
  hasPhoto: boolean;
  country: string;
  device: string;
  joinedMonth: string;
  fieldsFilled: number;
  completeness: number;
  likesGiven: number;
  likesGot: number;
  comments: number;
  posts: number;
  catchupAnswers: number;
  bookmarks: number;
  photoHearts: number;
  visits: number;
  minutes: number;
  pageViews: number;
  daysActive: number;
  profileOpensGot: number;
  profileOpensGave: number;
  searches: number;
};

/** The nine profile fields counted toward completeness. `bio` is excluded: it
 *  is retired and nothing in the shipped profile renders it. */
const PROFILE_FIELDS = 9;

export async function loadMemberMetrics(): Promise<MemberRow[]> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    WITH
      likes_given AS (SELECT "userId" id, count(*) n FROM "Like" GROUP BY 1),
      likes_got AS (
        SELECT p."authorId" id, count(*) n
        FROM "Like" l JOIN "Post" p ON p.id = l."postId" GROUP BY 1
      ),
      cmts AS (SELECT "authorId" id, count(*) n FROM "Comment" GROUP BY 1),
      posts AS (SELECT "authorId" id, count(*) n FROM "Post" WHERE status = 'published' GROUP BY 1),
      answers AS (SELECT "authorId" id, count(*) n FROM "CatchupEntry" GROUP BY 1),
      marks AS (SELECT "userId" id, count(*) n FROM "Bookmark" GROUP BY 1),
      phearts AS (SELECT "userId" id, count(*) n FROM "PhotoLove" GROUP BY 1),
      vis AS (
        SELECT "userId" id,
               count(*) n,
               sum(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) / 60 mins,
               sum("views") views,
               -- The valley's day, not UTC's (audit Low 46).
               count(DISTINCT date_trunc('day', ("startedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')) days,
               mode() WITHIN GROUP (ORDER BY "device") dev
        FROM "Visit" GROUP BY 1
      ),
      opens_got AS (
        SELECT "targetId" id, sum("count") n FROM "ContentView"
        WHERE kind = 'profile' GROUP BY 1
      ),
      opens_gave AS (
        SELECT "viewerId" id, sum("count") n FROM "ContentView"
        WHERE kind = 'profile' GROUP BY 1
      ),
      srch AS (SELECT "userId" id, count(*) n FROM "SearchLog" WHERE "userId" IS NOT NULL GROUP BY 1),
      place AS (
        SELECT up."userId" id, min(p."country") c
        FROM "UserPlace" up JOIN "Place" p ON p.id = up."placeId" GROUP BY 1
      )
    SELECT
      u.id, u."name", u."batchYear", u."accountType", u."verifyState",
      (u."photoUrl" IS NOT NULL)                                        AS "hasPhoto",
      coalesce(place.c, 'unknown')                                      AS country,
      coalesce(vis.dev, 'never visited')                                AS device,
      -- The valley's month, not UTC's (audit C-143), same conversion as the
      -- visit-day count above it.
      to_char((u."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'Mon YYYY') AS "joinedMonth",
      (   (u."about"       IS NOT NULL AND u."about"       <> '')::int
        + (u."workplace"   IS NOT NULL AND u."workplace"   <> '')::int
        + (u."jobTitle"    IS NOT NULL AND u."jobTitle"    <> '')::int
        + (u."currentCity" IS NOT NULL AND u."currentCity" <> '')::int
        + (u."houses"      IS NOT NULL AND u."houses"      <> '')::int
        + (u."phone"       IS NOT NULL AND u."phone"       <> '')::int
        + (u."links"       IS NOT NULL AND u."links"       <> '')::int
        + (u."photoUrl"    IS NOT NULL)::int
        + (u."instagram" IS NOT NULL OR u."linkedin" IS NOT NULL
           OR u."facebook" IS NOT NULL)::int )                          AS "fieldsFilled",
      coalesce(likes_given.n, 0) AS "likesGiven",
      coalesce(likes_got.n, 0)   AS "likesGot",
      coalesce(cmts.n, 0)        AS comments,
      coalesce(posts.n, 0)       AS posts,
      coalesce(answers.n, 0)     AS "catchupAnswers",
      coalesce(marks.n, 0)       AS bookmarks,
      coalesce(phearts.n, 0)     AS "photoHearts",
      coalesce(vis.n, 0)         AS visits,
      coalesce(vis.mins, 0)      AS minutes,
      coalesce(vis.views, 0)     AS "pageViews",
      coalesce(vis.days, 0)      AS "daysActive",
      coalesce(opens_got.n, 0)   AS "profileOpensGot",
      coalesce(opens_gave.n, 0)  AS "profileOpensGave",
      coalesce(srch.n, 0)        AS searches
    FROM "User" u
    LEFT JOIN likes_given ON likes_given.id = u.id
    LEFT JOIN likes_got   ON likes_got.id   = u.id
    LEFT JOIN cmts        ON cmts.id        = u.id
    LEFT JOIN posts       ON posts.id       = u.id
    LEFT JOIN answers     ON answers.id     = u.id
    LEFT JOIN marks       ON marks.id       = u.id
    LEFT JOIN phearts     ON phearts.id     = u.id
    LEFT JOIN vis         ON vis.id         = u.id
    LEFT JOIN opens_got   ON opens_got.id   = u.id
    LEFT JOIN opens_gave  ON opens_gave.id  = u.id
    LEFT JOIN srch        ON srch.id        = u.id
    LEFT JOIN place       ON place.id       = u.id
    WHERE u."isBlocked" = false
  `;

  const num = (v: unknown) => Number(v ?? 0);
  return rows.map((r) => {
    const year = r.batchYear as number | null;
    const filled = num(r.fieldsFilled);
    return {
      id: String(r.id),
      name: String(r.name),
      batchYear: year,
      decade: year ? `${Math.floor(year / 10) * 10}s` : "unknown",
      accountType: String(r.accountType ?? "unknown"),
      verifyState: String(r.verifyState ?? "unknown"),
      hasPhoto: Boolean(r.hasPhoto),
      country: String(r.country),
      device: String(r.device),
      joinedMonth: String(r.joinedMonth),
      fieldsFilled: filled,
      completeness: filled / PROFILE_FIELDS,
      likesGiven: num(r.likesGiven),
      likesGot: num(r.likesGot),
      comments: num(r.comments),
      posts: num(r.posts),
      catchupAnswers: num(r.catchupAnswers),
      bookmarks: num(r.bookmarks),
      photoHearts: num(r.photoHearts),
      visits: num(r.visits),
      minutes: num(r.minutes),
      pageViews: num(r.pageViews),
      daysActive: num(r.daysActive),
      profileOpensGot: num(r.profileOpensGot),
      profileOpensGave: num(r.profileOpensGave),
      searches: num(r.searches),
    };
  });
}

/* ---------------------------------------------------------------- *
 *  The journey from signing up to belonging, by generation
 * ---------------------------------------------------------------- */

export type JourneyRow = {
  decade: string;
  joined: number;
  steps: { label: string; n: number }[];
  /** Median hours between the confirmation email being sent and the link
   *  being tapped. Median, not mean: one person who confirmed after three
   *  weeks would drag an average into nonsense. */
  medianVerifyHours: number | null;
};

export async function loadJourney() {
  const [funnel, verify, failures, lockedOut, recentFails] = await Promise.all([
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT CASE WHEN u."batchYear" IS NULL THEN 'unknown'
                  ELSE (floor(u."batchYear" / 10) * 10)::text || 's' END        AS decade,
             count(*)::int                                                       AS joined,
             count(*) FILTER (WHERE u."emailVerified" IS NOT NULL)::int          AS confirmed,
             count(*) FILTER (WHERE u."about" IS NOT NULL OR u."workplace" IS NOT NULL
                                 OR u."currentCity" IS NOT NULL OR u."phone" IS NOT NULL
                                 OR u."links" IS NOT NULL OR u."photoUrl" IS NOT NULL
                                 OR u."instagram" IS NOT NULL OR u."linkedin" IS NOT NULL)::int
                                                                                 AS "filledAnything",
             count(*) FILTER (WHERE u."houses" IS NOT NULL AND u."houses" <> '')::int AS houses,
             count(*) FILTER (WHERE u."photoUrl" IS NOT NULL)::int               AS photo,
             count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "Post" p WHERE p."authorId" = u.id)
                                 OR EXISTS (SELECT 1 FROM "Comment" c WHERE c."authorId" = u.id)
                                 OR EXISTS (SELECT 1 FROM "CatchupEntry" e WHERE e."authorId" = u.id))::int
                                                                                 AS wrote,
             count(*) FILTER (WHERE u."lastSeenAt" IS NOT NULL)::int             AS "cameBack"
      FROM "User" u WHERE u."isBlocked" = false
      GROUP BY 1 ORDER BY 1 DESC
    `,
    /* AuthToken records when a confirmation link was minted and when it was
     * used, so this is an exact measurement rather than an estimate. */
    prisma.$queryRaw<{ decade: string; hours: number | null }[]>`
      SELECT CASE WHEN u."batchYear" IS NULL THEN 'unknown'
                  ELSE (floor(u."batchYear" / 10) * 10)::text || 's' END AS decade,
             percentile_cont(0.5) WITHIN GROUP (
               ORDER BY EXTRACT(EPOCH FROM (t."usedAt" - t."createdAt")) / 3600
             ) AS hours
      FROM "AuthToken" t JOIN "User" u ON u.id = t."userId"
      WHERE t.kind = 'verify' AND t."usedAt" IS NOT NULL
      GROUP BY 1
    `,
    prisma.loginAttempt.groupBy({
      by: ["reason"],
      _count: { _all: true },
      orderBy: { _count: { reason: "desc" } },
    }),
    /* THE LIST THAT MATTERS. Addresses that have failed and never once
     * succeeded: somebody trying to get in who still cannot.
     *
     * The LEFT JOIN is the second half of that sentence. Purging an account
     * deletes the User row and leaves its LoginAttempt rows standing --
     * account-purge.ts touches neither this table nor the userId on it -- so
     * without the join an address whose owner is GONE keeps being counted as
     * a person locked out, under a panel that says "worth emailing them
     * directly". Found 2026-08-25: the tile had been red for six days over
     * phase2-probe-...@example.invalid, a throwaway the security probe blocked
     * on purpose and then deleted. Nobody was locked out.
     *
     * Both conditions are aggregates over the whole address, deliberately, so
     * one dropped row cannot flip an address INTO the list: keep it only if
     * every attempt failed AND no attempt points at an account that has since
     * vanished. A userId of NULL is not a vanished account -- it is the
     * ordinary "no account with that address" failure, which is exactly the
     * person this panel is for. */
    prisma.$queryRaw<{ email: string; tries: bigint; last: Date }[]>`
      SELECT l.email, count(*)::bigint AS tries, max(l."createdAt") AS last
      FROM "LoginAttempt" l
      LEFT JOIN "User" u ON u.id = l."userId"
      GROUP BY l.email
      HAVING bool_and(l.ok = false)
         AND bool_and(l."userId" IS NULL OR u.id IS NOT NULL)
      ORDER BY count(*) DESC
      LIMIT 20
    `,
    prisma.loginAttempt.count({
      where: { ok: false, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
    }),
  ]);

  const hoursBy = new Map(verify.map((v) => [v.decade, v.hours]));
  const n = (r: Record<string, unknown>, k: string) => Number(r[k] ?? 0);

  const rows: JourneyRow[] = funnel.map((r) => ({
    decade: String(r.decade),
    joined: n(r, "joined"),
    steps: [
      { label: "Signed up", n: n(r, "joined") },
      { label: "Confirmed email", n: n(r, "confirmed") },
      { label: "Filled in anything", n: n(r, "filledAnything") },
      { label: "Added houses", n: n(r, "houses") },
      { label: "Added a photo", n: n(r, "photo") },
      { label: "Wrote something", n: n(r, "wrote") },
      { label: "Came back", n: n(r, "cameBack") },
    ],
    medianVerifyHours: hoursBy.get(String(r.decade)) ?? null,
  }));

  return {
    rows,
    failures: failures.map((f) => ({ label: f.reason, value: f._count._all })),
    lockedOut: lockedOut.map((l) => ({
      email: l.email,
      tries: Number(l.tries),
      last: l.last,
    })),
    failsThisWeek: recentFails,
  };
}
