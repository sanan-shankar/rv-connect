# Catch-ups rework, LIVING HANDOVER

## Start here

**@ this file and nothing else.** Then, in this order:

1. **Read [`brief.md`](brief.md) in full.** Not skimmed, not summarised. It is the owner's
   spoken brief with the fillers removed and nothing else touched, fifty numbered paragraphs,
   about fifteen minutes. Every `¶n` in this file points into it. He has asked, again, that no
   session work from a condensed version of it (¶22), and the last two campaigns proved him
   right.
2. **Find your session** in "The sessions" below, check the status board, and read that
   session's section. Each section is written to be the whole prompt for that session.
3. **Read the old spec for vocabulary only.** [`docs/spec/catchups.md`](../../spec/catchups.md)
   describes what is shipped today: the objects, the Round state machine, the permissions. The
   owner on it, ¶48: *"Those are heavily outdated, and you have much more knowledge from my
   prompt than those guys do."* Take the nouns and the mechanics from it. Take no design, no
   copy and no scope fence from it. Where it and the brief disagree, the brief wins.
4. **Before your session ends, edit this file**: status board, findings, decisions, session
   log. The next session starts by @-ing it alone, so whatever is not written here is lost.

`.claude/skills/writing-for-agents/SKILL.md` governs how you edit this file and anything else
you write for the session after you. Its section "Whose words are you carrying?" was added
for this campaign, at the owner's request (¶22): when you brief a worker or a next session on
anything the owner asked for, his paragraphs travel verbatim, not your paraphrase.

**Three campaign-wide rules.** One mind per job, and a fan-out only where several independent
minds are genuinely better than one: he left ultracode to this session's judgment (¶51), and
the allocation is in "The sessions" below, with his earlier reasoning against fan-outs kept in
view (`.claude/skills/fix-campaign/SKILL.md`: *"the agents are receiving this summarisation
of summarisation, and then you don't get high-quality results"*). Nothing that exists in
Catch-ups today is deleted (¶45). And his suggestions are examples, not answers (¶7, ¶26):
*"You would be reducing the negatives but not increasing the positives."*

This file follows the `docs/planning/collection-rework/` pattern (brief, living handover,
prior art, spec) because that campaign worked. It lives under `docs/planning/` rather than
`docs/audit-fix/` because this is a design and rework campaign, not an audit and its fixes.

---

## What this campaign is

The owner's own frame, ¶19: *"There are two parts to this. One is [how would I do it if
catch-ups was my entire app], and then the other is finding out all the things that went
wrong."* And ¶20 gives the order: deep reconnaissance from a UI/UX point of view, then
multiple rounds of brainstorming, then build it *"in completely different ways, plural, and
then see what works."*

So, three tracks:

1. **Find everything that is wrong**, thoroughly, with screenshots, at his phone's size and
   his laptop's, in every state a Catch-up can be in. He has described *"maybe 10% of the
   problems"* (¶41). The rest is ours to find.
2. **Design Catch-ups as if it were the whole app.** Information architecture first (what is
   the home of a Catch-up, what does clicking anything do, one representation of a published
   Round instead of fifteen), then several genuinely different directions built as lab rooms
   with the real data, the owner picks, a spec is written, it is built.
3. **The magazine and the PDF** (¶21, ¶30, ¶31): a second rendering of a published Round,
   laid out by rules that adapt to the content the way a magazine designer would, exported as
   a beautiful PDF, and eventually emailed. *"One whole side project."* It runs beside track 2,
   not after it.

Plus the functional changes he named, which every direction must carry: the **batch
Catch-up that exists by default** (¶4), **archive and delete like WhatsApp** (¶5),
**comments** (¶10), **link previews that fire on any pasted song link** (¶16, ¶50), the
**photo wall** (¶16, ¶49), and the shared **image viewer and heart** bugs (¶28, ¶29).

---

## The sessions

He asked (¶46) to be told which sessions run on which model at which effort, and then left
ultracode to this session (¶51: *"totally up to you"*). This is the answer. Every session is
started by pasting `@docs/planning/catchups-rework/handover.md` plus one line saying which
session it is. Everything is **max** effort unless noted.

| # | Session | Model | Ultracode | Runs after | Produces |
|---|---|---|---|---|---|
| S0 | Set-up (this one, 2026-09-05) | Fable max | yes, used: four transcript verifiers ran; the ledger critics and the S2 sweep hit the usage limit, see the log | | `brief.md`, this file, the skill amendment |
| S1 | **Reconnaissance** | Opus max | **no**: one browser, one machine | now | `recon.md`, `flows.md`, the storyboards, the export script and a first export, root causes for every reported bug |
| S2 | **Prior art** | Opus, high is enough | **yes**: eight researchers by shape, one assembler; the script exists and is resumable, see the log | now, alongside S1 | `prior-art.md` |
| S3 | **Directions** | **Fable max** | **yes**: the shape is in its section | S1 and S2 | `directions.md`: the IA, three or four directions, a room brief per direction |
| S4 | **Rooms** | Opus max | no | S3 | `/lab/catchups/*`, one room per direction plus the pressure room, real data, both viewports |
| S5 | **Pick and spec**, owner present | **Fable max** | no | S4, once he has browsed | `spec.md` with every decision marked LOCKED / RECOMMENDED / OPEN |
| S6+ | **Build**, one phase per session | Opus max | no, his standing rule for fixes | S5 | production, phase by phase |
| M1 | **Magazine design** | **Fable max** | **yes**, for the failure-mode hunt and the grammar panel only | S1 and S2 | `magazine.md`: the layout grammar, the failure list, a feasibility spike |
| M2+ | **Magazine build** | Opus max | no | M1 (and S5 for shared parts) | the magazine rendering, the PDF, then email if he says so |
| X | **Viewer and heart slice** | Opus max | no | S1 | fixes to the shared image viewer and the heart timing; may ship before anything else |

