# Spec: onboarding

I now have everything I need. I have grounded the spec in the real schema, auth setup, validators, signup flow, trivia gate, proxy gating, admin tooling, and the report pipeline. Writing the spec now.

---

# Onboarding, Accounts & Verification — Design Spec

This section covers invite-only entry, the trivia warmth gate, minimal signup, the "complete your profile" flow, account types for teachers, three-track verification (office class lists + community vouching + flagging), and a non-obvious verified marker. Everything below is grounded in the real code: `prisma/schema.prisma`, `src/lib/auth.ts`, `src/lib/validators.ts`, `src/components/auth/actions.ts`, `src/components/auth/signup-form.tsx`, `src/components/auth/trivia-gate.tsx`, `src/app/(auth)/signup/page.tsx`, `src/proxy.ts`, `src/app/(main)/layout.tsx`, `src/app/(main)/admin/page.tsx`, the report pipeline (`src/components/posts/report-action.ts`, `report-dialog.tsx`), and `src/app/preview/v2/page.tsx`.

---

## 0. What exists today (the starting point)

- `User` already has: `name`, `email`, `password?`, `batchType` ("ICSE"/"ISC"), `batchYear`, `yearJoined?`, `yearLeft?`, `admissionNumber?`, `role` ("member"/"admin"), `isBlocked`, `adminNote`, plus profile fields (`bio`, `currentCity`, `workplace`, `jobTitle`, `phone`, `instagram`, `linkedin`, `avatarColor`). No avatar photo field, no account type, no verification state, no house/section data, no invite/vouch models.
- Auth is **Credentials (email + password)** via NextAuth v5 with a JWT session strategy (`session.strategy = "jwt"`), not the database sessions implied by AGENTS.md. The Prisma adapter is attached but JWT is the live strategy. Magic links are **not** wired in `auth.ts`; `src/components/auth/magic-link-sent.tsx` is dead code and `/verify` just `redirect("/login")`. The brief says magic links are to be removed, so this confirms the direction: keep password auth, delete the magic-link remnant.
- Signup is a 2-step client flow on `/signup`: `TriviaGate` -> `SignupForm`. The form already collects more than the brief's minimum (it includes `yearJoined`, `yearLeft`, `admissionNumber` inline). The trivia gate is purely client-side (`onPass` just advances a `useState`), so it is decorative, not a real entry control. There is **no invite gate at all** right now: anyone who answers "banyan" can create an account.
- `registerUser` (`actions.ts`) hashes the password (bcrypt, cost 12), validates with `signupSchema`, checks email uniqueness, creates the user with a random `avatarColor`, then the form calls `signIn("credentials")` directly.
- Admin tooling exists (`/admin`): user list, block/unblock, delete, admin note, hide post, reports queue with pending/reviewed/dismissed. Reports are **post-only** today (`Report.postId` is required; `reportPost(postId, reason)`).
- Gating is in `src/proxy.ts`: public paths are `/`, `/login`, `/signup`, `/verify`, `/api/auth`, `/preview`. Everything else needs a session cookie. `(main)/layout.tsx` re-checks `auth()` server-side.

The work below extends this rather than replacing it.

---

## 1. Account types (alumnus / teacher / ex-teacher) — the core model change

The brief's biggest correction: the app currently assumes everyone is an alumnus graduating with an ICSE/ISC batch. Teachers (past and present) may never have studied at RV and have **no batch year**. We need a first-class account type.

### Decision: an `accountType` enum on `User`, with batch fields made conditional

```
accountType  String  @default("alumnus")  // "alumnus" | "teacher" | "ex_teacher"
```

Rationale for a single string field rather than booleans: it is mutually exclusive (you are one thing at signup), it mirrors the existing `role`/`batchType` string-enum convention already in the schema (no native Prisma enums are used anywhere; staying consistent avoids a migration style change), and it is trivially filterable in the directory (`where: { accountType: "teacher" }`).

- **alumnus**: studied at RV, graduated (or left early) with a batch. Has `batchType` + `batchYear`. This is the default and the existing behaviour.
- **teacher**: currently teaches/works at RV. May or may not be an alumnus themselves. **No required batch.**
- **ex_teacher**: taught at RV in the past, no longer there. No required batch.

### Consequence: `batchType` and `batchYear` must become nullable

Today both are required (`batchType String`, `batchYear Int`). A teacher who never studied here has neither. This is a breaking schema change and the most important data-model delta in this area.

```
batchType  String?   // null for teachers who never studied here
batchYear  Int?      // null for teachers; required for alumni
```

