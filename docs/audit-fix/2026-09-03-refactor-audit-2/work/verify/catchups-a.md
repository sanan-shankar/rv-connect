# catchups-a — adversarial verification (refactor audit 2)

Verifier: catchups-a. Date: 2026-09-04. HEAD at verification: `74cc61a`
("fix(retention): notifications are kept 30 days, everywhere"), which is **one commit
past the audit baseline `72b5a1d`**. `git log 72b5a1d..HEAD` = 1 commit, retention-only,
touches nothing in this territory. Working tree at verification: `M docs/audit-fix/README.md`,
`M progress.md`, `?? docs/audit-fix/2026-09-03-refactor-audit-2/` — no uncommitted edits in
any file I judged.

Findings verified: catchups-01 .. catchups-12 (cluster `catchups-a`; 13-18 belong to
catchups-b). Read-only throughout: `grep`, `sed`, `wc`, `stat`, `python3` over
`raw/route-bundle-stats.json`, and byte-level greps of the read-only production build at
`.scratch/audit2-build/.next/static/chunks/`. No builds, no tsc, no browser, no database.

---

## catchups-01 — Retire the Spotify link pipeline — **confirmed-with-correction**

What I re-proved at HEAD:

- `resolveSpotify` / `SpotifyResult` / `SPOTIFY_PATH_RE` live at `src/lib/catchups-core.ts:839-911`
  under the banner `// ─── Spotify (keyless oembed; the SSRF boundary) ───`. Exactly as claimed.
- **No UI writes a song link.** The only `submitEntry` caller in the app is
  `answer-experience.tsx:135`, inside `persist(promptId, patch)` whose signature is
  `function persist(promptId: string, patch: { body?: string; images?: string[] })` —
  **at line 128, not 178 as the finding says**. `body`/`images` only; no `songUrl`.
- `grep -rn "songUrl|songTitle|songArt" src prisma/schema.prisma docs/spec/catchups.md`
  (generated client excluded) returns 50 hits. Every writer is inside `actions.ts`'s
  `submitEntry` (:149 schema, :1259 `hasSong`, :1278-1292 resolve, :1322 select,
  :1359-1361 the three create columns, :1392 withdraw test) and the core. Nothing in
  `src/lib/demo-seed*`, nothing in `scripts/`.
- The 10 `resolveSpotify` tests are real and countable at `catchups-core.test.mjs:584-643`
  (non-Spotify host, non-https, bad path, garbage, empty string, track+normalize, album/playlist,
  intl prefix, fail-soft throw, fail-soft non-200). Exactly ten.
- The C-027 pin's third assertion is verbatim what the finding quotes —
  `catchup-lifecycle.test.mjs:178`: `body.indexOf("resolveSpotify") < body.indexOf("catchupEdition.count")`.
  Once the name is gone this is `-1 < n`, always true. The finding's instruction (delete that one
  `assert.ok`, keep the transaction/CAS assertions at :175-177) is right.
- The surviving read path is real: `round/answer-card.tsx:44-45` builds
  `namedSong = { url: "", title: bodyText, art: null }` for `kind === "songs"`, and
  `spotify-card.tsx:55-61` renders the `!song.url` branch as a plain row. The file is 76 lines;
  deleting the linked branch (`:43-48` + `:63-75`) plus the two-shapes docblock (`:4-12`) is ~25
  lines, as claimed.
- `prisma/schema.prisma:1033-1035` carries the three columns; `docs/spec/catchups.md` §3.4.1 is at
  line 308 and the migration that created them is `prisma/migrations-manual/2026-07-05-secondary-city.sql:89-91`.

**Correction 1 (the one that matters).** The finding's "Where" list is missing a live consumer:
`src/app/(main)/admin/catchups/[catchupId]/page.tsx:103` selects `songTitle: true` and `:281`
renders it inside `metaLine(entry.author.name, formatDisplayDate(...), hearts, entry.songTitle)`.
A fix session that deletes the column without touching that file gets a Prisma validation error at
runtime on the admin Catch-up detail page — a page `tsc` will catch only because the generated
types change. Add it to the plan: drop `songTitle` from that select and from the `metaLine` call.