**Where ultracode earns its keep and where it does not.** A fan-out helps when the work is
many independent readings of the same thing (research shapes, transcript stretches, failure
modes, alternative designs from one shared brief), and it hurts when the work is one long
sequence with state (a browser walked through every Catch-up state; a room built and looked
at; a build phase with a gate). It also cannot help where the machine is the limit: his Mac
has hung under browser fleets, so S1 and S4 are one browser each regardless. The one risk he
named, summarisation of summarisation, is avoided by the rule in the writing-for-agents
skill: every worker reads `brief.md` itself, in full, from disk; nobody gets a digest. So:
turn ultracode on for **S2, S3 and M1** and leave it off for everything else.

Why Fable on exactly three: S3, S5 and M1 are where the campaign's taste and synthesis
happen, and he said he would rather not run everything on Fable (¶46). The sweeps (S1, S2),
the room-building (S4) and the build (S6+) are Opus work at his usual setting. S1 and S2 can
run at the same time. S4 rooms are independent of each other and two sessions may build in
parallel if he is in a hurry, colliding only on `src/app/lab/_registry.ts`. X can run any
time after S1 and touches the feed too, which he allowed in ¶28.

---

## Status board (update every session)

| Item | Status | Notes |
|---|---|---|
| Brief captured in his words | DONE | `brief.md`, 2026-09-05, 52 paragraphs: two sittings, the follow-up, and his answers |
| Skill amended (¶22) | DONE | `.claude/skills/writing-for-agents/SKILL.md`, "Whose words are you carrying?"; the user-level copy in `~/.claude/skills/` updated to match |
| Owner questions 1 to 5 | DONE | answered 2026-09-05, ¶51 and ¶52; readings under "Owner answers" |
| Brief checked against the raw transcript | DONE | four verifiers, 69 findings, all folded into `brief.md` on 2026-09-05; see the log |
| Ledger checked against the brief | OPEN | two critics were scripted and hit the usage limit; resume the S0 workflow or have S3 do it as its first act |
| S1 Reconnaissance | OPEN | |
| S2 Prior art | OPEN | eight researchers and an assembler were scripted in S0 and hit the usage limit before running; resumable, see the log |
| S3 Directions | OPEN | blocked on S1, S2 |
| S4 Rooms | OPEN | blocked on S3 |
| Owner browses the rooms | OWNER-GATED | |
| S5 Pick and spec | OPEN | blocked on the pick |
| S6+ Build | OPEN | blocked on S5 |
| M1 Magazine design | OPEN | blocked on S1, S2 |
| M2+ Magazine build | OPEN | blocked on M1 |
| X Viewer and heart slice | OPEN | blocked on S1's root causes |
| Old spec rewritten to describe what shipped | OPEN | last, with the final build phase |

Statuses are `DONE`, `PARTIAL`, `OPEN`, `OWNER-GATED`, `DECLINED`, the same five words the
fix-campaign board uses.

---

## What is true today (findings)

Numbered so later sessions can cite and correct them. **Verified** means this session looked;
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
  (`index/filed-away.tsx`), which is the thing he does not want to see (¶5). Note for the
  batch Catch-up: "delete removes your membership after 30 days" cannot apply to a
  membership that is fixed by batch.
- **F5, the batch history (partly verified).** The create page has a one-tap "Everyone from
  <batch>" (comment in `(index)/page.tsx` lines 77 to 80), so today a batch Catch-up is a
  people-Catch-up someone made by hand. The archived `/lab/groups-rethink` rooms (concepts
  C and D) already argued for putting Catch-ups on the batch itself. S1 should recover from
  git how the earlier default batch Catch-up behaved and why it went (`git log -S`).
- **F6, the membership container (verified).** A Catch-up still belongs to a hidden `Group`
  row (`groupId` unique); people-Catch-ups create one. Batch groups are the same table with
  `batchYear` set. So "a batch Catch-up by default" is one `Catchup` row per batch group,
  and nothing about the container has to change for it.
- **F7, the reader's table of contents (code read, complaint unverified).** `round/toc.tsx`
  is one scroll-spy hook with a desktop rail and a mobile chip row, both mounted at every
  viewport with CSS visibility. He reports the active item bolding and reflowing (¶10),
  the mobile chips clipping in a box, a one-second lag on tap that *"reloads like a whole
  page almost"*, and no way to navigate once scrolled (¶11). All four are S1's to reproduce.
- **F8, the mobile header cut-off (unverified).** ¶11, ¶25, ¶33: on his phone the green top
  bar stops short of the right edge, and the whole page reads as if half a centimetre of
  white space were added on the right, cutting through the sidebar. Not reproducible by
  narrowing a desktop window. That pattern is a child wider than the viewport creating
  horizontal overflow; S1 finds which one, with a script that walks every element's
  `getBoundingClientRect().right` against `innerWidth`.
- **F9, the shared image viewer and heart (unverified).** ¶28: swiping from a tall photo to
  a landscape one snaps the viewer to a smaller size; swiping back from the last photo jumps
  to the first, not the previous; the jump overshoots. ¶29: a heart on a Catch-up answer
  fills instantly but its animation fires a second late, unlike the feed. The viewer is
  `src/components/common/image-viewer.tsx` / `photo-carousel.tsx`, shared with the feed and
  the Collection; he allowed the fix to touch the feed. Caption clamp today is 2 lines
  (¶32), wanted 4.
- **F10, the safety net that already exists (verified in `docs/OPERATIONS.md`).** A nightly
  `pg_dump` goes to a private R2 bucket, 30 days kept plus the first of every month forever,
  and the media job mirrors every object in the public bucket. So the floor under "nothing
  gets deleted" is already there. What he asked for in ¶45 is a rebuildable file he can
  point at; S1 adds that (D6).
- **F11, prior research on disk.** `docs/planning/letterloop-research.md` (2026-07-05) is
  thorough on Letterloop's mechanics and says nothing about how it looks; he calls it
  *"still somewhat useful"* (¶49). `docs/planning/dialog-standards-findings.md` (2026-08-29)
  is the evidence base for the dialogs he wants reworked *"in general"* (¶3), and its thesis
  applies here word for word: the standards exist and were not enforced past the surface
  they were written on.
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
  variety of content and authors comes from fixtures (D30, D33).

---

## The ledger: every ask in the brief

Each item names its paragraphs. This is an index into `brief.md`, not a substitute for it:
the paragraph carries the tone and the reasoning, and the tone is part of the instruction.
Status is `open` until a session closes it and says where.

### How to work (P)