This ripples outward and must be coordinated with the other workstreams (do not silently change it):
- `src/lib/auth.ts` puts `batchType`/`batchYear` into the JWT and session; `src/types/next-auth.d.ts` types them as non-null `string`/`number`. These become `string | null` / `number | null`.
- The session callback `select` and the directory `groupBy(["batchYear"])` must tolerate null. The directory "browse by year" grid simply excludes null-batch users from the year grid and instead surfaces teachers under a dedicated **"Teachers & Staff"** facet (handled by the Directory workstream; flagged here as a dependency).
- The "Batch of 'XX" display string used across `post-card`, navbar userchip, and the v2 mock must fall back to a role label when `batchYear` is null. Decision: show **"Teacher"** / **"Former teacher"** in the batchline slot where alumni show "Batch of '09". This keeps the one shared batchline component working for everyone.

### For teachers who are ALSO alumni

A teacher who studied at RV picks `teacher`/`ex_teacher` as their primary type but can still fill in their own batch in "complete your profile". So `batchType`/`batchYear` remain *available* (not forbidden) for teachers; they are merely not *required*. The primary identity shown is the teaching role, with "Also Batch of '02" as a secondary line on the profile. No separate model needed; the existing nullable batch fields carry it.

### Teaching tenure fields (parked to profile, not signup)

Teachers need their own "years at the valley" analogous to alumni `yearJoined`/`yearLeft`. Rather than overload those (which for alumni mean *student* years), add teacher-tenure fields collected in profile completion, not signup:

```
taughtFrom   Int?     // first year on staff
taughtUntil  Int?     // null = still teaching (present teacher)
subjects     String?  // free text, e.g. "Biology, Nature Club" — comma list, kept simple for MVP
```

`subjects` is a comma-separated string for MVP (consistent with how `targetBatches`/`images` are stored as strings in the current schema) rather than a join table; revisit only if we need to filter the directory by subject.

### Current students are NOT allowed

This is a policy, not a field. There is no "student" account type, and the invite + verification flow (below) is the enforcement mechanism: invites are issued by verified alumni/teachers/admins, and verification checks against office leaving records. We add one soft signal: the trivia/verification gate copy and the invite explicitly state "for alumni and teachers, past and present." No technical age check (unreliable and unkind); the human verification layer catches it.

---

## 2. Invite-only entry

> **DROPPED 2026-07-02 (owner decision).** Invite-only signup is not being built. Signup stays
> open behind the trivia gate only. The `Invite` / `InviteRedemption` / `JoinRequest` models, the
> `/join` route, and invite-code validation described in this section are **not planned** — treat
> this whole section as shelved, kept for history only. (Community vouching in §6 is a separate,
> still-parked idea, not dropped, just not part of MVP.)

Today `/signup` is wide open behind a guessable trivia question. The brief requires genuine invite-only entry. 

### Decision: signed invite tokens, issued by verified members and admins, redeemable once

Add an `Invite` model:

```
model Invite {
  id          String    @id @default(cuid())
  code        String    @unique          // URL-safe random token, e.g. 24-char base62
  email       String?                    // optional: pre-addressed to a specific person
  inviterId   String                     // who created it
  note        String?                    // "my brother, batch of '04" — helps admin verify later
  intendedType String   @default("alumnus") // alumnus | teacher | ex_teacher — sets the default at signup
  maxUses     Int       @default(1)
  uses        Int       @default(0)
  expiresAt   DateTime?                   // null = no expiry; default we set to +30 days at creation
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())

  inviter     User      @relation("InvitesSent", fields: [inviterId], references: [id], onDelete: Cascade)
  redemptions InviteRedemption[]

  @@index([code])
  @@index([inviterId])
}

model InviteRedemption {
  id         String   @id @default(cuid())
  inviteId   String
  userId     String   @unique           // each new user redeems exactly one invite
  redeemedAt DateTime @default(now())

  invite     Invite   @relation(fields: [inviteId], references: [id], onDelete: Cascade)
  user       User     @relation("InviteRedeemed", fields: [userId], references: [id], onDelete: Cascade)
}
```

And on `User`:
```
invitesSent     Invite[]          @relation("InvitesSent")
invitedById     String?           // denormalised: who vouched you in (drives the vouch trust graph)
invitedBy       User?             @relation("InvitedBy", fields: [invitedById], references: [id])
invitedUsers    User[]            @relation("InvitedBy")
inviteRedeemed  InviteRedemption? @relation("InviteRedeemed")
```

Why a separate `InviteRedemption` table when `maxUses` is usually 1: it lets one invite be a multi-use "batch link" (e.g. an admin drops a link in a class WhatsApp group with `maxUses: 40`), while still recording exactly who came through it and seeding `invitedById` for the vouch graph. For the common 1:1 case it is one row. Keeping `uses`/`maxUses` as a counter on `Invite` avoids a count query on the hot redemption path.

