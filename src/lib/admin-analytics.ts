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

/** A single headline number, optionally with its own recent history. */
export type Metric = {
  key: string;
  label: string;
  value: number;
  /** "count" renders bare, "money" as rupees, "percent" as a rate, "days" as an age. */
  kind?: "count" | "money" | "percent" | "ratio";
  hint?: string;
  trend?: Trend;
};

export type Slice = { label: string; value: number; hint?: string };

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
    byHouse,
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
    prisma.user.groupBy({ by: ["batchType"], _count: { _all: true }, where: { batchType: { not: null } } }),
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
    byHouse: byHouse.map((h) => ({ label: h.batchType ?? "unset", value: h._count._all })),
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
  const [posts, letters, drafts, comments, likes, bookmarks, photos, photoLoves, topAuthors] =
    await Promise.all([
      prisma.post.count({ where: { kind: "post", ...PUBLISHED } }),
      prisma.post.count({ where: { kind: "letter", ...PUBLISHED } }),
      prisma.post.count({ where: { status: "draft" } }),
      prisma.comment.count(),
      prisma.like.count(),
      prisma.bookmark.count(),
      prisma.photo.count(),
      prisma.photoLove.count(),
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
    photoLoves,
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
  const [series, editions, prompts, entries, loves, byEdition] = await Promise.all([
    prisma.catchup.count(),
    prisma.catchupEdition.count(),
    prisma.catchupPrompt.count(),
    prisma.catchupEntry.count(),
    prisma.catchupEntryLove.count(),
    prisma.catchupEntry.groupBy({
      by: ["editionId"],
      _count: { _all: true },
      orderBy: { _count: { editionId: "desc" } },
      take: 8,
    }),
  ]);

  const editionRows = await prisma.catchupEdition.findMany({
    where: { id: { in: byEdition.map((e) => e.editionId) } },
    select: { id: true, number: true, status: true },
  });
  const label = new Map(editionRows.map((e) => [e.id, `Round ${e.number}`]));

  const answerers = await prisma.catchupEntry.findMany({
    distinct: ["authorId"],
    select: { authorId: true },
  });

  return {
    series,
    editions,
    prompts,
    entries,
    loves,
    people: answerers.length,
    /* The health number: a Round with ten questions and two answers is not
     * working, and neither total on its own would say so. */
    answersPerPrompt: prompts > 0 ? entries / prompts : 0,
    byEdition: byEdition.map((e) => ({
      label: label.get(e.editionId) ?? "unknown",
      value: e._count._all,
    })),
  };
}

/* ---------------------------------------------------------------- *
 *  Support: the funnel the owner asked about first
 * ---------------------------------------------------------------- */

export async function loadSupport() {
  const LIVE = { livemode: true } as const;
  const PAID = { ...LIVE, status: "paid" } as const;

  const [started, paid, failed, agg, givers, byMethod, recent] = await Promise.all([
    prisma.contribution.count({ where: LIVE }),
    prisma.contribution.count({ where: PAID }),
    prisma.contribution.count({ where: { ...LIVE, status: "failed" } }),
    prisma.contribution.aggregate({ where: PAID, _sum: { amount: true }, _avg: { amount: true } }),
    prisma.contribution.findMany({
      where: { ...PAID, userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.contribution.groupBy({
      by: ["method"],
      _count: { _all: true },
      where: { ...PAID, method: { not: null } },
      orderBy: { _count: { method: "desc" } },
    }),
    prisma.contribution.count({ where: { ...PAID, paidAt: { gte: ago(30) } } }),
  ]);

  const members = await prisma.user.count();

  return {
    started,
    paid,
    failed,
    recent,
    people: givers.length,
    totalPaise: agg._sum.amount ?? 0,
    avgPaise: Math.round(agg._avg.amount ?? 0),
    /* Of everyone who opened a payment, how many finished. The gap between
     * these two is the most actionable number on the page. */
    completion: started > 0 ? paid / started : 0,
    /* Of everyone who COULD give, how many have. */
    participation: members > 0 ? givers.length / members : 0,
    byMethod: byMethod.map((m) => ({ label: m.method ?? "unknown", value: m._count._all })),
  };
}

/* ---------------------------------------------------------------- *
 *  Mail: is it actually arriving
 * ---------------------------------------------------------------- */

export async function loadMail() {
  const [sent, failed, queued, delivered, bounced, complained, byKind] = await Promise.all([
    prisma.outboundEmail.count({ where: { status: "sent" } }),
    prisma.outboundEmail.count({ where: { status: "failed" } }),
    prisma.outboundEmail.count({ where: { status: { in: ["queued", "sending"] } } }),
    prisma.outboundEmail.count({ where: { deliveredAt: { not: null } } }),
    prisma.outboundEmail.count({ where: { bouncedAt: { not: null } } }),
    prisma.outboundEmail.count({ where: { complainedAt: { not: null } } }),
    prisma.outboundEmail.groupBy({ by: ["kind"], _count: { _all: true } }),
  ]);

  return {
    sent,
    failed,
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