| # | Ask | ¶ | Status |
|---|---|---|---|
| P1 | A serious, bottom-up rework of UI and functionality; a completely fresh take on the presentation; the functionality is mostly fine | 1, 17, 18 | open |
| P2 | He gives constraints, not answers; find the solution shape; think critically about each way; research what others and Letterloop do; pick the best | 7 | open |
| P3 | Every suggestion of his is an example that may be wrong; do not just fix the listed items, which only *"reduces the negatives"* | 6, 26 | open |
| P4 | The bar is *"if catch-ups was my entire app"*: a complete experience, beautiful and intuitive | 19, 47 | open |
| P5 | Two parts: how would I do it, and everything that went wrong | 19 | open |
| P6 | Thorough recon from a UI/UX point of view with screenshots (code alone cannot show it), then multiple rounds of brainstorming, then build it several different ways and see what sticks | 20, 43 | open |
| P7 | Map every intent against every state a Catch-up can be in; good modular design makes the 10,000 combinations collapse | 36 | open |
| P8 | Do not reinvent the palette; it must still be this app; new things are allowed; the Apple Action Button analogy: bespoke, unmistakably of the app, not the same pills everywhere; *"a higher level of abstraction"* | 42 | open |
| P9 | Letterloop is the floor and we must be much better; Letterloop's things are too fixed | 17, 49, 50 | open |
| P10 | Past specs and prompts are guidance, not law; heavily outdated; the brief outranks them | 48, 50 | open |
| P11 | Existing content is not deleted; export it to a rebuildable file; but do not let that lower the scale of the rework | 45 | open |
| P12 | Say which sessions on which models at which effort; no ultracode unless he turns it on after a turn; time not a constraint; tokens not wasted; not everything on Fable | 46 | done, "The sessions" |
| P13 | Catch-ups is the weakest part, hidden from demos, 70 beta testers waiting; the one genuinely creative feature; *"do me proud"* | 44, 47 | open |
| P14 | Amend the writing-for-agents skill: his brief travels verbatim when relayed | 22 | done, S0 |
| P15 | He has described about 10% of the problems; find the rest | 19, 41 | open |
| P16 | What works and stays: the answer tile (bird, name, batch, answer, heart), the posts dialog, the image viewer and the way images are arranged, the Keeper leaf mark; comments will be easy to add | 17, 19, 27, 37 | open |

### The index, `/catchups` (I)

| # | Ask | ¶ | Status |
|---|---|---|---|
| I1 | Sort out what belongs in the wide left column and what on the right | 1 | open |
| I2 | Long rectangles stretch on wide screens until 90% is white space; not scalable; a different shape (squares? a picture per Catch-up?) | 1, 6 | open |
| I3 | The Spotify-grid idea is an example he immediately withdrew; explore many shapes | 6 | open |
| I4 | Three calls to action on opening: *"overpowering"* | 23 | open |
| I5 | The View CTA is redundant (everything clicks through to the same place) and mis-aligned because of the three dots | 3 | open |
| I6 | Three dots in a random corner *"interrupts everything"*; if they exist at all they belong top right; whether tiles exist at all is the level of rethink wanted | 24 | open |
| I7 | A row of birds plus "+18" identifies nobody; keep birds, never initials; find a different way to show who is here | 23, 27 | open |
| I8 | The birds now overlap each other; he thinks a regression | 23 | open |
| I9 | Fresh off the press: round, loop, date, then a quoted sentence he does not want to keep seeing; a strangely shaped hover; a curved border between items; text spilling out of the hover; *"could be done in a completely different way"* | 9 | open |
| I10 | One representation of "a published Round", not *"15 different ways in 15 different places"*, and not different on desktop and mobile | 13, 39 | open |
| I11 | Hover darkens, outline appears, a View button: *"not critical thought"*, *"a V0.5 of an app"* | 3 | open |

### Lifecycle: archive, delete, pause, end, leave (L)

| # | Ask | ¶ | Status |
|---|---|---|---|
| L1 | Ending, deleting, archiving, leaving, pausing: too many verbs, no consistency, *"everything's just different in every different situation"*; pause he *"kind of doesn't get"* | 4, 8, 40 | open |
| L2 | WhatsApp model: archive and delete; neither is visible on the main list; no Archived section with a Put back button in your face | 5 | open |
| L3 | No leaving a batch Catch-up; you simply do not open it | 5 | open |
| L4 | Popup dialogs need reworking in general, *"a whole other thing"* (the dialog-standards research is the base) | 3, 38, 40 | open |

### The batch Catch-up (B)

| # | Ask | ¶ | Status |
|---|---|---|---|
| B1 | Exists by default for every batch; everyone in the batch is automatically in; sees the history of Rounds; can take part in future Rounds | 4 | open |
| B2 | No adding members; the members are fixed, the batch | 4 | open |
| B3 | Who is the Keeper? Who may start a Round? A question he asked, not answered | 4 | open |
| B4 | It used to exist and disappeared; recover why | 4 | open |

### A Catch-up's home, `/catchups/[id]` (H)

| # | Ask | ¶ | Status |
|---|---|---|---|
| H1 | What is the "home" of a Catch-up and how do you get back to it; clicking a finished Catch-up lands in the reader; the relationship between pages is not designed | 18, 36 | open |
| H2 | The same published Round appears three times on the home: a "Round 1 is out" tile, the whole Round inline, and a Published issues entry; *"so ridiculous"*; and yet *"then what do we put on the left? I don't know"* | 15 | open |
| H3 | The "Round 1 is out" tile is dead except for its link; the whole tile is the target or there is no tile | 35 | open |
| H4 | Say "In the loop", not "In the loop catch-up" | 25 | open |
| H5 | Pause and resume behave acceptably; the whole left side pauses | 14, 15 | open |

### The reader, `/catchups/round/[id]` (R)