### Entry flows

1. **Direct invite link** — `/join/[code]`. New public route. Resolves the code, checks `!revokedAt && (expiresAt == null || expiresAt > now) && uses < maxUses`. On success it carries the code through the trivia gate into signup and stamps `intendedType` as the default account type. The redemption is recorded **after** the user row is created (in `registerUser`), inside a transaction, with a re-check of validity to prevent races.
2. **Request an invite** — the v2 login mock already says "New here? Request an invite" (`src/app/preview/v2/page.tsx` line 551). `/signup` with **no** valid code shows a "Request an invite" form (name, email, who you are, a sentence about your connection to RV) which writes a row to a lightweight `JoinRequest` queue for admins, rather than creating an account. This is the honest version of today's open signup.

```
model JoinRequest {
  id          String   @id @default(cuid())
  name        String
  email       String
  message     String?                 // "I was in Krishna house, left after 10th in 2008"
  accountType String   @default("alumnus")
  status      String   @default("pending")  // pending | invited | declined
  createdAt   DateTime @default(now())
  handledById String?
}
```
An admin reviewing a `JoinRequest` clicks "Send invite," which creates an `Invite` pre-addressed to that email and (optionally for MVP) emails it via the same Resend setup. The request row flips to `invited`.

### Gate change in `src/proxy.ts`

`/signup` stays public (the page itself decides invite-valid vs request-an-invite). Add `/join` to `publicPaths`. No other middleware change; the real enforcement is that `registerUser` refuses to create an account without a valid, unredeemed invite code (see section 4). This keeps the security decision server-side, where the existing code already puts auth decisions, rather than trusting the client-routed step state.

### MVP escape hatch

To avoid a chicken-and-egg cold start (the first members have no inviter), the admin (identified by `ADMIN_EMAIL`, the existing bypass identity in `auth.ts`) can mint invites from the admin panel and can also bulk-import a seed list. The admin's own account is the root of the vouch/invite graph.

---

## 3. The trivia / verification gate — keep it warm

The existing `TriviaGate` (blinking owl, "What tree was the school built around?" -> "banyan") is the right *tone* but is currently a toy: client-only, two hardcoded questions, answer compared in the browser. We keep the warmth and the owl, fix the substance, and reframe it.

### Decisions

- **Reframe as warmth + soft-verification, not the security boundary.** The invite is the real gate (section 2). Trivia is a friendly "are you really one of us" moment and a *signal* recorded for the verifier, not a hard pass/fail that grants access. This is honest: trivia answers are guessable/searchable, so they should never be load-bearing for entry. They are load-bearing for *delight* and as a tiebreaker the admin can see.
- **Move answer checking server-side** and store the question/answer pairs in a small seed table or a server module, so they are not shipped to the client. Add light rate-limiting (a few attempts, then a cooldown) to stop brute force, with kind copy ("Take a breath, try again in a moment").
- **Expand the question bank** (banyan, Rishi Konda, the hoopoe, house names like Cauvery/Krishna, the long dining-hall tables, "what do you climb at dawn") and pick one at random per session, as it does now. Accept fuzzy answers (trim, lowercase, a small synonym set: "banyan tree" == "banyan").
- **Reuse the existing owl/hoopoe delight.** The v2 mock's `Hoopoe` covering its eyes (lines 46-65, 779-783) is the canonical easter-egg template per the brief. The trivia owl blink and the hoopoe wing-cover are the same family of micro-animation. The gate is one of the 2-3 sanctioned easter-egg locations.
- **Record the answer as a verification signal**, not a verdict:

```
// on User
triviaPassedAt  DateTime?   // when they cleared the warmth gate
triviaQuestion  String?     // which prompt they answered (for admin context)
```

The admin verification view can show "Cleared trivia (banyan) at signup" as one small green tick among the evidence, alongside admission number and vouches.

### Flow position

`/signup` step order becomes: **(invite check) -> trivia warmth -> minimal register -> land in feed (unverified)**. The trivia step is skippable-by-admin and never blocks an invited user from finishing; a wrong answer just shakes the owl (existing animation) and lets them retry. We deliberately do not lock people out on trivia, because an 80-year-old alumnus who forgets the house names should still get in via their invite and admin verification.

---

## 4. Minimal signup

The brief: signup must capture **at least** name, email, password, batch (grad year), years joined/left. Everything else moves to profile completion. The current `SignupForm` over-collects (it has admission number inline) and under-handles teachers (batch is mandatory). Both are fixed.

### Fields kept on the signup form