**Correction 2.** `persist` is at `answer-experience.tsx:128`, not `:178`.

**Correction 3 (scope of the verdict).** Everything above is code-side. The "0 of 133 live entries
have a song" number is from the audit-1 fix log and I cannot re-run it here; the finding already
makes the `SELECT count(*) FROM "CatchupEntry" WHERE "songUrl" IS NOT NULL OR "songTitle" IS NOT
NULL OR "songArt" IS NOT NULL;` a hard precondition. Keep it as one. Note the admin page above reads
`songTitle` for display, so if that SELECT ever returns non-zero the admin surface silently loses a
line of metadata — a second reason to run it first.

Nothing here drops a guard: the SSRF boundary the finding removes exists *only* to defend
`resolveSpotify`. Removing the call removes the attack surface rather than the defence.

## catchups-02 — Finish audit-1 catchups-03 (prop drills + the retyped unions) — **confirmed**

Every line number in the finding is exact at HEAD:

- `[catchupId]/(home)/page.tsx:21` (`CATCHUP_PROMPT_SETS` in the import) and `:371`
  (`promptLibrary: CATCHUP_PROMPT_SETS,`).
- `home/types.ts:100-101` (`/** The built-in question library, threaded down once… */` +
  `promptLibrary: CatchupPromptSet[];`).
- `console-collecting.tsx:55` (`promptLibrary={data.promptLibrary}`), `:75`, `:81`, `:169`
  (`<LibraryPickerDialog sets={promptLibrary} onPick={handlePick} />`).
- Five spellings of the cadence set, all present: `Cadence` union `catchups-types.ts:32`;
  `CADENCE_VALUES` `actions.ts:99`; `CADENCE_LABELS` keys `catchups-core.ts:176`; `OPTIONS`
  `cadence-control.tsx:25`; `CADENCE_OPTIONS` `keeper-settings-dialog.tsx:31-35`.
- Reminder set three times (`ReminderMode` :35, `REMINDER_MODE_VALUES` actions:100,
  `reminder-pref-control.tsx` OPTIONS). Notify kinds twice (`CatchupNotifyKind` :85-90,
  `CATCHUP_NOTIFICATION_TYPES` actions:1517-1523).
- The three stale docblocks say what the finding says they say, and they are wrong at HEAD:
  `cadence-control.tsx:12-17` ("that module also pulls in the Prisma `pg` driver (dynamically,
  for the impure helpers)"), `keeper-settings-dialog.tsx:5-8`, `create-catchup-form.tsx:19-22`.
  `catchups-core.ts:18-21` states in the file's own header that "That workaround is gone".
- `catchups-types.ts:49-55` states the "This ARRAY, not the union, is the source of truth" rule
  with the stale-validator story attached — the worked example the finding says to copy.
- The audit-1 quote is verbatim: `docs/audit-fix/2026-08-25-refactor-audit-1/fix-prompt.md:1386-1388`
  — "The prop-drill half of the finding … is **not done** and is still worth doing."
- Payload size: the `CATCHUP_PROMPT_SETS` literal is 2,014 source bytes, of which 1,047 bytes are
  quoted string content across 16 top-level strings plus 5 set ids/labels. ~1.1-1.3 KB as JSON on
  every home render and every `router.refresh()`. The finding's "~1.1 KB" is honest.
- The library is **not** in any client chunk today:
  `grep -l "A photo from everyone" .scratch/audit2-build/.next/static/chunks/*.js` → no matches.
  The string is only at `catchups-core.ts:245`.

