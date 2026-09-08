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

## How much of this you actually have to read

Added 2026-09-07, at his request: *"if you can reduce the amount of context they have to ingest
(of course without lowering quality of output) that would be great."* This campaign has about
8,500 lines of planning across nine files, and the design phase is over -- so most of it is now
REFERENCE rather than reading.

| | |
|---|---|
| **Read in full, always** | this file's board, your own session's section, and `architecture.md`. `architecture.md` carries his sentences inline beside each decision, so it is the shape AND the reasoning in one place |
| **Read in full IF you are deciding rather than recording** | `brief.md`. His rule (¶22) is that his words travel verbatim rather than summarised, and it holds wherever judgment is being exercised. A session transcribing a settled shape into a spec is not exercising it |
| **Grep, do not read** | `review-2026-09-06.md`, `review-2026-09-07.md`, `recon.md`, `flows.md`, `prior-art.md`, `directions.md`. Every rule in `architecture.md` names the paragraph it came from; go and read that paragraph when you need the why, and nothing around it |
| **Dead** | `directions.md` Parts 2 to 6. Two rejected passes |

**The one thing not to economise on**: if you are about to disagree with something drawn, read his
paragraph first. Three sessions have now re-litigated a decision he had already made, and each time
the paragraph was two lines long and settled it.

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
| Owner culls the sketches | DONE | 2026-09-06: he went through all fifteen out loud, one at a time, and rejected all fifteen. Verbatim in [`review-2026-09-06.md`](review-2026-09-06.md), 51 paragraphs. "There is nothing here that I prefer to what is shipped" (R46), and "you are okay to delete everything else" (R47). Owner questions 7 and 8 are withdrawn: the cull answered 7, and 8 is folded into the front runner |
| S3c Front runner | DONE | 2026-09-07: ONE reader, by one hand, live at `/lab/catchups/sketches`. The strip under the green bar is the navigator; drawn three ways as asked (R24). The fifteen are deleted (R47). What it answers, and what is his to decide: [`front-runner.md`](front-runner.md), "What was built" |
| Owner reviews the reader, round one | DONE | First round of notes given 2026-09-07 and all of them folded in the same day: the drifting navigator (F34), the birds' left edge (F35), the feed's comment row, a three-line cap on a docked question, the laptop's margins and rail, and a jump that no longer fast-forwards. His words are in [`review-2026-09-07.md`](review-2026-09-07.md). |
| Owner reviews the reader, round two | DONE | Second round of notes given 2026-09-07 and folded (`review-2026-09-07.md` Parts two to four): every S4 default accepted except delete, which **becomes leave**; the Catch-up **picture**, which is new and changes every surface; and the list's question previews, which he took off. Still owed from him: which navigator (A, B or C). Still owed by us: **N11, the reader's title**, the one note of his not yet answered |
| S4 The shape of the whole thing | PARTIAL | 2026-09-07, **two passes**. First pass rejected by him the same day: the home was worse than what ships, because it deleted the shipped right rail and left every control floating in the content (`review-2026-09-07.md` N26 to N45; *"the level of critical thinking and brainstorming and planning and rigor has significantly dropped"*). Second pass rebuilt from a full control inventory: the rail is back, `preparing` is deleted, a batch has no manual transitions, a published Round's cover is its photographs, and a card always opens the home. [`architecture.md`](architecture.md) §§1, 1b, 4, 5, 6, 8 rewritten. **Still owed by us: N11 the reader's title.** |
| S4c Pressure corpus wired; aesthetic changes reverted | DONE | 2026-09-07 night. `_fixtures/pressure.ts` had been on disk since S1 and nothing had ever drawn it; `?data=pressure` now swaps the Round the whole spine draws, through one adapter into the same `SketchRound`. It found seven defects, F36 to F42. **The same session also redrew the reader's title and took the Round number out of it, unasked, and he rejected all of it: *"i don't like any of the aesthetic changes you've made they all suck"*. Every aesthetic change is reverted; only the defect fixes with no visual footprint were kept.** N11, the reader's title, is therefore STILL OPEN |
| Owner browses the shape, round two | DONE | 2026-09-07 evening. He walked the whole spine out loud and then sent notes continuously for the length of one session. Every one of them is folded in; his own verdict partway through: *"I can't believe i'm saying this but you're actually doing a good job. for the first time in two days and a million sessions I feel like this is coming together."* Verbatim notes in [`review-2026-09-07.md`](review-2026-09-07.md) Part six |
| S4d Fine-tuning, round one | DONE | 2026-09-07 evening, four commits. The reader's rail magnification rebuilt from scratch on the app's own motion-value mechanism; the home rebuilt around two doors on the picture and a sidebar of back numbers; answering and the questions panel brought onto the page; the type rule written down. `npm run check` green, `npm run visual` 25/25 |
| The composer, the picture's crop | PARTIAL | The composer's *shape* is drawn, on the home, because he asked for it there. What is not drawn: the photo attachment flow, the song field, the photo-wall question, and the crop-at-creation surface. The people surface is DONE (a dialog and a sheet, off the sidebar). **`spec.md` §10 rules on each**: the song field is DELETED rather than drawn (a pasted link resolves anywhere, ¶50), the photo-wall control is the drawn photo strip with a higher cap, and the crop-at-creation is assembled from `photo-aim.tsx` and the direct-upload path -- all three inside the build. The photo wall's READING surface goes to S-features, and the confirmations go to the settings session, both before the phase that would need them |
| The settings surface, refined | OPEN | **his, and he has said he will take it in a session of its own.** It is a real settings list now rather than a column of verbs, and he called it *"very bare bones"* before that and has not called it finished since |
| **S-features, the second brainstorm** | DONE | **2026-09-09, [`features.md`](features.md), and HE HAS RULED ON EVERY ITEM** (§1, verbatim). **In: a question you answer out loud** (*"We should definitely have this"* — it plays back the AUDIO, transcript through the browser, his own suggestion); **a question the group votes on**; **a longer question library**; **TIME CAPSULE MODE, which is his own idea and is new** (an Edition sealed and released a year later, a switch in settings, with the library tweaked to suit); and **answers hidden until you write your own, but a PUBLISHED Edition open to everybody whether they wrote or not** — that last one changes build phases 7 and 8. **Out: the map; a question from another batch; a one-line answer AS A FEATURE** (*"we can have those questions in the library. We don't have to enforce them in the answers"*). **Parked: more reactions, anonymous answers, and email** (it needs a paid Resend plan). **Open, and it is one sentence from him: then-and-now**, which he did not follow; it is explained plainly in §1. **A build warning that is free today and expensive in November: phase 11 must NOT drop `CatchupEdition.publishAt`** — a time capsule is a scheduled publish date and that is the same column. Originally: the mechanism that makes it cheap (a kind is derived from a category, so a new one needs no migration), the photo wall's three reading shapes and why a grid is wrong, the Letterloop parity list with its one real gap (email), the voice signal from the rest of the space, and seven proposals with a default of "not unless you say so" for him to cut. **The photo wall is the only non-optional item and comes before build phase 8.** Originally: **He has asked twice that this not be lost.** 2026-09-07: *"in my initial request for the catch ups rework I also requested a brainstorm on and research into more features we can incorporate for instance a photo wall round and that can be shown nicely on the reader in a unique way and maybe some other stuff ... have a think and see what people would want and what letterloop and any other similar guys do now. I don't want you to do it in this session but I had requested it at some point and I wanna make sure it gets done at some point and it hasn't been written out of the brief completely."* It has not been: it is ¶16, ¶49 and ¶50 in the brief and rows R15, R16 and P22 in the ledger below. What is missing is a SESSION that does it, and this row is that session. See "S-features" below, and `spec.md` §11, which schedules it before phase 8 because the photo wall's reading surface is the one piece of it that can change a page already drawn |
| **The list, when it has room to spare** | DONE | **Decided by him 2026-09-07, drawn in build phase 6, 2026-09-08.** See "The list's spare slots" below. Scheduled: `spec.md` §5 puts it inside build phase 6, with the list, because it is a rule about what fills that grid rather than a surface of its own |
| S3b Second round | OPEN | only if he asks for one after browsing the shape |
| S5 Pick and spec | DONE | 2026-09-08. [`spec.md`](spec.md): the data changes as dated idempotent files, the Round -> Edition rename as one pass, eleven build phases plus track X, the three undrawn surfaces called before-or-inside, and ¶1 to ¶52 mapped. Owner questions 19, 20 and 21 are new and are below. It does NOT redraw anything: `architecture.md` is still the design |
| S6+ Build | **PARTIAL** | **Phases 1 to 6 of eleven are DONE**, 2026-09-08. **Phase 1**, the Round -> Edition rename: one pass, `npm run visual` 25/25 with no baseline moved, the route moved with a permanent 308, `roundLabel()` deleted, the admin room keeping its numbers by his decision. **Phase 2, the clock**: `preparing` deleted (N88) so answering goes straight to published in one transition; every deadline snapped to **07:00 IST**, which is the hour `vercel.json`'s 02:00 UTC tick catches within thirty minutes, pinned by a test that reads `vercel.json`; and **Start the next Edition now** added (N43), the one-way control in the rail with a cinnamon dot and a confirmation, sharing `openNextEdition` with the clock. Three commits. Two files the spec listed for deletion SURVIVE, with the reason in each docblock: `almost-ready.tsx` is the P2021 holding scene on six routes, `not-yet-published.tsx` covers draft/collecting/answering deep links and was never the preparing screen. Phase 2's migration is a no-op backstop and **is applied to both projects** (0 preparing rows on each, counted first). `publishAt` the COLUMN is NOT dropped -- that is phase 11, after this deploys. **Phase 3, the picture**: two columns on `Catchup` (`pictureSrc`, `pictureFocus`), NOT NULL with a deterministic backfill in the same file, applied to BOTH projects; the pool moved out of the lab to `src/lib/catchup-pictures.ts`, so **his twenty are one edit and no migration**; both creation paths pick from it; `mayChangeCatchupPicture` written wide enough for phase 4 (anyone in a batch); and the settings row that opens a picker with a **Use your own** branch, driven end to end in a real browser — a pool pick wrote `center 81%` and an upload came back as a real R2 url. The aiming frame is the TIGHTEST band (1520x240), not the roomiest, which is the thing that had fooled two sessions. Nothing renders any of it: `npm run visual` 25/25, no baseline moved, which is the correct result. The purge learned about the column in the same commit. **Phase 4, the batch Catch-up**: two Catch-ups exist that never did, on the two batch groups at or over the floor of ten -- Batch of 2023 (39) and Batch of 2024 (11, now 12). The 2024 one was ADOPTED rather than duplicated: one migration heals the memberships, ASSERTS the subset relation, then re-points `Catchup.groupId` at the real batch group, so its published Edition, 8 answers and 8 questions stayed exactly where they were and two 2024 alumni were handed an Edition they were never in. `createdById` and `inviteToken` are NULL on both: nobody keeps one and there is nobody to invite. Both Keeper preambles (`loadKeeperScope`, `loadKeeperEdition`) refuse a batch BEFORE they ask who the Keeper is, and `leaveCatchup` and `setCatchupDeleted` refuse it by name, so there are no manual transitions, no member editing and no way out but archiving. `joinBatchGroup` moved to `src/lib/batch-catchups.ts` and now ensures the Catch-up, which makes the tenth signup of a batch the moment one appears; the tick gained two idempotent self-heal passes that run on the CRON sweep only, never on a page view. **The sidebar's test is 'have you got a Catch-up', not 'is your batch big'** (spec 3.5b RECOMMENDED): measured on the live database, 51 of 70 members now see the row, 15 lose it and 4 teachers were already out. Applied to BOTH projects; a genuine no-op on the demo, which has no batch groups. `npm run visual` 25/25, no baseline moved. **Phase 5, leaving and the read mark**: `setCatchupDeleted` and the thirty-day bin are deleted, and `leaveCatchup` is the only exit -- it takes the `GroupMember` row in the moment rather than on the thirtieth night, which is what the bin was doing behind a countdown. Four things went with it: the retention sweep (its Serializable transaction, its 200-a-night batch and its succession hand-off), the subtraction in `groupMemberIds` that kept the audience honest for a month, the "Recently deleted" shelf, and `restoreOwnCatchupCopy`. **Audits C-020 and C-023's third path close by DELETION** and are pinned as absences, so each fails if the thing it described comes back. The batch refusal survived the action that shared it: `leaveCatchup` holds `BATCH_LEAVE_REFUSAL`, and the test now also fails if `setCatchupArchived` ever starts refusing a batch, because there archiving is the only exit. On the list Delete became **Leave**, with new confirmation copy, driven in a real browser at 1440 and 390. **The read mark is `CatchupEditionRead`, a table rather than a read of `ContentView`** -- that one is the analytics counter, is under standing pressure to stay bounded, has no foreign key on `targetId` and is written before the reader knows the Edition's status. Written after the published gate, proved live: one row for a published Edition, `readAt` unchanged on a re-read, nothing at all for a collecting one. Nothing DRAWS it yet; phase 6 does. Migration applied to both projects (zero rows moved on each, counted first); `deletedAt` the column waits for phase 11. `npm run check` 110/110, `npm run visual` 25/25, no baseline moved. **Phase 6, the list**: `/catchups` is `_list.tsx` transplanted -- the card IS the photograph, 5:2 on a laptop and 16:9 on a phone, two up from 1180px, the name and one state line written on it over the shared scrim, no rail, no Fresh off the press, no View, no dots, no birds, no counts, no Edition number. Measured against the room at 1440: shelf 1096 wide at x 288, card 538x216 against 536x214 (the two pixels are the border), and the pill now right-aligns with the cards. Five files DELETED and pinned as absences in `batch-catchups.test.mjs`. **The spare slots (spec 5) are drawn for the first time**: `editionSlots()` in `catchup-shelf.ts` with a table test, 1->3, 2->2, 3->1, 4+->0, and 0->0. **The Edition cover was drawn TWICE**: the first version wrote the date onto the photograph the way a Catch-up card writes its name, and failed his own test (*"just so it's obvious that they're different types of elements"*) because three of the five published Editions carry no photograph, so it fell back to its Catch-up's own picture and came out as a paler copy of the card beside it. It has a FOOT now -- the picture stops short, the date is set on the card's own paper under it -- which is the home's Earlier Editions shape and is one glance rather than a detail. It keeps the Catch-up card's outline exactly, so no row is ragged. **The read mark is drawn**: `readEditionIds()`, one query, a set and never a count, shown as the 2px measure beside a cover's date, cinnamon unread and hairline read; both states driven live. **Archiving, when the card menu died**: the phone's swipe-left with an undo toast (driven with a real touch sequence -- a left swipe archives, a vertical swipe scrolls and archives nothing), plus a control in the card's top right on a fine pointer, invisible until hover or Tab, because a swipe leaves a mouse and a keyboard with nothing and on a batch Catch-up archiving is the ONLY exit. Leaving was CHECKED, not assumed: `home/people-panel.tsx` still offers it. Two numbers came from the app: the ratio switches at **500px**, not `sm` (at 639 a card is 599x338 and at 640 it is 584x235, a 103px jump on one pixel), and the name **clamps to two lines** because at the 80-character cap it took four and covered the whole photograph. One trap: `line-clamp-2` IS a display utility and Tailwind emits `display:block` after it, so the two together cancel the clamp. `npm run check` 110/110, `npm run visual` 25/25 with **one baseline moved**, read first: the CTA travels 332px right. No migration. **Phases 7 to 11 open. Phase 7 is GATED on the settings session, which is his (N100, spec 10.3); track X may ship first and at any time**
| M1 Magazine design | OPEN | unblocked. D27 is answered in `recon.md` section 6: photographs are boxed to 1920px, which is 164 dpi at A4 full-bleed |
| M2+ Magazine build | OPEN | blocked on M1 |
| X Fast fixes | **PARTIAL** | **2026-09-08/09, four commits.** F18 the phone overflow: a pasted Spotify link's 54-character run is 369px with no break opportunity against a 316px column, so the DOCUMENT laid out 414px wide in a 390px window and the sticky green bar stayed 390 -- his half-centimetre of white space, measured. `break-words` on every element that prints a member's typing, the feed and letters included, pinned by `src/lib/rich-text-wrapping.test.mjs`. **The recon's "does not reproduce on this machine" was a viewport flag**: without `isMobile` Chrome will not shrink the layout viewport, and with it the fault is plain. F23 the heart: the two `revalidatePath` lines deleted, measured four taps each way on the owner's own answer so no bell moved -- **223 KB and 1,333 to 1,809 ms a tap becomes 1 KB and 514 to 781 ms**, the rest being the trip to Mumbai; the optimistic flip was always 30 to 56 ms. Pinned across all four love toggles by `heart-revalidate-rule.test.mjs`. D38 the caption clamp, two lines to four: measured on the longest live caption, 90px of 180px at 390 with More, and **whole with no fold at 1440**. V1 the size snap: reproduced on the three photographs he was looking at (1200x1600, 1200x1600, 1288x966 -> 390x520, 390x520, 390x293) and fixed -- both frames now dissolve inside one box that tweens between the fitted sizes on the step's own 220ms curve, sizes LEARNED from the pre-decode rather than plumbed through four callers. **V2 and V3 are OPEN and are not guessed at**: six attempts (real touch swipe, arrow keys, trackpad wheel fling, two swipes 150ms apart, at 390 and 1440) could not reproduce them, `step` clamps at both ends, one gesture calls it exactly once, and the carousel's snap CSS is all correctly applied. **He confirmed 2026-09-09 that it happens on phone AND laptop**, so the "needs a real iPhone" note is withdrawn. `/lab/catchups/swipe` is the instrument: the real photographs, the real shared viewer, and a trace of every finger and every change of picture, for him to run on his own device |
| Old spec rewritten to describe what shipped | OPEN | last, with build phase 11 (the cleanup), which also drops the dead columns and removes the three throwaway Catch-ups |

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

