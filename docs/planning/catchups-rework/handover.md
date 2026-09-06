# Catch-ups rework, LIVING HANDOVER

## Start here

**@ this file and invoke `/campaign`.** The skill is the protocol for running this unattended:
it front-loads every question the owner must answer, then works the sessions below one after
another, briefing one worker per session at the model the table names and verifying each one
itself. This file outranks the skill wherever they disagree. Then, in this order:

1. **Read [`brief.md`](brief.md) in full.** Not skimmed, not summarised. It is the owner's
   spoken brief with the fillers removed and nothing else touched, plus his typed answers,
   **52 numbered paragraphs**, about fifteen minutes. Every `¶n` in this file points into it.
   ¶51 and ¶52 are where he answers direct questions; do not stop at ¶50. He has asked, again,
   that no session work from a condensed version of it (¶22), and the last two campaigns
   proved him right.
2. **Find your session** in "The sessions" below, check the status board, and read that
   session's section. Each section is written to be the whole prompt for that session.
3. **Read the old spec for vocabulary only.** [`docs/spec/catchups.md`](../../spec/catchups.md)
   describes what is shipped today: the objects, the Round state machine, the permissions. The
   owner on it, ¶48: *"Those are heavily outdated, and you have much more knowledge from my
   prompt than those guys do."* And ¶49: *"beyond that, there is no granular detail that will
   be useful in that."* Take the nouns and the mechanics from it. Take no design, no copy and
   no scope fence from it. Where it and the brief disagree, the brief wins.
4. **Read [`recon.md`](recon.md)** — what is actually wrong, 43 findings, measured, with a root
   cause per bug and a ranked ten at the end. Its section 13 is the list S3 reads first. Then
   [`flows.md`](flows.md), the click map and the intent-by-state matrix he asked for in ¶36.
5. **Read [`prior-art.md`](prior-art.md)** before disagreeing with a recommendation; the
   disagreement may already be answered there, with its confidence marked. Read its closing
   "The gaps" before leaning on any number in it.
6. **Before your session ends, edit this file**: status board, findings, decisions, session
   log. The next session starts by @-ing it alone, so whatever is not written here is lost.

`.claude/skills/writing-for-agents/SKILL.md` governs how you edit this file and anything else
you write for the session after you. Its section "Whose words are you carrying?" was added for
this campaign, at the owner's request (¶22): when you brief a worker or a next session on
anything the owner asked for, his paragraphs travel verbatim, not your paraphrase. Its
paragraph "A hedge is content" was added after this campaign's brief was checked against the
recording and found to have been de-hedged; read it before you clean anything he says.

**Three campaign-wide rules.** One mind per job wherever a job is one long sequence with state,
and a fan-out only where several independent readings are genuinely better than one; he left
ultracode to this session's judgment (¶51), the allocation is D40, and his earlier reasoning
against fan-outs is kept in view (`~/.claude/skills/campaign/SKILL.md`: *"the agents are
receiving this summarisation of summarisation, and then you don't get high-quality results"*).
No member's words or photographs are lost (¶45, ¶51), exported before anything can lose them,
and in his own words that must not *"be any reason for you to lower the scale of your
reworking"* (¶45): the shipped UI is not protected, the content is. And his suggestions are
examples while his problems are valid (¶26): *"when I flag the problems, those are valid, but
every suggestion I give is just an example"*, and *"You would be reducing the negatives but not
increasing the positives."*

This file follows the `docs/planning/collection-rework/` pattern (brief, living handover,
prior art, spec) because that campaign worked. It lives under `docs/planning/` rather than
`docs/audit-fix/` because this is a design and rework campaign, not an audit and its fixes. On
2026-09-05 two independent critics read this file against the brief and found the ledger short
by about thirty asks and a dozen paragraph pointers, and a dozen marks over-read him; all were
folded in the same day, and the session log says what changed.

---

## What this campaign is

The owner's own frame, ¶19: *"There are two parts to this. One is [how would I do it if
catch-ups was my entire app], and then the other is finding out all the things that went
wrong."* His diagnosis of the cause, same paragraph: it was treated as *"one fifth of the app,
maybe sixth on the sidebar, not that important"*. And ¶20 gives the order: deep reconnaissance
from a UI/UX point of view, then *"multiple rounds, definitely multiple rounds, of
brainstorming"*, then build it *"in completely different ways, plural, and then see what
works."* The bar for the campaign's own documents is set in the same paragraph: the bug-fix and
refactor audit prompts, *"the level of detail that these prompts go into is insane."*

Two fences he set in ¶20: this is **not** the refactor pass (*"We don't have to refactor the
catch-ups portion yet"*) and **not** the backend-architectural bug hunt; the user experience
comes first. A 2,054-line actions file is not this campaign's problem unless a design needs it
changed.

So, three tracks:

1. **Find everything that is wrong**, thoroughly, with screenshots, at his phone's size and
   his laptop's, in every state a Catch-up can be in and along every path between states
   (¶51). He has described *"maybe 10% of the problems"* (¶41). The rest is ours to find.
2. **Design Catch-ups as if it were the whole app.** Information architecture first (what is
   the home of a Catch-up, what does clicking anything do, one representation of a published
   Round instead of *"15 different ways in 15 different places"*), then several genuinely
   different directions built as lab rooms with the real data and the pressure corpus, the
   owner picks, a spec is written, it is built.
3. **The magazine and the PDF** (¶21, ¶30, ¶31), which he twice called *aspirational*: a second
   rendering of a published Round, portrait, laid out by rules that adapt to the content the
   way a magazine designer would, exported as a beautiful PDF, and, *"if we can do an amazing
   job"*, emailed. *"One whole side project."* It runs beside track 2, not after it.

Plus the functional changes he named, which every direction must carry: the **batch Catch-up
that exists by default** (¶4, ¶51), **archive and delete like WhatsApp** (¶5), **comments**
(¶10), **photos that open in the viewer** (¶10), **one representation of a published Round**
(¶13, ¶39), **link previews that fire on any pasted song link** (¶16, ¶50), the **photo wall**
(¶16, ¶49), and the shared **image viewer and heart** bugs (¶28, ¶29).

---

## The sessions

He asked (¶46) to be told which sessions run on which model at which effort, and then left
ultracode to this session (¶51: *"totally up to you"*). This is the answer; the structure is
this session's judgment (D41), the order of activities is his (D17). Every session is started by
pasting `@docs/planning/catchups-rework/handover.md` plus one line saying which session it is.
Everything is **max** effort.

| # | Session | Model | Ultracode | Runs after | Produces |
|---|---|---|---|---|---|
| S0 | Set-up (2026-09-05) | Fable max | yes, used: four transcript verifiers, two ledger critics, the S2 sweep | | `brief.md`, this file, the skill amendment, `prior-art.md` |
| S1 | **Reconnaissance** | Opus max | **no**: one browser, one machine | now | `recon.md`, `flows.md`, the storyboards, the export script and a first export, the first fixtures, root causes for every reported bug |
| S2 | **Prior art** | done inside S0 | | | `prior-art.md`, 21,000 words, eight shapes, with its gaps listed; a follow-up only if S3 finds a hole |
| S3 | **Directions** | **Fable max** | **yes**: the shape is in its section | S1 | `directions.md`: the IA, the directions, a room brief per direction; and `/lab/catchups/sketches`, one screen per direction for him to cull |
| S4 | **Rooms** | Opus max | no | S3 | `/lab/catchups/*`, one room per direction plus the pressure room, real data and fixtures, both viewports |
| S3b | **Second round**, only if the rooms disappoint | Fable max | yes | S4, at his word | more spaghetti, then a new shortlist (¶20) |
| S5 | **Pick and spec**, owner present | **Fable max** | no | S4, once he has browsed | `spec.md` with every decision marked LOCKED / RECOMMENDED / OPEN |
| S6+ | **Build**, one phase per session | Opus max | no (the `/campaign` skill's one-worker rule) | S5 | production, phase by phase |
| M1 | **Magazine design** | **Fable max** | **yes**, for the failure-mode hunt and the grammar panel only | S1 | `magazine.md`: the layout grammar, the failure list, a feasibility spike |
| M2+ | **Magazine build** | Opus max | no | M1 (and S5 for shared parts) | the magazine rendering, the PDF, then email if he says so |
| X | **Fast fixes** | Opus max | no | S1's root causes | the mobile header cut-off, the shared image viewer, the heart timing; may ship before anything else |

**Where ultracode earns its keep and where it does not (D40).** A fan-out helps when the work is
many independent readings of the same thing (research shapes, transcript stretches, failure
modes, alternative designs from one shared brief), and it hurts when the work is one long
sequence with state (a browser walked through every Catch-up state; a room built and looked
at; a build phase with a gate). It also cannot help where the machine is the limit: his Mac
has hung under browser fleets, so S1 and S4 are one browser each regardless. The one risk he
named, summarisation of summarisation, is avoided by the rule in the writing-for-agents skill:
every worker reads `brief.md` itself, in full, from disk; nobody gets a digest. So: turn
ultracode on for **S3 (and S3b) and M1** and leave it off for everything else. S2 already ran
that way inside S0.

Why Fable on exactly three: S3, S5 and M1 are where the campaign's taste and synthesis happen,
and he said he would rather not run everything on Fable (¶46). The sweep (S1), the
room-building (S4) and the build (S6+) are Opus work at his usual setting. S4 rooms are
independent of each other and two sessions may build in parallel if he is in a hurry,
colliding only on `src/app/lab/_registry.ts`. X can run any time after S1 and touches the feed
too, which he allowed in ¶28.

---

## Status board (update every session)

| Item | Status | Notes |
|---|---|---|
| Brief captured in his words | DONE | `brief.md`, 2026-09-05, 52 paragraphs: two sittings, the follow-up, his answers |
| Brief checked against the raw transcript | DONE | four verifiers, 69 findings, all folded in on 2026-09-05; see the log |
| Skill amended (¶22) | DONE | "Whose words are you carrying?" and "A hedge is content"; the user-level copy in `~/.claude/skills/` matches |
| Owner questions 1 to 5 | DONE | answered 2026-09-05, ¶51 and ¶52; readings under "Owner answers"; question 6 is open |
| Ledger and decisions checked against the brief | DONE | two critics, about sixty findings, folded in on 2026-09-05; see the log |
| S1 Reconnaissance | DONE | `recon.md` (43 findings), `flows.md`, the export, the pressure fixture, one `[Recon]` Catch-up left in place. Gaps listed at the end of `recon.md` |
| S2 Prior art | DONE | `prior-art.md`, inside S0, 2026-09-05; F15 says how far to trust each part |
| S3 Directions | DONE | 2026-09-06 first pass: `directions.md` Parts 1-5, ten directions, ten sketches. **Second pass the same day, after he rejected most of them** ("80% of the designs have just no taste at all"): six deleted, one rebuilt, four new, one synthesis. `directions.md` Part 6 supersedes Parts 2-4 and carries his rules as a table. Five sketches now |
| Owner culls the sketches | OWNER-GATED | **now**: `/lab/catchups/sketches` on his phone, starting at The one I would build. Owner question 7, rewritten for the five. His cull is S4's shortlist |
| S4 Rooms | OPEN | blocked on the cull; build from `directions.md` Part 3 and each direction's own file, and draw the composer too (F25) |
| Owner browses the rooms | OWNER-GATED | |
| S3b Second round | OPEN | only if he asks for it after the rooms |
| S5 Pick and spec | OPEN | blocked on the pick |
| S6+ Build | OPEN | blocked on S5 |
| M1 Magazine design | OPEN | unblocked. D27 is answered in `recon.md` section 6: photographs are boxed to 1920px, which is 164 dpi at A4 full-bleed |
| M2+ Magazine build | OPEN | blocked on M1 |
| X Fast fixes | OPEN | unblocked. Root causes for R6/F8, I9, R4, V1 and R13 are in `recon.md`; V2 and V3 need a real iPhone first |
| Old spec rewritten to describe what shipped | OPEN | last, with the final build phase |

Statuses are `DONE`, `PARTIAL`, `OPEN`, `OWNER-GATED`, `DECLINED`, the same five words every
`/campaign` board uses.

---

## What is true today (findings)

Numbered so later sessions can cite and correct them. **Verified** means a session looked;
**unverified** means it is the owner's report or a reading of the code, not yet reproduced.

- **F1, the live data (verified, read-only query 2026-09-05).** 3 Catch-ups: 1 active, 1
  paused, 1 ended. 4 Rounds, 2 published. 21 questions, 141 answers, 32 of them with photos,
  none with a song attached, 520 hearts. Nobody has archived or binned a copy. 11 batch
  groups exist (`Group.batchYear`, unique), and **none of them has a Catch-up**. 64 of 70
  members carry a batch year; 6 do not. The whole content fits in one JSON file.
- **F2, the code map (verified by listing, not by reading every file).** Routes:
  `/catchups` (index, `(index)/page.tsx`, 395 lines), `/catchups/new`, `/catchups/[id]`
  (home, 459 lines), `/catchups/[id]/answer`, `/catchups/round/[editionId]` (reader, 284
  lines), `/catchups/join/[token]`, plus `/admin/catchups`. Components under
  `src/components/catchups/{index,create,home,answer,round,join}`; the largest is
  `home/people-panel.tsx` at 728 lines, which is the "In this catch-up" panel he calls
  *"done so badly"* (¶12, ¶37). Server actions: one file, `catchups/actions.ts`, 2,054
  lines, 21 exports (create, join by token, cadence, pause/resume/end, submit/curate
  prompt, open/close/extend/publish, submit entry, heart, add/remove/leave members,
  archive, delete, keeper, reminder pref, nudge). Pure logic in `src/lib/catchups-core.ts`
  (state machine, `planNextAction`, `resolveSpotify`), `catchup-shelf.ts` (active /
  archived / deleted), `catchups-round-view.ts`, `catchups-notify.ts`, `catchups-types.ts`.
  Tests beside them. Two visual baselines (`e2e/__screenshots__/{desktop,mobile}/catchups.png`),
  both masked past the header because the page photographs live data.
- **F3, what the code says exists that he says does not work (code verified, behaviour
  unverified).** `catchups-types.ts` has a `promptKind()` with `photo-wall` and `songs`
  kinds, and `catchups-core.ts` has `resolveSpotify()` calling Spotify's keyless oembed.
  He reports (¶49) *"if you link a song, it doesn't automatically pull up a thumbnail. It
  doesn't work for YouTube or Spotify. There is no photo-wall kind of thing."* F1 says zero
  answers carry a song. S1 establishes what a member actually experiences. The design
  requirement is in ¶50 regardless: the preview fires on **any** pasted link, not only on
  the "songs" question kind.
- **F4, the lifecycle today (verified in schema and lib).** `Catchup.status` is active /
  paused / ended; pausing freezes the live Round's clock (`pausedAt`). A member's copy can
  be archived or deleted **personally** (`CatchupPref.archivedAt / deletedAt`), the bin is
  30 days, and the nightly sweep then removes the member's `GroupMember` row. The index
  shows an "Archived" and a "Recently deleted" section with put-back controls
  (`index/filed-away.tsx`), which is the thing he does not want to see (¶5). There is also
  a `leaveCatchup` action. Note for the batch Catch-up: "delete removes your membership
  after 30 days" cannot apply to a membership that is fixed by batch.
- **F5, the batch history (partly verified).** The create page has a one-tap "Everyone from
  <batch>" (comment in `(index)/page.tsx` lines 77 to 80), so today a batch Catch-up is a
  people-Catch-up someone made by hand, and "Start one" leads to the add-members page he
  objects to in ¶4 (B5). The archived `/lab/groups-rethink` rooms (concepts C and D) already
  argued for putting Catch-ups on the batch itself. S1 should recover from git how the
  earlier default batch Catch-up behaved and why it went (`git log -S`).
- **F6, the membership container (verified).** A Catch-up still belongs to a hidden `Group`
  row (`groupId` unique); people-Catch-ups create one. Batch groups are the same table with
  `batchYear` set. So "a batch Catch-up by default" is one `Catchup` row per batch group,
  and nothing about the container has to change for it.
- **F7, the reader's table of contents (code read, complaint unverified).** `round/toc.tsx`
  is one scroll-spy hook with a desktop rail and a mobile chip row, both mounted at every
  viewport with CSS visibility. He reports the active item bolding and reflowing (¶10),
  the mobile chips clipping in a box, a one-second lag on tap that *"reloads like a whole
  page almost"*, and no way to navigate once scrolled (¶11). All four are S1's to reproduce.
- **F8, the mobile header cut-off (unverified).** ¶11, ¶19, ¶25, ¶33: on his phone the green
  top bar stops short of the right edge, and the whole page reads as if half a centimetre of
  white space were added on the right, cutting through the sidebar. He saw it on the
  Catch-up home (¶25) and on the reader (¶11); not reproducible by narrowing a desktop
  window. That pattern is a child wider than the viewport creating horizontal overflow; S1
  finds which one, with a script that walks every element's `getBoundingClientRect().right`
  against `innerWidth`. It is the one bug he can see today on a live surface with seventy
  members, so X takes it first (D49).
- **F9, the shared image viewer and heart (unverified).** ¶28: swiping from a tall photo to
  a landscape one snaps the viewer to a smaller size; swiping back from the last photo jumps
  to the first, not the previous; the jump overshoots. ¶29: a heart on a Catch-up answer
  fills instantly but its animation fires a second late, unlike the feed. The viewer is
  `src/components/common/image-viewer.tsx` / `photo-carousel.tsx`, shared with the feed and
  the Collection; he allowed the fix to touch the feed. Caption clamp today is 2 lines
  (¶32), and he said *"maybe make it 4 lines"*.
- **F10, the safety net that already exists (verified in `docs/OPERATIONS.md`).** A nightly
  `pg_dump` goes to a private R2 bucket, 30 days kept plus the first of every month forever,
  and the media job mirrors every object in the public bucket. So the floor under "nothing
  gets lost" is already there. What he asked for in ¶45 and ¶51 is a rebuildable file,
  *"totally regeneratable"*; S1 adds that (D6, D23).
- **F11, prior research on disk.** `docs/planning/letterloop-research.md` (2026-07-05) is
  thorough on Letterloop's mechanics and says nothing about how it looks; he calls it
  *"still somewhat useful"* (¶49); `prior-art.md` §1 now covers the look.
  `docs/planning/other/dialog-standards-findings.md` (2026-08-29; moved into `other/` by a
  peer session on 2026-09-05, `git log --follow` if it has moved again) is the evidence base
  for the dialogs he wants reworked *"in general"* (¶3), and its thesis applies here word for
  word: the standards exist and were not enforced past the surface they were written on.
- **F12, the lab.** `/lab` requires a session and the admin role (`src/app/lab/layout.tsx`).
  Rooms may read live data through server components; the lab's own `actions.ts` already
  imports the Prisma client. `docs/spec/lab-voice.md` is the house voice; a new room goes
  in the **Delight** group, never "Second look". The owner has opened `/lab/catchups/` for
  *"all kinds of testing for a bunch of different things... whatever we want"* (¶52).
- **F13, his answers (2026-09-05, ¶51 and ¶52).** Ultracode is this session's call.
  Throwaway Catch-ups are allowed, *"or anything else you want and need to do a great job"*.
  What matters most to him in recon: *"how literally every state of the catch up looks and
  every sequence of events through those states looks."* Batch and people Catch-ups both
  exist and live together; a batch Catch-up *"can't edit people in and out"*, everyone in the
  batch is added automatically and *"[has] access to previous issues if they join later"*;
  people Catch-ups are *"how you'd expect"*. Any way of saving old Catch-ups is fine *"as
  long as they're totally regeneratable"*. The magazine is **portrait**. Build *"a fake
  catch up or two"* filled with *"literally every type of content we might come across"*
  and make the features survive it: *"incredibly robust can be produced with only pressure
  testing."* Real data in the rooms: yes.
- **F14, a hazard the answers open.** A throwaway Catch-up notifies its members when a Round
  opens, when answers open, on every reminder and on publish (`catchups-notify.ts`). A fake
  Catch-up containing any real member would put test noise in that member's bell, to seventy
  beta testers' detriment. So a live throwaway holds only the owner's account and Jerry, and
  variety of content and authors comes from fixtures (D30, D33). This is the session's care,
  not his instruction; a session that needs more may ask him.
- **F15, `prior-art.md` and how far to trust each part (S0, 2026-09-05).** Eight researchers,
  one assembler, 21,000 words, every claim marked [measured], [company] or [secondary], every
  gap collected at the end. By the assembler's own review: §8 (the PDF pipeline) is the best
  evidenced, with package sizes, Vercel's limits page (dated 2026-08-24) and Cloudflare's
  caps read directly; §7's oembed section is genuinely measured (fields, status codes,
  thumbnail sizes, Spotify's cover-art path prefixes, the missing artist field). §5 (who is
  in this) is the weakest: nothing in it was opened in a browser. §2's wide-screen argument
  is inference; nobody measured Spotify or Letterboxd at 1920. §3's Revolut part is empty,
  because Revolut has published nothing about document navigation; treat *"what if Revolut
  did this"* as unanswered and look at his phone instead. §1 has no pixels of Letterloop's
  home, members screen, PDF or Mementos; only words. Read "The gaps" before building on any
  of it.
- **F16, a correction to this file's own earlier claim.** The export script and the PDF
  script are ordinary `scripts/dev/` scripts. `docs/spec/hand-run-passes.md` and its test
  govern passes where a model judges members' data and writes a judgment back (the
  Collection's tags, the directory's professions); neither script does that, so the protocol
  does not apply and `scripts/qa/hand-run-passes.test.mjs` will not see them. Whether
  `scripts/qa/scripts-ledger.test.mjs` wants a row for each in `scripts/dev/README.md` is
  unverified; check it.