| # | Ask | ¶ | Status |
|---|---|---|---|
| R1 | Stays navigable on the website, roughly as now; not the worst on desktop | 10 | open |
| R2 | Comments on answers | 10, 17, 27 | open |
| R3 | Click a picture to expand it | 10 | open |
| R4 | Active TOC item bolds and reflows the text; some questions truncate to "..."; one very long scroll; *"a nicer way to do it"* | 10 | open |
| R5 | Mobile navigation is *"incredibly bad"*: the horizontal chip bar is janky, boxed, clipped and slow; after scrolling you cannot navigate or even tell which question you are in; *"what if Revolut did this?"*; ideas offered: a tap that takes over part of the screen, or disabling native scroll for a Collection-like navigation | 11, 17, 34 | open |
| R6 | On his phone the green header bar is cut off at the top right and about half a centimetre of white space appears on the right, cutting through the sidebar; not reproducible by narrowing desktop | 11, 25, 33 | open |
| R7 | The masthead's row of birds identifies nobody, and the horizontal rule under it is wasted space, *"barely visible"*, delete it | 11, 27 | open |
| R8 | "13 of the group wrote in": is it needed? | 27 | open |
| R9 | Drop "Question 1"; just ask the question | 27 | open |
| R10 | The desktop right-hand navigation is not done that well either | 11 | open |
| R11 | The answer tiles are right and stay: bird, name, batch, answer | 27 | open |
| R12 | Tiles waste space: a thick bottom band with the heart alone, one-line answers using 15% of a 3 to 4 cm tile; minimise here and solve completely in the magazine | 30, 31 | open |
| R13 | The heart fills instantly but its animation fires a second late, unlike the feed | 29 | open |
| R14 | Photo caption More and Less stays; the threshold goes from 2 lines to 4 (he reversed himself and landed here) | 32 | open |
| R15 | YouTube and Spotify previews for songs, *"cute, clickable"*, and they fire whenever a link is pasted, not only on the songs question kind | 16, 49, 50 | open |
| R16 | A photo wall for questions, modular, working with everything else | 16, 49 | open |
| R17 | "Back to the catch-up" lands on the awful home | 35 | open |

### People (E)

| # | Ask | ¶ | Status |
|---|---|---|---|
| E1 | "In this catch-up": six or seven names, "and 16 more", See and add people, truckloads of white space, only the A-names visible; does it have to be a tile, a preview, a whole list, shown at all? *"Yes, we probably should. But from there is where I want you to start thinking"* | 12, 37 | open |
| E2 | The Keeper highlight and the leaf mark next to the name are nice; keep the idea | 37 | open |
| E3 | The See-and-add-people dialog: white space, "Keeper, some people started it" should just say Keeper, the link on a *"horribly coloured background"*, the move dialog so narrow three words take three lines, rules everywhere; *"no way Apple would design anything that looked like this"* | 38 | open |

### Settings (S)

| # | Ask | ¶ | Status |
|---|---|---|---|
| S1 | Twelve horizontal rules, pills inside pills, *"too many pills, man"*; removing the rules alone will not save it; not invisible design | 14, 40 | open |
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
| M1 | The whole Catch-up as a beautiful PDF; a navigable PDF is nice, not essential | 10, 21 | open |
| M2 | A magazine or editorial rendering, tailor-made per Catch-up by layout rules that adapt to the content (*"a lot of if statements"*, like the profile page), no comments, not cookie-cutter, image one side and text the other, different pages, big images only at high resolution; *"as if we shipped all the content to someone at Vogue"* with him as editor | 21, 30 | open |
| M3 | A PDF is shareable and emailable; if it is amazing he will wire up emailing everyone when a Round is ready | 21 | open |
| M4 | List the hundred things that could go wrong and how each is bypassed | 31 | open |
| M5 | Scope it as its own side project; decide what goes to subagents and what to separate sessions | 21 | done, track M |
| M6 | Both: minimise the wasted space in the web reader, and solve it completely in the magazine | 31 | open |

---

## Decisions

The three marks are the ones the writing-for-agents skill defines. **LOCKED** is the owner's,
with the paragraph. **RECOMMENDED** is this session's judgment; do better if you can, and say
so. **OPEN** is nobody's yet; the phase named decides it.

### LOCKED

- **D1** The rework is bottom-up, not a round of tweaks (¶18, ¶26).
- **D2** He sets constraints; sessions find the shape; his suggestions are examples (¶7, ¶26).
- **D3** The design stays inside this app's tokens, type and colour, and is otherwise free in
  layout and component shape; bespoke but unmistakably ours, the Action Button analogy (¶42).
- **D4** A batch Catch-up exists by default for every batch; membership is the batch, fixed
  and automatic; everyone in it sees the whole history and can take part in future Rounds;
  no adding members; no leaving; someone who joins the site later is in it and can read every
  earlier Round (¶4, ¶5, ¶51).
- **D5** Archived and deleted Catch-ups do not appear on the main list (¶5).
- **D6** Existing content is preserved, and exported to a rebuildable file before any change
  that could lose it (¶45).
- **D7** Comments on answers are in scope; the old spec's fence against them is void (¶10, ¶27).
- **D8** Photos in answers open in the viewer (¶10).
- **D9** A song link pasted anywhere in an answer produces a preview card, YouTube and
  Spotify at minimum, regardless of the question's kind (¶16, ¶50).
- **D10** A photo-wall question type exists and is modular (¶16, ¶49).
- **D11** The caption More and Less control stays; its threshold is four lines (¶32).
- **D12** The answer tile keeps bird, name, batch, answer and heart (¶27).
- **D13** Two renderings of a published Round: the web reader, navigable, with comments; and
  the magazine, print-first, without comments. Both exist (¶10, ¶21).
- **D14** Letterloop is the floor (¶49).
- **D15** Past specs and prompts are guidance, not law (¶48).
- **D16** Ultracode is allocated by this session (¶51), and the allocation is: S0's checks
  and sweep, S3's independent directions, M1's failure-mode hunt; nowhere else. One mind per
  job everywhere a job is one long sequence with state (his fix-campaign words).
- **D17** The order of work is recon, research, directions, rooms, pick, spec, build, with the
  magazine as a parallel track (¶20, ¶43).
- **D18** One click target per tile and the whole tile is it; no redundant View; no tile that
  is dead except for a link inside it (¶3, ¶35).
- **D19** Copy: "In the loop", not "In the loop catch-up"; a question is asked without
  "Question N"; the Keeper is labelled "Keeper" and nothing more (¶25, ¶27, ¶38). The banned
  words from the old spec's banner stand: "gentle", "quiet", "small", "warm", "a round of".