- **F33, a still cannot find a navigation fault; a live drawing can (S3c, 2026-09-07).** The front
  runner's phone drawing scrolls, spies on its own headings and opens, and its first scroll-spy
  rule was wrong in a way no still would have shown: a picked question landed with its heading
  under the strip while the strip still named the question before it, two questions stacked. The
  reading line is now the strip's foot plus the landing breath, so a landed question is current at
  once, and the strip shows the Round while a heading is on screen. Three smaller traps from the
  same session, each found in a capture: a `<button>` centres its own text, so a label inside one
  needs `text-left` whatever its parent says; the app's `.glass` (78% paper) is a bar over a feed,
  not a surface to read a question through, and the strip carries its own 93%; and a wrapper with
  `overflow-x-auto` is a scroll container, inside which nothing sticky sticks (F31 again, from the
  harness this time). Also: Spotify's keyless oembed has no artist, and "Spotify" is not one; the
  song card prints a title over its cover and nothing else.

- **F34, a sticky element inside a scaled frame drifts, and the number is exact (S3c, 2026-09-07).**
  `position: sticky` inside `transform: scale(s)` lags the scroll by (1 - s): the browser resolves
  the sticky offset in the untransformed coordinate space and the scale then shrinks the
  correction. Measured at 0.92 (a 390 drawing in a 360 window): the strip sat 1,487px above the
  viewport after 20,000px of scroll, having read as "fixed" for the first screen. At 0.95 on the
  1512 laptop frame it was 914px. This is the third distinct bug the sketch room's scaling frame
  has caused (F27's blank capture, F31's dead sticky bar, now this), so the frame is deleted and
  every drawing is fluid. **Nothing in this room is scaled any more, and nothing should be again.**
- **F35, the birds' left edge, and it is the glyph set (S3c, 2026-09-07).** Owner: "the people
  who've uploaded a profile photo, for them, their icon is correctly left-aligned to the left
  border, but many of the other people who have a bird, their bird is actually not left-aligned."
  Measured: every avatar BOX in the column starts on the same pixel. A photograph is clipped to a
  full circle and fills its 40px; a bird is drawn inside r~45 of a 0..100 viewBox (`bird-avatar-v2`
  says so at the top), so its ink spans ~32px starting ~4px in. The feed is identical and has never
  shown it, because the feed never stacks twelve avatars in one column. The reader now measures each
  glyph's ink box and slides it left by its own inset, layout-neutral, sizes untouched. **The
  app-wide cure would be to normalise fifty drawings and it is the owner's call, not a room's.**


- **F36, a portalled component was being server-rendered, and it silently doubled the page (S4c,
  2026-09-07). FIXED.** `_parts.tsx` imported `ImageViewer` directly. Its last line is
  `createPortal(..., document.body)` with no early return, so every server render of a page holding
  a photograph threw `document is not defined`; React caught it, called the render **recoverable**,
  threw the server's whole tree away and re-rendered on the client. Nothing turned red -- the page
  looked right, `npm run check` stayed green, and the only trace was one console line. On a 34,000px
  Round that is the page built twice. `lazy-image-viewer.tsx` has said in its header since it was
  written that every caller must come through it, and four other surfaces do. **The comment is now a
  test**: `src/components/common/image-viewer-import-rule.test.mjs`, proved to fail before it was
  kept. The fix also brings the room the latch and the pointer preload.

- **F37, the answer paragraph had no `overflow-wrap`, which is recon F18 alive inside the front
  runner (S4c). FIXED.** A pasted Spotify link is a 54-character run with no break opportunity.
  Measured before the fix: the paragraph laid out to 1,310px inside an 814px tile and the words were
  cut off, held on the page only by `html { overflow-x: clip }`. Fixed on the body and on the
  question heading, which a member can also fill with a pasted url.

- **F38 and F39, links, from both ends (S4c). FIXED.** `stripLinks` stripped `https?://\S+`, all of
  them, while only Spotify and YouTube become cards -- so an answer whose whole body was a Bandcamp
  link came out empty, produced no card, and was dropped from the page altogether by `said()`. And
  `Tile` did the opposite: `entry.text || entry.body` fell back to the raw body whenever `text` was
  empty, which is exactly the answer that is ONLY a link, so the url was printed in full above the
  card it had just become. That is R31 inverted: *"I think it should just not show the link at all.
  Let it just show the button."*

- **F40, FIXED 2026-09-07 by deleting the thing rather than bounding it.** The people are no longer
  in a fixed column at all: they are behind an icon on the picture, in a dialog on a laptop and a
  sheet on a phone. An unbounded list does not belong in a sticky column, and no scroller-inside-a-
  scroller was needed. The original finding, kept because the arithmetic is the argument:

- **F40 (original), the sticky rail is unreachable at the app's own people cap (S4c).** At 100 members (`lib/catchup-caps.ts`; Batch of 2023 already has 39) the home's rail lays
  out **4,000px tall inside a 982px window**, and because it is `position: sticky` everything past
  the first screen is not below the fold -- it cannot be reached at any scroll depth. A fix was
  drawn (bound the rail to the window, let the People block scroll inside it under a fade) and
  reverted with the rest, because it changes what the rail looks like and that is his call, not a
  session's. **Show him the fix before shipping it.**

- **F41, one rail row can swallow the rail (S4c). ANSWERED 2026-09-08, ships in build phase 8.**
He chose three lines for the list's rows and moved the strip's docked question from three to two:
*"a. make this clamp to three lines and the other one that was previous clamped to three lines,
clamp to two lines."* `spec.md` §4.3. Original finding:

- **F41 (original), one rail row can swallow the rail (S4c).** At the app's 300-character question
  cap one row of the reader's question rail measured **211px against its neighbours' 41**. A
  three-line clamp was drawn (three lines is his own number for the docked question, N5) and
  reverted with the rest: truncating a question in the navigator is a design decision. Two traps for
  whoever fixes it: `overflow: hidden` clips at the PADDING box, so a clamp written on the padded
  button bleeds a band of the fourth line into the row beneath -- it belongs on an inner span; and a
  duplicate React key on a photograph is a child React may silently drop, which is why photographs
  are keyed by position now.

- **F42, the pressure corpus was minting duplicate ids and had been since S1 (S4c). FIXED.**
  `personOf` slugged the name through `[^a-z]+`, so the digits went: "Member 1" through "Member 93"
  were all `px-member-`, all 24 wallers shared one id and all 40 of the crowd shared another, and
  the Devanagari and Arabic names -- having no a-z in them at all -- were **both `px--`**, one id for
  two different people. 186 duplicate React keys, and every invented member drew the same bird,
  because the bird is a hash of the id. Nothing warned about it until a room finally rendered the
  file, which is the argument for D45 in one sentence.


- **F43, the Pressure pill never worked (S4d, 2026-09-07). FIXED.** Which corpus is drawn is decided
  by the SERVER component, off `searchParams.data`, but the pill changed the URL with a client-side
  `router.replace`. So it lit up, the address bar changed, and the page went on drawing the real
  Round. His: *"pressure button does literally nothing."* It is a full navigation now. Anything a
  lab room switches that its server component reads has this shape.

- **F44, a room's own chrome made the drawing look broken (S4d). FIXED.** At 390 the header's row of
  view pills laid out to 449px, so the DOCUMENT was 59px wider than the window and the whole drawing
  sat inside a horizontally scrolling page. He read it as a design fault -- *"the batch of 2005
  picture doesn't meet the right margin"* -- and it was not: the cards run 20 to 370 inside a 390
  viewport, measured. The row scrolls internally now. **A lab room's chrome that overflows is
  indistinguishable, to the person looking, from the design overflowing.**

- **F45, the swell was three bugs, not one (S4d). FIXED.** *"it's super glitchy and jittery ...
  things react early and late and it's just built horribly."* (a) The pointer's position was React
  state, so every pixel of movement reconciled eleven rows. (b) Row centres were cached in an effect
  keyed on the CURRENT QUESTION, so they were stale against every resize -- the "early and late".
  (c) `transition: transform 90ms linear` restarted an animation every frame toward a target that
  had already moved. The rebuild uses the Collection year rail's mechanism: a motion value for the
  pointer, a transform reading each row's live rect, a spring on the scale, zero React renders per
  frame. **Reach had to change with it**: the Collection's 64px covers three of its 20px rows, and
  these rows are 41 to 79px, so at 64 one row swelled alone.

- **F46, two of the six stand-in photographs were unusable and nobody had looked (S4d). FIXED.**
  `v1.webp` and `demo-banyan-pillar.webp` are the same photograph, which is why two list cards
  looked identical; `demo-assembly-wide.webp`, despite its name, is 760x1140, portrait. Cropping a
  portrait to a wide banner keeps a ninth of it and upscales that, which is exactly the *"insanely
  cropped in, like, 30x zoom"* he kept seeing. Both dropped, and each survivor now carries the band
  its wide crop is taken at, because the horizon and the benches are in the lower quarter of all of
  them. **He still owes the twenty**, and they want 2,400px or more on the long edge.

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
| P24 | Robustness by pressure testing: a fake Catch-up or two filled with every type of content; survive the most varying input | 51 | the switch exists and works: `?data=pressure` swaps the Round the whole spine draws, through one adapter into the same `SketchRound`, so the list, the home in every state and the reader all draw it. Seven defects, F36 to F42, four fixed and two left for him to decide. The composer and the magazine inherit the same switch |
| P25 | `/lab/catchups/` is the sandbox for any test, *"whatever we want"* | 52 | open |
| P26 | Seventy beta testers are on this today: live members, live Rounds mid-flight; the rework lands on a live surface and a migration cannot orphan an open Round | 44 | open |

### The index, `/catchups` (I)

| # | Ask | ¶ | Status |
|---|---|---|---|
| I1 | Sort out what belongs in the wide left column and what on the right | 1 | closed by S4: the right rail is deleted, so there is no second column to sort |
| I2 | Long rectangles stretch on wide screens until 90% is white space; not scalable; a different shape (squares? a picture per Catch-up?) | 1, 6 | closed by S4: equal picture cards, two up, page capped at 1096. And the picture he asked for on 2026-09-07 is the one he had already half-asked for in ¶1 |
| I3 | The Spotify-grid idea is an example he immediately withdrew; explore many shapes | 6 | open |
| I4 | Three calls to action on opening: *"overpowering"* | 23 | closed by S4: one, in the page header |
| I5 | The View CTA is redundant (everything clicks through to the same place) and mis-aligned because of the three dots; but *"if there's a reason, sure"*, and controls that do not span the tile are *"fine, I guess"* | 3, 24 | closed by S4: no controls on the list at all. Recon found View was the fallback label for two states with no verb; those states now say what they are in words |
| I6 | Three dots in a random corner *"interrupts everything"*; if they exist at all they belong top right; whether tiles exist at all is the level of rethink wanted | 3, 24 | closed by S4: no dots on the list; one menu, top right, on the Catch-up's own home |
| I7 | A row of birds plus "+18" identifies nobody, on the index tile, the reader's masthead and the home; keep birds, never initials; find a different way to show who is here | 12, 23, 25, 27 | open |
| I8 | The birds now overlap each other; he thinks a regression | 23 | open |
| I9 | Fresh off the press: round, loop, date, then a quoted sentence he does not want to keep seeing; a strangely shaped hover; a curved border between items; text spilling out of the hover; *"could be done in a completely different way"*; and by his ranking it has *"the most bugs"* | 9 | closed by S4: deleted rather than redrawn. Its job -- what is new to read -- is the Catch-up's own card |
| I10 | One representation of "a published Round", not *"15 different ways in 15 different places"*, and not different on desktop and mobile | 13, 39 | closed by S4: the cover, one component, `_cover.tsx`, the same on both |
| I11 | Hover darkens, outline appears, a View button: *"not critical thought"* | 3 | closed by S4: a card is a door and the whole rectangle is the target |
| I12 | A member is in only two or three Catch-ups; design a short list, not a library | 1 | closed by S4: two up on a laptop is a screen; the room's default shelf is three |
| I13 | The long-box problem is everywhere in the app, and the worst case he names is a TV | 1 | open |