- **F17, the batch Catch-up never existed, and one has already drifted (S1, verified).** Two
  groups are named "Batch of 2024": the real batch (`batchYear: 2024`, 11 members, **no
  Catch-up**) and a hand-made snapshot (`batchYear: null`, 11 members, **the Catch-up**). A 2024
  alumnus made it on 2026-08-23 through `/catchups/new`, which always mints a NEW group;
  a real 2024 alumnus who joined the site on 2026-08-28 is not in it. Its Round 1 is in
  `preparing` with 8 answers from one author of eleven. The history is three commits:
  2026-07-25 (`063896c`) recorded his instruction *"the Catch-up with your batch is
  automatically there"* and shipped a one-tap shortcut instead; 2026-08-21 (`31f84c9`) removed
  the "Start one" row, with his own reasoning that a private naming choice must not rename a
  shared batch group. `recon.md` section 9. **This corrects B4: nothing regressed, it was never
  built.**
- **F18, the phone overflow, root-caused (S1, verified).** A pasted Spotify link's
  scheme-host-path is 54 characters and 369px with no break opportunity; the reader's answer
  paragraph is 316px and carries no `break-words`; nothing between it and `<html>` clips; only
  `html { overflow-x: clip }` (globals.css:325) holds the page still, and the green bar is
  `position: sticky` so it does not follow a pan. `recon.md` section 0. **This closes F8.**
- **F19, the real ceilings (S1, verified in the validators).** Answer body 6,000 characters;
  **3 photos per answer**; question 300 characters; 40 questions per Round; 100 people per
  Catch-up; photographs boxed to **1920px** on the long edge. **D35 asks for two things the app
  cannot produce** (a 3,000-word answer, a ten-photo answer) and `recon.md` section 6 corrects
  it. The pressure fixture is built to the real caps and one row over each.
- **F20, the export exists and everything fits in 5.8 MB (S1, run).**
  `scripts/dev/export-catchups.mjs`, shape in `src/lib/catchups-export.ts`, ledger row added,
  `scripts-ledger.test.mjs` passes. 3 Catch-ups, 4 Rounds, 21 questions, 141 answers, **36
  photographs**, 520 hearts, verified regenerable (every file fetched, every byte recorded, no
  invite token exported). **F16 was right that the pass protocol does not apply; the ledger it
  DOES need is `scripts/README.md`, not `scripts/dev/README.md`.**
- **F21, a paused Catch-up hides a live Round (S1, verified).** Pausing replaces the whole left
  column with a banner. "in the loop" is paused **and has a Round 2 in `collecting`**; nothing
  on its home says so. `flows.md` section 2.
- **F22, the "catch-up" suffix is his own July decision (S1, verified).**
  `catchupSurfaceTitle`'s docblock cites *"owner review 2026-07-25"*. In ¶25 he reverses it. The
  name is printed **seven** ways today. Record it in the spec as a reversal, not a bug.

- **F23, the heart re-renders the whole Round on every tap (S1, measured; he corrected the
  reading on 2026-09-05).** ¶11's *"it takes a second to react, and it just reloads like a whole
  page almost"* sits in the chip-bar paragraph and was first filed there. It is the heart:
  *"tapping the heart on a catch up taking longer to react than tapping heart on feed. noticeably
  longer."* `toggleEntryLove` ends both paths with `revalidatePath('/catchups/round/<id>')`, and
  the reader server-renders all 133 answers, so one tap ships **603 KB and 1.5 to 2.6 seconds**
  against the feed's **55 KB and ~270ms**. The feed's `toggleLike` removed exactly this call and
  its comment states the rule: *"an action whose result the client already holds does not
  revalidate"*, having caused *"an occasional scroll-to-top on the heart click"*. The optimistic
  flip is fine, measured at 28ms. **The fix is deleting two lines.** The lazy-motion chunk (5,239ms
  here against 1,930ms on the feed) is a separate, smaller effect that only touches the first tap
  after a cold load. `recon.md` §8. **This supersedes the earlier reading of R5 and R13.**

- **F24, what ten designers agreed on without being asked (S3, 2026-09-06).** Every one of the
  ten directions replaced the chip row with the same two-part mechanism: a persistent one-line
  namer of the question you are in, plus a sheet listing every question with its count, the
  current row marked by colour and never by weight. Seven invented a progress line made of one
  piece per question. Eight gave a short answer a boxless form. Seven caught that D-line 1.3 read
  literally draws the latest cover twice on a one-Round home and made the same repair. Four made
  the app's green bar the reader's own surface. These are findings for S5's spec whichever
  direction wins; `directions.md` 2.3 and 2.4.