- **D28** Batch Catch-ups and people Catch-ups both exist and are listed together as the
  same kind of thing; a people Catch-up works *"how you'd expect"*, with people added and
  removed by hand; a batch Catch-up has no people editing at all (¶51).
- **D29** The magazine is portrait, not landscape (¶51).
- **D30** Robustness comes from pressure testing: *"a fake catch up or two"* filled with
  *"literally every type of content we might come across"*, and every surface (the rooms,
  the reader, the magazine) must survive the most varying input (¶51). The corpus exists
  before the directions are judged and before the magazine grammar is written.
- **D31** Throwaway Catch-ups and *"anything else you want"* may be created to do the job
  well (¶51), within D33.
- **D32** `/lab/catchups/` is the sandbox for any test in this campaign, *"whatever we
  want"* (¶52): direction rooms, the pressure room, the magazine spike, viewer experiments.
- **D34** Recon's first duty is *"how literally every state of the catch up looks and every
  sequence of events through those states looks"* (¶51): every state, and every path
  between states, as a storyboard a person could follow.

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
  Re-run before every migration in S6+.
- **D24** The magazine is one layout engine rendering to screen and to print from the same
  components, at a route of its own; the PDF is that page printed by headless Chrome. Start
  it as a hand-run script (the `docs/spec/hand-run-passes.md` shape) that writes the PDF to
  R2, and move it to a serverless function only if M1's spike shows it fits. I have **not**
  verified what Vercel's current function size and duration limits allow for a headless
  Chromium; M1 measures before deciding. The alternative, a pure-JS PDF renderer, buys a
  smaller function at the cost of a second layout implementation, which is exactly the
  "second implementation" that cost the Collection campaign a room.
- **D25** Three or four directions, each answering the same fixed checklist so they can be
  compared; none of them is "today's layout with the bugs fixed".
- **D26** The models table above.
- **D27** Photo resolution for print: today an uploaded Catch-up photo is boxed to 1920px on
  its long edge (`toDisplayWebp` in `src/lib/image.ts`, the feed's pipeline). That is enough
  for most magazine pages and not for a full-bleed A4 at 300 dpi. Whether Catch-ups should
  start keeping the original the way the Collection does is a data decision for S5; M1 says
  what it needs.
- **D33** Variety and volume come from **fixtures, not fake members.** A live throwaway
  Catch-up holds only the owner's account and Jerry Maguire, because every Round event
  notifies its members (F14) and because invented accounts would appear in the directory
  and the member counts seventy real people look at. The pressure corpus (D30) is JSON in
  the export's shape under `src/app/lab/catchups/_fixtures/` (invented names and birds,
  no real member's words unless copied from the export), plus the two real published Rounds
  from the export. Rooms and the magazine engine render fixtures through the same loader as
  live data. If a live test genuinely needs many real authors, that is a question for the
  owner, not a thing to do.
- **D35** The pressure corpus covers, at least: an answer of one word and one of 3,000
  words; a question with one answer and one with forty; a Round with one question and one
  with twelve; zero photos, one photo in each orientation, three portraits together, ten
  photos on one answer, a two-hundred-photo wall; a song link from Spotify, YouTube and an
  unknown host, and a link that fails to resolve; an emoji-only answer; a very long name and
  a name with diacritics; a member who left; a deleted photo; a Round nobody answered; a
  Catch-up with two members and one with a hundred; every lifecycle state.

### OPEN

- **O1** Who keeps a batch Catch-up, who may start a Round, and whether Rounds simply run on
  a cadence with nobody in charge (¶4). S3 proposes, S5 decides.
- **O2** Whether "delete" exists for a batch Catch-up and what it means when membership is
  fixed (¶5). S3, S5.
- **O3** Whether pause survives as a verb (¶8, ¶40). S3, S5.
- **O4** The shape of the list: squares, a shelf, a grid, a picture per Catch-up, something
  else (¶1, ¶6). S3, rooms.
- **O5** How to show who is in a Catch-up and who wrote in a Round, in a way that identifies
  people (¶12, ¶23, ¶27, ¶37). S3, rooms.
- **O6** What the home of a Catch-up is and what is on it, per state (¶15, ¶18). S3.
- **O7** Mobile reader navigation (¶11, ¶34). S3, rooms; the most important single design
  problem in the campaign after the IA.
- **O8** The one representation of a published Round (¶13, ¶39). S3.
- **O9** Whether "13 wrote in", the rule and the question numbering survive (¶27). S3.
- **O10** Whether Fresh off the press exists at all (¶9). S3.
- **O11** The shape of settings and where the lifecycle verbs live (¶14, ¶40). S3.
- **O12** What the six members with no batch year see, and whether staff get a Catch-up of
  their own. S5.
- **O13** The magazine's look, its layout grammar and the PDF pipeline (¶21). M1.

---

## S1: Reconnaissance

You are finding everything that is wrong, from a member's point of view, and writing it down
so precisely that S3 can design from your notes without opening the app. You fix nothing.

**Read first**: `brief.md` in full; this file; `docs/spec/catchups.md` for the nouns and the
state machine; `docs/spec/DESIGN-SYSTEM.md`; `docs/planning/dialog-standards-findings.md`.
Read the code under `src/app/(main)/catchups` and `src/components/catchups` as you go, not up
front: the owner's point (¶43) is that *"UX problems you can't make out from just freaking
code"*, so the screen leads and the code explains.

**How to look.** One browser, the `chrome-devtools` MCP, signed in through
`scripts/qa/_dev-login.mjs` (see Operational context; the MCP cannot sign itself in). Four
viewports: **390x844** (his phone; use `emulate` for touch, because the swipe and tap
complaints are touch complaints), **1512x982** (his MacBook), **1440x900**, and **1920x1080**
or wider (his ¶6 complaint about 90% white space is a wide-screen complaint; measure the
ratio). Light and dark. Screenshot every state at every size into `e2e/.shots/catchups-recon/`
with numbered names, and **read each PNG** before you write about it.

**Whose account.** Sign in as the owner (the admin account `screenshot:auth` uses) to see his
real Catch-ups: "In the loop", the paused one, "Test". **On those, read only.** A heart is a
write; an answer is a write; a settings change is a write. For anything that writes, create one
throwaway Catch-up named `[Recon] ...` between the owner's account and Jerry Maguire
(`sanan.shankar@gmail.com`, the test account; never a real alumnus), drive it through every
state with the Keeper controls, and leave it in place, named so nobody mistakes it. Say in
`recon.md` that it exists.

**Cover every route and every state.** The index; the create flow; a Catch-up's home in
collecting, answering, preparing, published, paused, ended; a copy archived and a copy binned;
the answer page with text, photo, song and photo-wall questions; the reader; the join link;
the admin Catch-ups pages; the notifications that link into all of this; anything on the feed
that mentions a Catch-up. As Keeper and as plain member. Then the empty states: a member in a
batch with no Catch-up, a brand-new member, a Round with one answer.

**Then every sequence, as a storyboard (D34).** This is the part he cares about most (¶51):
*"how literally every state of the catch up looks and every sequence of events through those
states looks."* For each path below, walk it in the `[Recon]` Catch-up and record every
screen a member sees along the way, in order, at 390 and 1512, as a numbered strip in
`recon.md` (shot, one line of what the person sees, one line of what they can do next). The
paths: create a people-Catch-up and reach collecting; collecting to answering (by the clock
and by "Open answering now"); answering to preparing to published, including the 24-hour
hold and "Publish now"; a published Round to the next Round opening; pause in the middle of
answering, then resume; extend a deadline; end; archive, then find it, then put it back;
delete, then restore, then let it expire; join by link; a member removed, a member leaving;
the Keeper handed over; a member who joined the site after Round 1 opening the Catch-up for
the first time; and the notification a member taps at each transition and where it lands.
Where a path takes days by the clock, say how you moved the clock (the state is a pure
function of timestamps, `computeStatus` in `catchups-core.ts`; a Keeper control or a
read-only look at the code may be enough, and if you must touch a timestamp do it only on
the `[Recon]` rows and say so).

**Reproduce every complaint in the brief and label it.** For each of I1 to M6 that describes
something visible: *reproduced* with the measurement, or *not reproduced* with what you saw
instead. Root-cause the mechanical ones, in the code, to the line:

- the mobile header cut-off and the right-hand white space (F8): find the element whose right
  edge exceeds `innerWidth`; say whether it is the chip row, a photo row, or something else;
- the TOC bold reflow and the tap lag (F7);
- the curved border and the hover shape on Fresh off the press (¶9);
- the overlapping birds on the index (¶23), and whether `git log` shows when it changed;
- the heart's late animation (F9): compare how the feed's `LoveButton` call site and the
  Catch-up answer card's differ;
- the viewer's size snap, wrap-around and overshoot (F9): reproduce with touch emulation on a
  real multi-photo answer, read `image-viewer.tsx` and `photo-carousel.tsx`, and say which
  behaviour is a bug and which is a design choice that reads as one;
- the song and photo-wall kinds (F3): in the `[Recon]` Catch-up, ask a songs question and a
  photo-wall question, answer as Jerry with a Spotify link in the song field, a YouTube link
  in the song field, and both links pasted into an ordinary text answer; screenshot what a
  reader sees for each;
- the dialog sizes he measured by eye (¶38, ¶40): measure them.

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
fifteen, ¶39) and list them with a shot each.