| Field | Required | Notes |
|---|---|---|
| `name` | yes | unchanged |
| `email` | yes | unchanged, unique |
| `password` + confirm | yes | unchanged (bcrypt 12) |
| `accountType` | yes | NEW. A 3-way segmented control: "Alumnus / Teacher / Former teacher". Defaults from the invite's `intendedType`. |
| `batchType` (ICSE/ISC) | only if alumnus | hidden for teacher/ex_teacher |
| `batchYear` | only if alumnus | hidden for teacher/ex_teacher |
| `yearJoined`, `yearLeft` | optional, alumnus only | the brief lists these as "at least" capture; keep them but optional, with the "don't remember" affordance below |

The admission number input is **removed from signup** and moves to profile completion (the brief explicitly lists it under "complete your profile"). This shortens the form, which matches "keep signup minimal."

### The "don't remember" affordance (applies wherever a year/number is asked)

A recurring, reusable control: each optional year/number field gets a small **"I don't remember"** checkbox/toggle beside it. Checking it disables and clears the input and submits the field as `null`. Rationale: older alumni genuinely will not recall a 1971 admission number, and forcing a guess pollutes the verification data. A `null` is honest and the verifier treats it as "unknown," not "suspicious." This control is built once (`<RememberableField>`) and reused in signup, profile completion, and the house-per-year picker (section 5).

### `signupSchema` deltas (`src/lib/validators.ts`)

```ts
export const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  password: z.string().min(8).max(128),
  accountType: z.enum(["alumnus", "teacher", "ex_teacher"]),
  inviteCode: z.string().min(8).max(64),            // NEW, required server-side
  triviaAnswer: z.string().max(60).optional(),       // checked server-side
  // batch is conditional on accountType:
  batchType: z.enum(["ICSE", "ISC"]).optional(),
  batchYear: z.number().int().min(1926).max(new Date().getFullYear() + 1).optional(),
  yearJoined: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
  yearLeft: z.number().int().min(1926).max(new Date().getFullYear()).optional(),
}).refine(
  (d) => d.accountType !== "alumnus" || (d.batchType && d.batchYear),
  { message: "Alumni need a batch type and year", path: ["batchYear"] }
);
```

The `admissionNumber` line is dropped from `signupSchema` (it stays in `profileSchema`). The year `1926` floor (school founding era) is kept as-is from the current validators.

### `registerUser` deltas (`src/components/auth/actions.ts`)

The server action becomes the real gate. New responsibilities, all server-side:
1. **Validate the invite** before anything else: look up by `inviteCode`, check not revoked/expired/exhausted. If invalid -> `{ error: "This invite link isn't valid anymore. Ask whoever invited you for a fresh one." }` and do **not** create a user.
2. **Check trivia** server-side against the question bank if a `triviaQuestion` was issued; record `triviaPassedAt`/`triviaQuestion`. A miss is non-fatal here (the page already gated it) but is recorded as "not passed."
3. Existing email-uniqueness check and bcrypt hash, unchanged.
4. **Create user + redeem invite in one `prisma.$transaction`**: create the `User` with `accountType`, conditional batch fields (or null), `verifyState: "unverified"`, `avatarColor`; create the `InviteRedemption`; increment `Invite.uses`; set `User.invitedById = invite.inviterId`. The transaction prevents a double-redeemed invite under concurrent signups.
5. Return `{ success, email }` as today; the form then `signIn("credentials")` exactly as it does now.

This keeps the client form thin and moves every trust decision server-side, consistent with how `auth.ts` and the admin actions already work.

---

## 5. "Complete your profile" flow

Everything the brief lists as deferred lives here: **house per year (year-by-year picker + "don't remember"), class sections (9A/9B), admission number (+ "don't remember"), profession, socials, about, school-memory prompts**, and for teachers the tenure/subjects fields.

### Route & IA

- New route `/profile/complete` inside `(main)/` (so it inherits the auth layout). Reached automatically right after first signin with a soft, dismissible banner/redirect, and always reachable from `/settings` and the profile page ("Finish your profile — 60%").
- It is a **multi-section, progressive, never-blocking** flow. Nothing here is required; a member can use the whole site with just the signup minimum. A small completion meter ("Your profile is 40% complete") is the only nudge, plus the fact that a fuller profile makes you more findable in the directory (the actual reason people fill it in).
- Sections (alumnus): **Where you are now** (city, profession/workplace/job title), **Your valley years** (house-per-year picker, sections, admission number), **Socials** (instagram, linkedin, personal site), **About you** (bio + memory prompts), **Photo** (avatar upload). Teachers get **Your teaching years** (taughtFrom/taughtUntil, subjects) instead of the house picker.

### House per year — the year-by-year picker (new data model)

Houses change year to year for many alumni, so a single `house` column is wrong. Model it as rows:

