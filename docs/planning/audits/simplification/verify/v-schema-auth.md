# v-schema-auth — verification notes

Verifier: adversarial pass over the schema/auth cluster. Date: 2026-08-25.
HEAD at time of verification: c74d99f (same as find-phase snapshot's stated tip, but the
catchups admin reading room from 6d5609e IS in this tree and matters — see catchups-16).
Working tree: only the audit's own untracked files; no uncommitted edits to any file I read.

Method: read-only. `src/lib/auth.ts` read in full (461 lines). All greps exclude
`src/generated/`. NextAuth reachability checked against the installed dist
(`node_modules/@auth/core` 0.41.3, `next-auth` 5.0.0-beta.32), not docs.

---

## 1. The adapter-inert claim (dependency-diet-04, and the core of data-layer-01)

**VERDICT: the adapter is genuinely inert under this config. Confirmed.**

Config at HEAD (`src/lib/auth.ts`):
- line 58: `adapter: PrismaAdapter(prisma as any)` (with an eslint-disable on 57)
- lines 59-256: exactly one provider, `Credentials`
- line 283: `session: { strategy: "jwt", maxAge: SESSION_MAX_AGE }` — explicit, so
  `init.js:74`'s `strategy: config.adapter ? "database" : "jwt"` default never applies
- no `events` configured; `callbacks` are `jwt` and `session` only, neither touches an adapter

Every adapter method call in the installed dist, and its gate:

| call site | gate |
|---|---|
| `@auth/core/lib/actions/callback/index.js:141,156` (`useVerificationToken`, `getUserByEmail`) | `provider.type === "email"` branch (line 131) — no email provider |
| `callback/index.js:318` (`createAuthenticator`) | webauthn branch (line 279) — no webauthn provider |
| `lib/actions/signin/send-token.js:14,61` | email provider sign-in only |
| `lib/actions/session.js:67` (`getSessionAndUser/deleteSession/updateSession` destructure) | the `else` of `if (sessionStrategy === "jwt")` (line 31) — jwt here |
| `lib/actions/signout.js:21` (`deleteSession`) | `else` of `session.strategy === "jwt"` (line 15) — jwt here |
| `lib/utils/session.js:23` (`getSessionAndUser`) | `else` of `sessionStrategy === "jwt"` |
| `lib/utils/webauthn-utils.js:126,158,168,175,260,286` | webauthn only |
| `handle-login.js` (handleLoginOrRegister) | invoked only from the oauth/oidc (line 70), email (171) and webauthn (311) branches of callback/index.js — never from credentials |

The credentials branch itself (`callback/index.js:227-278`): `provider.authorize` →
`handleAuthorized` (callbacks.signIn; not configured, default returns true, no adapter) →
`callbacks.jwt` → `jwt.encode` → cookie → `events.signIn?.()` (none configured). Zero
adapter calls. `next-auth/lib/` dist: zero `adapter.` call sites.

`assert.js` only *requires* an adapter for email/webauthn/database-session setups; an
unused adapter present raises no error. Origin verified: `git log -S "PrismaAdapter"` →
`fa7120e feat: add authentication with magic links` (the era the email provider existed).

## 2. prisma.account / session / verificationToken / groupInvite call sites

Full grep over `src`, `scripts`, `e2e` for `(prisma|tx|db|client).(account|session|verificationToken|groupInvite).`,
generated client excluded. Complete list of real call sites:

- `scripts/demo/verify-guard.mts:121` — `prisma.session.create` (demo deny canary)
- `src/lib/demo-seed/seed.ts:119` — `tx.groupInvite.deleteMany({})`
- `src/lib/demo-seed/seed.ts:126` — `tx.session.deleteMany({})`
- `src/lib/demo-seed/seed.ts:127` — `tx.account.deleteMany({})`
- `verificationToken`: **zero** call sites anywhere

So: account 1, session 2, verificationToken 0, groupInvite 1. dead-code-14's counts were
exactly right. data-layer-01's grep (`prisma.session.` etc.) missed the two `tx.` sites
in the demo seed — a correction, not a refutation: those two lines must be deleted as
part of the fix, and `verify-guard.mts:121` needs a different deny canary table.

**Additional reference both findings missed:** `src/lib/cascade-rule.test.mjs` OWN_CONTENT
map names `Account` (:101), `GroupInvite` (:112), `Session` (:123). The test asserts the
cascade-reachable set is a *subset* of those keys, so removal may not turn it red, but the
entries must be pruned in the same commit or the map lies. VerificationToken is absent
from it (no User relation), consistent with zero refs.

Schema anchors verified: Account/Session/VerificationToken models live in
`prisma/schema.prisma` ~310-346 (data-layer-01's :310-342 and dead-code-14's :336-346 are
both close enough to execute from); User back-relations `accounts`/`sessions` present;
GroupInvite model :277-291 with User relations (`groupInvitesSent/Received`) and Group
relation `invites` (:271) exactly as claimed. The AuthToken comment even self-documents:
"NOT NextAuth's VerificationToken above, which belongs to the (unused) email provider".

**dead-code-14 correction:** its reason for keeping Account/Session — "these two ARE
exercised by the @auth/prisma-adapter configured in auth.ts:58" — is FALSE (section 1).
They are exactly as dead as VerificationToken. data-layer-01 supersedes it on this point.

## 3. The five column claims (data-layer-03)