**The export (D6, D23).** Write `scripts/dev/export-catchups.mjs`, dry-run by default, in
the `hand-run-passes.md` shape (`scripts/qa/hand-run-passes.test.mjs` will hold you to it),
add its row to `scripts/dev/README.md` if that ledger exists, run it, and record the counts
against F1. It writes the JSON and copies every photo's bytes beside it, so the folder alone
can rebuild every Catch-up. Nothing in the tree is deleted, ever, by this script. Define the
JSON's shape as a TypeScript type in `src/lib/catchups-export.ts` (or beside the existing
types), because the rooms and the magazine will load fixtures in exactly this shape (D30,
D33); write the first fixture from the two real published Rounds, and a second, invented one
that covers as much of D35 as you can in the time, under `src/app/lab/catchups/_fixtures/`.

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

## S2: Prior art

The owner, ¶7: *"Research what other people do. Research what Letterloop does and pick the
best way."* Write `prior-art.md` in the shape of `docs/planning/collection-rework/prior-art.md`,
including its confidence marks (**[measured]**, **[company]**, **[secondary]**), because a
recommendation S3 leans on has to say how sure it is.

`docs/planning/letterloop-research.md` already covers Letterloop's mechanics; do not redo it.
What it lacks, and what you add first, is **how Letterloop looks and moves**: the home, an
issue on a phone, its section navigation, the members screen, its PDF export, its Mementos.
App Store screenshots, the help centre's images, reviews that describe the reading experience.
Then, for each shape below, two or three products that solved it well, what they do, why, what
it costs, and which fits a small trusted group of alumni with bird avatars on a warm paper
design system, mobile first:

1. **A short list of a few important things** (a person is in two or three Catch-ups, ¶1):
   WhatsApp's chat list, Apple Podcasts shows, Letterboxd lists, Are.na channels, Spotify's
   library. What they do about width on a big screen.
2. **A long, multi-author document read on a phone with navigation** (¶11, ¶34): Kindle and
   Apple Books progress and chapter scrubbers, Medium and Substack's apps, the New York Times
   and The Pudding's long reads, Apple News+ magazines, iOS Photos' scrubber, Revolut's
   patterns since he named it. What lets a reader know where they are and move without
   scrolling to the top.
3. **Magazine and editorial layout engines that adapt to content** (¶21): Flipboard's layout
   engine (they published about it), Apple News Format, InDesign's liquid layout, Readymag,
   the print grids of Kinfolk and Monocle. How they decide what goes with what, and how they
   fail.
4. **Who is in this**: WhatsApp and iMessage group info, Slack channel details, Discord's
   member list, Partiful's guest list. How they show forty people without a wall of rows.
5. **Archive, delete, mute, leave**: WhatsApp, Telegram, Slack, Instagram. Which verbs exist,
   which are personal, where the archived things live.
6. **Link previews**: iMessage, Slack unfurls, Notion, X cards; and what Spotify's and
   YouTube's keyless oembed endpoints actually return.