```
model HouseYear {
  id     String @id @default(cuid())
  userId String
  year   Int                  // calendar/academic year
  house  String               // "Krishna" | "Cauvery" | "Ganga" | ... (RV house names)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, year])
}
```
The picker renders one row per year between `yearJoined` and `yearLeft` (if known), each with a house dropdown and a "don't remember" option (reusing `<RememberableField>`; "don't remember" = simply no `HouseYear` row for that year). If the year range is unknown, the user adds rows manually. House names live in a shared `HOUSES` constant. On the profile, this renders compactly as "Krishna (2003-06), Cauvery (2006-09)" by grouping consecutive same-house years.

### Class sections (9A/9B), admission number

```
// on User
admissionNumber  Int?      // already exists; just moved here from signup
sections         String?   // free text/CSV for MVP, e.g. "9A, 10B" — matches existing string-list convention
```
Both get "don't remember." Admission number is one of the strongest office-list verification signals, so the profile copy gently explains *why* it helps ("This helps us match you to the school's records and verify you faster").

### School-memory prompts

A small set of optional, warm long-form prompts ("A teacher who changed how you think," "Where you sat in the dining hall," "A dawn you remember on Rishi Konda"). These reuse the **shared long-form post composer** (the "letter" post type owned by the Feed/Posts workstream) rather than a bespoke editor, and are stored as the user's pinned posts / about content. Flagged as a cross-workstream reuse: do not build a second rich editor here.

### `profileSchema` deltas

Add `accountType`, make `batchType`/`batchYear` optional, add `taughtFrom`/`taughtUntil`/`subjects`/`sections`, and accept a `houseYears: { year: number; house: string }[]` array. Keep existing fields. The avatar photo (below) is a separate upload action, not part of this Zod object.

### Avatar photo (new field, ties to the bird-default decision)

> **Superseded 2026-07-02.** Storage moved from Vercel Blob to **Cloudflare R2** (see
> `AGENTS.md`); there is no "Vercel Blob + Sharp/WebP pipeline" anymore, though Sharp/WebP
> conversion before upload is still accurate. The shipped field is `User.photoUrl`, not
> `avatarUrl`, and there is no `birdVariant` column — avatar selection is fully
> hash-derived per `docs/spec/avatars.md` / `src/lib/avatar.ts`, not a stored variant int.

The v2 design uses **bird-glyph avatars as the default with photo override**. Today `User` only has `avatarColor` (used to colour the initials/bird glyph). Add:
```
avatarUrl   String?    // Vercel Blob URL; when null, render the bird glyph tinted by avatarColor
birdVariant Int?       // 0..n, which valley-bird glyph; default derived from id hash so it's stable
```
`avatarColor` stays as the glyph tint. Upload goes through the existing Vercel Blob + Sharp/WebP pipeline (per AGENTS.md). The bird default means a brand-new, photo-less account still looks intentional, not like a grey placeholder, which matters for an older audience that may never upload a photo.

---

## 6. Verification — three tracks

The brief: admin verifies against office class lists, **plus** community vouching ("N people confirm they know X"), **plus** a flag-this-person path folded into reporting. These are three inputs to one `verifyState`.

### Verification state machine (on `User`)

```
verifyState   String    @default("unverified")
// "unverified" | "pending" | "community_vouched" | "verified" | "flagged"
verifiedAt    DateTime?
verifiedById  String?    // admin who confirmed (null if auto-promoted by vouch threshold, with a system marker)
verifyMethod  String?    // "office_list" | "community" | "admin_manual"
vouchCount    Int       @default(0)   // denormalised count of accepted vouches, for cheap directory rendering
```

- **unverified**: just signed up. Full read access; can post and comment, but carries no verified marker and may be rate-limited more aggressively (anti-spam). 
- **pending**: in the admin queue (either auto-queued at signup or pushed there by reaching the vouch threshold).
- **community_vouched**: hit the vouch threshold (e.g. **5** accepted vouches from already-verified members) but not yet admin-confirmed. This *can* be configured to auto-promote to `verified`, or to merely move to `pending` for a final admin glance. Decision for MVP: vouching auto-promotes to `verified` with `verifyMethod = "community"` and `verifiedById = null`, because the whole point of "10 people vouch for X" is to take load off the single admin; the admin can always demote. The threshold is a server constant, easily tuned.
- **verified**: confirmed. Gets the non-obvious marker (section 7).
- **flagged**: someone reported this person as not-who-they-say. Suppresses any verified marker, surfaces in the admin queue with the flag reason. Does not auto-block (that is a separate `isBlocked`, already in the schema).

### Track 1 — Admin against office class lists