- **F25, the bet nobody took (S3's adversarial judge).** All ten directions are about how a
  finished Round is read. Nine dispose of the composer, the surface a member spends longest on
  and where a song link or a wall photograph is made, in a paragraph that keeps today's shape.
  S4's room briefs ask every builder to draw the composer with the reader's care, and owner
  question 8 asks whether S3b should take it first.
- **F26, the real Round's shape in time (S3, derived from `createdAt`).** "in the loop" Round 1
  ran eight days (6 to 13 August 2026), not the five its transcript designer imagined, in
  **23 runs** by 13 people: four came back on a later day and two overlapped. Seven people wrote on
  the first day, 48 of the 133 answers. The composer saves one question at a time, so a person's
  answers arrive seconds apart in question order; a Round is arrivals, not conversation.
- **F27, a capture trap (S3, proved 2026-09-06).** A `--mobile --full` shot (device scale 2) of a
  page taller than about 8,000 CSS px that contains a `backdrop-filter` element comes out as blank
  background from top to bottom while the DOM is fine: the bitmap passes Chrome's 16,384px
  compositing limit and the blurred layer takes the rest with it. Capture at scale 1 or in
  viewport-sized pieces. Written into `scripts/qa/screenshot-auth.mjs`'s header.
- **F28, the MCP browser cannot be signed in from a session (S3).** Reading `DEV_LOGIN_SECRET`
  from `.env` is denied by the permission settings, and the `chrome-devtools` server runs
  `--isolated --headless` with no attachable port, so nothing can hand it the cookie. Every
  screenshot in S3 went through `screenshot-auth.mjs`, which signs in from Node. The measuring
  `evaluate_script` does is available from a throwaway puppeteer probe in `/tmp` that imports
  `scripts/qa/_dev-login.mjs`; that is what found F27.

- **F29, Spotify album art has never rendered, anywhere (S3, second pass).** `resolveSpotify`
  stores whatever `thumbnail_url` the keyless oembed returns. As of 2026-09-06 that endpoint
  answers with `image-cdn-fa.spotifycdn.com` and `image-cdn-ak.spotifycdn.com`; the CSP's
  `img-src` allowed only `i.scdn.co`, so the browser would refuse the image with nothing but a
  console line to show for it: the card falls back to its glyph and reads as a song nobody had a
  cover for. Two reasons rather than one, and the second is worse: `songArt` is **null on every
  entry in the database** (checked 2026-09-06), so the resolver has never once run end to end,
  which is ¶49's *"the Spotify song thing doesn't work yet"* confirmed. Found on a real answer in
  "in the loop" whose entire text is *"Honestly I just want to see if the album covers render
  properly"*. The allowlist half is fixed in
  `next.config.ts` with a wildcard on `*.spotifycdn.com`, because the shard letters rotate; the
  optimizer's own exact-host allowlist is untouched.

- **F30, the songs question resolves nothing at all (S3, second pass).** On this Round the songs
  question has thirteen answers and `songUrl` is null on every one. Today's resolver only fires
  when the composer's dedicated song field is used, and four people pasted links into the body
  instead. ¶50 asks for the opposite: *"the thumbnail thing should work. Whenever they paste a link
  to a song."* The sketches do it in `_media.ts` (find links in the body, resolve through oembed,
  strip them from the printed text). YouTube needs no key: the still is derivable from the video
  id, and `i.ytimg.com` is now on the img-src allowlist.

- **F31, a sticky bar inside the scaled frame has two separate traps (S3, second pass).** An
  ancestor with `overflow: hidden` becomes the scrollport, so `position: sticky` resolves against a
  box that never scrolls; and a sticky element at the END of its container has no distance to
  travel, so `bottom: 0` on a last child does nothing at all. Both were measured, not reasoned
  about: the navigator bar sat at `top: -2122` at scroll 3,000. The frame now clips with
  `overflow-x: clip` (which does not create a scrollport, unlike `hidden`) and a foot bar is a
  zero-height sticky box at the START of the page, offset by `100dvh` and lifted by its own height.
  Written up in `_frame.tsx` and `_parts.tsx`; the rooms will hit both.

- **F32, a fan-out of designers converges by construction (S3, second pass).** Ten builders given
  one brief and one shared contract produced nine variations on "a card per answer under a
  heading". Owner: *"it's clear many of these were done separately since many are just copies...
  the way you prompted your subagents led to a somewhat convergence on design"*, and *"So freaking
  just do it yourself I give up. There's no rigor."* What differs under those conditions is
  ornament, because everything structural is fixed by the brief they share. The second pass was
  drawn by one mind against real content, and the faults it found (F29 to F31) are ones no worker
  report would have surfaced, because each needed somebody to look at a screenshot and disbelieve
  it. **A design round is not a fan-out.** Fan out for coverage (audits, sweeps, verification);
  draw with one hand.

---

## The ledger: every ask in the brief

Each item names its paragraphs. This is an index into `brief.md`, not a substitute for it:
the paragraph carries the tone and the reasoning, and the tone is part of the instruction.
Status is `open` until a session closes it and says where. Checked against the brief by two
independent critics on 2026-09-05 and repaired; if you find a gap, add the row.

### How to work (P)

| # | Ask | ¶ | Status |
|---|---|---|---|
| P1 | A serious, bottom-up rework of UI and functionality; a completely fresh take on the presentation; the functionality is mostly fine | 1, 17, 18 | open |
| P2 | He gives constraints, not answers; find the solution shape; think critically about each way; research what others and Letterloop do; pick the best | 7 | open |
| P3 | The problems he flags are valid; every suggestion is an example that may be wrong; do not just fix the listed items, which only *"reduces the negatives"*; and the named anti-fix is a Back button or *"slide buttons here and there"* | 6, 18, 26 | open |
| P4 | The bar is *"if catch-ups was my entire app"*: a complete experience, beautiful and intuitive | 19, 47 | open |
| P5 | Two parts: how would I do it, and everything that went wrong | 19 | open |
| P6 | Thorough recon from a UI/UX point of view with screenshots (code alone cannot show it), then multiple rounds of brainstorming, then build it several different ways and see what sticks | 20, 43 | open |
| P7 | Map every intent against every state a Catch-up can be in; good modular design makes the 10,000 combinations collapse | 36 | open |
| P8 | Do not reinvent the palette; it must still be this app; new things are allowed; the Apple Action Button analogy: bespoke, unmistakably of the app; reusing the same pill-and-status-pill vocabulary everywhere is the named failure, *"a higher level of abstraction"* is the ask | 42 | open |
| P9 | Letterloop is the floor and we are under it (*"ours just looks so much worse than theirs"*); we must be much better; Letterloop's things are too fixed | 17, 49, 50 | open |
| P10 | Past specs and prompts are guidance, not law; heavily outdated; only what Catch-ups is *for* is worth taking from them | 48, 49, 50 | open |
| P11 | Existing content is not deleted; export it to a file that is *"totally regeneratable"*; but do not let that lower the scale of the rework | 45, 51 | done, `scripts/dev/export-catchups.mjs`, F20 |
| P12 | Say which sessions on which models at which effort; ultracode is the session's call; time not a constraint; tokens not wasted; not everything on Fable | 46, 51 | done, "The sessions" |
| P13 | Catch-ups is the weakest part, hidden from demos; the one genuinely creative feature; *"do me proud"* | 44, 47 | open |
| P14 | Amend the writing-for-agents skill: his brief travels verbatim when relayed; when one session hands its own work to the next, its judgment is enough | 22 | done, S0 |
| P15 | He has described about 10% of the problems; find the rest | 41 | open |
| P16 | What works and stays: the answer tile's content (bird, name, batch, answer), the posts dialog, the image viewer and the way images are arranged, portrait photos on a phone and swiping between them (*"kind of look fine"*), the Keeper leaf mark, pause and resume; comments will be easy to add; about 10% of the build is good | 14, 17, 19, 27, 28, 37 | open |
| P17 | *"It doesn't give me any dopamine"*: delight is an acceptance criterion, not only correctness; today reads as *"a V0.5 of an app"* | 3 | open |
| P18 | His diagnosis: it was built as one fifth of the app and got a fifth of the attention; the remedy is to treat it as the whole app | 19 | open |
| P19 | The effort benchmark for this campaign's own documents: the bug-fix and refactor audit prompts, *"the level of detail... is insane"* | 20 | open |
| P20 | Scope fence: no refactor pass yet, and not the backend-architectural bug hunt; UI/UX first | 20 | open |
| P21 | His severity ranking: Fresh off the press has *"the most bugs"* and *"severe problems"*; the rest of the index is *"just tweaking"* | 9 | open |
| P22 | Enumerate the Letterloop parity gaps: *"a lot of the things that were there in Letterloop aren't there"*, including the small pretty ones | 49 | open |
| P23 | Recon's first duty: how every state looks and how every sequence of events through the states looks | 51 | done, `recon.md` §11 |
| P24 | Robustness by pressure testing: a fake Catch-up or two filled with every type of content; survive the most varying input | 51 | partial: the corpus exists (`_fixtures/pressure.ts`); the rooms that must survive it are S4 |
| P25 | `/lab/catchups/` is the sandbox for any test, *"whatever we want"* | 52 | open |
| P26 | Seventy beta testers are on this today: live members, live Rounds mid-flight; the rework lands on a live surface and a migration cannot orphan an open Round | 44 | open |

### The index, `/catchups` (I)

| # | Ask | ¶ | Status |
|---|---|---|---|
| I1 | Sort out what belongs in the wide left column and what on the right | 1 | open |
| I2 | Long rectangles stretch on wide screens until 90% is white space; not scalable; a different shape (squares? a picture per Catch-up?) | 1, 6 | open |
| I3 | The Spotify-grid idea is an example he immediately withdrew; explore many shapes | 6 | open |
| I4 | Three calls to action on opening: *"overpowering"* | 23 | open |
| I5 | The View CTA is redundant (everything clicks through to the same place) and mis-aligned because of the three dots; but *"if there's a reason, sure"*, and controls that do not span the tile are *"fine, I guess"* | 3, 24 | open |
| I6 | Three dots in a random corner *"interrupts everything"*; if they exist at all they belong top right; whether tiles exist at all is the level of rethink wanted | 3, 24 | open |
| I7 | A row of birds plus "+18" identifies nobody, on the index tile, the reader's masthead and the home; keep birds, never initials; find a different way to show who is here | 12, 23, 25, 27 | open |
| I8 | The birds now overlap each other; he thinks a regression | 23 | open |
| I9 | Fresh off the press: round, loop, date, then a quoted sentence he does not want to keep seeing; a strangely shaped hover; a curved border between items; text spilling out of the hover; *"could be done in a completely different way"*; and by his ranking it has *"the most bugs"* | 9 | open |
| I10 | One representation of "a published Round", not *"15 different ways in 15 different places"*, and not different on desktop and mobile | 13, 39 | open |
| I11 | Hover darkens, outline appears, a View button: *"not critical thought"* | 3 | open |
| I12 | A member is in only two or three Catch-ups; design a short list, not a library | 1 | open |
| I13 | The long-box problem is everywhere in the app, and the worst case he names is a TV | 1 | open |

### Lifecycle: archive, delete, pause, end, leave (L)

| # | Ask | ¶ | Status |
|---|---|---|---|
| L1 | Ending, deleting, archiving, leaving, pausing: too many verbs, no consistency, *"everything's just different in every different situation"*, *"none of that has been considered properly"*; pause he *"kind of doesn't get"*, and then supplies the one argument for it himself: without it a Round *"will just start whenever the time is up"* | 1, 4, 8, 24, 40 | open |
| L2 | WhatsApp model: archive and delete; neither is visible on the main list; no Archived section with a Put back button in your face; and *"where do we keep them?"* | 1, 5 | open |
| L3 | *"There should not be an exiting a catch-up"*, said generally after the batch lead-in; ¶4 had asked for a leaving, so this is a reversal | 4, 5 | open |
| L4 | Popup dialogs need reworking in general, *"a whole other thing"*: the people dialog, the move dialog, the Reminders dialog (the dialog-standards research is the base) | 3, 38, 40 | open |
| L5 | Where archived and deleted Catch-ups live, and how you find one again | 1, 5 | open |
| L6 | Whether leaving exists for a people-Catch-up at all: asked for in ¶4, apparently withdrawn in ¶5; today's code has a leave action | 4, 5 | open |

### The batch Catch-up (B)

| # | Ask | ¶ | Status |
|---|---|---|---|
| B1 | Exists by default for every batch; everyone in the batch is automatically in; sees the history of Rounds; can take part in future Rounds; someone who joins the site later has access to the earlier issues | 4, 51 | open |
| B2 | No adding or removing members; the members are fixed, the batch; *"can't edit people in and out"* | 4, 51 | open |
| B3 | Who is the Keeper? Who may start a Round? A question he asked, not answered | 4 | open |
| B4 | It used to exist and disappeared; recover why | 4 | done, `recon.md` §9 and F17: it never existed |
| B5 | Bug today: "Start one" on a batch routes to the add-members page, which a batch Catch-up must never have | 4 | answered: the button was removed on 2026-08-21; `/catchups/new` replaced it and has the same fault (F17) |
| B6 | Batch and people Catch-ups both exist and are listed together; people Catch-ups are *"how you'd expect"* | 51 | open |