| I14 | **The picture.** Catch-ups is the only surface with no imagery and it reads *"very functional and very corporate"*; every Catch-up gets a photograph when it is made, from a pool of about twenty of the school he will supply, replaceable by whoever runs it and positioned at creation; it appears in several places as part of the Catch-up's identity, *"almost like a group chat photo"* | N19-N24 | **built, 2026-09-08, build phase 3**: two columns, the pool at `src/lib/catchup-pictures.ts`, both creation paths, and the picker with its upload and aim. Nothing DRAWS it until phases 6 and 7. **He still owes the twenty photographs**, and they are one edit to that array |
| I15 | The list must not carry the Round's questions: *"it's overcrowding ... too much text going on for something that should just be a navigation"*, and the picture must be *"a spectacle"* that *"makes you wanna click it"* | N25 | closed by S4 |

### Lifecycle: archive, delete, pause, end, leave (L)

| # | Ask | ¶ | Status |
|---|---|---|---|
| L1 | Ending, deleting, archiving, leaving, pausing: too many verbs, no consistency, *"everything's just different in every different situation"*, *"none of that has been considered properly"*; pause he *"kind of doesn't get"*, and then supplies the one argument for it himself: without it a Round *"will just start whenever the time is up"* | 1, 4, 8, 24, 40 | open |
| L2 | WhatsApp model: archive and delete; neither is visible on the main list; no Archived section with a Put back button in your face; and *"where do we keep them?"* | 1, 5 | closed by S4: one quiet "Archived" row at the foot, present only when one exists, opening in place. And on 2026-09-07 he replaced Delete with **Leave** |
| L3 | *"There should not be an exiting a catch-up"*, said generally after the batch lead-in; ¶4 had asked for a leaving, so this is a reversal | 4, 5 | **answered 2026-09-07, and it reverses again**: *"deleting becomes leaving"*. You leave a people Catch-up; you cannot leave your batch |
| L4 | Popup dialogs need reworking in general, *"a whole other thing"*: the people dialog, the move dialog, the Reminders dialog (the dialog-standards research is the base) | 3, 38, 40 | open |
| L5 | Where archived and deleted Catch-ups live, and how you find one again | 1, 5 | open |
| L6 | Whether leaving exists for a people-Catch-up at all: asked for in ¶4, apparently withdrawn in ¶5; today's code has a leave action | 4, 5 | **answered 2026-09-07**: it exists and it is the only word. Delete, and its thirty-day bin, go |

### The batch Catch-up (B)

| # | Ask | ¶ | Status |
|---|---|---|---|
| B1 | Exists by default for every batch; everyone in the batch is automatically in; sees the history of Rounds; can take part in future Rounds; someone who joins the site later has access to the earlier issues | 4, 51 | open |
| B2 | No adding or removing members; the members are fixed, the batch; *"can't edit people in and out"* | 4, 51 | open |
| B3 | Who is the Keeper? Who may start a Round? A question he asked, not answered | 4 | **answered 2026-09-07**: nobody keeps it. Anyone in the batch may work its Rounds; nobody may rename it or change who is in it |
| B4 | It used to exist and disappeared; recover why | 4 | done, `recon.md` §9 and F17: it never existed |
| B5 | Bug today: "Start one" on a batch routes to the add-members page, which a batch Catch-up must never have | 4 | answered: the button was removed on 2026-08-21; `/catchups/new` replaced it and has the same fault (F17) |
| B6 | Batch and people Catch-ups both exist and are listed together; people Catch-ups are *"how you'd expect"* | 51 | open |

### A Catch-up's home, `/catchups/[id]` (H)

| # | Ask | ¶ | Status |
|---|---|---|---|
| H1 | What is the "home" of a Catch-up and how do you get back to it; landing straight in the reader from a finished Catch-up is *"a nice thought"*, the fault is the missing way back; the relationship between pages is not designed | 18, 36 | closed by S4: the head, Now and Earlier Rounds; the shortcut into the Round stays and the Catch-up's name in the bar is the way out |
| H2 | The same published Round appears three times on the home: a "Round 1 is out" tile, the whole Round inline, and a Published issues entry; *"so ridiculous"*; and yet *"then what do we put on the left? I don't know"* | 15, 35, 36 | closed by S4: once, as its cover. Earlier Rounds holds only the ones Now is not showing |
| H3 | The "Round 1 is out" tile is dead except for its link; the whole tile is the target or there is no tile | 35 | closed by S4: "a card is a door", `_cover.tsx` |
| H4 | Say "In the loop", not "In the loop catch-up" | 25 | closed by S4 in the drawing; the shipped `catchupDisplayName` still needs it (recon §10) |
| H5 | Pause and resume behave acceptably; the whole left side pauses | 14, 15 | open |
| H6 | Getting back to the home means scrolling the whole Round: *"I scroll all the way to the bottom, which takes me a week"* | 18, 35 | closed by S3c/S4: the name in the green bar, at every scroll depth, and it is a button |
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
| E1 | "In this catch-up": six or seven names, "and 16 more", See and add people, truckloads of white space, only the A-names visible, *"so inefficient"*, *"these huge rows"*; the panel and the dialog show the same thing twice; does it have to be a tile, a preview, a whole list, shown at all? *"Yes, we probably should. But from there is where I want you to start thinking"* | 12, 14, 19, 37 | closed by S4: the whole roster is a column on the home at a laptop's width (R2) and the same list opening in place on a phone. No preview, no fold, no dialog, and the people SHEET is deleted from the plan |
| E2 | The Keeper highlight and the leaf mark next to the name are nice; keep the idea | 37 | open |
| E3 | The See-and-add-people dialog: white space, "keep it" [Keeper] with "some people started it" should just say Keeper, the link on a *"horribly coloured background"*, the move dialog so narrow three words take three lines, rules everywhere; *"no way Apple would design anything that looked like this"* | 19, 38 | closed by S4: the dialog does not exist. Add and invite move onto the home's column, which the next session draws |

### Settings (S)