The admin verification view (a new tab in the existing `/admin` page, sitting alongside the current Users and Reports sections) lists `pending`/`unverified` users with all the evidence in one place: name, claimed `batchType`/`batchYear`, `admissionNumber`, `yearJoined`/`yearLeft`, `sections`, `triviaPassedAt`, who invited them (`invitedBy`), and their current `vouchCount` with the vouchers' names. The admin compares against the office leaving-certificate / class lists (offline source) and clicks **Verify** (sets `verifyState="verified"`, `verifyMethod="office_list"`, `verifiedById`, `verifiedAt`) or **Needs info** (a soft state that messages the user via the existing `Notification` model asking for their admission number).

New admin server actions in the same style as `src/components/profile/admin-actions.ts`:
```
adminVerifyUser(userId, method)      // sets verified
adminUnverifyUser(userId)            // revert to pending
adminResolveFlag(userId, decision)   // "dismiss" | "uphold" -> sets verified back or escalates to block
```
All guard on `session.user.role === "admin"` exactly like the existing actions, and `revalidatePath("/admin")` + the user's profile.

### Track 2 — Community vouching ("N people confirm they know X")

```
model Vouch {
  id          String   @id @default(cuid())
  voucherId   String                  // who is vouching (must themselves be verified)
  voucheeId   String                  // who they vouch for
  relationship String?                // optional: "classmate", "taught me", "my batch"
  createdAt   DateTime @default(now())

  voucher User @relation("VouchesGiven", fields: [voucherId], references: [id], onDelete: Cascade)
  vouchee User @relation("VouchesReceived", fields: [voucheeId], references: [id], onDelete: Cascade)

  @@unique([voucherId, voucheeId])    // one vouch per pair
}
```
On `User`: `vouchesGiven Vouch[] @relation("VouchesGiven")` and `vouchesReceived Vouch[] @relation("VouchesReceived")`.

Rules and rationale:
- **Only verified members can vouch.** Otherwise an attacker creates 5 fake accounts to self-verify. This bootstraps from the admin-verified root.
- **You cannot vouch for yourself**, and the `@@unique([voucherId, voucheeId])` stops double-vouching.
- **The person who invited you** can be auto-counted as an implicit first vouch (they vouched by inviting), seeded from `invitedById`. So an invited alumnus starts at 1 of 5.
- A **server action `vouchForUser(voucheeId, relationship?)`** creates the row, recomputes `vouchCount`, and if `vouchCount >= THRESHOLD` promotes `verifyState` to `verified` (community) and notifies the vouchee ("Five people vouched for you. You're verified."). This is a small, sanctioned delight moment.
- UI: a **"I know this person"** / **"Vouch for [name]"** button on profiles of not-yet-verified users (hidden if you are not verified, or if you already vouched). The profile shows "**4 people you can see have confirmed they know Ananya**," naming mutuals first, which is itself a trust signal and a reason to explore the directory.

### Track 3 — Flag this person (folded into reporting)

The brief says fold "flag this person" into the existing report system. Today `Report` is post-only: `Report.postId` is required and `reportPost(postId, reason)` only handles posts. Generalise it.

Schema change to `Report`:
```
model Report {
  id              String   @id @default(cuid())
  reason          String
  reporterId      String
  targetType      String   @default("post")   // "post" | "user"   NEW
  postId          String?                       // now nullable
  reportedUserId  String?                       // NEW
  status          String   @default("pending")  // unchanged
  createdAt       DateTime @default(now())

  reporter     User  @relation("ReportsFiled", fields: [reporterId], references: [id])
  post         Post? @relation(fields: [postId], references: [id], onDelete: Cascade)
  reportedUser User? @relation("ReportsAgainst", fields: [reportedUserId], references: [id], onDelete: Cascade)
}
```
- `targetType` discriminates; exactly one of `postId` / `reportedUserId` is set. This reuses the entire existing reports queue, status flow (`pending`/`reviewed`/`dismissed`), and admin actions (`adminDismissReport`, `adminResolveReport`) with minimal change — the admin `ReportManagement` component just learns to render a "user" report variant.
- A **"Flag this person"** entry in the profile overflow menu (the same `···` menu pattern the v2 mock uses on posts) opens the existing `report-dialog` with reasons tuned for people ("This person isn't who they claim," "Not an RV alumnus/teacher," "Impersonation," "Other"). It calls a generalised `reportUser(userId, reason)` action, sibling to the existing `reportPost`.
- A user-report with an identity reason sets the reportee's `verifyState = "flagged"` (suppressing their marker) until an admin resolves it via `adminResolveFlag`. This closes the loop: vouching builds trust up, flagging tears a false claim down, and both feed the same admin queue.

### Why three tracks and not one

