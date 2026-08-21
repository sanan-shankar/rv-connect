# The demo

A public, no-login showcase of the site at `demo.rishivalley.space`. You send
someone a link, it opens on the feed, and they can use the whole product
without an account, a password, or a word of explanation from you.

It is a **second Vercel project, built from this same repository, pointed at a
second Supabase database** that contains nothing but invented people.

---

## Why a second database, and not a `/demo` route

Because it is the only version where a mistake is cheap.

The demo is a link anyone can open and share onward. Every other safeguard in
this document is a piece of code that could have a bug in it. The separate
database is not: a process holding the demo connection string has no way to
reach a real member's phone number, because that data is not in its world at
all. The same goes for the R2 keys and the Razorpay secrets, which the demo
project simply does not have.

It also happens to be the prettier option. The real database currently holds
37 people, 16 posts and one photograph, so a demo pointed at it would be a
showcase of an empty room.

---

## Setting it up

### 1. A Supabase project for the demo

Create a new project (free tier is fine), region **ap-south-1 (Mumbai)**, same
as production. Then from this repo:

The one that exists was created on 2026-08-07:

| | |
|---|---|
| Project | `rv-alumni-demo` |
| Ref | `cbvlzptghkuxhygyaezq` |
| Region | `ap-south-1` (Mumbai) |
| Pooler host | `aws-0-ap-south-1.pooler.supabase.com` |
| DB user | `postgres.cbvlzptghkuxhygyaezq` |

`.env.demo` (gitignored) holds only the credentials:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<pw>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
DEMO_MODE=1
```

Both are the POOLER, on `aws-0` (not `aws-1`, which resolves but answers
"tenant not found" for this ref). Not the direct `db.<ref>.supabase.co` host:
that is IPv6-only on the free tier, confirmed by DNS lookup, and will not
resolve from a typical machine or a Vercel build.

The password is embedded in the `DATABASE_URL` in `.env.demo`, which is
gitignored. (It used to be duplicated into a separate `.demo-db-password` file;
that was deleted on 2026-08-08, because one credential written in two places is
one more place for it to leak from and nothing read the second copy.)

Push the schema and seed it:

```bash
# Schema. NOT `prisma db push`: prisma.config.ts opens with
# `import "dotenv/config"`, which loads the repo's .env (the REAL database),
# and whether an injected DIRECT_URL beats that depends on dotenv's
# no-override behaviour. Too close to call when the downside is running DDL
# against production. So generate the SQL offline and apply it to a
# connection built explicitly from .env.demo:
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > /tmp/demo-schema.sql
node scripts/demo/apply-schema.mjs /tmp/demo-schema.sql