### A Catch-up's home, `/catchups/[id]` (H)

| # | Ask | ¶ | Status |
|---|---|---|---|
| H1 | What is the "home" of a Catch-up and how do you get back to it; landing straight in the reader from a finished Catch-up is *"a nice thought"*, the fault is the missing way back; the relationship between pages is not designed | 18, 36 | open |
| H2 | The same published Round appears three times on the home: a "Round 1 is out" tile, the whole Round inline, and a Published issues entry; *"so ridiculous"*; and yet *"then what do we put on the left? I don't know"* | 15, 35, 36 | open |
| H3 | The "Round 1 is out" tile is dead except for its link; the whole tile is the target or there is no tile | 35 | open |
| H4 | Say "In the loop", not "In the loop catch-up" | 25 | open |
| H5 | Pause and resume behave acceptably; the whole left side pauses | 14, 15 | open |
| H6 | Getting back to the home means scrolling the whole Round: *"I scroll all the way to the bottom, which takes me a week"* | 18, 35 | open |
| H7 | The home's spacing and typography, on the "Round 1 is out" tile in particular, *"just so horrible"* | 35 | open |

### The reader, `/catchups/round/[id]` (R)

| # | Ask | ¶ | Status |
|---|---|---|---|
| R1 | Stays navigable on the website, roughly as now; not the worst on desktop | 10 | open |
| R2 | Comments on answers | 10, 17, 19, 27 | open |
| R3 | Click a picture to expand it | 10 | open |
| R4 | Active TOC item bolds and reflows the text; some questions truncate to "..."; one very long scroll; *"a nicer way to do it"* | 10, 35 | open |
| R5 | Mobile navigation is *"incredibly bad"*: the horizontal chip bar is janky, boxed, clipped and slow; after scrolling you cannot navigate or even tell which question you are in; *"what if Revolut did this?"*; ideas offered: a tap that takes over part of the screen, or disabling native scroll for a Collection-like navigation | 10, 11, 17, 19, 34 | open |
| R6 | On his phone the green header bar is cut off at the top right and about half a centimetre of white space appears on the right, cutting through the sidebar; seen on the home and on the reader; not reproducible by narrowing desktop | 11, 19, 25, 33 | open |
| R7 | The masthead's row of birds identifies nobody, and the horizontal rule under it is wasted space, *"barely visible... Can totally delete that"* | 11, 27 | open |
| R8 | "13 of the group wrote in": is it needed? | 27, 39 | open |
| R9 | *"Do we need to say Question 1?"*, a question he asked | 27 | open |
| R10 | The desktop right-hand navigation is not done that well either | 11 | open |
| R11 | The answer tiles are right and stay: bird, name, batch, answer | 27 | open |
| R12 | Tiles waste space: a thick bottom band with the heart alone, one-line answers using 15% of a 3 cm tile, a tall photo leaving *"a lot of wasted space on the sides"*; minimise here and solve completely in the magazine | 21, 30, 31 | open |
| R13 | The heart fills instantly but its animation fires a second late, unlike the feed | 29 | open |
| R14 | Photo caption More and Less stays; the threshold *"maybe"* goes from 2 lines to 4 (he reversed himself and landed here, hedged) | 32 | open |
| R15 | YouTube and Spotify previews for songs, *"cute, clickable"*, and they fire whenever a link is pasted, not only on the songs question kind | 16, 49, 50 | open |
| R16 | A photo wall for questions, modular, working with everything else | 16, 49 | open |
| R17 | "Back to the catch-up" lands on the awful home | 35 | open |
| R18 | *"Not enough content is showing"*: density is a complaint of its own, apart from the navigation | 11 | open |

### People (E)

| # | Ask | ¶ | Status |
|---|---|---|---|
| E1 | "In this catch-up": six or seven names, "and 16 more", See and add people, truckloads of white space, only the A-names visible, *"so inefficient"*, *"these huge rows"*; the panel and the dialog show the same thing twice; does it have to be a tile, a preview, a whole list, shown at all? *"Yes, we probably should. But from there is where I want you to start thinking"* | 12, 14, 19, 37 | open |
| E2 | The Keeper highlight and the leaf mark next to the name are nice; keep the idea | 37 | open |
| E3 | The See-and-add-people dialog: white space, "keep it" [Keeper] with "some people started it" should just say Keeper, the link on a *"horribly coloured background"*, the move dialog so narrow three words take three lines, rules everywhere; *"no way Apple would design anything that looked like this"* | 19, 38 | open |

### Settings (S)

| # | Ask | ¶ | Status |
|---|---|---|---|
| S1 | Twelve horizontal rules, pills inside pills, *"too many pills, man"*; removing the rules alone will not save it; not invisible design; apply *"good UX principles like we have"*, the app's own | 14, 40 | open |
| S2 | The Reminders info dialog is twice as wide as its text | 40 | open |
| S3 | Pause and resume are okay | 14 | open |

### The shared image viewer (V)

| # | Ask | ¶ | Status |
|---|---|---|---|
| V1 | Swiping from a tall photo to a landscape one snaps the viewer smaller, *"very jarring"* | 28 | open |
| V2 | Swiping back from the last photo goes to the first, not the previous | 28 | open |
| V3 | The jump back overshoots, *"sudden, fast-moving"* | 28 | open |
| V4 | A fix may change the feed's viewer too; allowed | 28 | open |

### The magazine and the PDF (M)

| # | Ask | ¶ | Status |
|---|---|---|---|
| M1 | The whole Catch-up as a beautiful PDF, *"aspirational"*; a navigable PDF is nice, *"not that important"* | 10, 21 | open |
| M2 | A magazine or editorial rendering, *"equally aspirational"*, tailor-made per Catch-up by layout rules that adapt to the content (*"a lot of if statements"*, like the profile page), no comments, not cookie-cutter, image one side and *"this"* the other, different pages, big images only at high resolution; *"as if we shipped all the content to someone at Vogue"* with him as editor; the quality bar is three days of his own hand design per issue | 21, 30 | open |
| M3 | A PDF is shareable and emailable; *"if we can do an amazing job for this"* he will wire up emailing everyone when a Round is ready | 21 | open |
| M4 | List the hundred things that could go wrong and how each is bypassed | 31 | open |
| M5 | Scope it as its own side project; decide what goes to subagents and what to separate sessions | 21 | done, track M |
| M6 | Both: minimise the wasted space in the web reader, and solve it completely in the magazine | 31 | open |
| M7 | Portrait, not landscape | 51 | open |
| M8 | Scalable *and* adaptable; hard, *"but I think it's totally reachable and that it should be tried"*: the effort is pre-authorised | 30 | open |

---

## Decisions

The three marks are the ones the writing-for-agents skill defines. **LOCKED** is the owner's,
with the paragraph. **RECOMMENDED** is this session's judgment; do better if you can, and say
so. **OPEN** is nobody's yet; the phase named decides it. Two critics read these against the
brief on 2026-09-05 and a dozen marks moved; where a decision was split, the owner's part
stays LOCKED and the session's reading sits beside it as RECOMMENDED.

### LOCKED

- **D1** The rework is bottom-up, not a round of tweaks (¶18, ¶26).
- **D2** He sets constraints; sessions find the shape; his problems are valid and his
  suggestions are examples (¶7, ¶26).
- **D3** The palette stays and the result must still work in this app; new things are
  allowed; bespoke but unmistakably ours, the Action Button analogy, and *"a higher level of
  abstraction"* rather than the same pills everywhere (¶42). Only the palette is fenced by him;
  how far the rest of the design system binds is D36.
- **D4** A batch Catch-up exists by default for every batch; membership is the batch, fixed
  and automatic; everyone in it sees the whole history and can take part in future Rounds;
  no adding or removing members; no leaving; someone who joins the site later is in it and can
  read every earlier Round (¶4, ¶5, ¶51).
- **D5** Archived and deleted Catch-ups do not appear on the main list (¶5).
- **D6** No member's words or photographs are lost, and they are exported to a *"totally
  regeneratable"* file before any change that could lose them (¶45, ¶51); this is a preference
  with his own override attached, *"don't let the existing catch-ups be any reason for you to
  lower the scale of your reworking"*, so it protects content, never shipped UI (¶45).
- **D7** Comments on answers are in scope; the old spec's fence against them is void (¶10, ¶17,
  ¶19, ¶27).
- **D8** Photos in answers open in the viewer (¶10).
- **D9** A song link pasted anywhere in an answer produces a preview card, YouTube and
  Spotify at minimum, regardless of the question's kind (¶16, ¶50).
- **D10** A photo-wall question type exists and is modular (¶16, ¶49).
- **D11** The caption More and Less control stays (¶32). The threshold is D38.
- **D12** The answer tile's content stays: bird, name, batch, answer, and a heart (¶27). Its
  chrome, and where the heart sits, are not locked; ¶30 attacks exactly that.
- **D13** He wants two renderings of a published Round: the web reader, navigable, with
  comments; and a magazine, print-first, without comments (¶10, ¶21). He called both
  *aspirational* and left the scope to the session (¶21); that both ship, and in what order,
  is D39.
- **D14** Letterloop is the floor, and today we are under it (¶17, ¶49).
- **D15** Past specs and prompts are guidance, not law (¶48, ¶49, ¶50).
- **D16** Ultracode is the session's to allocate (¶51: *"totally up to you"*). The allocation
  itself is D40.
- **D17** The order of work is his: reconnaissance, then multiple rounds of brainstorming, then
  building it several different ways (¶20). The session structure that carries that order is
  D41; he said *"I don't know how you want to structure this"* (¶43).
- **D18** A tile that is dead except for a link inside it is wrong (¶35). Whether a tile has one
  click target and whether View survives is D42; he allowed *"if there's a reason, sure"* (¶3)
  and called controls that do not span the tile *"fine, I guess"* (¶24).
- **D19** Copy: "In the loop", not "In the loop catch-up" (¶25); the Keeper is labelled
  "Keeper" and nothing more (¶38); the barely visible horizontal rule under the reader's
  masthead goes (¶27, *"Can totally delete that"*). Question numbering is O9, not decided.
  The old spec's banned-word list is D43, not his.
- **D28** A batch Catch-up has no member editing at all, and batch and people Catch-ups are
  listed together as one kind of thing (¶51). What *"how you'd expect"* means for a people
  Catch-up is D44.
- **D29** The magazine is portrait, not landscape (¶51).
- **D30** Robustness comes from pressure testing: *"a fake catch up or two"* filled with
  *"literally every type of content we might come across"*, and every surface (the rooms,
  the reader, the magazine) must survive the most varying input (¶51). When the corpus is
  built relative to the directions is D45.
- **D31** Throwaway Catch-ups and *"anything else you want"* may be created to do the job
  well (¶51). This stands on its own; D33 is the session's proposed care, and a session that
  needs more may ask him.
- **D32** `/lab/catchups/` is the sandbox for any test in this campaign, *"whatever we
  want"* (¶52): direction rooms, the pressure room, the magazine spike, viewer experiments.
- **D34** Recon's first duty is *"how literally every state of the catch up looks and every
  sequence of events through those states looks"* (¶51): every state, and every path
  between states, as a storyboard a person could follow.
- **D37** None of the directions is today's layout with the bugs fixed (¶26: *"You would be
  reducing the negatives but not increasing the positives"*).
- **D46** This campaign is not the refactor pass and not the backend-architectural bug hunt;
  UI/UX comes first (¶20).
- **D47** A photograph placed large in the magazine must be high resolution (¶21). The
  mechanism is D27.
- **D48** A Back button, or *"slide buttons here and there"*, is not the answer (¶18).

### RECOMMENDED

- **D20** The campaign lives in `docs/planning/catchups-rework/` in the collection-rework
  shape. Reason: that shape survived ten sessions and a crash.
- **D21** Directions are built as lab rooms on the real data before anything ships, and the
  owner's pick is the spec, transplanted faithfully (the "ship the approved version" lesson:
  re-deriving a picked design cost a whole session once). Rooms, not static mockups, because
  the complaints that matter here are about moving and tapping: a mobile navigation cannot
  be judged from a PNG.
- **D22** S1 fixes nothing. It reproduces, measures and root-causes, so that S3 designs from
  facts and X fixes from causes. The one exception is track X itself, which is independent
  of the redesign and may ship first.