The single admin (the `ADMIN_EMAIL` identity that already exists) cannot personally verify a 600-posts-a-month-scale community against paper class lists. Community vouching distributes the trust work to the people who actually remember each other; the office-list track is the authoritative backstop for disputes and for people no one remembers; flagging is the community's downward correction. The `verifyState` field is the single source of truth that the marker reads from, so the three tracks never disagree in the UI.

---

## 7. The "verified" marker — non-obvious, hover-reveals "verified alumnus"

The brief wants something restrained: not a loud blue checkmark, discoverable on hover.

### Decision: a small tinted leaf/feather glyph next to the name, no label until hover

- **Glyph**: a tiny (about 13-14px) **leaf** mark in the brand leaf-green (`#1F6F57`, the v2 `--primary`), rendered inline right after the display name in the profile header, directory cards, and the post/comment author line. It reads as part of the brand's botanical language (banyan, valley, bird motifs) rather than a generic verification tick. For teachers, the same glyph but in the **alumni-office blue** (`#3F7CA6`, the v2 `--blue`) so the two roles are quietly distinguishable to those who notice, without a text badge.
- **Non-obvious**: no text, no "Verified" pill, no bright colour fill. Many users will never consciously register it; that is intended. It is a quiet signal of belonging, not a status badge.
- **Hover reveal**: on hover/focus it shows a small tooltip — "Verified alumnus" / "Verified teacher" / "Verified former teacher" — reusing the **exact tooltip pattern already in `signup-form.tsx`** (the `group relative` + absolutely-positioned dark bubble with the little caret, lines 130-138). That pattern is already in the codebase, brand-correct, and keyboard-focusable; we extract it into a shared `<RevealTooltip>` so the marker and the existing batch-type hint share one implementation.
- **Accessibility**: the glyph carries an `aria-label` ("Verified alumnus") and the tooltip is focus-triggered too (not hover-only), so it is reachable by keyboard and announced by screen readers even though it is visually subtle. This satisfies the "every interactive element needs hover, focus-visible, active" guardrail in CLAUDE.md.
- **Where it does NOT appear**: `unverified`, `pending`, and `flagged` users show no marker at all (absence is the signal). `community_vouched`-only users (if we ever stop auto-promoting) could get a faintly lighter variant, but for MVP community-vouched is promoted to full `verified`, so there is just one marker state.

A shared component `<VerifiedMark user={...} />` reads `verifyState` + `accountType` and renders the right glyph/colour/tooltip or nothing. It is used everywhere a name is shown: directory cards, profile header (v2 `cover-top .id`), post author line (v2 `.who b`), comment author, navbar userchip, and the "new in the directory" rail.

---

## 8. Reusable components & shared pieces

This area deliberately leans on existing patterns to stay "modular + lightweight" per the brief:

- **`<RememberableField>`** — new shared control wrapping any optional year/number input with an "I don't remember" toggle. Used in signup (years), profile completion (admission number, sections), and the house-per-year picker.
- **`<RevealTooltip>`** — extracted from the existing `signup-form.tsx` hover-tooltip markup; powers the verified marker and the batch-type hint, single implementation.
- **`<VerifiedMark>`** — reads `verifyState`/`accountType`, renders the quiet leaf/feather glyph + tooltip or nothing.
- **`<AccountTypeToggle>`** — the 3-way segmented control (Alumnus / Teacher / Former teacher). Reuses the v2 `Seg` segmented-control styling and shows/hides batch fields reactively in the signup form.
- **Avatar with bird default** — adopt the v2 `Avatar` + `BirdGlyph` (bird default, photo override) as the real shared avatar, reading `avatarUrl` / `avatarColor` / `birdVariant`. Replaces the colour-only initials avatar everywhere.
- **Owl/Hoopoe delight** — the trivia owl (existing `BlinkingOwl`) and the login hoopoe-covers-eyes (v2) are the sanctioned easter eggs for this area; reuse, do not invent new ones.
- **Admin actions** — new verify/flag actions mirror `src/components/profile/admin-actions.ts` exactly (auth guard + `revalidatePath`).
- **Report pipeline** — generalised `Report` model + existing `report-dialog` / `ReportManagement` queue carry the flag-this-person path; no new moderation surface.
- **Long-form composer** — memory prompts reuse the shared "letter" post composer (other workstream), not a new editor.

---

## 9. Routes / IA summary

| Route | Access | Purpose |
|---|---|---|
| `/join/[code]` | public (NEW) | Validate invite, carry code into signup |
| `/signup` | public (existing) | If valid invite: trivia -> minimal register. If no invite: "request an invite" form |
| `/login` | public (existing) | Unchanged password login (+ admin bypass) |
| `/verify` | public (existing) | Currently redirects to `/login`; **repurpose or delete** since magic links are gone. Decision: delete the route and remove `/verify` from `publicPaths`, and remove `magic-link-sent.tsx`. |
| `/profile/complete` | auth (NEW) | Progressive, non-blocking profile completion |
| `/profile/[id]` | auth (existing) | Gains verified marker, vouch button, flag-this-person menu |
| `/settings` | auth (existing) | Account type, re-run profile completion, edit batch/tenure |
| `/admin` | admin (existing) | Gains a **Verification queue** tab + **Invites** management alongside existing Users/Reports |