| # | Ask | ¶ | Status |
|---|---|---|---|
| S1 | Twelve horizontal rules, pills inside pills, *"too many pills, man"*; removing the rules alone will not save it; not invisible design; apply *"good UX principles like we have"*, the app's own | 14, 40 | closed by S4: the settings dialog is deleted. One menu on the home's head holds every Catch-up verb |
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
- **D51** *(S3c, 2026-09-07)* The reader spends its one bespoke object on the instrument you move
  with, not on the answers. The green bar carries the Catch-up's name; the strip under it carries
  the Round at rest and the current question in full once its heading has gone; a cinnamon line
  along its top is progress through the Round; opened, the same line runs down the list and stops
  at the current question, which is the mark. The answers are tiles at the feed's own sizes. Reason:
  R24, R37, R40 and R46 read together; the fifteen rejected designs all spent their invention on the
  answers and drew the same navigator. Which of the three navigators, and the line or the tint as
  the mark, is his (the board's next row).

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

## S4: The shape of the whole thing (one hand, live)

**This is the next session.** The reader is drawn and he has reviewed it twice; what is left is
everything around it, and the part he says matters more (N16): *"This aesthetic part is just one
aspect. We still have to design the aesthetic for every other page, and then more importantly, the
structures between, behind these pages. How they relate, how you access everything. The entire
logic of this entire concept."*

**Read first, in this order.** [`brief.md`](brief.md) in full; [`review-2026-09-06.md`](review-2026-09-06.md)
and [`review-2026-09-07.md`](review-2026-09-07.md) in full, which are his two verdicts and outrank
everything older; [`front-runner.md`](front-runner.md); then `directions.md` **Part 1 only**, which
is the architecture written by one mind before any fan-out and is the one part of that document
still worth reading. Parts 2 to 6 are the record of two rejected passes; do not take design from
them. Then the reader that exists: `src/app/lab/catchups/sketches/`, which is where the parts you
will reuse live.

**What this session produces.**

1. **The architecture, settled.** Take `directions.md` Part 1 and correct it against everything he
   has said since: R2, R21, R29 and R33 from the first review, and the whole of the second. It
   already answers most of it (the six nouns and the one home each, the home's three parts in every
   state, the cover, how you get anywhere in one move, the two kinds of verb and the one door, who
   is here versus who wrote in, the batch Catch-up, and the intents-by-state matrix). What it does
   not have is his decision on the handful of OPEN questions listed under "Decisions" (O1 to O14).
   Bring those to him as a short numbered list with a recommendation each, the way gate 1 did.
2. **The two surfaces that carry it, drawn live**, in the same hand and out of the reader's own
   parts: `/catchups`, the list, designed for two or three items at 390 and 1512; and a Catch-up's
   home in every state it can be in (no Round yet, collecting, answering, preparing, published and
   waiting, paused, ended). Live, not stills: the reader proved that a navigation fault is
   invisible in a picture (F33).
3. **Nothing else.** The composer, the people sheet, the verbs' dialogs and the magazine are the
   sessions after this one. A session that draws eight surfaces draws eight mediocre surfaces,
   which is how the first pass failed.

**How to work.** One hand, never a fan-out (F32). Nothing scaled, ever (F34). Reuse
`_parts.tsx`, `_navigator.tsx` and `_shell.tsx` rather than redrawing a byline or a tile. Type
comes off the app's scale and off `PageHeader`'s 30px page title unless there is a reason worth
writing down; he called this out by name on 2026-09-07. Look at every screen yourself at 390 and
1512 before saying anything is done, and drive anything that moves. `npm run check` before each
commit, `npm run visual` after UI work, never both at once (see the memory).

**Update the board and the log before you finish**, and write the next session's paste line at the
end of the log, because he asked for exactly that: *"just tell me what to paste and what the next
step is."*

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

## The list's spare slots

**His decision, 2026-09-07, verbatim**, on the page a member with one Catch-up sees:

> "regarding the one catch up page let's just show the latest editions in a preview like we're doing
> but on that page! I think that would work well. let's do it so it maxes at 4. that is if they have
> one catch up then max latest 3 editions. if they have 2 catch ups the the latest two editions
> whichever one they're from. if they have four catch up, no need to show editions there. we'd have
> to show the date and from which catch up it is if there's more than one catch up. and just so it's
> obvious that they're different types of elements maybe include the fact that it's the latest
> editon somewhere on the card in a pretty way."

**The rule, as arithmetic.** The grid holds four things. Catch-up cards come first; the remainder is
filled with the most recent Editions, newest first, from whichever Catch-ups they belong to:

| Catch-ups | Edition covers |
|---|---|
| 1 | 3 |
| 2 | 2 |
| 3 | 1 |
| 4 or more | none |

**What an Edition cover carries here**, and only here: its date; which Catch-up it came from, but
**only when the member has more than one** (with one, saying so is the same fact twice); and
something that marks it as the newest one, *"in a pretty way"* — his words, and deliberately not a
label reading "Latest Edition", which is the register he keeps cutting.

**Why this and not a wider card.** A card spanning the page asks a 1,280px photograph to fill 2,368
device pixels; nothing in the pool is close and his twenty may not be either. Filling the row with
more objects at the SAME size upscales nothing. It also gives the page with one Catch-up the thing
its member actually wants, which is what to read.

**Two things for whoever draws it.** It is `Cover` from `_cover.tsx`, the same component the home
uses, so this must not become a second way of drawing an Edition -- that is the campaign's oldest
complaint (¶13, ¶39). And it is close to "Fresh off the press", which he had deleted: what made that
one wrong was a rail of quoted first sentences with a curved divider and a padding-less hover, not
the idea of showing what is new. Draw the cover, not the teaser.

---

## S-features: the second brainstorm (a session of its own, not folded into a build)

**His, and the reason this row exists**, 2026-09-07: he asked for feature research early in the
campaign, watched it become a handful of ledger rows, and asked for it to be a piece of work rather
than a footnote. His words are on the board above, verbatim.

**What it is NOT.** Not a redraw of anything at `/lab/catchups/sketches`; the shape is settled and
he has signed off on it. Not the build. This session asks what a Catch-up should be able to *hold*
that it currently cannot.

**The three things already in the brief that it owns**, so nothing is re-derived:

- **A photo-wall Round** (¶16, ¶49; ledger R16, D10). *"we definitely have to add a photo wall for
  questions where people can just add photos, but it needs to be modular and work with everything
  else."* A photo-wall question exists as a `promptKind` in `catchups-types.ts` and has never been
  drawn. The interesting half is his: how a wall of twenty-four photographs is READ, in the reader,
  in a way that is not a grid. The pressure corpus already carries one.
- **Link previews on any pasted link** (¶16, ¶50; ledger R15, D9). Half-built: `_media.ts` in the
  sketch room resolves Spotify and YouTube out of body text, and F29/F30 found the shipped resolver
  has never once run end to end. What is undecided is which hosts, where the resolved metadata is
  stored, and the fail-soft rule.
- **The Letterloop parity list** (¶49; ledger P22). *"a lot of the things that were there in
  Letterloop aren't there ... those kind of tiny things."* `prior-art.md` §1 has words and no
  pixels, and F15 says not to lean on it. This wants looking at the product again, plus whoever
  else is in this space now.

**And the part that is genuinely open**: what ELSE a Round could hold. He said *"maybe some other
stuff"* and *"see what people would want"*, which is an invitation to propose rather than a list to
implement. Bring him a shortlist with a sentence each, the way the owner-questions block does, and
let him cut it.

**Where it sits.** After S5's spec and before or beside the build, because two of the three are
already LOCKED decisions (D9, D10) that the build has to carry anyway; a photo wall's *reading*
surface is the only one that could change a page already drawn.

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

---

**Asked 2026-09-07 by S4, after the architecture was settled.** Questions 7 and 8 are withdrawn
(the cull answered 7; 8 is folded into the front runner). One reply covers all of these:
*"defaults, except 11 and 13"*.

**9. Which of the three question menus do you want?** (still owed from the front runner)
- **What I'd change:** the list of questions you tap open while reading a Round. (A) the strip you
  tapped grows downwards in place. (B) a page of paper slides up from the bottom. (C) the whole
  screen becomes the Round's contents, in the heading font.
- **What you'd notice:** the way it opens, and nothing else. All three carry the same list.
- **If I guess wrong:** the reader ships with a menu that opens the wrong way, which is a day to change.
- **Options:** (a) A (b) B (c) C. All three are drawn on the Screens view of /lab/catchups/sketches.
- **If you don't reply I'll do:** (a), which is what the live reader uses now.

**10. Is the reader better than what is shipped?** (still owed)
- **What I'd change:** nothing yet. This is the only test that matters and you have not said.
- **What you'd notice:** if it is not, we draw the reader again rather than building on it.
- **If I guess wrong:** four more surfaces get built on a reader you do not actually want.
- **Options:** (a) yes, carry on (b) no, draw it again (c) yes with the notes I have already given.
- **If you don't reply I'll do:** (c).

**11. Who runs your batch's Catch-up?**
- **What I'd change:** nobody owns it. Anyone from the batch can start a Round, and anyone can
  close it or send it out. Nobody can rename it or change who is in it, ever.
- **What you'd notice:** on your batch's Catch-up there is no "owner" and nothing says who set it up.
- **If I guess wrong:** with nobody in charge, a batch could send out a Round early because one
  person pressed the button. The alternative gives that power to whoever pressed Start first,
  which risks a person who then never comes back.
- **Options:** (a) nobody, everyone can (b) whoever starts the first Round (c) you and the admins.
- **If you don't reply I'll do:** (a).

**12. Can you delete your batch's Catch-up?**
- **What I'd change:** no. You can put it away so it never shows up again, but it is your batch and
  it cannot be got rid of. Catch-ups with people you chose can still be deleted.
- **What you'd notice:** on a batch Catch-up the menu has "Archive" and no "Delete".
- **If I guess wrong:** someone who wants it gone entirely has to settle for it being hidden.
- **Options:** (a) archive only (b) delete too, meaning "hide it for good".
- **If you don't reply I'll do:** (a).

**13. Does "pause" survive, and what should it mean?**
- **What I'd change:** it becomes "hold the next Round". A Round already being written finishes
  normally and goes out; the clock simply does not start the next one until you say.
- **What you'd notice:** today, pausing hides everything, including a Round people are part-way
  through. In fact "In the loop" is paused right now and has a half-built Round 2 nobody can see.
  After this, pausing never hides anything.
- **If I guess wrong:** you may have wanted a full freeze that also stops a Round mid-flight.
- **Options:** (a) hold the next Round only (b) freeze everything, but drawn honestly so nothing
  hides (c) remove pause entirely and use End.
- **If you don't reply I'll do:** (a).

**14. Can you leave a Catch-up you were invited to, and what happens to what you already wrote?**
- **What I'd change:** "Delete" is how you leave one. What you wrote in Rounds that already went
  out stays where it is, because other people have read it and replied to it.
- **What you'd notice:** one word, "Delete", instead of two ("Leave" and "Delete") that did nearly
  the same thing.
- **If I guess wrong:** someone leaving might expect everything they wrote to vanish with them.
- **Options:** (a) delete is leaving, past answers stay (b) delete is leaving, past answers go
  (c) keep both words.
- **If you don't reply I'll do:** (a).

**15. The six members with no batch year, and staff.**
- **What I'd change:** nothing for them. They have no batch Catch-up and are in chosen-people ones
  like anybody else.
- **What you'd notice:** nothing, unless one of them asks why they have no batch.
- **If I guess wrong:** six people quietly miss out on the thing everyone else gets by default.
- **Options:** (a) nothing (b) a staff Catch-up of their own (c) ask them for a year.
- **If you don't reply I'll do:** (a).

**15b. Six of your members have not said which batch they are from.** (question 15, said again)
- **What I'd change:** nothing for them. Everyone else automatically gets a Catch-up for their
  batch year. Those six have no year on their profile, so there is no batch to put them in and they
  would not get one.
- **What you'd notice:** nothing, unless one of them asks why everyone else has a batch Catch-up
  and they do not. They can still be in Catch-ups other people invite them to, like anybody.
- **If I guess wrong:** six people quietly miss out on the thing everyone else gets for free.
- **Options:** (a) leave them (b) put all six in one Catch-up together (c) ask them to add a year.
- **If you don't reply I'll do:** (a).

**16. Should the app remember which Rounds you have read?**
- **What I'd change:** store one date per person per Round. The line down the side of a Round's
  contents is faint until you have read it and warm after, so you can see at a glance what is new
  without anything counting anything.
- **What you'd notice:** unread Rounds look different from read ones on the Catch-ups page.
- **If I guess wrong:** it is a new thing the database has to keep, and if you do not want it, the
  line is simply decoration and one nice signal is lost.
- **Options:** (a) yes, remember (b) no, the line is always the same.
- **If you don't reply I'll do:** (a).

**17. The twenty photographs.**
- **What I need:** about twenty pictures of the school, as files. I have drawn it with three
  photographs already in the repository so you can judge the shape, and they are three green trees,
  which is exactly the problem: the landing page and half the Collection are already wide valley
  views, so twenty more would read as the same picture again.
- **What I'd ask for instead:** details. A wall, a bit of the banyan, a shadow on a step, a
  doorway, a bench, a window. Nothing with a recognisable face in it, since it is a stranger's
  Catch-up. Nothing where the subject is dead centre, because the crop moves between screens.
- **If I guess wrong:** every Catch-up looks like every other Catch-up, which is the thing the
  picture was added to fix.
- **Options:** (a) you shoot or pick twenty details (b) twenty of whatever you have (c) I pick
  twenty out of the Collection.
- **If you don't reply I'll do:** keep the stand-ins in the lab and wait for you.

**18. Who may change a batch Catch-up's picture?**
- **What I'd change:** anyone in the batch, the same people who can start a Round. Nobody owns a
  batch Catch-up, so there is nobody else it could be.
- **What you'd notice:** any of your batchmates could swap the picture.
- **If I guess wrong:** thirty-nine people can change one picture and it could go back and forth.
- **Options:** (a) anyone in the batch (b) only the first person to change it (c) nobody, the
  default stands.
- **If you don't reply I'll do:** (a).

---

**Asked 2026-09-08 by S5, out of the spec.** One reply covers all three:
*"defaults, except 20"*. Full context in [`spec.md`](spec.md) §15.

**19. ANSWERED 2026-09-08.** See "Owner answers" below and `spec.md` §3.5b.

**20. ANSWERED 2026-09-08 -- (a), and it closes F41.** See "Owner answers" below and `spec.md` §4.3.

**21. WITHDRAWN, 2026-09-08 -- already answered and already done.** The 10% (N93) was measured on
2026-09-07 and the number IS shared with the feed: 8px above the reaction row and 9px below, so a
tenth of each is 2px (`mt-2 -> mt-1.5`, bottom pull `-7 -> -9`). It shipped to the feed as
`2a6f7d25`, on its own so he can revert it alone. The Catch-ups half arrives with build phase 8.
See `spec.md` §15 for the one cost it carries.

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

**2026-09-07, typed, verbatim** (also N18 of [`review-2026-09-07.md`](review-2026-09-07.md)):

> defaults, except deleting becomes leaving. and don't understand question 15. the reader has pretty
> much incorporated all my notes what's left to do?

*The reading:* every default in questions 9 to 16 stands. Question 14 changes: a people Catch-up is
**left**, not deleted, so the thirty-day bin and the "Recently deleted" shelf go with the word.
Question 15 is re-asked below in plain English and is still open. On the reader, **N11 (the title)**
is the one note of his that is not yet answered.

**2026-09-07, typed, verbatim** (N46, N47 of `review-2026-09-07.md`):

> 1. A  2. no it's not yet better.  3. no it's not it's just this tiny hanging thing not at all tied
> into the identiy it just exists.  4. don't know what the questions are please explain.

> if they've not put a batch that's fine. they don't need a catch up. 17 i'll give the pictures when
> I get time. 18 anyone can replace the batch picture

*The reading:* **navigator A**, and it is now the only one. The reader is **not yet better** than
shipped, which keeps S3c open. The picture as a small mark beside the name is rejected and is now
the card itself and a banner on the home. Question 15 is closed: the six with no batch year get
nothing and that is fine. Question 17 is closed pending the files. Question 18: anyone in the batch.

**2026-09-07, spoken, verbatim: the Catch-up's picture.** N19 to N25 of `review-2026-09-07.md`, in
full. Do not work from the summary in `architecture.md` §1b; read his paragraphs.

*The reading:* every Catch-up carries a photograph from the day it is made, from a pool of about
twenty he will supply, replaceable by whoever may run it. It is on the list (where it IS the card)
and on the home (as an identity mark), and deliberately not in the reader. And the list stops
carrying the Round's questions.

**2026-09-08, typed, verbatim** (answering S5's owner questions 19 and 20):

> 19. good point. for people whose batches have less than ten people, let's not even show the catch
> ups things in the sidebar. it won't be reachble to them. once there's ten it appears and the catch
> up would be created for that batch.

> 20 a. make this clamp to three lines and the other one that was previous clamped to three lines,
> clamp to two lines.

*The reading:* **ten is the floor.** A batch Catch-up is created when its batch reaches ten members,
not when the group is made -- which is two of the eleven groups today, Batch of 2023 (39) and Batch
of 2024 (11) -- and the **Catch-ups item leaves the sidebar** for a member with nothing to open.
`spec.md` §3.5b carries it, with one clause marked RECOMMENDED rather than assumed: the sidebar test
is *"have you got a Catch-up"* rather than *"is your batch big"*, because his own reason is
*"it won't be reachble to them"* and a small-batch member invited to a people Catch-up **does** have
something to reach. Two live cases: Jerry has no batch year and is in two Catch-ups, and the public
demo's visitor is a member of `demo-catchup`, so a strict batch-size test would delete Catch-ups
from the demo's sidebar. Twenty of the seventy members sit under the floor today; exactly one of
them, Jerry, is kept in by that clause.

On 20, the two clamps **swap**: the pull-down list's rows get three lines (they have none today, and
a 300-character question makes a 211px row against its neighbours' 41), and the strip's docked
question comes down from three to two. Right way round, because the strip is on screen the whole
time you read and the list is a deliberate pull-down. **F41 is closed.**

**2026-09-09, spoken, verbatim** (his verdict on every proposal in [`features.md`](features.md); the
full transcript of the passage is that file's §1, and it is the source, not this excerpt):

> "the rest of the space does now move to voice. We should definitely have this. Away. You can just
> answer your question by talking and it plays back the transcript. Very good idea. Sorry, it plays
> back the audio. ... Can you do it through the browser? Can probably do it through the browser. So
> that should be fine. F2. Yes, sure. S3. I kind of don't know what you're saying. Like, what do you
> want to do with those two pictures? F4 now. Because. Yeah, just know five. Known that people
> already have questions like what is describe the cell. People can say describe this in one line or
> whatever, and we can have those questions. In the, in the library. We don't have to enforce them in
> the answers. Let them answer whatever they want. I think you can, we should have maybe like a time
> capsule mode. ... where it will release the addition only one year later. ... Maybe something in
> settings. Say make this a time capsule. And we'd probably change the library a little bit ... so
> that those questions are more relevant, maybe something's a little bit more personal ... F7. Yeah.
> We can do that. Honestly, we can start creating this by looking at the questions that people
> actually like. Yeah, answers are definitely hidden until you write your own. But if the addition is
> out, you should be able to read it whether or not you participate in. ... Heart is okay. ... But I
> think for now hearts are okay. Anonymous guys is interesting. Again, do the same thing. Pocket. ...
> if you're asking and answering anonymously how much catching up is that really. ... Just a question
> from another batch. No, I'm not going to do that."

And, on the inbox:

> "the inbox thing would require a recent [Resend] subscription. ... So we can just park it as
> something for the future."

And, asking for something this session then produced:

> "You did a question library. Yes, I need your advice on how to improve that whether I shouldn't use
> that, what type of questions to include, how to go about it without making that in library super
> long."

*The reading*, and it is beneath his words rather than mixed into them:

- **IN**: the voice answer (audio played back, transcript from the browser), the poll question, the
  longer library, **time capsule mode** (his own, and it supersedes the "this time last year" idea
  entirely), and **answers hidden until you write your own — with a published Edition open to
  everybody regardless.** That last rule lands in build phases 7 and 8 and is not a new table.
- **OUT**: the map, the guest question from another batch, and the one-line answer as an enforced
  cap. The one-line idea survives as WORDING in the library, which is his correction and a better
  answer than the proposal: *"We don't have to enforce them in the answers."*
- **PARKED**: more reactions than the heart, anonymous answers, and the emailed issue.
- **OPEN**: then-and-now. He asked *"what do you want to do with those two pictures?"* and the answer
  is now written plainly in `features.md` §1. One sentence from him settles it.
- **He also said §1 of the first draft was incomprehensible** ("Number one, I don't understand what
  you're even saying"). It opened with an array of category ids and the word migration. It is
  rewritten; the mechanism now sits in a builder's line rather than in his first paragraph.

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

### 2026-09-06 to 07, S3 second and third passes (Opus max, run by /campaign)

He rejected the first ten directions and the fan-out that produced them (F32). They were redrawn by
one hand as five, three faults in the shipped app fell out of the drawing (F29, F30, F31), and the
first ten were then restored to the room behind a divider when he asked for them back, because a
thing you cannot flick to is a thing you cannot point at.

Then he reviewed all fifteen out loud, one at a time, for about forty minutes, and rejected all
fifteen. That review is [`review-2026-09-06.md`](review-2026-09-06.md), verbatim, 51 paragraphs, and
it outranks `directions.md` everywhere the two disagree. The distillation a builder works from is
[`front-runner.md`](front-runner.md): twenty-two settled rules with his sentence beside each, and
the five design problems that no design has yet solved.

The session stopped before starting the rebuild, at his instruction, with the tree clean and the
room still working: "you are at 50% context now and you're just starting the rebuild ... I don't
think you should start working when it's half full." Nothing of the rebuild was kept; `_parts.tsx`
and the fifteen directions are as they were at commit 8e3fe59.

**Two things the next session must not repeat.** It must not fan the design out (F32). And it must
not port the year rail, the directory grid, the letters type scale or the profile layout into
Catch-ups: those were named as examples of a FEELING of rightness, not as parts to reuse (R50).

### 2026-09-07, S3c, the front runner (Fable max, no ultracode, one hand)

Read `brief.md`, `review-2026-09-06.md` and `front-runner.md` in full, then the architecture,
the recon's reader section and its ranked eleven, the design system, the shipped reader, and the
fifteen sketches, and looked at the shipped reader and the last pick on a phone before drawing.
His one line mid-session: *"what you create has to be a quantum leap and significantly better than
all of them ... don't fall into the pitfalls and repeat the mistakes the other guys made."*

**Produced.** `/lab/catchups/sketches` is now one reader in three views (Reader, live at 390;
Screens, five stills; Laptop, 1512), registered as "The strip is the navigator". The fifteen
directions are deleted (R47); `_parts.tsx` is trimmed to what the reader uses, with his sentence
beside each rule; `_navigator.tsx` holds the strip, the list with its line, and the three
navigators; `_reader.tsx` the live page and its scroll-spy; `_frames.tsx` the stills. What it
answers, problem by problem, is in `front-runner.md`, "What was built"; the bet is D51; the faults
the live drawing found are F33.

**How it was verified.** Every view captured through `screenshot-auth.mjs` and read by this
session at 390 and 1512, three rounds; the live page driven through a scroll, an open, a pick
and a re-dock by a throwaway puppeteer probe beside `_dev-login.mjs` (deleted in the same
command), on the phone and the laptop, with the strip's position, the landing offsets and the
horizontal overflow measured (0px). The song cards were checked against the network: real covers
from `i.ytimg.com` and `*.spotifycdn.com`, per F29. `npm run check` green; `npm run visual`
untouched (the lab is not in the suite).

**Not done, and why.** No home, index, composer, people or settings: this session was the reader,
which is what he rejected fifteen of. No S4 until he has held the reader. Nothing pushed.

**Next.** He opens it on his phone (the board's next row) and says which navigator, and whether
it is the one. If it is, S4 builds outward from these parts, one hand. If it is not, R46 is the
question to answer before anything else is drawn.

### 2026-09-07, S3c second and third rounds (Fable max, then Opus 5, one hand)

He reviewed the front runner twice in one day. Both reviews are in
[`review-2026-09-07.md`](review-2026-09-07.md), verbatim; both were folded in the same day.

**Round one, the long one.** Two of his notes were bugs with causes worth keeping: the navigator
drifted instead of sticking (F34, the scaling frame, now deleted) and the birds sat 4px inside
their boxes (F35, the glyph set, measured and slid flush in the reader only). The rest: replies
are the feed's row with names and animate open and closed; a docked question stops at three lines;
the laptop fills the page and its rail is serif, cinnamon and marked by colour rather than weight;
a far jump cuts instead of fast-forwarding through thirty thousand pixels. He also asked for the
feed's photographs to run edge to edge, in a commit he can revert alone: that is `295db83` and
nothing else is in it.

**Round two, the short one.** The type had been chosen by feel. The Catch-up's name was 44px,
larger than anything in the app; it is 30, which is `PageHeader`'s size on every other page. The
question headings were 30 on a laptop, the same size as the title above them; they are 24 on both
viewports, the scale's `h2`. The rail was 16 and took the eye off the page; it is 14, the scale's
`small`. And the magnification was stepped by whole rows, which he named precisely: it is now a
bell curve on the pixel distance from the pointer, so every pixel of movement moves every row a
little, which is what a dock does.

**Four commits, in order:** `3cbdbb3` the front runner, `66798ac` his first round of notes,
`295db83` the feed's edge-to-edge photographs on its own, `a000d3a` the type scale and the swell.
`npm run check` green and `npm run visual` 25/25 after each. Nothing pushed.

**Next, and this is what he asked to be told.** He opens `/lab/catchups/sketches` on his phone
(Reader, then Screens, then Laptop) and says which navigator he wants and whether it clears R46.
Whatever he says, the session after this one is **S4**, whose section above is its whole prompt.
The line to paste into a new session:

> @docs/planning/catchups-rework/handover.md
>
> You are S4. Read brief.md, review-2026-09-06.md and review-2026-09-07.md in full before you
> draw anything. Settle the architecture and draw the list and a Catch-up's home, by hand.

### 2026-09-07, S4, the shape of the whole thing (Opus 5, one hand, no fan-out)

**Read first, and in full:** `brief.md`, `review-2026-09-06.md`, `review-2026-09-07.md` (which grew
by three parts during this session), `front-runner.md`, `directions.md` Part 1. Then
[`architecture.md`](architecture.md), which is what this session produced and what supersedes that
Part 1.

**What was produced.**

1. **[`architecture.md`](architecture.md)** — the settled shape. The one idea is that a Round's
   contents, hung off a vertical measure, is ONE component drawn at two depths: the cover on a
   Catch-up's home, and the navigator inside the reader. That retires "one Round drawn ten ways on
   four surfaces" (recon §5) by making it one file. Plus: a card is a door; the six nouns and their
   one home each; the home's three parts in every state; one menu for every Catch-up verb; the way
   up out of every screen; and the intents-by-state matrix.
2. **Both surfaces, live and joined up** at `/lab/catchups/sketches`. The list, a Catch-up's home
   in all seven states, and the reader, with every move between them working: a card opens the
   reader or the home, a cover opens the reader, and the Catch-up's name in the green bar comes
   back out. It is navigable rather than a set of stills because the thing being judged is the
   relationship between the pages (N16), and a dead end in that is invisible in a picture.
3. **His two new briefs, mid-session, folded in.** Both are verbatim in `review-2026-09-07.md`.

**The two things this session changed course on, both because he said so mid-flight.**

- **The Catch-up's picture** (N19 to N25). His diagnosis, and it is better than anything that was on
  the table: Catch-ups is the only surface in the app with no imagery, which is why it reads
  "functional and corporate". Every Catch-up now carries a photograph from the day it is made.
  `architecture.md` §1b. **He owes about twenty photographs**; the room uses three from the demo
  Collection as stand-ins, and they are three green trees, which demonstrates the trap.
- **The list stopped carrying the Round's questions** (N25). It had them, in a wide row with the
  name in a margin. He called it overcrowding for something that should just be navigation, and he
  is right; the questions lost nothing, because they are still on the home and in the reader.

**Four list shapes were drawn and three thrown away**, in this order, and the reasoning is in
`_list.tsx` so nobody re-treads them: a two-column grid of unequal panels (locks into rows, 165px
hole mid-page); CSS columns of the same (balancer strands the tall one, 470px void); a wide row with
the identity in a 240px margin (no holes, but a page of text); and the one that shipped, equal
picture cards, which only became possible once the picture arrived to make every card the same
height.

**Verified by this session, not by a report.** `npm run check` green (the one protocol finding,
`sidebar.tsx:132`, is another session's commit and predates this work); `npm run visual` 25/25,
run separately. Every screen looked at at 390 and at 1512, four rounds on the list and three on the
home, with the faults fixed between them: the lab chrome eating a third of the phone screen, the
grid's hole, the state line's hanging dot, the stranded Keeper sprout, the door hanging in the
gutter, a phone title wrapping beside a 120px picture, and "Answer" landing on the fold. The spine
was walked in the browser, not asserted: list card → reader → the name in the bar → the home.

**Two things this session is least sure it got right.** First, whether the picture makes the list
"a spectacle" at his bar or merely pretty — the stand-ins are working against it and he should judge
it with the real twenty in mind. Second, the home when a Catch-up has only one Round: it is the
head, one cover and the people, and it is thin. That is honest, but thin.

**What is left on the reader**, since he asked: **N11, the title** — *"In the Loop Round 1, 15th
August. It's super basic ... I feel like we can still make it much prettier."* Every other note in
`review-2026-09-07.md` Part one is in. Beyond his notes, the reader has never been driven against
the pressure corpus (a forty-answer question, a 6,000-character answer, a twenty-four-photograph
wall), and it only ever draws a published Round.


### 2026-09-07 night, S4c, the pressure corpus (Opus 5) — and a pass he reverted

**Read what the section above asks for, in full**, then every file in
`src/app/lab/catchups/sketches/`.

**What this session was for, in his words afterwards:** *"the purpose of this session was to iron
out bugs of the previous guy and fine tune the layout ... i wanted a fresh session to fine tune."*
The paste line it was given said *"He has more tweaks. Take them"* and also named two items as
"ours, not his". He had not given the tweaks yet. **The session filled the wait with the two items
instead of stopping and asking, and that was the mistake.** A prompt with a wait-state in it is a
prompt that means wait.

**What it drew, and what he said.** It redrew the reader's title for N11 (a cinnamon rule at the
column's width, the name and the date on one baseline), took the Round NUMBER and its middle dot out
of the reader on the strength of `architecture.md` §5, dropped a question nobody answered from the
published Round, bounded the rail, clamped the rail's rows to three lines, and ran a simplify pass
over the room. His verdict: *"i don't like any of the aesthetic changes you've made they all suck.
i'm inclined to revert the entire session."* **All of it is reverted.** The drawing is byte-identical
to `d9bf261` again.

**What survived, and why each one.** Only defects with no visual footprint, and he was given the
list to check:
- the image viewer no longer server-rendered, plus the rule test that keeps it that way (F36);
- `overflow-wrap` on an answer and on a question heading (F37);
- links: only resolved ones stripped, and none re-printed above its own card (F38, F39);
- photographs keyed by position rather than by url;
- the pressure corpus's duplicate ids (F42);
- **the pressure switch itself**, `?data=pressure`, which is his own ¶51 (*"incredibly robust can be
  produced with only pressure testing"*) and is the only reason any of the above was found.

**What it found and did NOT fix**, because both fixes change what a page looks like: F40, the rail
unreachable at 100 members, and F41, one 300-character question making a 211px rail row. Both are
written up with the fix that was drawn, so the next session can show it to him rather than decide
for him.

**Two things worth carrying forward.** `npm run visual` is 25/25 green including `/catchups`, so an
older note in this file saying that route is red is stale. And the `chrome-devtools` MCP's
`take_screenshot` returns the TOP of the document after a programmatic scroll on a tall page while
`evaluate_script` correctly reports `scrollY` -- measure with the MCP, capture with a throwaway
puppeteer probe beside `scripts/qa/_dev-login.mjs`, deleted in the same command.

---

## Session log, continued

### 2026-09-07 evening, S4d, fine-tuning round one (Opus 5, one hand)

Read `brief.md`, both reviews, `architecture.md`, `front-runner.md` and every file in
`src/app/lab/catchups/sketches/` in full, walked the spine at 390 and 1512, reported, and then
worked his notes as they arrived. All of them are verbatim in
[`review-2026-09-07.md`](review-2026-09-07.md) Part six, N50 to N100.

**Four commits.** `2640adfe` the reader, `ab1a0816` the home rebuilt, `2a6f7d25` the feed's
reaction row on its own so he can revert it alone, `20f918f6` the second half of his notes.
`npm run check` green (105 tests), `npm run visual` 25/25, run separately.

**Where the session nearly went wrong, and it is worth the next one knowing.** It did the small
mechanical notes first and stopped to show him, holding back the big structural ones as
"design decisions to bring back". He was right to be furious: *"you're still using a megazoomed in
picture and like every single other thing I told you about?!?! like are you not listening AT ALL."*
The lesson is not "do more"; it is that **a note he has given IS the decision**, and holding it for
confirmation reads as ignoring it. The things genuinely his to decide are the ones he has not
spoken about at all.

**The four faults worth carrying forward** are F43 to F46: a lab switch the SERVER reads cannot be
flipped by `router.replace`; a room's own chrome overflowing is indistinguishable from the design
overflowing; a per-frame value must not be React state and must not wear a CSS transition; and
photographs have to be opened before they are used, because two of six were a duplicate and a
portrait.

### 2026-09-08, S5, the spec (Opus 5, one hand, no fan-out)

Read `brief.md` in full, `architecture.md` in full, this file's board, findings, ledger, decisions,
owner questions and answers, the two parked sections, `front-runner.md`, and both reviews at the
paragraphs `architecture.md` cites. Read the drawn room (`_list`, `_home`, `_cover`, `_shelf`,
`_rail`, `_reader`) and the shipped tree (57 files, `actions.ts` at 2,054 lines, `catchups-core.ts`
at 922). **Drew nothing**, which was the instruction.

**Re-ran the export** (`--write`): 6 Catch-ups, 7 Editions, 24 questions, 143 answers, 36
photographs, 521 hearts, 5.8 MB.

**Five things the database said that the plan did not.**

- **No Edition is in `preparing` any more.** The one that was published itself between S4 and now.
  The migration still handles the state, because the daily tick can create one at any moment before
  the build lands, and the notification is the part that is easy to miss: `notifyPublished` fires
  from the action, not from the database, so a row published by SQL sends nobody anything.
- **The publish hour has an answer already in the repo.** `vercel.json` runs the tick at 02:00 UTC,
  which is 07:30 IST, so snapping deadlines to **07:00 IST** means that morning's cron always
  publishes, within thirty minutes. That is what replaces the 24-hour `preparing` hold, and it is a
  number off the app rather than a preference.
- **Rukmini Rau carries `batchYear: 2024` and is not in the Batch of 2024 group.** The swallowed
  `joinBatchGroup` failure its own comment predicted has already happened once, so the batch phase
  ships a self-heal in the tick rather than only a backfill.
- **Which makes the hand-made "Batch of 2024" adoptable.** Snapshot 11, real group 11, ten shared;
  the one who is only in the snapshot is Rukmini, with no answers and no questions. Heal her
  membership first and the snapshot becomes a strict subset, so re-pointing `Catchup.groupId` at the
  real batch group loses nobody and hands two 2024 alumni the earlier Edition -- ¶4's *"access to
  previous issues if they join later"*, true for the first time.
- **Nine of eleven batches have four members or fewer, and six have exactly one.** A batch Catch-up
  for one person is a newsletter to yourself, with reminders. Owner question 19.

**What the spec settles beyond transcription**: comments widen the existing `Comment` table rather
than growing a twin (`CommentLike`, the soft delete, the purge rule and the 700-line reading surface
all already exist and are all already argued); link previews get a `LinkPreview` table keyed by url,
the way the Collection's `Image` table is, so nothing migrates and a missing row is not an error;
the song FIELD is deleted rather than drawn, because ¶50 asks for the opposite of a dedicated field
and F30 measured what keeping it costs. Column drops are a second file applied after the deploy,
because one database serves production and local dev.

**Three new owner questions, then two, then none.** 21 was withdrawn within the hour -- the 10%
tile tightening had already been measured and had already shipped as `2a6f7d25`. He answered 19 and
20 the same evening, and 19 came back bigger than the question: **ten** is the floor for a batch
Catch-up, and under it Catch-ups leaves the sidebar entirely. **F41 is closed with 20.** Nothing in
`spec.md` is waiting on him now; what is still his is the twenty photographs and the settings
surface.

**And a correction to this session's own arithmetic**, made before he answered: six of the eleven
batches hold exactly one person, not three, and nine hold four or fewer, not eight. More than half
being a newsletter to yourself is a different weight of question from the one first written down,
and it is very likely why the answer came back as ten rather than two.

### 2026-09-08, S7, build phase 2: the clock (Opus 5, one hand, no fan-out)

Read `spec.md` and `architecture.md` in full plus this board. Drew nothing. Ran the export first
(§3.1): 6 Catch-ups, 7 Editions, 522 hearts, 38 files, 5.8 MB. Three commits, because the three
things turned out to be genuinely independent.

**1. `preparing` deleted** (N88). Answering -> published is now ONE transition, which fixed a
thing nobody had named: the close was silent and the bell came a day later on the second
transition, so the two could come apart. They are the same write now, and a test says so.

**2. Every deadline snaps to 07:00 IST.** The hour is read off `vercel.json`, not chosen: the
tick runs at 02:00 UTC = 07:30 IST, so a 07:00 IST deadline is always swept by that morning's
cron within thirty minutes. **A test asserts that gap by parsing `vercel.json`**, so moving the
cron fails the build rather than silently making every Edition a day late.

**3. "Start the next Edition now"** (N43). `openNextEdition` is now one function shared by the
clock and the Keeper's hand, so a hand-started Edition is the same object as a scheduled one
down to the notification, and the compare-and-swap on `nextOpensAt` stops two stale tabs
minting two Editions. In the rail, cinnamon dot, confirmation — the accident rule, N30.

**Three judgment calls, so the next session does not re-litigate them.**

- **Two files on the spec's deletion list SURVIVE**, and this is a correction to §3.3 rather
  than a departure from a decision of his. `almost-ready.tsx` is the pre-migration P2021
  holding scene on **six** routes; only its second job, standing in for `preparing`, is gone.
  `not-yet-published.tsx` was NEVER the preparing screen — its own docblock said so — it covers
  draft, collecting and answering deep links, all three still reachable, and deleting it would
  dead-end every link shared while an Edition is taking questions. His words (N88) are about the
  preparing state; the file list around them was S5's enumeration, and it over-reached by two.
- **Resume does not snap.** It credits back exactly the time a freeze took, and rounding forward
  hands back time nobody was owed — which would have broken a pinned invariant ("paused with two
  days left, resumed with two days left"). §3.3 names three places that snap and resume is not
  one. The reason is in the code, where a later session would otherwise "finish" the rule.
- **The snap costs up to a day per window.** A 7-day window opened at noon rounds to ~7.5 days,
  so the reminder bucket seeds at 8 rather than 7. That is the price of the civil hour and it is
  paid in the members' favour; the alternative, rounding back, shortens a window somebody was
  promised.

**Measured, not eyeballed.** The one-way dot sits in a 16px box because a bare 6px dot in the
same `gap-2` row started its label **30px** from the card edge against the three sibling rail
cards' **40px**. "Cannot be undone." is a structural row in the confirmation rather than the
tail of a sentence (§7's rule); as one string it landed on its own line only by luck of the
measure.

**Proved by clicking it, not by asserting it.** On `[Recon] the happy path`: Edition 2 opened
`collecting` with `questionsCloseAt` at **2026-09-12 07:00 IST**, against Edition 1's inherited
**22:20**; `nextOpensAt` cleared; one notification written with the actor excluded. `npm run
check` green, `npm run visual` 25/25, no baseline moved. **That Catch-up is left with a live
Edition 2 and `nextOpensAt` null** — the restore SQL was blocked by the sandbox and is in the
close-out. It is one of the three throwaways phase 11 deletes.

**The migration is applied to both projects and is a no-op**, which is the opposite ordering
from a column drop and the file says why: the RUNNING build understands `published` perfectly,
while the NEW build has no `preparing` branch at all — `STATUS_ORDER.indexOf` would return -1
and read as "advance this Edition to draft". A row left in `preparing` when this deploys is the
one way phase 2 can break something. Counted first: 0 preparing on production (2 collecting, 5
published) and no Editions at all on the demo.

**`publishAt` the COLUMN is not dropped.** This commit only stops Prisma naming it, which is
what makes the drop safe. It and `@@index([status, publishAt])` go in phase 11.

### 2026-09-08, S6, build phase 1: Round becomes Edition (Opus 5, one hand, no fan-out)

Read `spec.md` and `architecture.md` in full, plus this file's board and the S6+ section. Drew
nothing and re-derived nothing: `npm run visual` is 25/25 with **no baseline moved**, which is
the whole proof that phase 1 was a rename.

**Ran the export first** (`--write`, §3.1): 6 Catch-ups, 7 Editions, 24 questions, 143 answers,
36 photographs, 522 hearts, 5.8 MB. One heart more than S5 counted.

**What moved.** `/catchups/round/[editionId]` -> `/catchups/edition/[editionId]`;
`src/components/catchups/round/` -> `edition/`; `catchups-round-view.ts` ->
`catchups-edition-view.ts`; `RoundEntry`, `RoundMasthead`, `RoundTocRail`/`Chips`,
`RoundFooterTease`, `FreshRoundItem`, `PublishedRoundView`, `loadPublishedRoundView`,
`openNextRoundIfDue`, `reviveDormantRound`, `ExportedRound`, `ROUND_STATUS`, `roundNumber`,
`roundViews`, and in the lab `SketchRound`, `ShelfRound`, `RoundState`, `roundVerbs`,
`RoundMeta`, `EarlierRounds`, `loadSketchRound`, `loadPressureRound`. The lab room draws at 200
on all three of `?w=phone|laptop`, `?data=pressure`, with zero "Round" in the HTML.

**`roundLabel()` deleted, and its five call sites are the only copy phase 1 chose.** Every one
lost a number, per N92. The table is in `docs/history/progress-2026-09.md`. **One decision the
other way, put to him and CONFIRMED the same day**: the ADMIN room still prints `Edition 3`, in
three places, because there the number is the row's actual key
(`@@unique([catchupId, number])`), an unpublished Edition has no date, and §7's copy rule is
about what members read. His answer, 2026-09-08: *"admin room can keep printing number."* All
three sites now carry a comment saying so, and `spec.md` §7 states the exception, because the
failure mode is a later phase tidily "finishing" the rename.

**The migration is written and NOT applied.** `2026-09-08-round-becomes-edition.sql` rewrites
`Notification.link` (61 production rows) and `ContentView.kind` (17), both idempotent, both
counted read-only. Applying it before this commit deploys would point 61 live bell links at a
route the running build has not got -- a 404 for seventy members. That is §3's own ordering rule
for a column drop, applied to a stored VALUE for the same reason: one database behind
production and local dev. It runs against both projects the moment Vercel finishes. The demo's
counts are 0 and 0. The redirect is what makes waiting free: the old route is a permanent 308,
verified.

**Two failure modes a big mechanical rename has, for whoever runs the next one.**

- **"round" is not always the noun.** `"How often a Round comes round"` -> `"comes edition"`;
  `daysLeftUntil: rounds up` -> `editions up`; `round trip` -> `edition trip`, three files; and
  the guide's opening line told every member a Catch-up *"comes edition on a schedule."* Four
  of those were live copy, and no gate would ever have caught one of them.
- **His quoted words are everywhere in this codebase, and a sed does not know they are his.**
  Nine verbatim sentences were rewritten -- *"let's ditch the round 1"* became *"the edition
  1"*, *"once the question round has started"* became *"question edition"*, *"be round 15"*
  became *"be edition 15"*. Every one restored by diffing each file against HEAD and reading
  the quoted lines. A quoted paragraph is evidence; editing it destroys the record of what he
  said, which is the one thing this campaign has been most careful about.

**Working in a shared tree.** A peer session held the `page.tsx` -> `page.lab.tsx` rename
staged for the whole of this pass, including
`src/app/lab/catchups/sketches/page.lab.tsx`, which phase 1 had to edit. Committing that path
by pathspec would have swept their rename in without their `next.config.ts`, breaking the lab.
Messaged them, worked around it, did the lab last; they landed `ed51b119` before this commit.

Gate 107/107, seven green.

### 2026-09-08, S8, build phase 3: the picture (Opus 5, one hand, no fan-out)

`spec.md` §3.4 and §10.2. Data and control only; nothing draws it, which is why `npm run visual`
came back 25/25 with no baseline moved. That is the phase passing, not the phase missing.

**Two columns, and the DEFAULT is the part worth reading.** `pictureSrc` NOT NULL with a
deterministic `hashtext` backfill in the same file, `pictureFocus` defaulting to `center 85%`. The
column also carries a server-side DEFAULT, and that is not laziness: one database serves
production and local dev, so a NOT NULL column with no default breaks the RUNNING build's
`catchup.create` the moment it is added, and adding it after the deploy breaks the NEW build
instead. With a default, either ordering is safe and the file went in before the push like every
other additive change. Applied to both projects the same hour: 6 rows on production, 0 on the
demo. The backfill carries the FOCUS through with the pick rather than leaving it on the default,
because three of the six stand-ins are aimed at 88, 90 and 92 per cent and a picture taken without
its aim comes back as green canopy.

**The pool is `src/lib/catchup-pictures.ts` now.** It had to leave the room: the creation path,
the settings control and the demo seed all read it, and none of them can import a lab file,
because the demo's build leaves the whole tree out. `_shelf.ts` re-exports it, so there is exactly
one pool and the room reads the same as it did. **His twenty are one edit to that array**, and
`catchup-pictures.test.mjs` is what says whether the edit was complete: every file on disk, no
duplicates, every focus valid, and the migration's own retyped VALUES list still in step.

**The aiming frame is the TIGHTEST band, and that is the thing that had fooled two sessions.**
1520x240, 6.33:1 — the home's head at 1080p and wider. Not the roomiest. What you place inside it
survives every other frame; aim in the roomy one and a phone-shaped choice quietly falls out of
the banner a laptop draws, which nobody would ever see happen. Measured in the dialog: 478x75 on a
laptop, 324x51 on a phone. An arrow key moves the aim two points, a 30px drag moved it seven.

**Driven end to end in a real browser rather than assumed**, both halves: a pool pick plus an aim
wrote `center 81%` to the column, and an upload came back as a real `images.rishivalley.space`
url and saved. The upload goes through a new `uploadOneImage` in `upload-client.ts` (presign →
finalize, downscaled proxied fallback). The composer keeps its own copy on purpose — it uploads a
batch, keeps the facts its crop handle opens on, and reports "3 of 5" — and collapsing that into a
helper would make the helper worse for the caller that wants one line.

**Three things nobody asked for and all three are consequences of the column, not scope.** The
purge now collects an uploaded picture's url and puts the row back on its pool pick, because
`pictureSrc` cannot take the null that `User.coverPhoto` does. `setCatchupPicture` accepts exactly
a pool path or an image minted under the caller's OWN `uploads/<id>/` prefix, through the same
`ownedUploadUrls` rule a post's images use — an arbitrary url in that column is somebody else's
server learning who read what, from a settings row. And `pictureFocus` is matched against a
pattern rather than trusted, because it is interpolated into a style attribute.

**The guard is written for phase 4 already.** `mayChangeCatchupPicture` is pure and tested: the
Keeper, or ANYONE in a batch (owner question 18). It is the one place this feature leaves the
accident rule, and it has to — nobody keeps a batch Catch-up, so Keeper-only would mean nobody at
all on the Catch-ups most members end up in. The home passes `canChangePicture` beside `isKeeper`
and the settings dialog splits on them, so phase 4 flips one boolean rather than unpicking a
component.

**What is NOT done, deliberately.** Nothing renders the picture: the list is phase 6, the home is
phase 7. The settings row it lives in is the shipped "very bare bones" dialog, because that
surface is HIS (N100) and is scheduled before phase 7; the row is a labelled thumbnail in that
dialog's existing grammar rather than a new one invented beside it.

**One thing left behind on purpose.** `[Recon] the happy path` is carrying the uploaded photograph
from the end-to-end test instead of its backfilled pool pick. Deleting the R2 object was refused by
the sandbox, and a row pointing at an object is better than an orphan nothing can enumerate. It is
a throwaway that phase 11 removes; it should take the object with it.

Gate 108/108, seven green. `npm run visual` 25/25.

---

### 2026-09-08, S9, build phase 4: the batch Catch-up (Opus 5, one hand, no fan-out)

`spec.md` §3.5 and §3.5b, `architecture.md` §6. His, brief 4 and 51: *"anyone in that batch is
automatically added to that catch-up ... This batch catch-up should exist by default"*, and *"the
batch catch up can't edit people in and out."*

**Nothing was modelled.** A batch was already a Group with `batchYear` set and a Catch-up was
already one row per Group (F6), so the whole phase is rows, guards and one predicate. No schema
change, no Prisma edit, no `prisma generate`.

**Two Catch-ups now exist that never did**, not eleven: Batch of 2023 (39 members) and Batch of
2024 (11, 12 after the heal). Nine of the eleven batch groups hold four members or fewer and six
hold exactly one, so under any smaller floor most batch Catch-ups would be a newsletter to
yourself, with reminders. Ten is his number.

**The 2024 one was adopted, not duplicated, and the assertion is the point.** F17's snapshot group
(a 2024 alumnus made it through `/catchups/new`, which always mints a new group) is now the thing
the Catch-up used to sit on, and the Catch-up sits on the real batch group. One migration, in
order: heal the memberships, ASSERT that every snapshot member is in the real group, then
re-point. Re-pointing changes who can read a thing, so the file aborts rather than quietly taking
somebody's access away. Rehearsed on both projects inside a transaction that rolled back before
it was applied for real: 1 membership healed, 1 re-point, 1 Catch-up, 1 Edition on production;
four zeroes on the demo. Its published Edition, 8 answers and 8 questions did not move, and two
2024 alumni were handed an Edition they were never in, which is ¶4's *"access to previous issues
if they join later"* arriving for the first people it was ever true of.

**A batch Catch-up carries two NULLs on purpose.** `createdById`, because nobody keeps one, and
`inviteToken`, because there is nobody to invite: the membership IS the batch. The second is what
closes `joinCatchupByToken` on it and why the roster shows no invite link.

**The refusals are rules, not accidents.** Nobody could have passed the Keeper check on a batch
group anyway -- `createdById` is null and every role in one is `"member"` -- but that is a property
of today's data, and one `setCatchupKeeper` against the wrong group would end it. So both Keeper
preambles refuse a batch BEFORE they ask who the Keeper is, which covers all thirteen controls
that come through them in one place, and `leaveCatchup` and `setCatchupDeleted` refuse it by name.
Leaving would have been undone by the nightly heal putting them straight back, so refusing is the
honest answer rather than the strict one. Neither screen offers what the server refuses: no Leave
row in the roster, no Delete in the card menu. **The settings dialog was not touched** and on a
batch it comes out as the Picture row alone, which is phase 3's `canChangePicture`/`isKeeper`
split working exactly as it was built to.

**Three creation paths, plus the backfill, and only one of them is the primary one today.**
`joinBatchGroup` moved out of `src/components/auth/actions.ts` into `src/lib/batch-catchups.ts`
(a `"use server"` file may export nothing but server actions, and the tick needs it too) and now
ensures the Catch-up, so **the tenth person of a batch signing up is the moment one appears**.
The tick's two passes are the belt: every alumnus with a batch year is in their batch group, then
every batch group at or over the floor has a Catch-up, in that order because healing a membership
can be what carries a batch over. They run on the UNSCOPED cron sweep only -- both scan a whole
table, and `advanceDueCatchups` fires on essentially every authenticated page view. **Both paths
are live, and this was checked rather than assumed** -- a session note claiming `CRON_SECRET` was
still owed was three weeks stale; it is set in `.env`, on Vercel and in GitHub, and
`/api/catchups/tick` answered 200 to a correctly signed request with both passes coming back a
clean no-op.

**The backfill does not notify anybody, and that is a decision.** `ensureBatchCatchup` does, because
a batch reaching ten is a real event at a real moment. The migration is not that: it is two batches
that crossed the floor months ago, at whatever hour he happens to apply it, and 51 bells is not the
place to say "a thing that should always have existed now does". They find it on their list.

**The sidebar's test is "have you got a Catch-up", not "is your batch big"** (spec 3.5b
RECOMMENDED). His reason for hiding it is *"it won't be reachble to them"* -- hide the door when
there is nothing behind it -- and a strict batch-size test would have deleted Catch-ups from the
sidebar of two live accounts that can open one: Jerry, who has no batch year at all and is in two,
and the demo's visitor. One `findFirst` in the layout, inside the Promise.all that was already
waiting, measured at 0.117ms execution and 2.1ms planning on the semi-join; skipped entirely for
teachers, who were already out. `hasCatchup` defaults to TRUE so a caller that forgets it shows the
row rather than hiding a feature. Measured on the live database: **51 of 70 members now see
Catch-ups, 15 lose the row, 4 teachers were already hidden.** Before this, only people-Catch-up
members had anything there.

**Verified in a real browser at both viewports**, signed in as the owner's own account, which is
batch 2023 and therefore a member of the new Catch-up. The batch card's overflow menu offers
Archive and nothing else; the home offers the composer, the roster, reminders and Settings and not
one Keeper control; the roster dialog has no Leave and no invite link; the settings dialog is the
Picture row alone. One transient `Query read timeout` appeared on `/catchups` in 1 of 3 mobile
runs and did not reproduce in four further runs across three routes -- the list's own member
fan-out measures 0.4ms on the database, so it is a cold pool reaching Mumbai from a dev server, not
this change.

`npm run check` 109/109, seven green. `npm run visual` 25/25, no baseline moved -- correct, because
nothing about the list or the home was redrawn.

**One thing found and fixed on the way, in its own commit**: phase 3's picture picker shipped a
`sr-only` file input, which the focus-edge gate walks for, so `npm run check` was already red at
HEAD. It joined the borderless allowlist beside the two other hidden file inputs.

**The write-path review found two things and both were true, and both were comments overclaiming
rather than code being wrong.** It said the self-heal runs on `/admin/catchups` too, not only on
the cron -- checked, and it does: that page calls `advanceDueCatchups()` unscoped on purpose,
because its job is to show every Catch-up's true state. Harmless (one person, both passes normally
zero rows) but not what the comment said. So the comment is accurate now, and the test that
claimed to pin it now actually does: it greps for every UNSCOPED caller and fails on a third one,
which is the failure that would matter -- two table scans quietly added to a member-facing page.
It also said `healBatchGroupMemberships` is not the "indexed read" its docstring claimed: checked,
and `User.batchYear` and `User.accountType` carry no index, so the plan is a seq scan of `User`
feeding a hash anti-join against memberships that ARE indexed. Measured: 0.35ms over 64 alumni.
That is the right trade -- an index to serve one nightly pass would cost every signup a write --
but the docstring says what actually happens now.

**S10, build phase 5 -- leaving, and the read mark (2026-09-08).** One commit, because one
migration file does both halves and reverting either without the other would leave the schema and
the code disagreeing. The verb changed and a table appeared; nothing was redrawn.

**The bin was leaving with a fuse on it, and that is the argument for deleting rather than
renaming it.** `setCatchupDeleted` stamped `CatchupPref.deletedAt`, which stopped every broadcast
reaching you at once and armed a nightly sweep to take your `GroupMember` row on the thirtieth
night. In between you were still in the group, out of every notification, with a countdown on a
row you had to go looking for. His word settles it (N18): *"defaults, except deleting becomes
leaving."*

**Counted first on both projects: 16 preference rows on production, 0 on the demo, of which zero
archived and zero binned.** The `UPDATE ... SET archivedAt = COALESCE(archivedAt, deletedAt)` moved
nothing, and exists so it cannot become a no-op later. The INDEX went tonight -- an index drop has
no ordering, and the sweep that was its only reader is deleted in the same commit -- and the COLUMN
waits for phase 11.

**Four things went with the bin**, and each was load-bearing for it alone: the `catchupCopies` step
in `retention.ts` (Serializable, 200 a night, with a Keeper succession hand-off before every
removal), the subtraction in `groupMemberIds` that kept the audience and the membership honest
across those thirty days, the "Recently deleted" shelf and its countdown in `filed-away.tsx`, and
`restoreOwnCatchupCopy`.

**Two audit findings close by deletion, and both are pinned as absences.** C-020 was the rejoin
hole -- following your own invite link redirected an existing member past the join action, so the
bin stayed armed. C-023's third path was the sweep that removed a membership and therefore had to
promote a successor first. A test that reads nothing is worse than no test, so each now asserts the
thing is gone and fails if it returns.

**The refusal survived the action that shared it**, which was this phase's one real hazard: phase 4
put `BATCH_LEAVE_REFUSAL` on both exits, and deleting one of them is exactly how a guard quietly
goes missing. `leaveCatchup` is the only exit now and holds it. `batch-catchups.test.mjs` was
turned around to say both halves: it fails if `setCatchupDeleted` comes back without a refusal, and
it fails if `setCatchupArchived` ever starts refusing a batch -- because on a batch Catch-up
archiving is the only way out there is.

**On the list, Delete became Leave**, with the confirmation rewritten to say what happens: you come
out now, your published answers stay, nobody else's list changes, coming back needs a fresh
invitation. Driven in a real browser at 1440 and 390 -- the menu reads Archive then Leave, the
dialog carries that copy, zero console errors -- and the batch card offers Archive alone.

**The read mark is a table of its own, and the reasoning belongs to whoever draws it.**
`ContentView` already writes a `(viewerId, "edition", targetId)` row from the same page, so reading
it back was the obvious move. Three things stopped it: it is the admin analytics counter and is
under standing pressure to stay bounded (its own comments record an index dropped and its columns
argued over), its `targetId` is deliberately not a foreign key, and it is written BEFORE the reader
knows the Edition's status -- so a deep link followed while an Edition was collecting would have
made it look read on the day it came out. `CatchupEditionRead` is one row per person per Edition,
both sides Cascade, `update: {}` so a re-read keeps the first time you saw it, written from
`after()` past the published gate.

**Proved live rather than asserted**: opening a published Edition as Jerry wrote exactly one row,
opening it again left `readAt` at 05:29:42.228, and opening a collecting Edition wrote nothing.
Nothing draws it yet, which is the point of writing it now -- the marks accumulate from tonight, so
the list phase 6 builds has something to draw.

**One tooling note, because it cost a restore.** `npx prisma format` re-aligned all 501 lines of
`schema.prisma` and moved several comment blocks away from the attributes they explain. The edits
went back in by hand. Do not run it on this schema.

`npm run check` 110/110. `npm run visual` 25/25, no baseline moved -- correct, since the only
visible change lives inside a dropdown and the shelf that went was empty for every member.

---

### 2026-09-08 to 09, S12, track X: the fast fixes (Opus 5, one hand, no fan-out)

Four commits, one per fault, each with its test and its log lines inside it. `npm run check` green
before every one; `npm run visual` 25/25 after each that touched a pixel, no baseline moved.

**Two of the four were measured before and after, because that is what they are.** The phone
overflow: 414px of document in a 390px window becomes 390 against 390. The heart: 223 KB and
1.7s a tap becomes 1 KB and 0.6s. Both numbers are in their commits.

**A correction to the recon, and it is a method note.** `recon.md` says the green bar cut-off "does
not reproduce on this machine, which is the finding, not a gap". It reproduces immediately with
`isMobile: true` in the viewport. Without that flag Chrome does not shrink the layout viewport to
the overflowing content, which is the very thing iOS Safari does; with it, the document measures
414 against 390 on the first try. The recon's REASONING was right (a browser difference, not a
width) and only its conclusion about this machine was wrong.

**The scope widened once, deliberately.** `break-words` went on the feed's post body and a letter's
body as well as the three Catch-ups sites. Both have the identical omission and a wider column, so
they need a longer link to show it; he has never reported them and would have eventually. The rule
is written as a test rather than as "add break-words everywhere": the handful of elements that
render `renderRichText` output each carry a break rule, because that is the only text on any page
whose width nobody chose.

**V2 and V3 were NOT fixed, and that is the finding.** Six attempts could not reproduce either: a
real touch swipe at 390, the arrow keys, a trackpad-style wheel fling at 1440, and two swipes 150ms
apart. `step` clamps at both ends. One gesture calls it exactly once -- `onPointerUp` is the only
caller and `onPointerCancel` does not step. The carousel's computed snap properties are all correct
(`x mandatory`, `scroll-snap-stop: always` on all three slides). **He confirmed on 2026-09-09 that
it happens on the phone AND the laptop**, so the earlier "needs a real iPhone" is withdrawn: the
difference is not the device, it is that a headless browser has no inertia phase and a finger does.

Guessing a fix for code that measures correct is how correct code gets broken, so instead
**`/lab/catchups/swipe`** puts the instrument on his device: the real photographs from the answer he
was looking at, the real shared viewer imported exactly as the app imports it, and two passive
recorders -- a capture-phase pointer listener and a rAF loop reading which photograph is on the
glass. One swipe should write one `up` line and one `became` line. Two `became` lines from one `up`
is the bug, caught, with the gap between them as the fix's threshold. Verified working on a machine
where the fault does NOT occur: one swipe, one change.

**V1's fix changes a shared component's motion**, so it is its own revertable commit. The dissolve
itself is untouched -- he settled that in August -- and the only thing that moves now is the shape.

### 2026-09-09, S12 close, his verdict on every feature (Opus 5)

He went through `features.md` out loud and ruled on all eleven items plus four written up as not
proposed. Every word is in that file's §1 and under "Owner answers"; the board carries the result.

**He invented one and it is the best thing on the page.** Time capsule mode: an Edition sealed when
it is written and released a year later, a switch in settings, with the library tweaked so the
questions are worth opening. It replaces "this time last year" entirely, and it is better for a
reason worth writing down: the old idea surfaced an old answer beside a new one, while this one
changes what people write in the first place, because they are writing to themselves in a year.

**A build warning fell out of it that is free today and expensive in November.** Phase 11 is
scheduled to drop `CatchupEdition.publishAt`, because the `preparing` hold it served went in phase
2. A time capsule is exactly a scheduled publish date and it is the same column. Phase 11 keeps it.

**He corrected one proposal into something better.** The one-line answer was proposed as a cap the
app enforces; he said the constraint belongs in the WORDING: *"People can say describe this in one
line or whatever, and we can have those questions in the library. We don't have to enforce them in
the answers. Let them answer whatever they want."* His own live data agrees — "Describe your month
in 3 words" already pulled 33-character answers with nobody enforcing anything.

**And he reversed a "considered and not proposed".** Answers are hidden until you write your own —
but a PUBLISHED Edition is open to everybody whether they wrote or not. That is sharper than either
half: while an Edition is being written, reading is earned; once it is out, it is a record, and a
record is not a reward. It lands inside build phases 7 and 8 and needs no new table.

**He asked for advice this session then produced**, on the question library: whether to use one,
what to put in it, and how to keep it from becoming six hundred long. The answer is `features.md`
§2 and it is argued from HIS OWN DATA, which was his suggestion — *"we can start creating this by
looking at the questions that people actually like."* Ranked by hearts per answer across the live
Edition: the nosiest question won at 6.0 on 112-character answers, the most thoughtful one came
last but one on 618-character answers from the fewest people, and **the songs question came last**,
which is worth knowing since the previews are a whole build phase. The recommendation is sixty to
eighty questions rather than six hundred, six shown at a time, never a library anyone meets the
length of, and three rules that keep it short — write for this school, never repeat a question a
Catch-up has asked, and let the ones people answered surface first.

**A note on how this file is written, from him.** The first draft of `features.md` opened with the
mechanism — an array of category ids and the word migration — and his first sentence back was *"I
don't understand what you're even saying."* He is not a programmer and the first thing he reads
must not be for a builder. It is rewritten; the mechanism now sits in a builder's line further
down.

---

### 2026-09-09, S12 continued, S-features: the second brainstorm (Opus 5, one hand, no fan-out)

[`features.md`](features.md). No fan-out, per the allocation: ultracode is S3, S3b and M1 and this
is not one of them.

**The finding that makes the rest of it cheap.** A question's kind is DERIVED from its category,
and the categories are an array in `catchups-types.ts`. So a new kind of thing an Edition can hold
is one id, one branch in `promptKind`, one answering control and one reading surface. No column and
no migration. That is why the shortlist is seven items rather than two.

**The photo wall's data is done and its reading is not.** `photo-wall` has been a category since
the feature was built and has never been drawn. Three shapes are written up — a run, a drift, a
stack — with the argument that a grid is a contact sheet and a contact sheet is what a magazine
designer would never print. Only the stack survives two hundred photographs, which the pressure
corpus already carries. **This is the one item here that is not optional**: it is LOCKED (D10) and
it comes before build phase 8 because it can change a page already drawn.

**The Letterloop parity list, read against the live product.** Eleven rows, and exactly one real
gap: **the issue arrives in your inbox and ours does not.** Letterloop is an email newsletter with
a website; we are a website with no email. That is ¶21 and he gated it himself on the magazine
being good, so it stays gated — it is named so the list is honest rather than flattering. The cheap
gap is the question LIBRARY: 600+ against our eight categories, and closing it is no code at all,
just somebody writing questions, and it should be him because they are the voice of the thing.

**The one signal in the rest of the space.** StoryWorth, Remento, Storii, Tell Mel, Heritage
Whisper and Memorygram have all moved to VOICE — recorded, telephoned, transcribed — on a shared
diagnosis that typing is the barrier rather than willingness. For a member of 1978 that is the
difference between answering and not. The second signal is that their product is the printed
keepsake, which is a straight confirmation of track M.

**Seven proposals, each with a default of "not unless you say so"**, plus four written up as
considered and not proposed (answers hidden until you write; more reactions than the heart;
anonymous answers; a guest question from another batch). The session's lean is F5 then F2 then F1:
one-line answers are nearly free and eight of ten designers invented the shape unasked (F24); a
poll reuses the feed's own machinery; the voice answer has the real upside and the real unknowns
and wants a session.

**What is NOT measured**, and it is said in the file: nobody opened Letterloop's own published
issue or its composer. The parity table is read off marketing pages and a store listing, which is
the same limit `prior-art.md` §1 has and F15 warns about.

---

### 2026-09-08, S11, build phase 6: the list (Opus 5, one hand, no fan-out)

`/catchups` is `_list.tsx` transplanted rather than re-derived, and diffed against the room
before it was called done. At 1440 the shelf is 1096 wide starting at x 288, a card is 538 by 216
against the room's 536 by 214 (the two pixels are the card's own border), and the "Start a
Catch-up" pill right-aligns with the cards instead of with a rail column that no longer exists.
At 390 a card is 350 by 198 against 348 by 196. Five files deleted rather than restyled, and
pinned as absences in `batch-catchups.test.mjs` so a three-dot menu coming back fails the build.

**The spare slots (spec 5) are drawn for the first time.** `editionSlots()` lives in
`catchup-shelf.ts` beside `catchupShelf` with a table test.

**The Edition cover was drawn twice, and the first one failed his own test for it.** Version one
wrote the date onto the photograph exactly the way a Catch-up card writes its name. Three of the
five published Editions on this database carry no photograph at all, so the cover fell back to its
Catch-up's own picture and came out as a paler copy of the card two inches to its left: same
picture, same words in the same corner, with a 2px mark carrying the whole distinction and
invisible at 1440. *"Just so it's obvious that they're different types of elements"* was not met.
The second has a FOOT -- the picture stops short and the date is set on the card's own paper under
it, with the Catch-up's name beside it when the member has more than one. That is one glance
rather than a detail, whatever the picture turns out to be, and it is the shape the home's Earlier
Editions covers already have, so it is not a second way of drawing an Edition. It keeps the
Catch-up card's OUTLINE exactly (the picture takes whatever the foot leaves), so the shelf has no
ragged row in it: a different object, not a different size.

**The read mark is drawn.** `readEditionIds()` is one query for the page and returns a set, never
a count. It shows as the 2px measure beside a cover's date: cinnamon unread, the page's own
hairline read. Cinnamon because that is what the bell wears for an unread notification. Both
states were driven live.

**Where archiving went when the card menu died, and it is the one thing here not in the drawing.**
Architecture 4 replaces the menu with the phone's swipe-left (his WhatsApp gesture, brief 5). That
is built, with the undo toast, and it was driven with a real touch sequence: a left swipe
archives, a vertical swipe scrolls the page and archives nothing, because `dragDirectionLock` sets
`touch-action: pan-y` itself. But a swipe leaves a mouse and a keyboard with nothing, and on a
batch Catch-up archiving is the ONLY exit there is. So the same action has a second door on a fine
pointer: a control in the card's top right -- where he said dots belong *"if at all"* (brief 24)
-- invisible until the card is pointed at or reached with Tab. Verified: focus lands on it,
`:focus-visible` matches, opacity 1. `useCoarsePointer()` picks between them and asks about the
POINTER rather than the viewport, because a 1,024px tablet is a finger and a 1,024px window is
not. **If he would rather the pointer had nothing and waited for phase 7's Settings, that is one
`{!coarse && ...}` block to delete.**

Leaving was CHECKED rather than assumed: `home/people-panel.tsx` still offers it to a non-creator
on a people Catch-up, so nobody is left with no way out between phases 6 and 7.

**Two numbers came from the app rather than from taste.** The card's ratio switches at 500px, not
at the app's `sm`: at 639 the shelf is one column so a card is 599 by 338, and at 640 it is 584 by
235, a 103px jump on one pixel of viewport. 500 is where a card stops being phone-shaped (below it
a card is at most 460 wide and the widest phone in portrait is 430) and the jump there is 74px.
And the name clamps to two lines, which is a pressure finding rather than a preference: at the
80-character cap `actions.ts` allows, drawn at 390, the name took four lines, covered the
photograph from 18px below the card's top to its foot, and put its first line above where the
scrim has any ink in it at all.

**Three traps worth keeping.** `line-clamp-2` IS a display utility, and Tailwind emits
`display: block` after it, so the two together silently cancel the clamp -- the first attempt
still drew four lines and read as a clamp that had not been applied. Framer's `dragTransition`
takes inertia options, not a spring, so `SPRINGS.firm` cannot be spread in; its two numbers are
read off it rather than copied. And the room's `shortDate`/`dayAndDate` read the SERVER's clock,
which is UTC on Vercel -- anything published between 00:00 and 05:30 IST would have printed the
wrong day, so they were replaced by `formatDisplayDateLong` and a new `formatDayAndDate`, both
pinned to the valley's own day.

**What moved out of the lab, for the reason the pool did in phase 3.** `PICTURE_SCRIM`,
`COVER_SHOTS` and the cover's tiling now live in `src/lib/catchup-pictures.ts` and the room
re-exports or imports them: the shipped list draws the same things, and a lab room is not
importable from `(main)` because the public demo's build does not compile one. `COVER_SHOTS` had
been declared three times by the end of the first pass -- the room, the query that fetches the
urls, the card that draws them -- so raising it to four would have quietly capped at three in
whichever was forgotten. The shelf's own grid is `LIST_GRID` in `picture-door.tsx`, imported by
the page AND its loading skeleton, which is the lesson `rail-grid.ts` already carries in its own
docblock and which the new list had quietly reopened under a different number.

The old query that read EVERY member of every group, with no `take`, to draw a five-avatar cluster
-- flagged in phase 4 because a batch group is everyone from a year and grows on its own -- is
deleted rather than bounded. The drawn card has no birds on it, so 39 rows and 0.4ms became 0.

**Cards appear and disappear, and the shelf owns that** -- his, once it was on screen: *"can you
have a pretty and thoughtful animation for the archiving of ccatchups basically the appearing and
disappearing of any of those cards on that screen. we need that level of attention to detail
throughout."* Archiving moved off the card onto the shelf, which is where membership belongs: a
card that removes itself cannot animate its own exit, and the Undo in its toast outlives it. A
card leaves DOWNWARD, because down is where an archived Catch-up goes; the survivors slide up
while it is still fading. Two numbers came from watching it -- the exit needed its own curve (on
the default ease-out it was 21% opaque by 100ms, gone before it had moved, against a 400ms slide),
and every entrance holds its fade 140ms because archiving frees a slot, so one cover leaves a cell
as another arrives.

**A bug he found in it, and it was mine.** *"there was one edition showing and when put back an
archived one the edition disappeared the the catch up didn't appear. it just disappeared from the
archived list."* The optimistic hide was never reconciled: **Put back** happens in a different
component at the foot of the page, the server correctly handed the card back, and the shelf went
on hiding it -- so the Edition cover filling its slot correctly left and nothing replaced it. The
hide now lasts exactly as long as the server takes to disagree with it, adjusted during render
rather than in an effect (an effect paints the wrong frame first, and that frame is the bug).
Driven through his sequence and four neighbours: archive / expire / put back, archive two and put
them back singly, archive everything, reload. A reload agrees with the screen in every one.

**A real hole in the visual mask**, found chasing a diff and worth knowing about: the grid and the
Archived row were two siblings, so `markLiveBand` marked two boxes and the 8px between them
compared live page background every run. One wrapper, one box.

`npm run check` 110/110. `npm run visual` 25/25 with ONE baseline moved, read before it was
updated: the desktop `/catchups` header, where the CTA travels 332px right to sit flush with the
shelf. No migration.

**Two side commits, his, made while he was watching.** `PICTURE_SCRIM` is a tenth darker on all
three stops (*"increase the bottom image darkening on both the card and header by 10%"*), which is
one edit because it is one constant. And the toast's action button is the word in Canopy rather
than Sonner's inverted black pill (*"sometimes they come with this black thing which is
jarring"*) -- app-wide, and it needed a fourth selector to beat a stylesheet the library injects
at runtime.

---

## What to paste next

**Track X is done bar one fault, and S-features is done and ruled on.** 2026-09-08/09, six commits.
The phone overflow, the heart, the caption clamp and the viewer's size snap are fixed and measured.
**V2 and V3 — the swipe back that lands on the first photograph, and its overshoot — are NOT fixed
and are not guessed at**: six attempts could not reproduce them, and `/lab/catchups/swipe` is the
instrument waiting on his own device. He confirmed 2026-09-09 that it happens on phone AND laptop,
which withdraws the old "needs a real iPhone" note.

**He has now approved five new features and killed three** ([`features.md`](features.md) §1, his
words). Nothing in `spec.md` knows about any of it yet, and that is the first job below.

**Phase 7 is still GATED on the settings session, which is his** (N100, spec 10.3). **The photo
wall's reading surface must land before phase 8**, because it can change a page already drawn, and
it is the only item on that page that was never optional.

**Two things are still his**: the twenty photographs (`src/lib/catchup-pictures.ts`, one edit, 2:1
at 2,400px, details rather than valley views) and the settings surface. And one sentence: whether
then-and-now is worth building at all.

**Nothing is owed to the database**, and there are **14 unpushed commits**. A push is his.

### Paste this into a fresh Opus max session

```
@docs/planning/catchups-rework/handover.md

You are S13. Two jobs, in this order.

JOB 1, and it is an hour: fold his 2026-09-09 decisions into spec.md.
Read features.md section 1 first -- it is his verdict on every proposal, in his
own words, and it outranks anything older. Then add to spec.md section 9:

  - a phase for A QUESTION YOU ANSWER OUT LOUD. It plays back the AUDIO. The
    transcript comes from the browser's own speech recognition while the person
    is talking, so nothing is sent anywhere and there is no API key -- he raised
    this himself and he is right. Audio with no transcript has to work on its
    own, because Firefox has no such API.
  - a phase for A QUESTION THE GROUP VOTES ON. The feed already has
    PollOption/PollVote bound to postId; widen it the same way section 9 already
    widens Comment.
  - a phase for TIME CAPSULE MODE. His own idea: a switch in a Catch-up's
    settings, and the Edition is sealed and released a year later. features.md
    section 3 has what a member sees.
  - THE RULE THAT TOUCHES PAGES ALREADY DRAWN, and it belongs inside phases 7
    and 8 rather than in a phase of its own: you cannot read the answers until
    you have written your own, BUT a published Edition is open to everybody
    whether they wrote or not. It is not a new table.
  - A CORRECTION TO PHASE 11: it must NOT drop CatchupEdition.publishAt. A time
    capsule is a scheduled publish date and that is the same column. Say so in
    the phase, with the reason.

Do NOT schedule then-and-now: he did not follow it and it is one sentence from
him. Do NOT schedule the map, a guest question from another batch, or a one-line
answer cap -- all three are out. More reactions, anonymous answers and the
emailed issue are PARKED, not dead; record them as parked with his reason.

JOB 2: draw the photo wall's reading surface, in one lab room, by one hand.
It is LOCKED (D10), it has never been drawn, and it comes before build phase 8
because it can change a page already drawn. features.md section 4 argues three
shapes -- a run, a drift, a stack -- and why a grid is wrong. Draw all three,
live, at 390 and 1512, against the pressure corpus's two-hundred photograph wall
(?data=pressure already swaps it). Nothing in that room is ever scaled.
Notify him when it is up and let him pick. Do not pick for him.

DO NOT START PHASE 7. It is gated on the settings surface, which is HIS.

How to work:
  - One hand. No fan-out: a design round is not a fan-out (F32).
  - Take numbers from the app, never from taste.
  - A note he has given is a DECISION, not a proposal.
  - npm run check before every commit, npm run visual after UI work, never both
    at once, and never at the same time as a browser probe -- the machine hangs.
    Stage by pathspec: other sessions are live in this tree.
  - Update this file's board and session log inside the same commit.
  - Do not push.
```

### What that session must know, and would otherwise learn the hard way

- **`spec.md` is the plan; `architecture.md` is the design.** Where the spec and a review of his
  disagree, he wins. Where the spec and `architecture.md` disagree, `architecture.md` wins on
  anything drawn and the spec wins on anything mechanical.
- **`Notification.link` is a stored column**, so a route rename is a data change as well as a file
  move, and `/catchups/[id]/answer` gets the same treatment when phase 7 deletes it.
- **Production and the demo are separate Supabase projects.** Every migration is applied twice.
- **A column drop before its code has deployed breaks production**, because one database serves
  production and local dev. Drops are always a second file, in phase 11.
- **Ten is the floor** (spec.md §3.5b): a batch Catch-up exists at ten members, which is two of the
  eleven batches today, and under it the Catch-ups item leaves the sidebar. That lands in phase 4,
  not phase 1, but it changes what the backfill creates, so do not write eleven anywhere.
- **He owes about twenty photographs.** Two of the six stand-ins had to be dropped (F46) and the
  rest are 900 to 1280px, so every wide crop is still upscaled at retina. Since phase 3 the pool
  is `src/lib/catchup-pictures.ts` and dropping them in is one edit to that array, with no
  migration; `catchup-pictures.test.mjs` says whether the edit was complete.
- **Nothing in that room is ever scaled** (F34), and a lab switch the SERVER reads cannot be
  flipped by `router.replace` (F43).
- **A client-side link from `/lab` into `(main)` loses the app's layout** -- measured, `main` at
  left 0 instead of 248. Lab-only; use a plain `<a>` there and `next/link` in the real app.
- **`npm run visual` was 25/25 green** at the end of phase 4, `/catchups` included.
- **Two batch Catch-ups exist now** (phase 4): Batch of 2023 and Batch of 2024, `createdById` and
  `inviteToken` NULL. `isBatchCatchup(batchYear)` is the whole test, `BATCH_CATCHUP_FLOOR` is ten,
  and `src/lib/batch-catchups.ts` is where creation and the two self-heal passes live. Both Keeper
  preambles in `actions.ts` refuse a batch before they ask who the Keeper is, which is what covers
  all thirteen controls in one place; deleting either refusal is how a batch Catch-up quietly
  acquires a Keeper.
- **The Catch-ups sidebar row is now conditional.** The predicate is "can you open at least one
  Catch-up", asked once in `(main)/layout.tsx` and passed down as `hasCatchup`, which DEFAULTS TO
  TRUE so a caller that forgets it shows the row rather than hiding a feature. Hiding a door is not
  access control: `/catchups` still renders for anyone signed in and the invite link still works.
- **`CRON_SECRET` IS set** -- in `.env`, on Vercel and in GitHub -- so `/api/catchups/tick` runs
  nightly and phase 4's two self-heal passes run with it. The security ledger still lists it as
  owed; that line is stale, and phase 4 wasted an afternoon's reasoning on it. To check rather than
  guess: `fetch("/api/catchups/tick", { headers: { authorization: "Bearer " + CRON_SECRET } })`
  against the dev server, which answers 200.
- **A Catch-up cannot be created without a picture.** `Catchup.pictureSrc` is NOT NULL. It has a
  server-side DEFAULT so a build that forgets does not throw -- it quietly gives every new
  Catch-up the same photograph instead, which nothing would report. Any new creation path calls
  `pictureFor(seed)`, and `catchup-pictures.test.mjs` greps for it.

### The twenty photographs, with the crops measured

He asked on 2026-09-08 what aspect ratio to supply. Every number below was measured off
`/lab/catchups/sketches` the same day, at four real viewports. Every surface uses
`object-fit: cover` with a per-photograph `object-position` near the bottom, so a frame WIDER
than the source crops the top and bottom, and a frame NARROWER than the source crops the sides.

| Where it appears | Pixels | Ratio |
|---|---|---|
| the home's head, 13in laptop | 1112 x 240 | 4.63 : 1 |
| the home's head, 14in MBP | 1184 x 240 | 4.93 : 1 |
| the home's head, 1080p and wider | 1520 x 240 | **6.33 : 1** — the widest, and it caps here |
| the list card, laptop | 536 x 214 | 2.50 : 1 |
| the home's head, phone | 388 x 172 | 2.26 : 1 |
| the list card, phone | 348 x 196 | **1.78 : 1** — the narrowest |

**The head has no ratio to match, by design.** It is a fixed 240px HEIGHT (architecture 1b, so a
wider screen shows MORE photograph rather than a thinner slice), which means its ratio slides from
4.63:1 to 6.33:1 with the window. Nothing can match that. The head is meant to be a BAND taken out
of the picture, and `pictureFocus` is what aims the band.

**So the ratio is set by the LIST, which is where the photograph is seen as a photograph.**
Supply **2:1 — 2400 x 1200**. Against the phone card (1.78:1) it loses 11% of its width, 5.5% off
each side; against the laptop card (2.5:1) it loses 20% of its height off the top. 5:2 was the
first answer and is worse: it costs 29% of the width on the phone, which is his own primary
device.

**The safe zone, which matters more than the ratio.** Running the four crops against a 2:1 source
at the pool's default `center 85%`, the band that survives every one of them is:

> **the horizontal strip from 58% to 90% down the frame, and the middle 85% of its width.**

Put the subject there. Not the very bottom edge, not dead centre, not the outer eighth. And keep
the **bottom-left corner quiet** — the Catch-up's name is written across it over `PICTURE_SCRIM`,
a warm near-black fade covering the bottom 74%.

Unchanged from spec 3.4: landscape, **2,400px or more on the long edge** (retina on a 1,520px
banner is 3,040, so 2,400 is already a mild upscale at the widest; more is better), nothing with a
recognisable face in it, and **details rather than valley views** — the landing page and half the
Collection are already wide valley views, so twenty more would read as the same photograph twenty
times.

### Still his, whenever he wants it

The twenty photographs, and the shape of the settings surface. Everything else he has answered:
navigator **A**; delete becomes **leave**; nobody keeps a batch Catch-up and it has no manual
transitions; pause becomes **hold the next Edition**; the six with no batch year get nothing;
anyone in a batch may change its picture; **ten** is the floor and under it Catch-ups is not on the
sidebar; the list's question rows clamp to three lines and the strip's docked question to two. His
own verdict partway through the fine-tuning round: *"for the first time in two days and a million
sessions I feel like this is coming together."*