- **D23** The export is `scripts/dev/export-catchups.mjs`, writing to
  `scripts/dev/.exports/catchups/<date>/` (already ignored by the `scripts/dev/.*/` rule;
  it holds members' words and must never be committed): one JSON file with every Catch-up,
  Round, question, answer, heart, reminder preference and membership, **and the photo
  bytes beside it**, because he asked for *"totally regeneratable"* (¶51) and 32 answers'
  worth of 1920px WebP is a few tens of megabytes. The JSON's shape is also the fixture
  format the rooms and the magazine engine consume (D30), so one loader serves both.
  Re-run before every migration in S6+. It is an ordinary dev script, not a hand-run pass
  (F16).
- **D24** The magazine is one layout engine rendering to screen and to print from the same
  components, at a route of its own; the PDF is that page printed by headless Chrome. Start
  it as a local script the owner runs, which writes the PDF to R2, and move it to a
  serverless function or a GitHub Actions job only if M1's spike shows it fits; `prior-art.md`
  §8 has the measured sizes and Vercel's dated limits, and recommends the same. The
  alternative, a pure-JS PDF renderer, buys a smaller function at the cost of a second layout
  implementation, which is exactly the "second implementation" that cost the Collection
  campaign a room.
- **D25** Three or four directions reach the rooms, each answering the same fixed checklist so
  they can be compared. The fan-out that produces them may generate more than that and
  shortlist (¶20, *"a lot of spaghetti"*).
- **D26** The models table above.
- **D27** How the magazine gets high-resolution pixels (D47): today an uploaded Catch-up photo
  is boxed to 1920px on its long edge (`toDisplayWebp` in `src/lib/image.ts`, the feed's
  pipeline), enough for most magazine pages and not for a full-bleed A4 at 300 dpi. Whether
  Catch-ups should start keeping the original the way the Collection does is a data decision
  for S5; M1 says what it needs.
- **D33** *(narrowed by S1, 2026-09-05, and said out loud: the committed fixtures do NOT contain
  the two real published Rounds. The export folder is gitignored precisely because it holds
  members' words, and copying them into `src/` would put them in git under another name. What he
  approved in owner question 5 was that ROOMS show real data, and a room can read the live
  database directly, which is what the lab already does. So real Rounds come from Prisma at render
  time and only the invented corpus is committed. `recon.md` §7.)* Variety and volume come from
  **fixtures, not fake members.** A live throwaway
  Catch-up holds only the owner's account and Jerry Maguire, because every Round event
  notifies its members (F14) and because invented accounts would appear in the directory
  and the member counts seventy real people look at. The pressure corpus (D30) is JSON in
  the export's shape under `src/app/lab/catchups/_fixtures/` (invented names and birds,
  no real member's words unless copied from the export), plus the two real published Rounds
  from the export. Rooms and the magazine engine render fixtures through the same loader as
  live data. If a live test genuinely needs many real authors, that is a question for the
  owner, not a thing to do.
- **D35** *(corrected by S1, 2026-09-05; see `recon.md` §6 and F19. Two items below cannot exist:
  the answer cap is 6,000 characters, not 3,000 words, and the photo cap is 3 per answer, not ten.
  The corpus in `src/app/lab/catchups/_fixtures/pressure.ts` sits on each real cap and steps one
  row over it, which is the useful extreme.)* The pressure corpus covers, at least: an answer of one word and one of 3,000
  words; a question with one answer and one with forty; a Round with one question and one
  with twelve; zero photos, one photo in each orientation, three portraits together, ten
  photos on one answer, a two-hundred-photo wall; a song link from Spotify, YouTube and an
  unknown host, and a link that fails to resolve; an emoji-only answer; a very long name and
  a name with diacritics; a member who left; a deleted photo; a Round nobody answered; a
  Catch-up with two members and one with a hundred; every lifecycle state.
- **D36** The design system's type, radius ladder, surface ladder and motion rules are the
  default a direction works within, and a direction may break one where the break is the
  point, saying so; his Action Button analogy is a full-screen, end-to-end surface that
  looks like nothing else in Settings (¶42). What is not negotiable is D3.
- **D38** The caption clamp is four lines. He said *"maybe"* twice (¶32); it is one constant
  and trivially changed, and question 6 below asks him.
- **D39** Both renderings ship, the web reader first and the magazine beside it as track M;
  the magazine's existence is his wish and its schedule is ours.
- **D40** Ultracode: on for S3 (and S3b) and M1, used in S0 for the transcript check, the
  ledger check and the prior-art sweep, off everywhere else, for the reasons in "The
  sessions".
- **D41** The session structure in "The sessions": S1 to S6+, M1 and M2+, X, and an optional
  S3b if the rooms disappoint (¶20 asks for multiple rounds of brainstorming, and one
  fan-out is one round).
- **D42** One click target per tile, the whole tile, and no View unless a direction can say
  what View does that the tile does not.
- **D43** The banned words from the old spec's banner ("gentle", "quiet", "small", "warm",
  "a round of") stay banned. This is the old spec's rule, sourced to his 2026-07-25 review of
  the copy, not to this brief; it is kept because he has not reversed it.
- **D44** A people Catch-up, *"how you'd expect"* (¶51): people added and removed by its
  Keeper, an invite link, and whatever L6 decides about leaving.
- **D45** The pressure corpus exists before the directions are judged and before the
  magazine grammar is written, so both are judged on extremes and not only on the two real
  Rounds. S1 starts it; S4 completes it.
- **D49** The mobile header cut-off (R6, F8) is the one live bug he can see today, on a
  surface seventy members use. X takes it first, as soon as S1 has the root cause, ahead of
  the redesign.
- **D50** The dialogs (L4, E3, S2) are owned: S3's checklist includes them and S5's spec has a
  section for them, built on `docs/planning/other/dialog-standards-findings.md`.

### OPEN

- **O1** Who keeps a batch Catch-up, who may start a Round, and whether Rounds simply run on
  a cadence with nobody in charge (¶4). S3 proposes, S5 decides.
- **O2** Whether "delete" exists for a batch Catch-up and what it means when membership is
  fixed (¶5). S3, S5.
- **O3** Whether pause survives as a verb: he does not get it (¶8), supplies its only argument
  himself (¶8), calls pausing and resuming *"okay"* (¶14, ¶15), and lists it among too many
  verbs (¶40). S3, S5.
- **O4** The shape of the list: squares, a shelf, a grid, a picture per Catch-up, something
  else (¶1, ¶6). S3, rooms.
- **O5** How to show who is in a Catch-up and who wrote in a Round, in a way that identifies
  people (¶12, ¶23, ¶27, ¶37). S3, rooms.
- **O6** What the home of a Catch-up is and what is on it, per state (¶15, ¶18). S3.
- **O7** Mobile reader navigation (¶11, ¶34). S3, rooms; the most important single design
  problem in the campaign after the IA.
- **O8** The one representation of a published Round (¶13, ¶39). S3.
- **O9** Whether "13 of the group wrote in" and the question numbering survive (¶27). S3.
- **O10** How Fresh off the press is done differently, and whether the job it does belongs
  somewhere else entirely (¶9). S3.
- **O11** The shape of settings and where the lifecycle verbs live (¶14, ¶40). S3.
- **O12** What the six members with no batch year see, and whether staff get a Catch-up of
  their own. S5.
- **O13** The magazine's look, its layout grammar and the PDF pipeline (¶21). M1.
- **O14** Whether a people Catch-up can be left, and what leaving means for answers already
  published (¶4, ¶5, L6). S3, S5.

---

## S1: Reconnaissance

You are finding everything that is wrong, from a member's point of view, and writing it down
so precisely that S3 can design from your notes without opening the app. You fix nothing.

**Read first**: `brief.md` in full; this file; `docs/spec/catchups.md` for the nouns and the
state machine; `docs/spec/DESIGN-SYSTEM.md`; `docs/planning/other/dialog-standards-findings.md`.
Read the code under `src/app/(main)/catchups` and `src/components/catchups` as you go, not up
front: the owner's point (¶43) is that *"UX problems you can't make out from just freaking
code"*, so the screen leads and the code explains.

**How to look.** One browser, the `chrome-devtools` MCP, signed in through
`scripts/qa/_dev-login.mjs` (see Operational context; the MCP cannot sign itself in). Four
viewports: **390x844** (his phone; use `emulate` for touch, because the swipe and tap
complaints are touch complaints), **1512x982** (his MacBook), **1440x900**, and **1920x1080**
or wider (his ¶6 complaint about 90% white space is a wide-screen complaint, and ¶1 names a
TV; measure the ratio). Light and dark. Screenshot every state at every size into
`e2e/.shots/catchups-recon/` with numbered names, and **read each PNG** before you write
about it.

**Whose account.** Sign in as the owner (the admin account `screenshot:auth` uses) to see his
real Catch-ups: "In the loop", the paused one, "Test". **On those, read only.** A heart is a
write; an answer is a write; a settings change is a write. For anything that writes, create
throwaway Catch-ups named `[Recon] ...`. He allowed *"any throwaway catch up or anything else
you want"* (¶51); the limit that they hold only the owner's account and Jerry Maguire
(`sanan.shankar@gmail.com`, the test account; never a real alumnus) is this session's, for one
reason: every Round event notifies every member (F14), and a real member in a test Catch-up
gets test noise in their bell. If you need more than two authors for a live test, ask him
rather than adding anyone. Drive the throwaways through every state with the Keeper controls,
and leave them in place, named so nobody mistakes them. Say in `recon.md` that they exist.

**Cover every route and every state.** The index; the create flow; a Catch-up's home in
collecting, answering, preparing, published, paused, ended; a copy archived and a copy binned;
the answer page with text, photo, song and photo-wall questions; the reader; the join link;
the admin Catch-ups pages; the notifications that link into all of this; anything on the feed
that mentions a Catch-up. As Keeper and as plain member. Then the empty states: a member in a
batch with no Catch-up, a brand-new member, a Round with one answer.

**Then every sequence, as a storyboard (D34).** This is the part he cares about most (¶51):
*"how literally every state of the catch up looks and every sequence of events through those
states looks."* For each path below, walk it in a `[Recon]` Catch-up and record every screen a
member sees along the way, in order, at 390 and 1512, as a numbered strip in `recon.md` (shot,
one line of what the person sees, one line of what they can do next). The paths: create a
people-Catch-up and reach collecting; create a batch one by "Everyone from <batch>" and note
where "Start one" lands (B5); collecting to answering (by the clock and by "Open answering
now"); answering to preparing to published, including the 24-hour hold and "Publish now"; a
published Round to the next Round opening; pause in the middle of answering, then resume;
extend a deadline; end; archive, then find it, then put it back; delete, then restore, then
let it expire; join by link; a member removed, a member leaving; the Keeper handed over; a
member who joined the site after Round 1 opening the Catch-up for the first time; and the
notification a member taps at each transition and where it lands. Where a path takes days by
the clock, say how you moved the clock (the state is a pure function of timestamps,
`computeStatus` in `catchups-core.ts`; a Keeper control or a read-only look at the code may be
enough, and if you must touch a timestamp do it only on the `[Recon]` rows and say so).

**Reproduce every complaint in the brief and label it.** Walk `brief.md` paragraph by
paragraph; the ledger above is a checklist to tick against, not the boundary of what you look
for, because the ledger was found short once already. For everything visible: *reproduced*
with the measurement, or *not reproduced* with what you saw instead. Root-cause the mechanical
ones, in the code, to the line:

- **first**, the mobile header cut-off and the right-hand white space (F8, D49): find the
  element whose right edge exceeds `innerWidth`; say whether it is the chip row, a photo row,
  or something else, on both the home and the reader; X ships the fix as soon as you have it;
- the TOC bold reflow and the tap lag (F7);
- the curved border and the hover shape on Fresh off the press (¶9);
- the overlapping birds on the index (¶23), and whether `git log` shows when it changed;
- the heart's late animation (F9): compare how the feed's `LoveButton` call site and the
  Catch-up answer card's differ;
- the viewer's size snap, wrap-around and overshoot (F9): reproduce with touch emulation on a
  real multi-photo answer, read `image-viewer.tsx` and `photo-carousel.tsx`, and say which
  behaviour is a bug and which is a design choice that reads as one;
- the song and photo-wall kinds (F3): in a `[Recon]` Catch-up, ask a songs question and a
  photo-wall question, answer as Jerry with a Spotify link in the song field, a YouTube link
  in the song field, and both links pasted into an ordinary text answer; screenshot what a
  reader sees for each;
- the dialog sizes he measured by eye (¶38, ¶40): measure them;
- how much content is on a phone screen at a time in the reader (R18): count answers and
  words per 844px.

**The click map and the matrix.** In `flows.md`: every clickable thing on every screen and
where it goes, then the table he asked for in ¶36, intents down the side (see what is new for
me; answer; add a question; read the latest Round; read an old Round; see who is in this;
comment or heart; change my reminders; start a Round; make a Catch-up; invite; archive;
find an archived one; change the cadence; publish now or extend; pause; end; get back to the
Catch-up's home; get back to the app) against states across the top (collecting, answering,
preparing, published; active, paused, ended; Keeper or member; copy normal, archived,
binned; batch or people). Fill each cell with what happens **today**, in a few words, and
mark the cells where the answer is "nothing", "two different things", or "the same thing
shown a different way". Count how many distinct ways a published Round is drawn (he says
fifteen, ¶39) and list them with a shot each. Count the clicks and the scroll distance from
the reader back to the Catch-up's home (H6).

**The export (D6, D23).** Write `scripts/dev/export-catchups.mjs`, dry-run by default as a
courtesy, an ordinary dev script (not a hand-run pass; F16). It writes the JSON and copies
every photo's bytes beside it, so the folder alone can rebuild every Catch-up; that is the
test he set, *"totally regeneratable"* (¶51). Check whether `scripts/qa/scripts-ledger.test.mjs`
wants a row in `scripts/dev/README.md`, run the export, and record the counts against F1.
Nothing in the tree is deleted, ever, by this script. Define the JSON's shape as a TypeScript
type in `src/lib/catchups-export.ts` (or beside the existing types), because the rooms and the
magazine will load fixtures in exactly this shape (D30, D33); write the first fixture from the
two real published Rounds, and a second, invented one that covers as much of D35 as you can in
the time, under `src/app/lab/catchups/_fixtures/`.