7. **Shared photo walls**: Apple Shared Albums, Google Photos shared albums, Partiful,
   Pixieset.
8. **Producing a PDF from a web layout without a server you own**: headless Chromium on
   Vercel (`@sparticuz/chromium` and the current size and duration limits, which I have not
   verified), Browserless and Gotenberg as services, pure-JS renderers, and print-to-PDF with
   `@page` CSS. Give M1 the trade-offs and the numbers you can find.

For each shape, end with a one-paragraph "what this means for us". Do not design. Do not read
the code. Update the board and log here when you finish.

---

## S3: Directions (Fable, ultracode on)

You are the session the owner ran this campaign to reach. Read `brief.md` twice. Then
`recon.md`, `flows.md`, `prior-art.md`, `docs/spec/DESIGN-SYSTEM.md` end to end,
`docs/spec/lab-voice.md`, and `docs/planning/collection-rework/spec.md` as the model for how
a decision is marked.

**How ultracode is used here, and how it is not.** The architecture below is yours alone:
one mind, written before any fan-out, because it is the shared structure every direction
must fit (¶42: *"different teams are working together... but under the same broader
structure"*). Then a `Workflow`: three or four independent designers, each given the SAME
inputs and nothing else, that is, told to read `brief.md`, `recon.md`, `flows.md`,
`prior-art.md`, `DESIGN-SYSTEM.md` and your architecture page in full from disk (never your
digest of them; the writing-for-agents skill's "Whose words" section is the rule), each with
a different starting bet you assign (for instance: the reader is the product and everything
else is a door into it; the list is a shelf of magazines; the Catch-up's home is a calendar
of Rounds; Catch-ups as if it were the whole app, ¶19), and each returning one direction
against the checklist below. Let the designers inherit this session's model: this is the
one place intelligence is the point. Then a judge panel on Opus, one judge per direction,
each scoring against the brief's paragraphs with quotes, and one adversarial judge told to
find where every direction is *"today's layout with the bugs fixed"* (¶26). You read all of
it yourself, keep what is strong, and write `directions.md` and the room briefs yourself;
the synthesis is not delegated. Keep every direction that genuinely differs; merge only
where two designers converged.

**First, the architecture**, because every direction shares it and it is where the rot is
(¶18, ¶36). Decide the nouns a member thinks in (a Catch-up, a Round, the people, a question,
an answer) and for each the one place it lives. Answer, in a page: what is the home of a
Catch-up and what is on it in each state; what a member sees first when they open
`/catchups`; where a published Round is read, and the **one** way it is represented
everywhere else (¶13, ¶39); how you get from any screen to any other with one obvious move;
where the lifecycle verbs live and how few there can be (¶40); what a batch Catch-up is
(D4) and your proposal for O1 to O3; where comments go; where who-is-here goes (E1); and the
intents-against-states table from `flows.md` **as it should be**, with cells that are mostly
the same few words, which is what he meant by modular design taking care of it (¶36).

**Then three or four directions.** Each is a whole concept across every surface, not a
style. Each has a thesis in one sentence (what it bets on), a name after what it does
(`lab-voice.md`), and answers the same checklist so he can compare like with like:

- the list at 390, 1512 and 1920 (¶1, ¶6, ¶23, ¶24);
- a Catch-up's home in collecting, answering, preparing and published, and paused and ended (¶15, ¶18);
- the reader on desktop, and the reader on a phone **with its navigation** (¶10, ¶11, ¶34);
- who is in it, and who wrote in (¶12, ¶27, ¶37);
- settings and the lifecycle verbs (¶14, ¶40);
- the batch Catch-up: default, fixed members, your answer to who keeps it (¶4);
- archive and delete (¶5);
- comments on an answer, a song preview card, a photo-wall question (¶10, ¶16, ¶50);
- the empty states: a new member, a batch with no Round yet, a Round with one answer.

None of the directions is today's layout with the bugs fixed (¶26). At least one should be
what he described in ¶19: Catch-ups as if it were the whole app. All of them live inside the
design system's tokens, type, radius ladder, surface ladder and motion rules (D3) and are
otherwise free; his Action Button analogy (¶42) is the standard: *"you can tell that it
belongs to this app"* and *"it doesn't look like anything already in"* it. Break ties the way
the owner does, Apple HIG first. Copy at 4.5 on his warmth dial, not 7.5: one warm line per
surface at most, on a title, never on a button. The banned words in D19.

**Then a room brief per direction**, for S4, written to the writing-for-agents skill: intent
and constraint, not implementation; a number only where the number is the decision; what
"good" looks like at 390 and 1512 with the real data; the owner's paragraphs quoted where
they carry the nuance; every decision marked LOCKED / RECOMMENDED / OPEN, with the OPEN parts
granted to the builder out loud. Say which parts of a room must be **live** (the mobile
navigation must be tappable and scrollable for real; a static picture of it proves nothing)
and which may be static.

**Finally**, one paragraph: which direction you would pick and why. He picks; you may lean.

Write it all in `directions.md`. Update the board and log. Do not build anything.

---

## S4: Rooms

Build each direction from its brief in `directions.md`, one room at a time, yourself (not
through subagents: their work is below the standard this needs, and the owner asked for one
mind per job). Read `docs/spec/lab-voice.md` before the first line: the room is in the
**Delight** group, the lede is one line, no scoreboard unless the numbers are the finding.

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
surface. He may mix directions. Write it down as he says it, verbatim, under "Owner answers"
below, before you interpret anything.

Then write `spec.md` in the shape of `docs/planning/collection-rework/spec.md`: how to read
it and how much room the builder has; every decision LOCKED / RECOMMENDED / OPEN; the IA; each
surface; the batch Catch-up and the lifecycle (O1 to O3 resolved); comments (model, actions,
notifications; whether the post comment components are reused); link previews (where the
resolved metadata is stored, which hosts, the fail-soft rule); the photo wall; the data
changes as an idempotent dated file in `prisma/migrations-manual/` applied with
`scripts/dev/run-sql.mjs`, never `db push`, with the export re-run first (D6, D23); the
build phases for S6+, each a revertable slice; the tests (unit for the pure state machine
and the shelf, Playwright on geometry with `expect.poll` for the mobile navigation, visual
baselines); the copy rules; a table mapping **every** ledger item above to the section that
answers it, or to a stated reason it is out; and the operational context. He reviews it
before S6 starts.

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

If a session is asked to run several phases unattended, `/fix-campaign`'s loop (one worker,
verify yourself, park what breaks) is the protocol.

---

## M1: Magazine design (Fable, ultracode on for two steps)

Read ¶21, ¶30, ¶31 and ¶51 until you can hear them, then `prior-art.md`'s sections on
layout engines and on producing a PDF, then the export and the fixtures from S1, because the
two published Rounds and the invented extremes are your test corpus (D30, D33, D35).

Design the layout engine, not the page. Portrait (¶51, D29). That means:

- **The page model.** A portrait paper size and how the same components render to a browser
  and to `@page`. Whether the on-screen magazine is the same pages or a continuous portrait
  scroll of them is yours to decide.
- **The grammar.** The kinds of block a Round is made of (a question opener; a short answer;
  a long answer; an answer with one, two, three or more photos in each orientation; a photo
  wall; a song card; a pull-quote from a most-hearted answer; the contributors) and the rules
  that map content shape to block: *"if these images are of this size..."* (¶21), like the
  profile page's rules. Write the rules as rules, testable without a browser.
- **Type and image.** Libre Baskerville and Source Sans 3 at print sizes, a baseline grid,
  and what resolution a photo needs at each size it can be placed (D27); which placements a
  1920px photo may take and which need the original.
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
  numbers you could verify and the ones you could not, and a recommendation.
- **A test corpus**: the two real Rounds plus synthetic extremes as JSON fixtures.

Write `magazine.md`, and if the spike produced a page worth looking at, register it at
`/lab/catchups/magazine`. Plan M2+ as phases. Update the board and log.

---

## X: The viewer and heart slice

Independent of the redesign, allowed to touch the feed (¶28), and small enough to ship early.
From S1's root causes: the viewer's size snap between orientations, the wrap-around on swipe
back, the overshoot, the heart's late animation, and the caption clamp from two lines to
four (D11). `superpowers:systematic-debugging` first. Each fix with the test that pins it, in
its own commit, `npm run visual` after. The feed's own viewer is the regression to watch.

---

## Operational context

So none of it is explained twice. It matches the collection campaign's, plus what has been
learned since.

- **Repo** `/Users/sanan/Documents/rv-connect`, branch `main`, no feature branches. Commit as
  each coherent piece lands, with its test, its `progress.md` entry and its doc edits inside
  the same commit. **Do not push**: a push is a deploy to both Vercel projects. Commit
  messages: plain conventional, 150 words at most, no AI attribution of any kind.
- **Several Claude sessions share this one checkout.** Uncommitted changes you did not make
  are someone's work in progress (today: `scripts/qa/fix-campaign.test.mjs`). Stage by
  pathspec, `git commit -F - -- path/one path/two`; never `git add -A`, `-a`, stash, reset,
  checkout or clean. Do not kill a dev server or build you did not start.
- **The gate** is `npm run check` (about 30 s idle, minutes when another session is
  building). `npm run visual` after any UI change, **never concurrently with check** (two
  spurious whole-page diffs on 2026-08-29). Read the diff before ever running `visual:update`.
- **Dev server** `npm run dev` on `http://localhost:3000`; start it in the background if it
  is down. `mv .next .next-stale-$(date +%s)` if every route 404s.
- **Signing in from the `chrome-devtools` MCP**: it cannot sign itself in. Use
  `scripts/qa/_dev-login.mjs`, which posts `DEV_LOGIN_SECRET` from Node and hands the cookie
  to the browser; do not POST the secret from `evaluate_script`. `npm run screenshot:auth --
  "<url>" [--mobile]` and `npm run verify:shot <route> <out.png> [mobile]` for shots on the
  record, both signed in as the admin account. `PUPPETEER_EXECUTABLE_PATH` to the real
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

**All five below were answered on 2026-09-05; his words are ¶51 and ¶52 of the brief and
are repeated under "Owner answers".** The questions stay here so the answers can be read
against what was asked. New questions for him go at the end of this section, in the same
five-line shape, with a default on each.

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

- Q1: ultracode is mine to allocate. Allocated in "The sessions" (D16): S0, S3 and M1.
- Q2: throwaway Catch-ups are allowed, and so is anything else needed. His emphasis is on
  seeing every state and every sequence, which is now D34 and the storyboard block in S1.
  The hazard in F14 (notifications to real members) is mine, not his, and D33 answers it:
  live throwaways hold only the owner and Jerry; variety comes from fixtures.
- Q3: both kinds, together, D28. His extra sentence about late joiners went into D4.
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
assembler. **The four verifiers finished; the other eleven failed on the owner's usage limit
("resets 7:10pm IST") before doing any work.** So the prior-art sweep has not happened and
the ledger has not been checked. The workflow is resumable with its cached verifier results:
script `~/.claude/projects/-Users-sanan-Documents-rv-connect/b1b1a5d8-1080-406a-ba71-fbca3459a4a8/workflows/scripts/catchups-rework-s0-verify-and-prior-art-wf_75c20c60-8e8.js`,
run id `wf_75c20c60-8e8`; resuming replays the verifiers from cache and runs the eleven
live. If S0's session is gone, S2 runs the same eight shapes from its own section above.

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
bracketed original its own header promised ("give up", "batch of catch-ups", "pile",
"onto", "the feature of", "after the second", "should be in" read as "could be in", supplied
words such as "middle", "format", "width", "the text"). Every one was folded in: hedges and
tags restored, reversals restored, the raw word kept inline with the guess in brackets, and
the header rewritten to say what the conventions actually are (labels capitalised, numerals
as spoken, British spelling in the spoken parts) and to record the check. The lesson for
every later relay of his words is now the second paragraph of the writing-for-agents skill's
"Whose words" section: a hedge is content.

**Also in this half.** His answers to the five questions were recorded verbatim (¶51, ¶52,
"Owner answers") and read into D4, D16, D23 and D28 to D35; S1 gained the storyboard block
(D34); S3 and M1 gained their ultracode shapes; S4 gained the fixture switch and the pressure
room; F13 and F14 were added.