# Content.
npx tsx scripts/demo/seed-demo.mts
```

`apply-schema.mjs` refuses to run unless the connection string names the demo
project ref AND the target database has zero tables. Production has thirty, so
a misdirected run stops rather than rewriting it.

`seed-demo.mts` is `.mts`, not `.ts`: this package has no `"type": "module"`,
so tsx compiles a plain `.ts` as CJS and its top-level `await` fails to build.

This also creates the `Catchup*` tables, which the production database does
not have yet. That is fine and slightly useful: the demo can show Catch-ups
working before production migrates.

The seed script refuses to run unless `.env.demo` sets `DEMO_MODE=1` and its
`DATABASE_URL` differs from the one in `.env`. It deletes every row in the
database it connects to, so those two checks are the difference between a
re-seed and an accident.

### 2. A Vercel project for the demo

New project, same Git repository, same `bom1` region.

Environment variables:

| Variable | Value |
|---|---|
| `DEMO_MODE` | `1` |
| `DATABASE_URL` | the demo transaction pooler URL |
| `DIRECT_URL` | the demo session pooler URL |
| `CRON_SECRET` | any long random string |
| `AUTH_SECRET` | any long random string (unused, but Next Auth wants one) |

**Do not set** `ADMIN_EMAIL`, any `R2_*`, any `RAZORPAY_*`, or `RESEND_API_KEY`.
The demo has no use for them, and a secret that is not in the environment is a
secret that cannot leak from it.

### Domain

`demo.rishivalley.space` is attached to the project. `rishivalley.space` runs
on Namecheap's nameservers (`dns1/dns2.registrar-servers.com`), not Vercel's,
so the record has to be created there:

| Type | Host | Value |
|---|---|---|
| `CNAME` | `demo` | `cname.vercel-dns.com` |

Vercel's own suggestion is `A demo 76.76.21.21`. Either works; the CNAME is
preferred because it survives Vercel changing that IP.

Until the record exists the domain will not resolve, and the deployment is
reachable at `rv-alumni-demo.vercel.app`.

### 3. Filling the Collection

The Collection is the one surface still waiting on you. This repository owns
exactly one photograph (the banyan and the assembly benches, cropped twelve
ways), so the demo seeds six framings of it rather than pretending to a fuller
archive than exists.

To fill it, put images in `demo-photos/` at the repo root, naming each file
with the caption you want under it, then:

```bash
node scripts/demo/add-photos.mjs   # any format sharp reads
npx tsx scripts/demo/seed-demo.mts
```

The filename becomes the caption, a four-digit year in it sets the decade
filter, credits rotate across six invented contributors, and each photo gets a
stable heart count so a reseed does not reshuffle "Most loved". It writes the
1600px display copy and 480px thumbnail (the same pipeline the real upload
route uses) into `public/images/collection/`, and regenerates
`src/lib/demo-seed/photos.generated.ts`, which the seed merges ahead of the
hand-written six. Nothing hand-written is edited, so reruns are always safe.

No bucket is involved at any point, which is exactly why the demo can afford
to refuse every upload a visitor attempts.

---

## What a visitor can and cannot do

The demo's posture is **default-deny**: a write is refused unless something
explicitly permits it. A server action added six months from now is therefore
born blocked rather than born exposed, which is the only way a list like this
stays true.

### They can

Post, comment, reply, love, bookmark, vote in polls, love a photo, answer the
Catch-up, love an answer, edit their own profile, move their pins on the map,
and read every surface.

Not their bird, though it reads like it should be on that list: picking one
is the `/pick-bird` supporter perk, gated on a real Razorpay contribution the
demo cannot take, so `chooseBird` refuses outright in demo mode (bug audit
M62) and nothing else writes `User.birdOverride`. Everyone keeps the bird
their account hashed to.

All of it is real: it goes to the database and it is still there on refresh.
Nothing is faked, because a demo that quietly discards your input is worse than
no demo.

### They cannot

| Blocked | Because |
|---|---|
| Upload any image | Bytes into a bucket from an anonymous link is the most dangerous thing this app could offer a stranger |
| Report a post or person | Reporting summons a real moderator |
| Message the admins | Same |
| Contribute money | Real Razorpay, real money |
| Reach the admin panel | Their session's `role` is pinned to `member`, whatever the row says |
| End a Catch-up | Irreversible, and it would delete seeded content |
| Nudge the group | Would notify everybody |
| Delete the account | It is the only persona there is |
| Make themselves an admin, verify themselves, unblock themselves, change their email | Privilege escalation and identity takeover |
| Reach `/admin`, `/lab`, `/signup`, `/welcome`, `/verify` | Not part of the product story |
| Reach `/api/upload/*`, `/api/razorpay/*`, `/api/auth/*` | Bytes, money and sessions |

### Where each of those is enforced

Three layers, outermost first. Each is independently sufficient for most of
the list, which is the point.

1. **`src/proxy.ts`** — closes routes before any route code runs. Cannot be
   reached around by calling the handler directly.
2. **The action's own front door** — `if (IS_DEMO) return { error: "..." }` at
   the top of the dozen actions worth naming individually, so the UI shows a
   sentence written for that button rather than a generic failure. These are
   the ones with side effects *outside* Postgres (R2, Razorpay, email), which
   fire before any database write and so must be stopped earlier than the
   database.
3. **`src/lib/demo.ts` + the Prisma extension in `src/lib/prisma.ts`** — the
   backstop. Every query in demo mode passes `demoWriteAllowed()` before it
   reaches Postgres. This is what catches whatever nobody thought to name.

Layer 3's policy is written down as tests in `src/lib/demo.test.mjs`, phrased
as the attacks they prevent:

```bash
node --test src/lib/demo.test.mjs src/lib/demo-seed/content.test.mjs
```

Those test the POLICY. To test the WIRING, against a real Postgres, with
`DEMO_MODE=1` set the way the deployment sets it:

```bash
npx tsx scripts/demo/verify-guard.mts
```

Run that one after touching anything in `demo.ts` or `prisma.ts`. It exists
because it caught two leaks that every unit test happily passed over:

- The extension was mounted at `query.$allModels.$allOperations`, which never
  sees raw SQL. A live `$executeRawUnsafe` renamed all 40 users. It now sits at
  the top level of `query`, where `model` arrives `undefined` for raw calls.
- `Post` is a writable model, so `post.deleteMany({})` emptied the entire feed
  in one call. Unfiltered bulk writes are now refused outright.

A correct policy that is not actually attached to the client protects nothing,
and no amount of unit testing will tell you.

### Identity

There is no login and no session token. `auth()` in `src/lib/auth.ts` returns a
constant when `DEMO_MODE=1`: everyone who opens the link is Meera Sundaram,
batch of 2011. There is no session to steal because there is no session, and
`role` is hardcoded to `member` at that same point, so a tampered database row
still cannot open the admin surface.

Everyone shares that one persona, which means two people using the demo at the
same time see each other's posts. That is a deliberate trade (per-visitor
sandboxing would need row-level tenancy on every table) and the nightly reset
is what makes it acceptable.

---

## Resetting

`POST /api/demo/reset` wipes and rewrites everything from
`src/lib/demo-seed/`. It is a full rewrite rather than a targeted cleanup,
because that is the only version whose correctness is obvious.

It runs:

- **nightly at 20:00 UTC** (01:30 IST) via the cron in `vercel.json`,
  authenticated with `CRON_SECRET`;
- whenever anyone presses **Reset** in the demo bar, throttled to one run per
  20 seconds per instance.

The same cron entry exists on the production project, where the route returns
`{ ok: true, skipped: ... }` and does nothing. Both projects build from one
`vercel.json`, and a clean no-op beats a failed-cron alert every morning.

The reset uses an **unguarded** Prisma client, which is the one deliberate hole
in the write policy. It is acceptable because the route does not exist unless
`DEMO_MODE=1`, its blast radius is one database of invented people that is
fully reproducible from this repository, and the worst an attacker buys is
"the demo looks freshly seeded", which is what the cron does anyway.

The clear-then-rewrite inside `seedDemo()` (`src/lib/demo-seed/seed.ts`) runs
as **one Postgres transaction**. Until this was a bug (audit M61) it was
~40 independent statements, and a request landing mid-reset could see the
world half gone -- worst of all the `User` table cleared but not yet
rewritten, since that row is also the shared demo persona's identity:
`auth()` returns null for every page mid-reset, which sends the visitor to
`/login`, a page with no working way back in for them (no password, no
signup route, no `/api/auth`) in demo mode. Wrapping the rewrite in one
transaction means another connection sees the fully-old world or the
fully-new one and nothing in between, and a failure partway through rolls
back to the old world intact instead of leaving whichever statement got
furthest sitting there until the next successful reset.

---

## The invented people

Everyone is fictional. Sign-in addresses sit on `.invalid`, the TLD RFC 2606
reserves precisely so it can never resolve, so nothing in that database can be
mistaken for a way to reach a real person. No real member's name, employer or
city appears.

Batches run 1971 to 2024 so the directory's filters have something to bite on,
cities are all keys `src/lib/city-coords.ts` can place so no map pin lands in
the sea, and houses come from the canonical 22 in `src/lib/houses.ts`. Birds
are not authored at all: they hash deterministically from user id, so a varied
aviary comes free.

Those same cities are also the whole `Place` table in the demo database:
`src/lib/demo-seed/places.ts` hand-writes a 29-row slice of the real
234,934-row GeoNames gazetteer, one row per city ALL_DEMO_PEOPLE actually
lives in, so the "Where you are" editor's type-ahead has something real to
find instead of the free-text fallback it silently takes on a miss.

Content lives in `src/lib/demo-seed/people.ts` and `content.ts`. It is written
by hand rather than generated, because the feed is the first thing anyone sees
and filler reads as filler instantly.