---

## 10. Edge cases & decisions

- **Teacher with no batch** browsing the directory's "by year" grid: excluded from year buckets; surfaced under a "Teachers & Staff" facet. Their batchline shows "Teacher"/"Former teacher," not "Batch of null."
- **Alumnus who is also a teacher**: primary `accountType` is the teaching role; their own batch is shown as a secondary "Also Batch of '02" line. Both verified markers collapse to one (teacher-blue) since accountType is teacher.
- **Invite redeemed twice (race)**: prevented by the `$transaction` re-check + `uses < maxUses` guard; second redeemer gets the "invite no longer valid" message.
- **Invite link leaks publicly**: `maxUses` + `expiresAt` + admin `revokedAt` contain the blast radius; verification (admin/vouch) is the second wall, so a leaked invite alone cannot manufacture a verified identity.
- **"Don't remember" everywhere**: any unknown field is stored `null`, never a guessed value, so verification data stays trustworthy.
- **Vouch ring / sockpuppets**: only verified users can vouch and the graph roots at the admin, so a cluster of fake accounts cannot self-verify without an authentic verified member entering the ring; flagging + `adminUnverifyUser` is the recovery path.
- **Self-vouch / double-vouch**: blocked by `@@unique([voucherId, voucheeId])` and an explicit self-check.
- **Flagged then cleared**: `adminResolveFlag(..., "dismiss")` restores the prior `verifyState`; "uphold" can escalate to the existing `isBlocked`.
- **Existing users at migration time**: a data migration sets `accountType = "alumnus"` for all current rows (they all have batches today), and `verifyState = "verified"` with `verifyMethod = "admin_manual"` for the seed cohort the admin trusts (or `unverified` if we want everyone re-vetted — owner's call; recommend grandfathering the current small set as verified to avoid a cold-start verification pile-up).
- **JWT vs session strategy**: because `auth.ts` uses JWT, `verifyState`/`accountType` shown in chrome should be read in the `session` callback's fresh DB fetch (it already re-queries the user every session read, lines 84-104), so a newly-verified user sees their marker without re-login. Add these fields to that `select` and to `src/types/next-auth.d.ts`.

---

## 11. Parked (explicitly out of MVP, noted per brief)

- **Onboarding tutorial / coachmarks** for older, less-technical users: arrows and coachmark callouts pointing at "this is your feed," "find your batch here," "tap to vouch." Parked. When built, it should be a dismissible, replayable overlay (a `hasSeenTour` boolean on `User`) keyed off `verifyState`/profile-completion so it can gently resurface. Note the audience skew (some alumni are elderly) means generous tap targets and plain language; design it under `/frontend-design` + LiftKit spacing when picked up.
- **Dark mode** for these auth/onboarding screens: the v2 mock supports it, but per the owner light-mode-first decision, ship light only and revisit.
- **Subject-based directory filtering** for teachers (would need `subjects` as a join table instead of CSV).
- **Emailed invites at scale** beyond the basic Resend send.

---

### Files this area will touch (for the implementing agents)

Schema: `prisma/schema.prisma` (User deltas + new `Invite`, `InviteRedemption`, `JoinRequest`, `Vouch`, `HouseYear` models; `Report` generalisation). Auth/types: `src/lib/auth.ts` (session select + nullable batch), `src/types/next-auth.d.ts`. Validators: `src/lib/validators.ts` (`signupSchema`, `profileSchema`). Server actions: `src/components/auth/actions.ts` (`registerUser` invite/transaction), new `vouchForUser`, `reportUser`, admin verify/flag actions (mirroring `src/components/profile/admin-actions.ts`). Components: `src/components/auth/signup-form.tsx`, `trivia-gate.tsx`, new `<RememberableField>`/`<RevealTooltip>`/`<VerifiedMark>`/`<AccountTypeToggle>`, generalised `report-dialog.tsx`/`ReportManagement`. Routes: new `/join/[code]`, `/profile/complete`; `/admin` verification + invites tabs; delete `/verify` + `magic-link-sent.tsx`. Gating: `src/proxy.ts` (add `/join`, drop `/verify`). Design reference: `src/app/preview/v2/page.tsx` (Avatar/BirdGlyph, Hoopoe, Seg, tooltip, palette).

No em dashes used in proposed copy. No files were edited.