**Caveat for the fixer (not a refutation).** Step (2) turns `library-picker-dialog.tsx`'s
`@/lib/catchups-core` import from type-only into a **value** import. `catchups-core.ts` is 922 lines
(state machine, copy helpers, calendar math). Its non-type imports after finding 10 lands are
`./utils.ts` (clsx + tailwind-merge, already client) and `./prisma-errors.ts` (57 lines, pure), so
nothing server-only comes with it — but whether Turbopack tree-shakes the other ~900 lines out of
the home shell chunk is unproven here. That chunk is `1eizugyixie1y.js`, 44,394 bytes, which
catchups-03 is trying to shrink. **Sequence it: do 10, then 03, then 02's prompt-library half, and
measure `1eizugyixie1y.js` before and after.** Trading 1.1 KB of RSC payload for even 5 KB of
permanent client JS would be a loss. The cadence/reminder/notify-union half of 02 has no such risk
and can land on its own.

## catchups-03 — the home ships Keeper-only dialogs and a 17 KB chunk — **confirmed-with-correction**

Re-derived from `raw/route-bundle-stats.json` and the read-only build, not taken on trust:

- `/catchups/[catchupId]` first-load = 1,209,190 raw bytes (1,181 KB) vs `/catchups` 1,121,287
  (1,095 KB). Matches `raw/route-js.txt:11`.
- Set difference of `firstLoadChunkPaths` = **5 chunks, 128,359 bytes** (finding says 125 KB;
  it is 125.4 KiB, so the number is right and my byte figure is the same thing).
  `1eizugyixie1y.js` 44,394 · `370feaobakd1f.js` 48,258 · `3evj1hvsedjp7.js` 18,411 ·
  `3vrge4av51cxl.js` 16,943 · `1lx2a-xk-qzz8.js` 353.
- Chunk identification re-grepped by hand: `1eizugyixie1y.js` contains "Everyone in this catch-up",
  "Catch-up settings", "Ask something from the library", "More time", "Last day", "wrote in",
  `useSyncExternalStore` — one hit each. `370feaobakd1f.js` contains `AnimatePresence` and
  `field-sizing`, and none of the home strings. Exactly as claimed.
- The Keeper gate is real: `catchup-home-shell.tsx:110-135` wraps `ExtendDeadlineCard`,
  `OpenAnsweringButton` and `KeeperSettingsDialog` in `viewer.isKeeper &&`.
- `3vrge4av51cxl.js` is loaded by **exactly one route in the whole app** — I scanned every route in
  `route-bundle-stats.json` and only `/catchups/[catchupId]` lists it. That is the strongest part
  of the finding and it holds.