**History (B4).** `git log -S "batch" -- 'src/app/(main)/catchups' src/components/catchups`
and the spec's own history: when did a default batch Catch-up exist, how did "Start one"
work, who was Keeper, and in which commit and why did it go. Two paragraphs.

**Write `recon.md`** in the lab-voice register even though it is a document: lead with what a
person sees, one idea per sentence, numbers only where the number is the finding. Group by
surface (index, home, answer, reader, people, settings, dialogs, viewer, notifications), tag
every finding with the ledger id it confirms or `NEW`, name the shot for each, and end with
your own ranked list of the ten things that most make it feel like *"a V0.5 of an app"* (¶3),
because S3 will read that list first.

**Do not** fix, restyle, or "quickly improve" anything; do not touch a real Catch-up's data;
do not push; do not run `npm run visual` (nothing moved). Update the board, the findings
(correct any F-item you disproved) and the session log here before you end. If context runs
short, write what you have and mark S1 `PARTIAL` with the surfaces left.

---

## S2: Prior art (done inside S0)

The owner, ¶7: *"Research what other people do. Research what Letterloop does and pick the
best way."* Eight researchers ran in S0, one shape each, and one assembler stitched
[`prior-art.md`](prior-art.md): how Letterloop looks and moves; a short list of a few things
at any width; a long multi-author document on a phone with navigation; layout engines that
adapt to content; who is in this and who wrote in; archive, delete, mute, leave, pause, end;
link previews and photo walls; producing a PDF without a server of our own. Each shape ends
with "What this means for us"; every claim carries [measured], [company] or [secondary]; the
gaps are collected at the end. F15 says which parts to lean on and which are inference.