All re-grepped at HEAD, generated client excluded:

- **User.openTo** (`schema.prisma:20`): the schema line is the ONLY reference in the repo.
  Comment verbatim: "retired 2026-07-30 (owner call). Column kept for a future cleanup
  migration; no reader or writer remains." CONFIRMED dead.
- **Post.tag** (`schema.prisma:480`): zero readers/writers. `src/lib/validators.ts:217`
  pins it: "No `tag`: post types were abandoned 2026-08-02 (owner call)." All other `tag`
  hits are lab-room CSS/props, unrelated. CONFIRMED dead.
- **Photo.blurhash** (`schema.prisma:178`): the schema line is the only reference
  ("optional LQIP (not generated in MVP)"). CONFIRMED never generated.
- **Photo.originalUrl** (`schema.prisma:177`): six references, all reads —
  `src/app/(main)/collection/actions.ts:666,677,736,745`, `src/lib/account-purge.ts:109,126`
  — every one a select-then-maybe-purge defensive read. Zero writers (no `originalUrl:` in
  any create/update/seed). Every row is NULL; the defensive reads can never fire. CONFIRMED.
- **Group.visibility** (`schema.prisma:245`): three writers, all constants —
  `src/components/auth/actions.ts:252` ("public"), `src/app/(main)/catchups/actions.ts:516`
  ("private"), `src/lib/demo-seed/seed.ts:349` ("private"). Zero reads: no
  `visibility: true` select, no where/orderBy anywhere. CONFIRMED write-only.
  (Dropping it also drops `@@index([visibility, createdAt])` — overlaps data-layer-07.)

## 4. The three indexes (data-layer-07)

- **`SearchLog @@index([query])`** — now at `schema.prisma:1180` (finding said :1182; tree
  moved two lines). Every SearchLog query verified: `src/lib/search-log.ts:63` findFirst
  where (userId, scope, createdAt gte) orderBy createdAt; :77 update by id; :88 create;
  `src/lib/retention.ts:203` deleteMany on createdAt; `src/lib/admin-analytics.ts:488-521`
  — all five filter `createdAt: { gte: since }`; the two `groupBy(["query"])` hash-aggregate
  after that filter, which a btree on `query` serves in no plan. CONFIRMED unusable.
- **`Group @@index([visibility, createdAt])`** (`:274`): `visibility` appears in zero
  where/orderBy clauses in the repo (section 3). CONFIRMED unusable.
- **`Comment @@index([postId, isHidden])`** (`:549`): every comment visibility read goes
  through `VISIBLE_COMMENT` (`src/lib/posts.ts:80` = isHidden:false + deletedAt:null +
  author-in-good-standing join) as a relation-count or with id/parentId lists
  (`feed/actions.ts:1209,1377,1518,1539-1540`); `Comment @@index([postId, createdAt])`
  (:548) provides the same postId prefix, `@@index([parentId])` serves thread walks. The
  one other isHidden filter (`admin/people/[id]/page.tsx:71`) is on authorId, not postId.
  CONFIRMED marginal/droppable as claimed.
- `src/lib/index-coverage.test.mjs` pins none of the three (grep for query/visibility/
  isHidden: only gazetteer-trigram lines). Claim about the gate confirmed.

## 5. Prisma version skew (dependency-diet-10)

Read directly from `node_modules/*/package.json` at HEAD:
- `@prisma/client` **7.5.0**
- `@prisma/adapter-pg` **7.8.0**
- `prisma` (CLI) **7.9.1**

`package.json` ranges confirmed: `@prisma/adapter-pg ^7.8.0` (:33), `@prisma/client ^7.5.0`
(:34), `prisma ^7.5.0` (:57). Exactly as claimed. CONFIRMED.

## 6. catchups-16 (theme column dead) — REFUTED at HEAD

This is the finding the find phase outran. Commit 6d5609e ("feat(admin): a reading room
for every Catch-up", same day) added `src/app/(main)/admin/catchups/[catchupId]/page.tsx`,
which at line 95 selects `theme: true` inside `editions: { select: ... }` on
`prisma.catchup.findUnique` — that is `CatchupEdition.theme` — and at line 205 renders
`round.theme` in each round's meta line. The demo seed's write (`seed.ts:399`,
`content.ts:855,931`) therefore no longer goes "into the void": the admin reading room
displays it. No member surface reads it (grep over `src/app/(main)/catchups` and
`src/components/catchups`: zero theme refs), but the finding's load-bearing claim —
"readers: none anywhere in src/" — is false at HEAD. The column is live. Do not drop it.

## Verdict summary

| id | verdict |
|---|---|
| dependency-diet-04 | confirmed |
| data-layer-01 | confirmed-with-correction (2 missed tx.* seed lines; cascade-rule map entries; canary swap) |
| data-layer-02 | confirmed-with-correction (cascade-rule.test.mjs:112 must be updated too) |
| data-layer-03 | confirmed |
| data-layer-07 | confirmed-with-correction (query index line is :1180) |
| dead-code-14 | confirmed-with-correction (keep-Account/Session rationale is false; they are droppable) |
| dependency-diet-10 | confirmed |
| catchups-16 | REFUTED (admin reading room reads theme since 6d5609e) |

Nothing in this cluster needed live DB access; the index-drop findings' *benefit* sizing
would (row counts, pg_stat), but their correctness does not.