**Correction 1 — the 17 KB chunk is a Popover, not a Tooltip.** I decompiled the marker:
`3vrge4av51cxl.js` exports `InfoTooltip` and its body is `r.Popover` / `r.PopoverTrigger` /
`r.PopoverPortal` / `r.PopoverPositioner`. It is the Base-UI **Popover** primitive that
`InfoTooltip` is built on. `bundle-build.md:766` calls the same 16.6 KB "Popover" — the two
findings are describing one chunk and **agree**; only catchups-03's label is loose. The saving
claim is unaffected (16,943 raw bytes off this route's first load). Note `float-field.tsx:265`
also renders an `InfoTooltip`, so removing the reminder-card (i) does not delete the component,
only this route's first-load copy of the primitive.

**Correction 2 — `OpenAnsweringButton` cannot be deferred separately.** The finding's Evidence says
it is "parsed and never rendered" for a non-Keeper; true, but it is exported from
`console-collecting.tsx:186`, the same module the collecting console lives in, so a
`next/dynamic` on it saves nothing. The finding's own "What to do" correctly names only
`KeeperSettingsDialog` and `ExtendDeadlineCard`; the Evidence paragraph just overstates.

**Correction 3 — people-panel line range.** The file is 728 lines, not 729. Function boundaries:
`PeoplePanel` :106, `PersonPill` :205, `PeopleDialog` :256, `PersonRow` :364, `AddPeople` :503,
`InviteLink` :612, `LeaveCatchupDialog` :692. So the split is "keep 1-255, move 256-728", not
"keep 1-251".

The 20-30 KB estimate is unmeasurable without a build and the finding says so ("medium on the byte
numbers"). Keeper-only source is 201 + 135 lines out of a 44 KB chunk that also holds the whole
home tree; 20-30 KB is optimistic but not indefensible. Leave the number as an estimate with the
`npm run analyze` gate the finding already asks for.

## catchups-04 — the answer page's upload is a third copy, still on the 5 MB proxied path — **confirmed**

- `photo-attachments.tsx:27` `const MAX_BYTES = 5 * 1024 * 1024;`; the refusal is at `:69`
  (`if (file.size > MAX_BYTES)` → "Each photo must be under 5MB.") and `shrinkForUpload` is called
  at `:80` — **after** the refusal. The ordering claim is exactly right.
- `upload-shared.ts:31` `export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;` with the docblock
  "The one photo ceiling, everywhere: 20MB."
- Three `fetch("/api/upload")` callers in `src/components`: `use-composer-uploads.ts:186`,
  `message-composer.tsx:74`, `photo-attachments.tsx:90`. (The other two grep hits are `proxy.ts:77`
  and two test files.)
- The composer really did move on: `use-composer-uploads.ts:6-7` imports `directUploadPut` and
  `MAX_UPLOAD_BYTES`, `:157` `directUploadPut(original, "post")`, `:226` the "20MB is the real
  ceiling" comment, `:232-233` the 20 MB check. `directUploadPut`'s `kind` union is
  `"post" | "collection"` (`upload-client.ts:20`), so option (b)'s precondition is real.

**I tried to break option (a) and could not.** The worry would be that raising the per-file cap
lets an oversized body reach Vercel's ~4.5 MB platform limit. It cannot: `shrinkForUpload`
(`image-downscale.ts:107-135`) sums the shrunk files and refuses anything over `UPLOAD_BODY_LIMIT`
with three purpose-written sentences (animated GIF, HEIC, generic "still NMB after shrinking").
So deleting the 5 MB pre-check leaves the real guard standing. Option (a) is safe and is the
whole of the drift fix.

**Correction.** "each carrying its own cap" is true of two of the three, not all three:
`message-composer.tsx` has **no** size check at all (grep for MAX in that file returns only
`MAX_MESSAGE_LENGTH`); it relies entirely on `shrinkForUpload`. Minor, but the fixer should not go
looking for a third cap.

**Overlap, and which steps are safer.** Three findings describe this same clone:
`catchups-04(b)`, `duplication-02`, `media-viewer-06`. They **agree** on the facts. For the shared
transport, **`media-viewer-06`'s steps are the safest** — it alone spells out that `shrinkForUpload`
must stay at the call sites because `src/lib/upload-size-rule.test.mjs:24-36` pins a per-file regex
`/shrinkForUpload|downscaleImage|useAvatarUpload/` over a hardcoded `SENDERS` list that names
`photo-attachments.tsx`, `message-composer.tsx` and `use-composer-uploads.ts` (I read the test:
that is exactly how it works, and the B-030 docblock at :14-17 names the Catch-up attachments as
one of the three original failures). `duplication-02` adds the one genuinely new behavioural fact —
photo-attachments and message-composer have no `AbortController`, so a stalled fetch wedges the
button for the session. **catchups-04's unique contribution is the 5 MB drift**, which neither of
the other two raises. Plan: take (a) from catchups-04, take the transport extraction from
media-viewer-06 + the timeout from duplication-02, and drop catchups-04(b) as a duplicate.

Owner-visible either way, as the finding says: catch-up photos start accepting feed-sized photos.

## catchups-05 — `CatchupIndexCard` still models the removed "Start one" row — **confirmed-with-correction**

- `catchups-types.ts:157-171` carries the nullable quintet and the comment
  `/** null = this group has no Catch-up yet (card shows "Start one"). */` at :162.
- `(index)/page.tsx:82` is `where: { userId, group: { catchup: { isNot: null } } }`, under the
  owner's own 13-line decision comment at :69-81 ("Offered the choice between making the button
  attach to that group and dropping the row, the owner took the row").
- `buildCta` is at :32-56 and **every** branch returns an object (ended, paused, answering,
  published, preparing, collecting/default). The loader sets `catchupId: group.catchup.id` (:176)
  and `cta: buildCta({...})` (:182). So neither is ever null.
- The page's own "Unreachable" comment is at :147-151, above `if (!group.catchup) return null;`.
- The `as string` cast is at :222; the `: 90` sort arms at :239-240.
- `CatchupIndexCard` has exactly one importer — `your-catchups-card.tsx:19` — so the finding's
  "move the type to its only consumer" option is available. The card's own docblock at :29-32 even
  says "the shared `CatchupIndexCard` type has no other consumer that needs it".

**Correction.** The card's dead branches are at `:46` (`card.cta?.href ?? "/catchups"`), `:61`,
`:88` (`card.catchupId ? tone : "text-muted-foreground"`), `:116` (`{card.cta && …}`) and
`:126-136` (the "Start one rows are built from a group with none" comment + `{card.catchupId &&
<CatchupCardMenu/>}`). The finding lists `:45` for the `card.catchupId ? tone` line; that line is
**88**. Line 45 is `const tone = card.editionStatus ? …`, which is a different (and still live)
ternary — the fixer must not delete it. Everything else in the list is right.

## catchups-06 — `loadMeta`'s fallback query is unreachable — **confirmed**

- `AdvanceEditionInput` at `catchups.ts:63-72` with `catchup?: { id?; cadence?; status?; group? } | null`.
- `loadMeta` at `:103`; the `included?.group` test at `:105`; the `?? "monthly"` / `?? "active"`
  defaults at `:110-111`; the fallback `prisma.catchup.findUnique` at `:114-130`.
- All five callers pass a `catchup` with a `group`, verified individually:
  `actions.ts:243` via `loadFreshEdition`'s select at `:229-238` (`catchup: { createdById, cadence,
  status, group: { select: { id, name } } }`); `(home)/page.tsx:139-154` builds
  `catchup: { cadence, status, group: { id, name } }` by hand; `answer/page.tsx:169-173` spreads
  `catchup: { cadence, status, group: catchup.group }`; `round/[editionId]/page.tsx:96` via
  `LIGHT_EDITION_SELECT:61-71` which nests `group: { select: { id: true, name: true } }`;
  `catchups.ts:411` via the `include` at `:406-408`.
- No caller in `scripts/` (grep for `advanceEdition(` outside `src` finds nothing).

The finding's "the fallback is also the less safe path" reasoning is sound: it reads
cadence/status from the database while `applyEditionAction`'s CAS trusts the caller's snapshot.
Making the relation required is a tightening, not a loosened guard. B-061's pin
(`meta.catchupStatus !== "active")\s*return;`) is a literal-text pin and survives as long as that
line is kept verbatim — the finding says so.

## catchups-07 — the preparing ritual is written twice and has drifted — **confirmed**

`catchup-home-shell.tsx:71-83`: `<AlmostReady eyebrow={\`Round ${edition.number}\`}
title="Putting your Catch-up together." body="… They all appear **together the moment** this Round
publishes." />` inside `<FadeRise>`, then `{viewer.isKeeper && <div className="mt-[var(--space-m)]
flex justify-center"><PublishNowButton …/></div>}`.

`round/[editionId]/page.tsx:189-203`: the same component with
`eyebrow={\`${title} - ${roundLabel(edition.number)}\`}`, the same title, body "… They all appear
**at once when** this Round publishes.", inside `<div className="py-10">`, then
`{keeper && <div className="mx-auto mt-[var(--space-l)] flex max-w-3xl justify-center">…}`.

Two drafts of one sentence, exactly as claimed. The proposed `PreparingScene({ eyebrow, editionId,
isKeeper })` covers both because the eyebrow is already the only structural difference; the wrapper
difference (FadeRise + space-m vs py-10 + space-l + max-w-3xl) is the thing the fixer must decide
deliberately, and the finding's gate (screenshot both, Keeper and member, desktop and 390x844) is
the right one. Picking a body sentence is owner copy — flag it, do not silently choose.

## catchups-08 — the join route writes its shell three times, its refusal twice — **confirmed**

- `join/page.tsx`: shell `:26-33` (the `flex min-h-screen …` div + the Wordmark link), card
  `:33-44`. The docblock at `:20-22` really does say "It says exactly what the [token] page says
  about a token it does not recognise".
- `join/[token]/page.tsx`: `function Shell({ children })` at `:172-186`; the refusal card at
  `:79-95` ("This link has expired" / "The invite link is not one we recognise…" / the same
  `<Button variant="outline">Go to Rishi Valley</Button>`).
- `join/[token]/loading.tsx:22-29`: the identical nine lines around the skeleton.
- `max-w-[420px]` in `src/app/catchups`: 3 hits, one per file.

Minor line offsets only (the finding says `:25-33`/`:34-44` and `:78-95`; actual `:26-33`/`:33-44`
and `:79-95`). `_shell.tsx` is a safe filename: the App Router only treats `page`/`layout`/`route`/
`loading`/`error`/etc. as special, so a co-located component file is not routed. The C-020 pin
(`await restoreOwnCatchupCopy(catchup.id, session.user.id);` before the redirect) is in the token
page's body and is untouched by a shell extraction — I checked it sits at `:105-120`, well away
from the two blocks being moved.

## catchups-09 — five membership lookups, four edition column sets — **confirmed**

All five membership reads are byte-for-byte the same query at HEAD:

| site | lines | select |
|---|---|---|
| `actions.ts` `loadMembership` | 176-181 | `{ role: true }` |
| `round/[editionId]/page.tsx` (identical function, same name) | 103-108 | `{ role: true }` |
| `[catchupId]/(home)/page.tsx` | 123-126 | `{ role: true }` |
| `[catchupId]/answer/page.tsx` | 109-112 | `{ id: true }` |
| `catchups/join/[token]/page.tsx` | 101-104 | `{ id: true }` |
| (outside territory) `post-visibility.ts` `isMemberOf`, `cache()`d | 64-70 | `{ id: true }` |

Edition column sets: `EDITION_COLUMNS` `actions.ts:206-216`; `editionSelect`
`answer/page.tsx:66-75`; `LIGHT_EDITION_SELECT` `round/[editionId]/page.tsx:51-72`;
`EDITION_TIMING_SELECT` `catchups.ts:76-83` with the docblock "Exported so an action reading an
edition for `shiftEditionPatch` selects exactly the same set" — the intent the other three do not
follow. Confirmed as described.

The honest "0 lines" saving is right and the finding says so. One thing the fixer should keep:
`post-visibility.ts`'s `isMemberOf` is `cache()`-wrapped for a reason (per-request dedupe across
the feed's visibility checks); if it wraps a shared helper, the `cache()` must stay on the
*wrapper*, not migrate into the shared function where the four Catch-up call sites would inherit a
per-request memo they do not currently have. That is a behaviour change, small but real.

## catchups-10 — `newInviteToken` and `node:crypto` in the client-safe core — **confirmed**

`catchups-core.ts:25` `import { randomUUID } from "node:crypto";`; docblock `:84-94`;
`export function newInviteToken(): string` at `:95-97`. Consumers: `actions.ts:57` (import) and
`:463` (`inviteToken: newInviteToken()`), reached through `catchups.ts:51` `export * from
"./catchups-core";` — so the move needs no import change at the call site, as claimed.
`join/[token]/page.tsx:42` mentions it in a comment only. The core's header at `:2-9` does define
it as the half with "No database, no clock of its own". Do this before 02, as the finding says.

## catchups-11 — props and docblocks for a caller that no longer exists — **confirmed**

- `GroupFirstGuidance`: one caller, `(index)/page.tsx:370`, `<GroupFirstGuidance />` with **no
  props**. Six optional props with defaults at `:24-36`; docblock at `:4-9` claims "Used two
  places: the index … and the create flow's no-group short-circuit".
- `LibraryPickerDialog`: one caller, `console-collecting.tsx:169`, passing `sets` and `onPick`
  only. `triggerLabel`/`triggerVariant`/`triggerSize` defaults at `:28-30`, their types at
  `:33-36`, and the two `class-variance-authority`/`buttonVariants` type imports at `:21-22`.
  Docblock at `:4-8` claims reuse "by both call sites" including "the Keeper rail's own quick add",
  which `catchup-home-shell.tsx:14` explicitly says no longer exists ("There is no 'Keeper
  controls' box").

Both are dead options with one caller each. ~20 lines is fair.

## catchups-12 — two actions inline a gate the helper provides; `loadKeeperScope` defined late — **confirmed**

- `leaveCatchup` at `:1803`; its inline gate is `:1811-1813` —
  `const ctx = await loadCatchupContext(catchupId, viewerId);` / `if (!ctx) return { error:
  "Catch-up not found." };` / `if (!ctx.membership) return { error: "You are not in this
  Catch-up." };`. `loadOwnCatchupCopy` at `:1556-1561` returns those same two refusals with the
  **identical** sentences. I checked what else `leaveCatchup` uses from `ctx`: only
  `ctx.catchup.createdById` (:1814) and `ctx.catchup.groupId` (:1828, :1833) — both are in
  `loadOwnCatchupCopy`'s `{ groupId, createdById }` return. The swap is complete.
- `setReminderPref` `:1995-2001`: `prisma.catchup.findUnique({ select: { id, groupId } })` then
  `loadMembership` then `"You are not a member of this group."` — a **third** refusal sentence for
  the same rule. The finding correctly flags that adopting the helper changes owner-reviewed copy
  to "You are not in this Catch-up." Flag it in the commit or thread the sentence through.
- `loadKeeperScope` is defined at `:1615` and first called at `:565` (then 626, 656, 734) —
  **1,050 lines** after its first call, exactly as stated. `MEMBERSHIP_REFUSAL` at `:1599-1602`.
  Other callers at 1661, 1754, 1944; `loadOwnCatchupCopy` also used at 1865, 1904.

Nothing here is a guard being dropped: both changes replace an inline gate with the *same* gate
written once, and the helper is strictly no weaker (`loadCatchupContext` reads the same two rows).

---

## Cross-finding notes for the fix plan

1. **Ordering inside this cluster**: 10 → 03 → 02 (prompt-library half) → measure. 02 makes
   `catchups-core.ts` a value import in a client file, which is only safe after 10 and only a win
   if 03's chunk does not grow. The cadence/reminder/notify half of 02 is independent.
2. **catchups-04 vs duplication-02 vs media-viewer-06**: same clone, three writers, no
   contradictions. Merge as: catchups-04(a) (the 5 MB cap — unique), media-viewer-06's extraction
   steps (safest: names the `upload-size-rule.test.mjs` `SENDERS` pin and keeps `shrinkForUpload`
   at the call sites), duplication-02's timeout finding (unique: two surfaces have no
   `AbortController`). Drop catchups-04(b) as redundant.
3. **catchups-03 vs bundle-build**: the 16.6/17 KB chunk is one chunk, `3vrge4av51cxl.js`
   (16,943 B). bundle-build calls it "Popover"; catchups-03 calls it "Tooltip". Both mean
   `InfoTooltip`. Use "the Popover primitive behind InfoTooltip" in the plan.
4. **catchups-01 needs a sixth file**: `src/app/(main)/admin/catchups/[catchupId]/page.tsx`
   (:103, :281).
5. Nothing in this cluster was refuted. That is unusual and worth saying plainly: every line
   number I checked was either exact or off by one or two, and the three claims I actively tried
   to break (option (a)'s Vercel body cap, the unreachability of `loadMeta`'s fallback, the
   single-route Popover chunk) all survived.