If S3 finds a shape missing or a part too thin (§5 and §3's Revolut are the known weak spots),
run one more researcher for that shape from the same brief and append; do not redo the file.
Anything measured live on a real phone (a WhatsApp chat row, a Letterboxd list at 1920) beats
what is written there and should replace it.

---

## S3: Directions (Fable, ultracode on)

You are the session the owner ran this campaign to reach. Read `brief.md` twice. Then
`recon.md`, `flows.md`, `prior-art.md` with its gaps, `docs/spec/DESIGN-SYSTEM.md` end to end,
`docs/spec/lab-voice.md`, `docs/planning/other/dialog-standards-findings.md`, and
`docs/planning/collection-rework/spec.md` as the model for how a decision is marked.

**How ultracode is used here, and how it is not.** The architecture below is yours alone:
one mind, written before any fan-out, because it is the shared structure every direction
must fit (¶42: *"different teams are working together... but under the same broader
structure"*). Then a `Workflow` of six or eight independent designers, each with a different
starting bet you assign (for instance: the reader is the product and everything else is a
door into it; the list is a shelf of magazines; the Catch-up's home is a calendar of Rounds;
Catch-ups as if it were the whole app, ¶19), each returning one direction against the
checklist below. Generate more than you will keep, because ¶20 asks for *"a lot of
spaghetti"* before anything sticks. Let the designers inherit this session's model: this is
the one place intelligence is the point.

**Do not give them all the same inputs.** Most read `brief.md`, `recon.md`, `flows.md`,
`DESIGN-SYSTEM.md` and your architecture page, in full from disk, never your digest of them
(the writing-for-agents skill's "Whose words" section is the rule). **At least two get
`brief.md`, `DESIGN-SYSTEM.md` and the architecture page and nothing else** -- no recon, no
flows, no prior art. The reason is ¶26: forty-three findings about what is wrong with today's
layout is a detailed description of today's layout, and a designer who has read them is
thinking in their terms. Those two will produce the freshest and the least practical things in
the batch, which is what a shortlist is for. Say in `directions.md` which designers were blind,
so a later session can tell whether it worked.

**Rank the prior art rather than handing it over whole.** F15 is the ranking, and most of
`prior-art.md` is words: §7 and §8 are measured and may be relied on; §1, §2, §3 and §5 are
inference with nothing opened in a browser. Give the reading designers §7 and §8 as fact and
the rest as ideas that never outweigh what `recon.md` measured on the real app, and tell them
not to spend attention on §5 or §3's Revolut part at all. Twenty-one thousand words of
low-confidence research does not make a designer better; it uses up the attention that would
have gone somewhere else.

Then a judge panel on Opus: one judge per direction scoring against the brief's paragraphs with
quotes; one adversarial judge told to find where every direction is *"today's layout with the
bugs fixed"* (¶26, D37); and one question put to the panel as a whole, because scoring against
a checklist rewards completeness and quietly prefers the safe answer -- **which of these would
he still be thinking about tomorrow?** You read all of it yourself, keep what is strong, and
write `directions.md` and the room briefs yourself; the synthesis is not delegated. Keep every
direction that genuinely differs; merge only where two designers converged.

**First, the architecture**, because every direction shares it and it is where the rot is
(¶18, ¶36). Decide the nouns a member thinks in (a Catch-up, a Round, the people, a question,
an answer) and for each the one place it lives. Answer, in a page: what is the home of a
Catch-up and what is on it in each state; what a member sees first when they open
`/catchups`; where a published Round is read, and the **one** way it is represented
everywhere else (¶13, ¶39); how you get from any screen to any other with one obvious move,
including back from the reader without scrolling a week (H6), and without the Back button he
named as the wrong answer (D48); where the lifecycle verbs live and how few there can be
(¶40); what a batch Catch-up is (D4) and your proposal for O1 to O3 and O14; where comments
go; where who-is-here goes (E1); and the intents-against-states table from `flows.md` **as it
should be**, with cells that are mostly the same few words, which is what he meant by modular
design taking care of it (¶36). List the Letterloop parity gaps from `prior-art.md` §1 and
say which each direction closes (P22).

**Then the directions.** Each is a whole concept across every surface, not a style. Each has
a thesis in one sentence (what it bets on), a name after what it does (`lab-voice.md`), and
answers the same checklist so he can compare like with like:

- the list at 390, 1512 and 1920 (¶1, ¶6, ¶23, ¶24), designed for two or three items (I12);
- creating a Catch-up and starting a Round, for a batch and for a chosen set of people (¶4, B5);
- a Catch-up's home in collecting, answering, preparing and published, and paused and ended (¶15, ¶18);
- the answering surface where a photo wall and a song are added, composable with text (¶16);
- the reader on desktop, and the reader on a phone **with its navigation** and its density (¶10, ¶11, ¶34, R18);
- who is in it, and who wrote in (¶12, ¶27, ¶37);
- settings, the lifecycle verbs, and the dialogs they open (¶14, ¶38, ¶40, D50);
- the batch Catch-up: default, fixed members, your answer to who keeps it (¶4);
- archive and delete, and where archived things live (¶5, L5);
- comments on an answer, a song preview card, a photo-wall question (¶10, ¶16, ¶50);
- the notifications a member taps at each transition and where each lands (¶36);
- the empty states: a new member, a batch with no Round yet, a Round with one answer;
- the pressure fixtures: one answer, forty answers, a two-hundred-photo wall (D35).

None of the directions is today's layout with the bugs fixed (D37). At least one should be
what he described in ¶19: Catch-ups as if it were the whole app. All of them keep this app's
palette and belong to it unmistakably (D3); the type, radius, surface and motion rules are the
default and a direction may break one where the break is the point, saying so (D36); his
Action Button analogy (¶42) is the standard: *"you can tell that it belongs to this app"* and
*"it doesn't look like anything already in"* it. Break ties the way the owner does, Apple HIG
first. Copy at 4.5 on his warmth dial, not 7.5: one warm line per surface at most, on a title,
never on a button. The words in D43 stay banned. And ¶3's test applies to every screen: does
it give him any dopamine (P17).

**Then a room brief per direction**, for S4, written to the writing-for-agents skill: intent
and constraint, not implementation; a number only where the number is the decision; what
"good" looks like at 390 and 1512 with the real data and the fixtures; the owner's paragraphs
quoted where they carry the nuance; every decision marked LOCKED / RECOMMENDED / OPEN, with
the OPEN parts granted to the builder out loud. Say which parts of a room must be **live** (the
mobile navigation must be tappable and scrollable for real; a static picture of it proves
nothing) and which may be static.

**Finally**, one paragraph: which direction you would pick and why. He picks; you may lean.

Write it all in `directions.md`.

**Then build the sketch room, and it is the last thing you do.** `/lab/catchups/sketches`: one
room, one screen per direction, the same real published Round rendered every way, 390 first and
his 1512 second, switchable so he can flick between them on his phone. One surface only -- the
reader, because it is the densest and the most complained-about. Static is fine and expected:
this is the **cull**, not the pick, and D21's "rooms, not mockups" governs the pick. Register it
in `src/app/lab/_registry.ts` in the same commit; `npm run check` after; read the shots yourself
at both sizes before you say it is up.

It exists because without it he chooses directions from five thousand words of prose, which is
the hardest possible version of the task for him and the easiest for us, and S4 then spends
hours building rooms for bets nobody has looked at. Twenty minutes on his phone kills three
directions and doubles what the survivors get. **Notify him when it is up, then stop.** The
shortlist of three or four that reaches S4 (D25) is his cull, not your ranking; say which you
would keep and leave it at that.

Update the board and log.

---

## S4: Rooms

Build each **surviving** direction from its brief in `directions.md` -- the three or four he
kept at `/lab/catchups/sketches`, not all six or eight -- one room at a time, yourself. Not
through subagents: that is this campaign's judgment, not the brief's (the `/campaign` skill's
reasoning about summarised work applies to a room that has to be looked at as it is built),
and a room is one long sequence with state. Read `docs/spec/lab-voice.md` before the first
line: the room is in the **Delight** group, the lede is one line, no scoreboard unless the
numbers are the finding.

- Rooms live at `/lab/catchups/<slug>`, registered in `src/app/lab/_registry.ts` in the same
  commit, with an index at `/lab/catchups` that lists the directions and the shared checklist
  so he can move between them on his phone. `node scripts/qa/lab-audit.mjs` and
  `npm run check` must pass after each room. `/lab/catchups/` is his sandbox for anything
  (¶52); use it freely, register everything.
- **Real data, read only, and the pressure corpus.** Server components read the live
  Catch-ups through the Prisma client the way `src/app/lab/actions.ts` already does; no
  writes from a room, ever. Every room also takes `?fixture=<name>` and renders a fixture
  from `src/app/lab/catchups/_fixtures/` through the same loader (D23, D33), so each
  direction is judged on the real Rounds AND on the extremes in D35: one answer, forty
  answers, a two-hundred-photo wall, a 3,000-word answer. Complete the invented fixture S1
  started until it covers all of D35; that is the *"fake catch up or two"* he asked for
  (¶51), and it is data, not rows. Where a state does not exist in the data (a Round in
  collecting), the room may fake that one state and must say so on the page.
- **A pressure room**, `/lab/catchups/pressure`, that shows one chosen direction's reader
  and list against every fixture in turn, so *"incredibly robust"* (¶51) is something he can
  scroll through rather than a claim.
- Both viewports, two rounds each, and his 1512 as well. The `screenshot-qa` pair (desktop and
  mobile, in parallel, and never more than that pair) after each room. Look at the shots
  yourself.
- Faithful to the brief's LOCKED marks; better than its RECOMMENDED marks if you can, and say
  what you changed in the room's own caption; free on its OPEN marks.
- One commit per room, with its registry line and its `progress.md` entry inside.

Two S4 sessions may run at once if he wants speed; you collide only on `_registry.ts`. Update
the board (one line per room) and the log.

---

## S5: Pick and spec (Fable, owner present)

He browses the rooms, on his phone and his laptop, and tells you what he likes, surface by
surface. He may mix directions, or ask for a second round (S3b). Write it down as he says it,
verbatim, under "Owner answers" below, before you interpret anything.

Then write `spec.md` in the shape of `docs/planning/collection-rework/spec.md`: how to read
it and how much room the builder has; every decision LOCKED / RECOMMENDED / OPEN; the IA; each
surface; the dialogs (D50); the batch Catch-up and the lifecycle (O1 to O3 and O14 resolved);
comments (model, actions, notifications; whether the post comment components are reused);
link previews (where the resolved metadata is stored, which hosts, the fail-soft rule;
`prior-art.md` §7 has the measured endpoint fields); the photo wall; the data changes as an
idempotent dated file in `prisma/migrations-manual/` applied with `scripts/dev/run-sql.mjs`,
never `db push`, with the export re-run first (D6, D23) and no open Round orphaned (P26); the
build phases for S6+, each a revertable slice; the tests (unit for the pure state machine and
the shelf, Playwright on geometry with `expect.poll` for the mobile navigation, visual
baselines); the copy rules; a table mapping **every paragraph of the brief, ¶1 to ¶52**, to the
section that answers it or to a stated reason it is out (the ledger is the aid, the brief is
the test); and the operational context. He reviews it before S6 starts.

---

## S6+: Build

One phase per session, in the order `spec.md` gives. Each session: @ this file, read the
brief, `spec.md` and the picked room; ship the phase; `npm run check` before every commit and
`npm run visual` after any UI change, never at the same time; update the board and the log.
Transplant the picked room faithfully and diff the shipped page against the room before
calling it done (the Support redesign was re-derived during the ship once, and every
divergence cost a correction round); verify at 1512 as well as 1440 and 390. Baselines that
move on purpose are updated in the same commit as the change. Spawn `write-path-reviewer` on
any change to actions, routes, auth or the schema, and read its report as a claim, not a
verdict. The last phase rewrites `docs/spec/catchups.md` to describe what shipped, and closes
this board.

If a session is asked to run several phases unattended, `/campaign`'s loop (one worker,
verify yourself, park what breaks) is the protocol.

---

## M1: Magazine design (Fable, ultracode on for two steps)

Read ¶21, ¶30, ¶31 and ¶51 until you can hear them, then `prior-art.md` §4 (layout engines)
and §8 (the PDF pipeline) with their gaps, then the export and the fixtures from S1, because
the two published Rounds and the invented extremes are your test corpus (D30, D33, D35). Two
of his hedges travel with you: a navigable PDF is *"not that important"* (¶21), and emailing
everyone happens only *"if we can do an amazing job for this"* (¶21); the second is the gate
M2+ has to clear before anyone wires Resend.

Design the layout engine, not the page. Portrait (¶51, D29). That means:

- **The page model.** A portrait paper size and how the same components render to a browser
  and to `@page`. Whether the on-screen magazine is the same pages or a continuous portrait
  scroll of them is yours to decide.
- **The grammar.** The kinds of block a Round is made of (a question opener; a short answer;
  a long answer; an answer with one, two, three or more photos in each orientation; a photo
  wall; a song card; a pull-quote from a most-hearted answer; the contributors) and the rules
  that map content shape to block: *"if these images are of this size..."* (¶21), like the
  profile page's rules. Write the rules as rules, testable without a browser. `prior-art.md`
  §4 recommends candidate generation plus a weighted score, with four terms worth taking.
- **Type and image.** Libre Baskerville and Source Sans 3 at print sizes, a baseline grid,
  and what resolution a photo needs at each size it can be placed (D47, D27); which
  placements a 1920px photo may take and which need the original.
- **The hundred things that could go wrong** (¶31), each with its bypass: a 3,000-word
  answer, forty answers to one question, a Round with one answer, zero photos, all portrait
  photos, one member who answered everything, an emoji-only answer, a very long name, a
  deleted member, a missing image, a link with no preview, a photo wall with two hundred
  photos. **This is the first place ultracode is used**: a `Workflow` that fans out
  finders, each hunting failure modes from a different angle (content extremes, image
  resolution, typography, pagination, time and locale, missing data, malicious input), loops
  until two rounds find nothing new, and dedupes against everything seen; you write the
  bypass for each yourself. Every one of them becomes a fixture in D35's corpus if it is not
  there already.
- **The grammar panel** is the second: once you have a candidate grammar, three independent
  designers each lay out the same two real Rounds and the two hardest fixtures under your
  rules on paper (as a described sequence of pages, not code), and an adversarial judge looks
  for where the rules produce blown-up images, white space or monotony (¶21). Fix the rules,
  not the pages.
- **The feasibility spike.** Render one real Round through print CSS in Chrome and measure
  fidelity (page breaks, fonts, image bleed); then the pipeline per D24, with the Vercel
  numbers `prior-art.md` §8 verified and the ones it could not, and a recommendation. The
  local script is an ordinary `scripts/dev/` script, not a hand-run pass (F16).
- **A test corpus**: the two real Rounds plus synthetic extremes as JSON fixtures.

Write `magazine.md`, and if the spike produced a page worth looking at, register it at
`/lab/catchups/magazine`. Plan M2+ as phases. Update the board and log.

---

## X: Fast fixes

Independent of the redesign, allowed to touch the feed (¶28), and small enough to ship early.
From S1's root causes, in this order: **the mobile header cut-off and right-hand white space**
(R6, F8, D49), which is live for seventy members today; then **the heart's `revalidatePath`**
(R13, F23), two deleted lines that take one to three seconds off the app's most-used gesture on
its heaviest page; then the viewer's size snap between orientations (V1), whose answer already
exists in `photo-carousel.tsx`'s `heightAt`; then the wrap-around and the overshoot (V2, V3),
**which S1 could not reproduce and which need a real iPhone before any code changes**; and the
caption clamp from two lines to four (D38, his *"maybe"*; ask him if he is around, ship four if
not, it is one constant). There is no chip-tap lag to fix: it measures 65ms.

`superpowers:systematic-debugging` first. Each fix with the test that pins it, in its own commit,
`npm run visual` after. The feed's own viewer is the regression to watch, and for the heart it is
the feed's `toggleLike` comment, which already says what the rule is.

---

## Operational context

So none of it is explained twice. It matches the collection campaign's, plus what has been
learned since.

- **Repo** `/Users/sanan/Documents/rv-connect`, branch `main`, no feature branches. Commit as
  each coherent piece lands, with its test, its `progress.md` entry and its doc edits inside
  the same commit. **Do not push**: a push is a deploy to both Vercel projects. Commit
  messages: plain conventional, 150 words at most, no AI attribution of any kind.
- **Several Claude sessions share this one checkout.** Uncommitted changes you did not make
  are someone's work in progress (on 2026-09-05 a peer session was reorganising
  `docs/planning/` under this campaign's feet). Stage by pathspec,
  `git commit -F - -- path/one path/two`; never `git add -A`, `-a`, stash, reset, checkout or
  clean. Do not kill a dev server or build you did not start.
- **The gate** is `npm run check` (about 30 s idle, minutes when another session is
  building). `npm run visual` after any UI change, **never concurrently with check** (two
  spurious whole-page diffs on 2026-08-29). Read the diff before ever running `visual:update`.
- **Dev server** `npm run dev` on `http://localhost:3000`; start it in the background if it
  is down. `mv .next .next-stale-$(date +%s)` if every route 404s.
- **Signing in from the `chrome-devtools` MCP**: it cannot sign itself in, and as of S3 a
  session cannot sign it in either (F28: the secret cannot be read from `.env`, and the MCP's
  Chrome has no port to hand a cookie to). Use `npm run screenshot:auth -- "<url>" [--mobile]
  [--full]` and `npm run verify:shot <route> <out.png> [mobile]` for shots, both signed in from
  Node as the admin account; `--full` scrolls the page first so lazy images load, and F27 says
  when it blanks. For geometry, a throwaway puppeteer probe in `/tmp` that imports
  `scripts/qa/_dev-login.mjs` and dies with the command. `PUPPETEER_EXECUTABLE_PATH` to the real
  Chrome for `verify-shot` and `crawl`.
- **Test account is Jerry Maguire** (`sanan.shankar@gmail.com`). The owner's own account is
  fine for read-only looking. Never sign in as a real alumnus: dev-login writes presence
  telemetry against whoever it signs in as.
- **One Supabase database behind production and local dev.** Read-only SQL is fine through
  `node scripts/dev/run-sql.mjs --inline "..."`. Schema changes are a dated idempotent file
  in `prisma/migrations-manual/` applied with that script, after the export (D23). **Never
  `prisma db push`.** No DDL unattended.
- **`/lab` needs a session and the admin role.** Every room is registered in
  `src/app/lab/_registry.ts` or `npm run check` fails. House voice: `docs/spec/lab-voice.md`.
- **Never any Vercel CLI command.** Env vars, domains and settings are his, in the dashboard.
- **The repo root is closed.** Scratch goes to `/tmp` or dies in the command that made it;
  shots to `e2e/.shots/`; notes to `docs/`; scripts that stay to `scripts/dev` or
  `scripts/qa` with their working folder beside them.
- **His machine has hung under browser fleets.** One `chrome-devtools` instance; the
  desktop-plus-mobile `screenshot-qa` pair is the ceiling.
- **"kowalski"** anywhere in a message means: reply at once with a compact progress report
  and keep working.

---

## Owner questions

**Questions 1 to 5 were answered on 2026-09-05; his words are ¶51 and ¶52 of the brief and
are repeated under "Owner answers".** Question 6 is open. New questions for him go at the end
of this section, in the same five-line shape, with a default on each; one reply covers them:
*"defaults, except..."*.

**1. Ultracode: did you mean none at all, or "ask me"?**
- **What I read:** none anywhere in this campaign; one mind per job.
- **What you'd notice:** sessions take longer and produce one coherent answer each.
- **If I guess wrong:** the directions session (S3) could have explored more alternatives in parallel.
- **Options:** (a) none anywhere (b) allow it for S3 only (c) allow it wherever a session asks.
- **If you don't reply I'll do:** (a).

**2. May the recon session make one throwaway Catch-up to drive through every state?**
- **What I'd change:** a Catch-up named "[Recon] ..." between your account and Jerry, left in place afterwards.
- **What you'd notice:** one extra Catch-up on your list until the rebuild removes it.
- **If I guess wrong:** the paused and collecting states are only ever seen on your real ones, read-only.
- **Options:** (a) yes (b) no, reuse the ended "Test" one only.
- **If you don't reply I'll do:** (a).

**3. Do people-Catch-ups (a set of people you choose, like "In the loop") stay alongside batch Catch-ups?**
- **What I'd change:** nothing; both kinds exist, the batch one by default and yours by choice.
- **What you'd notice:** "In the loop" keeps working as it does.
- **If I guess wrong:** the directions would design for two kinds that should have been one.
- **Options:** (a) both kinds (b) batch only, and "In the loop" is migrated somewhere.
- **If you don't reply I'll do:** (a).

**4. Is the export enough as a file of words and photo addresses, or do you want the photo files copied too?**
- **What I'd change:** a JSON file of every Catch-up, Round, question, answer and heart, with the photo keys; the nightly backup already mirrors the photo bytes.
- **What you'd notice:** nothing.
- **If I guess wrong:** rebuilding from the file alone would need the R2 bucket to still exist.
- **Options:** (a) words plus keys (b) words plus a copy of every photo file.
- **If you don't reply I'll do:** (a).

**5. May the direction rooms in /lab show the real members' answers and photos?**
- **What I'd change:** rooms read your live Catch-ups, read-only, behind the admin-only lab.
- **What you'd notice:** you judge the designs on the real content, not lorem ipsum.
- **If I guess wrong:** members' words appear on a lab page only you can open.
- **Options:** (a) real data (b) your own answers only (c) invented data.
- **If you don't reply I'll do:** (a).

**6. Photo captions: three lines before "More", or four?** (open, asked 2026-09-05)
- **What I'd change:** the caption under a photo shows four lines before it folds, instead of two today.
- **What you'd notice:** most captions show whole; only long ones fold.
- **If I guess wrong:** a line more or less of caption before the fold.
- **Options:** (a) four (b) three (c) no fold at all.
- **If you don't reply I'll do:** (a), because you said "maybe make it 4 lines" last.

**7. Which of the five sketches get a full room?** (asked 2026-09-06, rewritten the same day
after the second pass)
- **What I'd change:** the ones you keep at `/lab/catchups/sketches` become the rooms S4 builds;
  the rest stay as writing and are not built. There are five now, not ten: the ten you called
  mostly tasteless are down to one rebuilt survivor, three new ones, and a synthesis.
- **What you'd notice:** rooms only for the directions you chose, each one live enough to tap and
  scroll on your phone, with the real Round and with invented worst cases.
- **If I guess wrong:** a direction you would have loved gets no room, and a room gets built for
  one you would have killed in a minute.
- **Options:** (a) The one I would build, plus Each question is laid out for what it is as the
  fallback if eleven green plates turn out to be too much green  (b) your own list of slugs from
  the tabs  (c) all five  (d) none of these, another round of directions first.
- **If you don't reply I'll do:** (a).

**8. Nobody designed the writing side. Should a second round take it before the rooms?** (asked
2026-09-06)
- **What I'd change:** all ten directions are about reading a finished Round; the page where
  people answer, add photographs and paste song links kept today's shape in every one. Either each
  room's builder designs it alongside the reader, or a short second round (S3b) designs it first.
- **What you'd notice:** with (a), the answering page in each room is that builder's own attempt
  in the direction's style; with (b), a week's delay and a set of answering-page sketches to cull
  before any room.
- **If I guess wrong:** (a) risks an answering page that is an afterthought in the room you pick;
  (b) risks a week on a surface you may not care about as much as the reader.
- **Options:** (a) the rooms draw it (b) S3b first, on answering alone (c) leave it to S5.
- **If you don't reply I'll do:** (a).

## Owner answers

**2026-09-05, typed, verbatim (also ¶51 of the brief):**

> 1 ultracode is totally up to you if you want me to run anything on ultracode i'll do so.
> you can make any throwaway catch up or anything else you want and need to do a great job.
> it's important especially to see how literally every state of the catch up looks and every
> sequence of events through those states looks. yes both are catch ups so they should be
> together. the batch catch up can't edit people in and out it's just people in that batch
> and they're all automatically added and have access to previous issues if they join later
> and all of that. people catch ups are how you'd expect. yes any form of saving previous
> catch ups is good as long as they're totally regeneratable. also for through testing of
> many of these features particularly the magazine (which by the way should be in portrait
> not landscape) you should def create a fake catch up or two and fill it with literally
> every type of content we might come across and make sure it surves the most varying input.
> incredibly robust can be produced with only pressure testing. 5 yes that's fine.

**A few minutes later (¶52):**

> we can do all kinds of testing for a bubnch of different things under
> /lab/catchups/....whatever we want. use it whenever you need

**The reading this session took**, beneath his words and separate from them:

- Q1: ultracode is mine to allocate (D16). Allocated in D40: S0, S3, M1.
- Q2: throwaway Catch-ups are allowed, and so is anything else needed (D31). His emphasis is
  on seeing every state and every sequence, which is D34 and the storyboard block in S1. The
  hazard in F14 (notifications to real members) is mine, not his, and D33 answers it: live
  throwaways hold only the owner and Jerry; variety comes from fixtures; a session may ask
  him for more.
- Q3: both kinds, together, D28. His extra sentence about late joiners went into D4. His
  *"how you'd expect"* for people Catch-ups is read in D44, marked as a reading.
- Q4: the export is fine in any form provided it can regenerate everything. Read as: include
  the photo bytes, D23. "Totally regeneratable" is the test the export script must pass.
- The magazine is portrait, D29. The fake Catch-ups full of every content type are D30, D33
  and D35; the reading that they are fixtures rather than rows of invented members is mine,
  for the F14 reason, and a session that needs live rows for a real test should ask.
- Q5: real data in the rooms, yes.
- `/lab/catchups/` is the sandbox, D32.

---

## Session log

### 2026-09-05, S0, set-up (Fable max)

Read the old spec, the code layout, the schema, the collection-rework files, the Letterloop
research, the dialog findings, the lab voice, and counted the live data (F1). Wrote
`brief.md` from the two-sitting transcript plus the typed follow-up, cleaned of fillers only.
Wrote this file. Amended the writing-for-agents skill with "Whose words are you carrying?"
in both copies (project and `~/.claude/skills/`). Put a banner on `docs/spec/catchups.md`
saying it describes today and is outranked by the brief. Did not build, did not screenshot
(the committed baselines are masked and the recon session will do it properly), did not
push. Five questions were put to the owner; he answered all five within the hour (¶51, ¶52)
and left ultracode to this session.

**Second half of S0, with ultracode.** One `Workflow`, fifteen Opus agents: four verifiers
reading the raw transcript stretch by stretch against `brief.md`, two critics reading the
ledger and decisions against the brief, eight researchers for the S2 prior-art sweep and one
assembler. The first run hit the owner's usage limit after the four verifiers had finished;
the other eleven ran on a second launch once it reset (19:24 to 19:58 IST). Everything below
was done by the same session from their returns.

**What the verifiers found, and what changed in `brief.md`.** 69 findings across the four
stretches, verdict on each stretch "substantially faithful" with the same three faults: the
first cut trimmed hedges as if they were fillers ("I think", "I guess", "maybe", "a little
bit", "kind of", "I don't know", "or something", "probably") and dropped a dozen "right?"
tags, which together made him sound more certain than he was; it erased three live
self-corrections (¶22 "writing for subagents... or writing for agents", ¶42 "I'm not going
to add any new things. There can be a lot of new things", ¶42 "this website always uses...
it doesn't always use"); it deleted one whole sentence of opinion (¶23 "I don't really care
about the birds."); it changed a number by turning a self-correction into a range (¶31 "4 3
centimeters" had become "3 or 4"); and it made about a dozen corrections without the
bracketed original its own header promised. Every one was folded in: hedges and tags
restored, reversals restored, the raw word kept inline with the guess in brackets, and the
header rewritten to say what the conventions actually are and to record the check. The
lesson is now in the writing-for-agents skill under "A hedge is content".

**What the critics found, and what changed in this file.** About sixty findings between two
lenses (the owner's, hunting dropped opinions; the design session's, hunting instructions it
would need and could not find), most of them right. The ledger stopped at ¶50 and had no row
for his answers; it was short by about thirty asks, among them two hard scope fences from ¶20
(no refactor pass yet; not the backend bug hunt), his severity ranking of Fresh off the press,
the "dopamine" test, the scroll-to-home distance, the density complaint, the Start-one
routing bug, the 70-beta-testers constraint, and the Letterloop parity list; about sixteen
paragraph pointers were short (¶19 alone was missing from five rows); and a dozen marks
over-read him: D18 had locked "one click target per tile" when he had said "if there's a
reason, sure"; D19 had locked question numbering while O9 left it open, and had locked the old
spec's banned words under his name; D11 had locked a number he said "maybe" to twice; D13 had
locked that both renderings ship when he called both aspirational; D16 had presented the
ultracode allocation as his; D17 the session structure as his; D6 had read a preference with
an override as an absolute. All repaired: 26 rows added or extended, the pointers fixed, each
disputed mark split into his part (LOCKED) and the session's (RECOMMENDED), the campaign-wide
rule about deletion reworded to protect content and not shipped UI, dialogs given an owner
(D50), the green-bar bug given a fast-ship slot (D49), an optional second brainstorming round
added (S3b), S1 told to walk the brief rather than the ledger and told whose rule the
two-account limit is, S3's checklist widened by four surfaces, and S5's completeness table
made to map the brief's paragraphs rather than the ledger's rows. One claim in the S1 prompt
was false and is withdrawn in F16: the hand-run-passes test does not govern an export script.
The same false sentence appeared twice in `prior-art.md` §8 and was corrected there too.

**The prior-art sweep.** Eight researchers, one shape each, 18 to 30 sources apiece, and one
assembler: `prior-art.md`, 21,000 words, eight "What this means for us" blocks, and a gaps
section that collects every unverified claim. Reviewed by this session: the header, all eight
recommendations, the gaps, and spot checks on the oembed measurements, the Vercel limits and
the Letterloop PDF claim. F15 records how far to trust each part. S2 is done; the S2 session
is not needed.

**Also in this half.** His answers to the five questions were recorded verbatim (¶51, ¶52,
"Owner answers") and read into D4, D16, D23 and D28 to D35; S1 gained the storyboard block
(D34); S3 and M1 gained their ultracode shapes; S4 gained the fixture switch and the pressure
room; `docs/README.md` gained the two rework campaigns under `docs/planning/`; a sixth owner
question (caption lines) is open with a default.

### 2026-09-05, S1, reconnaissance (Opus max, no ultracode, one browser)

Read `brief.md` in full, then the handover, the old spec, the design system and the dialog
findings. Everything below was measured on the running app against the live database, signed in as
the owner, `chrome-devtools`, four viewports. **Nothing was fixed.**

**Produced.** `recon.md` (43 findings: 24 confirming something he named, 2 marked NOT REPRODUCED,
17 new, each tagged with its ledger id, with a ranked ten at the end); `flows.md` (the click map,
the intent-by-state matrix he asked for in ¶36, and the counts); `scripts/dev/export-catchups.mjs`
plus `src/lib/catchups-export.ts` and a ledger row; `src/app/lab/catchups/_fixtures/pressure.ts`;
24 shots in `e2e/.shots/catchups-recon/`. Committed in two: the machinery, then the documents.

**The green bar is root-caused and X is unblocked.** A member's pasted Spotify link has a
54-character, 369px run with no break opportunity; the reader's answer paragraph is 316px wide and
carries no `break-words`; not one of its fourteen ancestors clips; only `html{overflow-x:clip}`
holds the page still, and the mobile bar is `position: sticky`, so it cannot follow a pan. Two
lines fix it and neither is the bar. Also root-caused: the curved divider (a `border-t` on a
`rounded-md` box, so CSS draws it along the corner arc), the hover with 0px padding on three
sides, the rail's bold reflow (item 5 of 11, +17.9px), the viewer's 552px-to-311px size snap (the
carousel next door already interpolates height and the viewer does not), and the heart's late pop
(the lazy-motion chunk lands at 5,239ms here against 1,930ms on the feed, because this page is
49,464px). V2 and V3 could not be reproduced and are marked so: `step` has never wrapped, and the
"fix" would be changing correct code. They need a real iPhone.

**The finding that changes the campaign.** There are two groups called "Batch of 2024". The real
batch has no Catch-up; a hand-made snapshot has it, and a 2024 alumnus who joined on 2026-08-28 is
not in it. The history is in F17: he asked for a default batch Catch-up on 2026-07-25, got a
one-tap shortcut, and removed its broken leftovers himself on 2026-08-21 for a reason that is
still the right constraint on B3. **B4's answer is that it never existed.**

**Two corrections to this file's own decisions**, both made rather than left: D35 asked for
extremes the app cannot produce (the caps are 6,000 characters and 3 photos), and D33 would have
put members' words into git. Both are annotated on the decisions themselves.

**One throwaway is left in place**, `[Recon] the happy path`, owner and Jerry only, driven through
create, collecting, answering, preparing, published, archived, binned and back. Every transition
used the Keeper's own controls; two `CatchupReminderPref` timestamps on that row were set and
cleared by hand, because the bin cannot be reached any other way. Nothing else was written.

**Not covered**, and listed at the end of `recon.md`: the join flow, notifications received and
tapped, `/admin/catchups`, dark mode, and a plain member's view.

**Correction, same day, after he read `recon.md`.** He said: *"the R5 it takes a second to react was
for tapping the heart on a catch up taking longer to react than tapping heart on feed. noticeably
longer."* That sentence lives inside ¶11's paragraph about the chip bar, and S1 had filed it there
and marked it NOT REPRODUCED after measuring the chip at 65ms. Following his correction found a
cause bigger than either complaint: **`toggleEntryLove` calls `revalidatePath` on the reader route,
so every heart tap re-renders all 133 answers — 603 KB, 1.5 to 2.6 seconds — while the feed's like
action deliberately has no such call and its comment states the rule.** F23; `recon.md` §8
rewritten; the ranked list now has eleven items and this is sixth; X takes it second, right after
the green bar. The lesson for the campaign is one the brief already warns about: a sentence's
position in the transcript is not its subject, and when a reading is wrong he is the one who can
say so.

### 2026-09-05 to 06, S3, directions (Fable max, ultracode on, run by `/campaign`)

Read everything the section asks for, in full. Gate 1 was already closed by S0 (questions 1 to 5
answered, 6 defaulted), so no new question blocked the start. Mid-session he sent one line, *"try
it different ways in your head brainstorm deeply and consider all options before making any single
/ group of decisions"*, and the architecture page was re-tried call by call before any designer saw
it: five binding lines loosened or gained a stated alternative (the home may be the reader; the
cover may carry headlines but never a quoted answer; pause becomes a hold on the clock; the menu
and the people sheet may be one info sheet; who keeps a batch has two answers and a term-calendar
alternative), each kept in the page as "considered and not taken". The rule is now a memory.

**Produced.** `directions.md`: Part 1 the architecture (one mind, before the fan-out), Part 2 the
ten directions with the judges, the adversarial pass and the panel, Part 3 a room brief per
direction for S4, Part 4 the lean, Part 5 what he does next. `directions/01` to `10`, the ten
directions in full, 8,500 to 11,400 words each, the same eight sections so they compare.
`/lab/catchups/sketches`: one room, ten tabs, three drawings each (the reader from the top as a
page, one 390x844 screen deep in question 5 with the navigator resting, one with it open) plus the
same reader at 1512, all of it the live "in the loop" Round 1 read through the shipped loader, in a
frame that scales a fixed-width drawing to fit so his phone sees 390 at 1:1. Registered, `npm run
check` green, every drawing read at both sizes by this session.

**How it ran.** One `Workflow`, 24 agents: ten designers on this session's model at max effort
(seven reading the recon, three blind to it), one Opus judge per direction scoring fifteen items
with quotes, an adversarial Opus judge over all ten hunting today's layout, and a three-lens Opus
panel (him on his phone, a designer at Apple, a member of 2003) asked which he would still be
thinking about tomorrow. The first run died on his session limit at 23:40 with four directions
written and none returned; the rerun at 05:40 read those four back with Sonnet and wrote the other
six. 3.8M subagent tokens across both runs. Then ten Opus builders, one file each under
`_directions/`, no browser, disjoint paths, four at a time; each reported the numbers it chose
where its direction was silent and the two things it was least sure of, and those are in the
files as comments.

**What came back.** Every judge said keep; none found today-with-bugs-fixed. Judge totals 58 to
68 of 75. The panel was unanimous: The bar is the question first, The calendar keeps it second,
the blind whole-app direction the one to forget, and it is folded into the paged direction as its
second execution. The adversarial judge's list of what ten designers converged on without being
asked is F24, and its missing bet, the composer, is F25. The transcript's builder found the Round
ran eight days in 23 runs (F26). Tabs run in the order this session would look at them, said out
loud as a nudge.

**Tooling that changed.** `screenshot-auth.mjs` gained `--full`, which scrolls the page first so
lazy images load, and its header records the 2x-over-8,000px blank (F27). The harness gained
`frame=mid|nav|reader` and `bare=1` for single-frame captures. The MCP browser could not be signed
in (F28); every shot went through the script, every measurement through a `/tmp` probe.

**Not done, and why.** The sketches are static by design (the cull, not the pick). No S3b. The
composer has no direction (F25, owner question 8). The pressure fixture is not in the sketch room;
it is S4's per the handover. Nothing pushed.

**Next.** He culls (owner question 7). S4 builds the survivors from `directions.md` Part 3 and the
direction files, one room at a time, composer included; X is still unblocked and independent.
