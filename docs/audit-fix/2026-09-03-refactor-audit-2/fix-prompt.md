# Refactor audit 2 — fix session prompt

**@ this file and invoke `/campaign`.** That is the whole handover. The skill is the protocol
for running this campaign: front-load every question the owner must answer, then work the phases one
after another, one worker per chunk, verifying each worker's output yourself before the next one
starts. It reads the campaign board below to know where to pick up, and writes to it before it ends.

Doing it by hand still works — read this file, do the next unfinished phase, update the ledger at the
bottom before you end — but then the owner has to start the next session himself, which is exactly
what the skill exists to stop.

Audit: `docs/audit-fix/2026-09-03-refactor-audit-2/`. `report.md` is the deliverable — read §2 (the
phased plan), §4 (the owner's questions) and §5 (things you must not "fix"). The per-finding evidence
is in `work/agents/<territory>.md`, indexed in `work/findings-index.json`. The adversarial verdicts
are in `work/verify/`.

---

## Read this before you touch anything

**The findings are right and their line numbers are not.** 84 of the 369 findings were re-tested by a
hostile reader whose instruction was to refute. **None was refuted. Forty-five carried a wrong
detail** — an off-by-two range, a miscounted call site, a pin named in the wrong test file. Assume the
same ratio holds for the 285 findings no adversary reached. **So: trust the finding, open the file,
re-derive the range.** Never apply a stated line range without reading it.

**Two standing warnings that apply to whole classes of finding, not single rows.**

1. **Every "no caller passes this prop" claim needs a lab re-grep before you act.** Two sub-findings
   were refuted for exactly this: `GetInTouch` has seven call sites, five of them lab profile-variant
   rooms, and two pass the props the finding calls dead; `AdmissionStamp`'s `className` is passed by
   two more. The lab is typed and compiled — deleting those props fails TypeScript. Several finders
   grepped non-lab callers only.
2. **Every `prisma/schema.prisma` line number in the `data-layer` report is wrong** — the content is
   right, the coordinates are off by 85 to 130 lines. A verifier wrote the corrected map at the end of
   `work/verify/data.md`. **Use that map, not the report's citations.**

Seven verified corrections change a *recommendation*, not a citation. They are folded into §2 already,
but they are the ones that would have bitten you:

1. **`admin-analytics-07` — do NOT do the one-line `after()` move.** `touchLastSeen` calls
   `await headers()`, which throws inside `after()` in a Server Component. Its error handler is silent
   in production, so the naive fix breaks presence and tells you nothing. Read the headers during
   render, pass the facts in.
2. **`auth-edge-01` — `hint` is `FloatArea`'s prop, not `FloatField`'s.** The finding's "use
   `trailing` instead" alternative does not exist.
3. **`dead-code-07` — the stated range `:112-122` includes `sectionVariants`, which is live** at
   `:249`. Deleting it as written breaks the landing hero's stagger.
4. **`media-viewer-09` — `IDLE_MS` never moved from 2.6 s to 3.6 s.** Drop the instruction to put it
   "back".
5. **`bundle-build-05`** — its `/welcome` half is superseded by `directory-profile-03`; take only the
   `person-detail.tsx:25` half. The figure is 115.7 KB, not 126 KB.
6. **`duplication-05`** — passing `m.index` to `balancedBody` coerces a number through `text.match()`
   and silently matches elsewhere. Pass the RegExp it already accepts.
7. **`dependency-diet-03`** — `phase9-probe.mjs:39` is **already failing today**, and the claimed
   saving on the security status board does not exist.

**Do not re-propose what two audits have now refuted.** §5 of the report is binding: the
`withMember`/`withAdmin` action-gate wrapper (`gate-coverage.test.mjs` forbids a non-async export in a
`"use server"` file), a `tsconfig` `exclude` of the lab (Next's generated route types pull every page
back in — measured twice), the comment mass, the shadcn kit, the C-189 preamble clones, the lab↔shipped
clones. If you think you have new evidence, put it in the ledger before you act on it.

**House rules that apply to every commit here**: work on `main`, no branches. `npm run check` before
every commit, and never at the same time as `npm run visual`. Stage by pathspec — `git commit -- <paths>` —
because another session may share this tree. One revertable change per commit: the code, its test, the
`progress.md` entry and the doc edit ride together; no trailing `docs:` commit. 150 words is the hard
ceiling on a commit message. Pushing is a deploy: **ask first.**

---

## Campaign board

Where the campaign is, in the order the phases run. **This is the resume anchor**: a session that
dies mid-run costs nothing, because the next one reads this table and starts at the first phase that
is not `DONE`. Update it before you end, in the same commit as the work. Status is one of `DONE`,
`PARTIAL`, `OPEN`, `OWNER-GATED`, `DECLINED` — `scripts/qa/campaign.test.mjs` fails on anything
else. The prose under "The order to work in" is the long version of this table; where they disagree,
fix the table.

| Phase | Status | Rows left | Blocked on |
|---|---|---|---|
| A — free money | DONE | A18 folded into B10, A19 declined | — |
| B — bundle levers | DONE | B9 measured and reverted | — |
| C — the query floor | DONE | C11 done differently; read the ledger | — |
| E — de-duplication that closes a drift | PARTIAL | E7b, E8, E11 (mascot + UI-kit + collection tails), E12's `catchups-02` | **E5, E6, E12 (bar catchups-02) and E11's feed/admin/directory halves are DONE 2026-09-07.** E7b needs `TURNSTILE_DEV_CHALLENGE=1` + a dev-server restart. `catchups-02` and `catchups-07/08/09` are **PARKED**: a peer session is rebuilding Catch-ups in this tree |
| D — switched-off subsystems | PARTIAL | D5, D6, D7 (bounceKind + the 9 indexes), D9 | **DONE 2026-09-07: D1, D4, D8, D11 (bar its two Catch-ups halves).** D2 DECLINED (Q1 keeps the showcase), D3 DECLINED (Q3). **D10 PARKED** — never explicitly asked; it is a close-out question. **No DDL**: code stops writing, migration files land unrun, commands go to him at the close |
| F — hygiene, in one pass, last | OPEN | all | runs after D. **The reduced-motion row is DECLINED (Q11)** and DESIGN-SYSTEM §7 is rewritten instead. Q10, Q13, Q20, Q21, Q22 all answered |
| H — letters get Report, Edit and Delete | OPEN | all | new work, from Q15 = (b). A write path: `write-path-reviewer` on the diff |
| G — architecture and taste | PARTIAL | G1 + G7 only (the demo exclusion, Q23) | **G3, G4, G5, G6, G10, G11 are PARKED by Q27** — written up in `docs/planning/FEATURES.md` instead of built |

## Owner questions

**Asked 2026-09-05. Twenty-eight questions.** They cover every decision left in this campaign: the
eight big ones from the report, the fifty-row table under them, and each phase's own gate. Sixty-one
separate asks collapsed into these twenty-eight — the audit put several of them to you three times in
three places.

**Every one has a default, so you can answer the whole batch in one sentence** — for example:
*"go with your defaults except 8 and 12, do (a) on both."* If you say nothing at all I will take
every default and the campaign finishes without you.

Where a question is about information in the database, **I have already run the check** and the real
numbers are in question 18. Nothing is deleted from the database by me in any case: that command is
handed to you at the end.

---

### Things a member would see

**1. The switched-off section on the front page.**
- **What I'd change:** delete eleven files, about 2,500 lines, that draw a large showcase section for the front page. It has been switched off behind a flag for months, and about a third of it is not even connected to the flag — nothing anywhere calls it.
- **What you'd notice:** nothing today. It is not on screen and it sends nothing to members.
- **If I guess wrong:** you lose a design you may have wanted to bring back. It is in the project's history, so it is recoverable, but not in five minutes.
- **Options:** (a) delete it  (b) keep it switched off  (c) switch it ON and let me check it for speed first.
- **If you don't reply I'll do:** (b). It costs nothing where it is, and this is the second audit in a row to ask you. *(rows: D2)*

**2. The feed's sort and date filters.**
- **What I'd change:** delete the code behind "newest / oldest" and "posts from the last week or month" on the feed.
- **What you'd notice:** nothing. Those controls stopped being on screen on 28 June, when the search pill moved to the top of the page. Nobody can reach them.
- **If I guess wrong:** if you wanted them back, they would be rewritten rather than switched on.
- **Options:** (a) delete  (b) leave the code there, switched off  (c) put them back on the feed.
- **If you don't reply I'll do:** (a). *(rows: D1)*

**3. Song links on Catch-up answers.**
- **What I'd change:** remove the half-built feature that attached a song to a Catch-up answer.
- **What you'd notice:** nothing. You had it taken off the answer form on 25 July, and none of the 142 answers ever used it. But the site still calls out to Spotify when an answer is saved, and still keeps three empty fields per answer.
- **If I guess wrong:** if you want songs on Catch-ups later, it gets rebuilt.
- **Options:** (a) remove it  (b) keep it plumbed in case you want it back.
- **If you don't reply I'll do:** (a). *(rows: D3)*

**4. The older photo-approval screen.**
- **What I'd change:** delete the second, older screen for approving photographs, the one on the content page. The review room replaced it two days after it was built.
- **What you'd notice:** nothing, if you approve photographs in the review room. If you still use the old page, you would lose it.
- **If I guess wrong:** you lose the screen you actually use — recoverable from history in about ten minutes.
- **Options:** (a) delete the old one  (b) keep both.
- **If you don't reply I'll do:** (a). *(rows: D4)*

**5. Photographs on Catch-up answers are smaller than on the feed.**
- **What I'd change:** draw photographs attached to a Catch-up answer at the same size the feed draws them.
- **What you'd notice:** photographs in Catch-up answers get bigger.
- **If I guess wrong:** the Catch-up page feels heavier than you wanted; it is one number to put back.
- **Options:** (a) match the feed  (b) leave them small.
- **If you don't reply I'll do:** (a). *(rows: #19)*

**6. Photographs from older phones get saved smaller, silently.**
- **What I'd change:** there are two ways a photograph reaches the Collection. The fast one keeps it at full size. The slower one, used when the fast one cannot run, shrinks it a lot first. I'd make the slow one keep full size too.
- **What you'd notice:** a few photographs would be sharper. Uploading from an older phone would take longer.
- **If I guess wrong:** slower uploads on old phones, for sharpness nobody asked for.
- **Options:** (a) keep full size on both  (b) leave it but tell the member it was saved smaller  (c) leave it exactly as it is.
- **If you don't reply I'll do:** (a). *(rows: #20)*

**7. The small pop-up help bubbles.**
- **What I'd change:** the site has two different pieces of machinery drawing small help bubbles, plus a third one hand-built for the verified tick. I'd put all three on the same one.
- **What you'd notice:** nothing — they would look exactly as they do now. The audit suggested instead swapping the Catch-up one for the browser's own plain grey box, which saves about 17 KB on that page but looks nothing like your site.
- **If I guess wrong:** a bubble looks slightly different somewhere and I would catch it in screenshots.
- **Options:** (a) one machine, same look everywhere, no saving  (b) plain grey browser box on Catch-ups, saves 17 KB there  (c) leave all three alone.
- **If you don't reply I'll do:** (a). *(rows: G2, #7)*

**8. The "install this on your phone" tile.**
- **What I'd change:** the tile offering to install the site as an app currently shows only to you, on your own profile. It has been that way since 22 August, when you said "for now only show it for admins". Showing it to everyone is deleting three words.
- **What you'd notice:** members on phones would start seeing it on their own profile.
- **If I guess wrong:** members see a tile before you were ready to show it.
- **Options:** (a) show everyone  (b) keep it to you.
- **If you don't reply I'll do:** (b), because only you know whether it is ready. *(rows: #10)*

**9. The guide has a front page that nothing links to.**
- **What I'd change:** there is a contents page for the guide, and the only way to reach it is from one of its own child pages. I'd add a link from the account menu.
- **What you'd notice:** a new line in the account menu.
- **If I guess wrong:** a menu item you did not want; one line to remove.
- **Options:** (a) link it from the account menu  (b) leave it unreachable  (c) delete the contents page.
- **If you don't reply I'll do:** (a), with a screenshot. *(rows: #39)*

**10. Two buttons that say "Back to settings" when there is no settings page.**
- **What I'd change:** the dark-mode page has two buttons labelled "Back to settings". There is no settings page any more — a request to it gives an error page. The buttons work; they just go back to wherever you came from. I'd relabel them.
- **What you'd notice:** the buttons would read "Go back".
- **If I guess wrong:** two words are wrong; trivial to change again.
- **Options:** (a) "Go back"  (b) leave the label  (c) your own wording — tell me and I'll use it.
- **If you don't reply I'll do:** (a). *(rows: F / member-surfaces-10)*

**11. Movement for people who asked their phone for less of it.**
- **What I'd change:** two places still animate for someone who has switched on "reduce motion" on their phone. One of them argues in its own notes that it is a deliberate exception.
- **What you'd notice:** on the "page not found" screen, and for the small bird in the front-page footer, those members would see stillness.
- **If I guess wrong:** a little charm is lost for the people who explicitly asked for less movement.
- **Options:** (a) both go still  (b) only the error page goes still, the footer bird keeps its exception  (c) leave both.
- **If you don't reply I'll do:** (a). *(rows: F / DESIGN-SYSTEM §7)*

**12. The icons carry six thicknesses and we draw one.**
- **What I'd change:** the decorative icon set ships every icon in six thicknesses, and each page carries thicknesses it never draws. Trimming saves roughly 21–26 KB on every page.
- **What you'd notice:** nothing if it goes right. If it goes wrong, an icon somewhere is drawn at the wrong weight and looks off.
- **If I guess wrong:** an icon looks wrong on a page I did not screenshot.
- **Options:** (a) do it and screenshot every page that carries an icon  (b) leave it.
- **If you don't reply I'll do:** (b). It is a visible risk for an invisible gain, and this is meant to run while you sleep. *(rows: #18, #48)*

**13. Three heading sizes that are not on your scale.**
- **What I'd change:** three headings are hand-typed at 27, 26 and 24 pixels instead of using the sizes your design system defines. I'd move all three onto the nearest defined size.
- **What you'd notice:** those three headings shift by one or two pixels.
- **If I guess wrong:** a heading looks a touch small or large on one page.
- **Options:** (a) move all three onto the scale  (b) keep the pixels exactly and just give them a name so they stop being retyped  (c) leave them.
- **If you don't reply I'll do:** (b) — same pixels, one name. *(rows: #31)*

**14. The About page.**
- **What I'd change:** nothing, unless you want something. It was called "indefinitely procrastinated" in the last audit and is unchanged.
- **What you'd notice:** nothing.
- **If I guess wrong:** nothing.
- **Options:** (a) leave it  (b) tell me what it should say and I'll build it.
- **If you don't reply I'll do:** (a). *(rows: #9)*

**15. Letters have no way to report, edit or delete.**
- **What I'd change:** nothing without you. Every other kind of content can be reported by a member and edited or deleted by its author; a letter cannot.
- **What you'd notice:** if we added them, letters would get the same three controls posts have.
- **If I guess wrong:** either a gap stays open, or controls appear on a page you wanted kept plain.
- **Options:** (a) leave it as it is  (b) add all three  (c) add reporting only.
- **If you don't reply I'll do:** (a) — this is a product decision, not a cleanup. *(rows: #11)*

---

### Things only you would see, in the admin area

**16. The admin email list would change if I merge two copies of it.**
- **What I'd change:** there are two nearly identical lists of sent email in the admin area. Merging them means one of the two changes to match the other.
- **What you'd notice:** on one of those screens the dates would switch from "2 September" to "3 days ago", and every row would gain two buttons — Try again and Clear.
- **If I guess wrong:** a screen you use becomes busier and harder to read.
- **Options:** (a) merge and accept the change  (b) leave the two alone.
- **If you don't reply I'll do:** (b). *(rows: E11 / admin-analytics-05)*

**17. Admin bits and pieces nobody can open.**
- **What I'd change:** delete a house picker used only in the test lab, a photo grid for a tab that does not exist, the "Start one" row you had removed on 21 August, and a handful of filters with no way to reach them.
- **What you'd notice:** nothing. Each has been checked for anything that calls it.
- **If I guess wrong:** nothing I can see.
- **Options:** (a) delete them  (b) leave them.
- **If you don't reply I'll do:** (a). *(rows: D8, D11)*

---

### Information the database keeps that no screen ever shows

**18. Which of these should stop being stored?**
- **What I'd change:** stop writing information nothing reads, and hand you a one-line command per item to remove it from the database.
- **What you'd notice:** nothing. I ran the count on your real database and on the demo before asking — the numbers are below.
- **If I guess wrong:** removing a column is permanent, which is exactly why **I never run that command myself**. You get them at the end, and you decide.
- **Options:** (a) stop writing them and give me the removal commands at the end  (b) stop writing them but keep every column  (c) leave it all alone.
- **If you don't reply I'll do:** (a) for the empty ones, (b) for everything else.

| What it holds | Real database | Demo | What I'd do |
|---|---|---|---|
| Two old ways of tagging Collection photographs | **0 of 1,749** | 0 | stop writing, offer you the removal |
| Song title / link / artwork on Catch-up answers | **0 of 142** | 0 | stop writing, offer you the removal |
| Which group a post belongs to (Groups was removed) | **0 of 20** | 0 | stop writing, offer you the removal |
| Why an email bounced | **0 of 55** | — | stop writing, offer you the removal |
| Whether a photograph is black and white | **3 of 53 are true** | 0 | stop computing it; it can be worked out again from the picture. Removal only if you say so |
| First-seen / last-seen on a viewed item | **217 of 217 filled** | — | written on every view, read by nothing. **Keep** — it is members' reading history and the notes promise a feature |
| The time an analytics snapshot was captured | **561 of 561 filled** | — | filled by default, read by nothing. Keep, comment why |
| When a photograph was approved, and by whom | **1,749 of 1,749 filled** | — | **Keep.** It is a real record even though no screen draws it |
| The two older "current city" / "second city" fields | **56 and 5 of 70 members** | 2 of 40 | **Keep. This is members' own data.** The audit called them legacy; the count says they are not empty. Nothing here touches them |

*(rows: D5, D6, D7, D9, #14, #27, #28)*

---

### Housekeeping nobody would ever see

**19. The 43 packs of AI instructions sitting in the project.**
- **What I'd change:** the project carries 43 packs of instructions for AI assistants — 619 KB, most untouched since 30 March, and fourteen of them older copies of things already installed elsewhere. I'd delete the fourteen duplicates and give you a one-line command to copy the rest into your personal folder, where they would work in every project instead of only this one. I am not allowed to write outside this project, so the copying is yours.
- **What you'd notice:** nothing about the website, and nothing about how your sessions work.
- **If I guess wrong:** a pack you wanted is in the project's history.
- **Options:** (a) delete the fourteen duplicates only  (b) delete the duplicates and remove the rest from the project too, after I give you the copy command  (c) leave them.
- **If you don't reply I'll do:** (a). *(rows: #4, #26)*

**20. The session log is the fourth-biggest file in the project.**
- **What I'd change:** it is 8,567 lines and grows about 550 a day. A rule already exists, written down in two places, saying a finished month moves to its own file — and nothing makes it happen. August finished a week ago and has not moved. I'd move it and add a check that fails if a month is ever left behind again.
- **What you'd notice:** nothing. Nothing is deleted, only filed by month.
- **If I guess wrong:** nothing.
- **Options:** (a) run the rule and add the check  (b) also flip it so the full entry always goes to the month file and the main log keeps one line per session  (c) leave it.
- **If you don't reply I'll do:** (a). *(rows: #5)*

**21. Finished audits are more than half your documentation.**
- **What I'd change:** when an audit closes, delete its working notes and keep a short pointer. The project's history keeps the rest. That is what was done for the bug audit in August.
- **What you'd notice:** nothing.
- **If I guess wrong:** the notes are in history.
- **Options:** (a) make it the rule  (b) keep everything.
- **If you don't reply I'll do:** (a). *(rows: #6)*

**22. Reference screenshots pile up, and a scratch folder never empties.**
- **What I'd change:** 101 MB of reference screenshots have gone into the project's history since 19 August, and five full-page ones are more than half the current set. Separately, the throwaway screenshot folder is 153 MB and nothing ever clears it. I'd put a size limit on the first and add one line to the end-of-session routine for the second.
- **What you'd notice:** nothing.
- **If I guess wrong:** nothing; both are recoverable.
- **Options:** (a) both  (b) just the throwaway clean-up  (c) neither.
- **If you don't reply I'll do:** (a). *(rows: #8)*

**23. The design lab, the public demo, and 63 font files.**
- **What I'd change:** your rooms of design experiments are built and deployed with the site. They cost about 12 seconds of every build and 9.7 MB of every deploy, and they drag 63 Google font files along for two rooms you have already archived. Members are not sent lab code, but 49 of 52 pages are a hair smaller without it. I'd keep the lab in your own site — your Collection tests depend on one of its rooms — and leave it out of the public demo only.
- **What you'd notice:** nothing on your site. The public demo would stop carrying the lab.
- **If I guess wrong:** the demo loses a lab you might have wanted visitors to browse.
- **Options:** (a) out of the demo only  (b) leave everything as it is  (c) out of both — but this breaks your Collection tests, so I'd rather not.
- **If you don't reply I'll do:** (a). *(rows: G1, G7, G8, #1)*

**24. Three lab rooms that have finished their job.**
- **What I'd change:** the crop room calls itself throwaway, but the Collection room now borrows its sample images; the Collection swap room and the focus room are both done. I'd move the sample images somewhere permanent and mark all three as archived in the lab list.
- **What you'd notice:** nothing on the site. Those three would move to an archived section of the lab index.
- **If I guess wrong:** you open a lab link and find it filed differently.
- **Options:** (a) archive all three  (b) delete them  (c) leave them.
- **If you don't reply I'll do:** (a). *(rows: #21, #22)*

**25. One-off scripts that have done what they were built for.**
- **What I'd change:** retire an investigation script whose ten investigations are all closed, and an old sign-in probe that has been failing for a week against a table that no longer exists. Keep the photo-album importer, because rebuilding from an album is a thing you might do again. One check the audit wanted has already been run: **nothing is stranded in your photo storage — zero files, zero megabytes.**
- **What you'd notice:** nothing.
- **If I guess wrong:** a script you wanted to re-run is in the project's history.
- **Options:** (a) retire the finished ones, keep the album importer  (b) retire all of them  (c) keep everything.
- **If you don't reply I'll do:** (a). *(rows: #23, #24, #25, #40)*

**26. Everything I am planning to leave exactly as it is.**
- **What I'd change:** nothing at all, on any of these. Say the number if you disagree with one.
- **What you'd notice:** nothing.
- **If I guess wrong:** we do it in a later session.
- **The list:** the login bird stays; the 51 bird drawings stay as they are rather than becoming one file; the Compare tab in analytics stays; the costs card keeps its three copies; the letterhead's "keep in step" header stays; the "group" wording in four Catch-up refusals stays; the lab keeps borrowing the site's animation settings; the email, toast, animation and id libraries all stay; both browser-testing toolkits stay installed; the city-merging scripts stay; the Catch-ups file is not split; draft status and Catch-up titles are unchanged; the public pages are not made to pre-render tonight; and the "person row" sweep in its own spec is left for a session of its own.
- **If you don't reply I'll do:** leave all of them. *(rows: #9, #12, #15, #16, #17, #29, #30, #32, #33, #34, #36, #37, #38, #47, #49, #51, #52)*

---

### How far to go, and the two things only you can do

**27. The bigger rebuilds — how far do you want me to go tonight?**
- **What I'd change:** five larger pieces where the code is reorganised and the site is meant to look identical: the profile letterhead (about 900 lines, half of which every stranger's visit loads for an editing form they will never open), the Collection page's inner workings, the composer's "+" menu, some small building blocks kept alive for one lab room, and the way photograph subjects are searched.
- **What you'd notice:** nothing if each goes well. These are the most-edited files in the project, so the honest risk of something visibly breaking is real.
- **If I guess wrong:** something on a busy page breaks and I undo it — but you might see it before I do.
- **Options:** (a) none tonight  (b) the two safest only — the small building blocks and the letterhead's first move  (c) all five.
- **If you don't reply I'll do:** (a). The rest of tonight's list is already a full night's work, and these want you awake. *(rows: G3, G4, G5, G6, G10, G11)*

**28. Two things I cannot do for you.**
- **What I'd change:** nothing — these need your hands.
- **What you'd notice:** **(i)** the thing that stops someone hammering the sign-in form is switched off unless two keys are set in your hosting dashboard, and no session can see your production settings. Please confirm they are there. **(ii)** nothing I do tonight reaches the live site: I commit, you push. I will not push.
- **If I guess wrong:** on (i), the sign-in form has no rate limit and nobody would know.
- **Options:** (i) confirm the keys are set, or tell me to write it up as an open risk.
- **If you don't reply I'll do:** write it into the bug list as an open item. *(rows: #45)*

---

**The one line that restarts everything:** reply with *"defaults"* — or *"defaults except 8 and 12,
do (a) on both"*. Anything you do not name, I take the default for.

## Owner answers

**2026-09-07. His reply, verbatim:**

> 3. fixing that separately leave it alone.
> 5b, 9b but mark it as a bug in bugs, 11 reduce motion shouldn't be considered anywhere. I know these people. they'd want to see these fun things. don't make anything boring because they have rduced motion on. 13 which headings. 15 b. 16a. 17 delete the whole house picker lab we don't need it. 18 delete all and stop writing info except to the First-seen / last-seen on a viewed item, Time an analytics snapshot was captured, When a photograph was approved, and by whom. i'd like to know what they are as well I don't get it. but they seem useful so let's keep them for now. 20b. 22 there's two different folders of them. delete all the screenshots in both and make sure all future screenshots only fill into one folder. delete the other folder permanently. 27 would need better descriptions to decide but not for now. however keep it somewherre so I know it's pending. 28i don't know what you're saying. should be fine.
>
> rest defaults are fine

**The reading. Argue with this, not with the paragraph above.**

| Q | His answer | What that means here |
|---|---|---|
| 1 | default | **(b)** — the landing showcase stays, switched off. Do not delete it. Second audit running; it is decided as "keep" until he says otherwise. |
| 2 | default | **(a)** — delete the feed's sort and date filters. D1 proceeds. |
| **3** | *"fixing that separately leave it alone"* | **D3 is DECLINED.** The Spotify/song pipeline is being handled by the Catch-ups rework campaign. **Touch nothing** — not the columns, not `song-attachment.tsx`, not the oembed fetch. **This overrides Q18's "delete all" for the three song columns**: they are the one item in that table that does NOT get dropped, because the campaign that owns them is live in this same tree. |
| 4 | default | **(a)** — delete the older photo-approval screen on `/admin/content`. D4 proceeds, and `image-purge-rule.test.mjs:253-264` gets re-pointed in the same commit (see the sequencing section). |
| **5** | *"5b"* | **(b)** — Catch-up answer photographs stay at their current size. Do not match the feed. (Also Catch-ups territory, also being reworked separately.) |
| 6 | default | **(a)** — the upload fallback stops shrinking; both paths keep full size. |
| 7 | default | **(a)** — all three help bubbles onto one piece of machinery, **look unchanged**. Not the plain browser box. |
| 8 | default | **(b)** — the install tile stays admin-only. |
| **9** | *"9b but mark it as a bug in bugs"* | **(b)** — leave the guide's contents page unlinked, **and file it in `docs/planning/bugs.md`** as a known gap. Two actions, not one. |
| **11** | *"reduce motion shouldn't be considered anywhere. I know these people. they'd want to see these fun things. don't make anything boring because they have rduced motion on."* | **Row DECLINED, and it becomes a standing decision.** Do not add a reduced-motion guard to `not-found.tsx` or `landing/footer-hoopoe.tsx`, or anywhere else. **DESIGN-SYSTEM §7 must be rewritten to say this**, in his words, or the spec and the code disagree — which is the exact drift Phase F exists to close. **Conservative half, taken deliberately: nothing that already honours reduced motion is stripped out.** He answered a question about adding two guards; removing every existing guard across the app is a far larger change he did not ask for, and it is offered back to him at the close. |
| **13** | *"which headings"* | He asked a question rather than answering. **Answered in the close**; meanwhile take the stated default **(b)** — identical pixels, one name, so nothing moves while he decides. The shipped ones are all 26px: the dark-mode page (six), the two Catch-up join pages, and the Collection's contribute room. 24px and 27px survive **only in lab rooms**. |
| 14 | default | **(a)** — About page untouched. |
| **15** | *"15 b"* | **(b) — build all three: Report, Edit and Delete on letters.** This is a feature, not a cleanup, and it is the largest single piece of new work in the campaign. It touches a write path, so `write-path-reviewer` runs on the diff and the existing post-moderation gates are the model to copy. |
| **16** | *"16a"* | **(a)** — merge `MailCard` into `MailRows`. He has accepted the visible consequence: relative dates ("3 days ago") and two extra buttons per row on the screen that changes. E11's admin half is unblocked. |
| **17** | *"delete the whole house picker lab we don't need it"* | **(a) plus more than was asked.** Delete the dead admin branches AND `HousePicker` itself AND **its lab room**, registry line included. Not just the component: the room goes. |
| **18** | *"delete all and stop writing info except to [three named]. i'd like to know what they are as well I don't get it. but they seem useful so let's keep them for now."* | **Stop writing, and prepare the removal, for:** `Photo.area`, `Photo.freeTags` (0 of 1,749), `Post.groupId` (0 of 20), `OutboundEmail.bounceKind` (0 of 55), `Image.greyscale` (3 of 53, derived, recomputable). **Keep, and explain to him in plain English at the close:** `ContentView.firstAt`/`lastAt`, `MetricSnapshot.capturedAt`, `Photo.approvedAt`/`approvedById`. **NOT dropped, and never offered: `User.currentCity` and `secondaryCity`** — the table row he read said "Keep. This is members' own data. Nothing here touches them", so "delete all" cannot reach them; deleting 56 members' cities is not a thing he asked for. **And the three song columns are exempt via Q3.** **No DDL runs tonight** — the skill's hard stop holds. The code stops writing them, a dated file lands in `prisma/migrations-manual/`, and the one command to run it goes to him at the close. |
| 19 | default | **(a)** — delete the fourteen duplicate skill packs only. The rest stay in the repo; the copy-out command goes to him at the close (writing to his home folder is outside this repository). |
| **20** | *"20b"* | **(b) — invert the log.** The full session entry goes to the month's own file from now on; `progress.md` keeps one line per session. Move what is already there, and put the enforcing test under it so it cannot regrow. |
| 21 | default | **(a)** — a closed audit's working notes go, a pointer stays. Applies to this audit's own `work/` folder at the close. |
| **22** | *"there's two different folders of them. delete all the screenshots in both and make sure all future screenshots only fill into one folder. delete the other folder permanently."* | **Safe reading, taken deliberately, and told to him at the close so one word corrects it.** The two scratch folders are `e2e/.shots/` (**450 MB**, not the 153 MB the audit measured) and `.tmp-shots/`, which `scripts/dev/apple-edge/look.mjs:17` writes **into the closed repo root**. Empty both, repoint `look.mjs` at `e2e/.shots/edge`, delete `.tmp-shots/` and its ignore line permanently, and add the clean-up to the close-out routine. **`e2e/__screenshots__/` (13 MB) is NOT touched**: those are the committed baselines `npm run visual` compares against, deleting them makes the whole visual suite meaningless until regenerated, and there is no reading of "screenshots piling up" that is worth that. If he meant those too, it is one command to regenerate them. |
| 23 | default | **(a)** — the lab leaves the **public demo's** build only. It stays in the main build, because `/lab/collection` is the Collection's test fixture. The 63 font files go with it. |
| 24 | default | **(a)** — crop, collection/swap and focus rooms archived in the registry; the crop room's specimens move somewhere permanent first. |
| 25 | default | **(a)** — retire the closed investigations and the failing sign-in probe; **keep** the album importer. |
| 26 | default | leave every item on that list exactly as it is. |
| **27** | *"would need better descriptions to decide but not for now. however keep it somewherre so I know it's pending."* | **(a) — none of the five rebuilds tonight.** And a second obligation: write each of the five up properly, in the plain English he can actually judge, somewhere he will find it. Home: `docs/planning/FEATURES.md`, which is the parked-ideas file, with a pointer from the close. **This is a deliverable, not a note to self.** |
| **28** | *"28i don't know what you're saying. should be fine."* | He did not understand it, which is my failure, not his. **Safe branch: treat the rate limiter as UNCONFIRMED**, file it in `docs/planning/bugs.md` as an owner action, and re-explain it in one plain sentence at the close. "Should be fine" is not a confirmation that two keys exist in a dashboard neither of us can see. The second half stands regardless: **nothing is pushed.** |

**The order this campaign now runs in**: Phase E's remainder, then Phase D (minus D2 and D3), then
Phase F, then Q15's letters feature, then Q23's demo exclusion. Phase G's five rebuilds are parked
by Q27 and written up instead.

## The order to work in

Phases A → C are worth doing whatever the owner decides about the rest, and all three are done. Do
not start Phase D, G or any row marked T4 until the owner has answered §4. **Phase E is eleven rows
in; finish it (the rest of E5 and E6, then E7b, E8, E11, E12)**, and Phase F after it.

### Phase A — free money — **DONE 2026-09-05.** See the ledger. Start at Phase B.
Config scoping, two dependency removals, two pieces of broken QA tooling, and a set of orphan
deletions. What it actually returned: **−78,014 B of CSS raw (−9,072 gz) on every route**, −235
lockfile entries, −420,350 B tracked, one route, and four quality tools that start telling the
truth. `node_modules` did not move measurably; quote the lockfile count, not the disk figure.
A18 and A19 are the two rows not done — the ledger says why.

### Phase B — bundle levers — **DONE 2026-09-05.** See the ledger. Start at Phase C.
All thirteen rows. Median non-lab first load **1,094 -> 992 KB**; the five public routes are
**-149 KB each**. B9 was an experiment and it reverted; its numbers and the trap it found are in
the ledger and in `docs/TRAPS.md`. A18 landed inside B10, as Phase A said it would.

### Phase C — the query floor — **DONE 2026-09-05.** See the ledger. Start at Phase D or E.
All eleven rows. Nine measured routes fell from **216 statements to 161 (-25%)**; every
authenticated page in the app pays four fewer before its own. C11 was done differently from the
way it is written -- read the ledger before re-proposing it.

### Phase D — switched-off subsystems (owner-gated)
Nine subsystems that work and nobody can reach. **Every one that touches a database column carries a
`SELECT` in its report: run it first, paste the result into the ledger, then cut.** These are the rows
that move source lines; nothing before them does, much.

### Phase E — de-duplication that closes a drift — **PARTLY DONE 2026-09-05.** See the ledger.
**All five drifts this phase existed for are closed**: E1 (the upload client's timeout and the
Catch-up 5 MB pre-check), E2 (the avatar's blank-MIME HEIC), E3 (three of four emails in two
wordings), E4a (`import-album.mjs`'s missing demo guard). Also done: E4b, E7a, E9, E10a.
Also done: E4b, E5a, E6a, E6b, E7a, E9, E10a, E10b.
**Still open: E5 (the rest), E6 (the rest), E7b, E8, E11, E12** — read the ledger's "what E left"
before starting, especially its warning about E7b, which is not verifiable without an env change
and a restart.

### Phase F — hygiene, in one pass, last
Stale comment blocks in eleven territories, the documentation drift, and the two recurrence mechanisms
(`progress.md`'s archive rule and the audit-archive rule) that stop this list regrowing.

### Phase G — architecture and taste, one at a time
Nothing here starts until A–C are done and green.

---

## Outside your scope — hand these over, do not fix them here

The report's §2 tail lists correctness and security leads found while auditing. **They belong in
`docs/planning/bugs.md`, not in a simplification commit.** The exception already taken: ORCH-04, the
notification-retention divergence, which the owner answered mid-audit and which shipped as `74cc61a`.

---

## Sequencing and gate traps

These come from the verifiers' working notes (`work/verify/*.md`), not from the finding reports. Each
one is a thing that would turn `npm run check` red, or silently undo another row, if you did the rows
in the obvious order.

**Tests that go red when you delete the thing they pin.**
- Deleting `approvePhoto` / `approvePhotos` (D4) turns `src/lib/image-purge-rule.test.mjs:253-264`
  (C-074 / C-130) red. **Re-point that pin at `admin/review/actions.ts:89-102` in the same commit.**
  The finding claims no rule test covers it; the finding is wrong.
- `image-purge-rule.test.mjs` also pins *counts* across the whole of `collection/actions.ts`
  (`putAllOrNone == 2` at `:151`, `createPhotoRow == 2` at `:145`, `Promise.all([putImage == 0` at
  `:152`). So **`fresh-code-01`'s shared-ingest plan breaks it and `media-viewer-04`'s encode-only
  helper does not.** Do `media-viewer-04` first; treat `fresh-code-01` as the ambitious follow-up.
- `scripts-ledger.test.mjs` only sees a *new* script after `git add`, so a new shared module passes
  `npm run check` and then fails at commit unless its `scripts/README.md` row ships in the same edit.
  Its second test fails on any *deletion* until every backticked mention of the file leaves that
  README — prose included.
- `check.mjs`'s `findUnrunTests` reds the build if any test-shaped file under `src/` or `scripts/` is
  not named `*.test.mjs`. The `MIN_TEST_FILES = 60` floor is nowhere near binding at 102 files.
- `auth-first-frame.test.mjs:41` pins a literal class string; E9 must widen it in the same commit.
- `append-page.test.mjs:94` asserts `appendUnseen(` is present in `collection-client.tsx` **by path**,
  so G5's decomposition moves a pin the finding's list does not mention.
- **D5 (`area` / `freeTags`) breaks two files the finding's remediation list misses**:
  `scripts/dev/import-album.mjs:405` names both columns in an explicit `INSERT` column list, and
  `src/app/lab/collection/_archive.ts:147,149` constructs a `Photo` with them.
- Deleting the tour tooling (A6) also needs `scripts/qa/_dev-login.mjs:19`, which names
  `tour-mobile-verify.mjs` in prose.

**Rows that must travel together.**
- A7's allowlist deletion **must** also fix `scripts/qa/phase9-probe.mjs:39`, which hard-codes the
  advisory id and is already failing at HEAD.
- `scripts-e2e-ci` 03 + 04 + 15 are **one commit**: 15's `chromePath` and 03's viewport are parameters
  of 04's shared module.
- Four of `scripts-e2e-ci-10`'s nine README corrections (`:50`, `:118`, `:123`, `:126`) must ship
  inside findings 13, 05, 07 and 01 rather than in 10 itself.
- `bundle-build-01` and `dependency-diet-15` edit the same eight lines of `motion-features.tsx`.
- C2, C3 and C4 all touch `(main)/layout.tsx`. Order them: `data-layer-07(a)`, then
  `shell-primitives-03(a)`, then `admin-analytics-07`.

**Swaps that are not drop-in replacements.**
- `admin-analytics-05` (`MailCard` = `MailRows`): `MailCard` uses `formatDisplayDate` (absolute) where
  `MailRows` uses `formatTimeAgo` (relative), and `MailRows`' `showActions` renders *Try again* and
  *Clear* on **every** row. Swapping changes what an admin sees.
- `media-viewer-12`'s shared cross-dissolve needs a variant-key rename plus the stage's
  `pointerEvents` exit — the viewer's keys are `enter/center/exit`, the stage's are `enter/here/leave`.

**Fixes that would work against another row.**
- `duplication-17` must **not** be fixed by importing `clamp` from `hoopoe-kit` — that pulls in
  `common/motion` and works directly against B2's deferral.
- `lab-07` and `landing-mascot-avatars-03` are **one** owner decision, and one of `-07`'s four waiters
  lives inside the switched-off showcase. Use `-03`'s steps: they catch `protocol-audit.mjs:120-121`
  and `section-reveal`'s five lab consumers.
- `lib-core-config-05` must not add a **fourth** `.env` parser. `scripts/dev/_env.mjs` already exports
  `readEnv`/`loadEnv`, and the two parsers disagree on **values**, not just keys. Adopt `dotenv`.
- `lib-tests-05`'s pre-filter needs a new count guard, because
  `identity-row-overflow-rule.test.mjs` has none and the filter could silently empty its loop.
- **`collection-01`'s proposed `replaceState` fix is a proven no-op in Next 16.3.3.**
  `copyNextJsInternalHistoryState` (`app-router.js:84-95`) copies the internals tree even when `data`
  is null, and `navigateToUnknownRoute` is reachable only from `ACTION_NAVIGATE`, never from the
  `ACTION_RESTORE` a `replaceState` produces. Measure it in chrome-devtools first (count `?_rsc=` GETs
  against action POSTs after one bucket press) and **start the bisection at `router.refresh()` and
  PostHog, not at line 418.**
- **`dead-code-05`: do NOT drop `export` from `hoopoe-geometry.ts:32`** on the strength of the named
  imports. `src/app/lab/hoopoe-marks/_parts.tsx:25` re-exports `H` (`export { H, G } from ...`), which
  the finding missed by reading only the import block above it, so the change fails TypeScript and
  `npm run check`. Delete `H` from that re-export line in the same edit — nothing imports `H` from
  `_parts`. This is the audit's **one outright refutation**, and it would have cost a red build.

**Security-sensitive rows where verification changed the answer.**
- **`auth-edge-03` changes behaviour by one branch.** `humanPassValid` compares the whole
  `${ts}.${sig}` string, so `<ts>.<sig>.junk` is **accepted today** and would be refused after the
  merge. That is a correction on a signup gate, not a confirmation — decide it deliberately.
- **`auth-edge-02`'s stated gate is unsound.** Nothing anywhere pins `TICK_HUMAN_BOX` or
  `BOT_CHECK_BLOCKED` — `phase4-probe.mjs` does not assert those sentences. The only proof is a manual
  `TURNSTILE_DEV_CHALLENGE=1` pass on all three forms.
- **`auth-edge-08`: the dead lines are `next-auth.d.ts` 43, 44, 47 and 48 — not the contiguous 43-48**
  the summary implies. Lines 45 and 46 are the live `batchType` / `batchYear`.

**Two findings the find phase reported and verification refuted — do NOT fix them.**
- `feed-posts-07`'s poll-option whitespace hole **does not exist**: the pre-parse filter at `:155`
  strips whitespace-only options on every path, and the proposed fix would make a 1-option array fail
  Zod's `.min(2)` and refuse the whole `createPost` instead of silently dropping the poll.
- `duplication-03`'s blank-MIME HEIC is **safely refused** by `sniffImageType`
  (`upload-shared.ts:268-288`), which merely gives a misleading reason. Fix the message if you like;
  there is no hole.

**More gate traps found in the later waves.**
- **`catchups-15`'s fix will turn `npm run check` red**: `catchups-core.test.mjs:833-838` (C-141) pins
  the exact line it deletes.
- **`data-layer-11`'s remedy for `catchups-round-view.ts:103-113` would add a `verifyState` column
  that `letters/[id]/(read)/page.tsx:63-71` documents as deliberately absent for the same byline.**
  That file also already imports `IDENTITY_SELECT` at `:42`, contrary to the finding.
- **E1's merge**: take `media-viewer-06`'s line ranges and steps, keep `duplication-02`'s timeout
  rationale, drop `catchups-04(b)` as redundant — and gate on `upload-size-rule.test.mjs` **plus the
  C-182 pin at `catchups-core.test.mjs:844-874`, which neither report names.**
- **`feed-posts-14(b)` is refuted: decline the move.** Its premise is that this is the only
  `"use server"` file under `components/`; there are twelve.
- **Adopting `Opener` verbatim strips a border**: `answer-photos.tsx:68` also lacks
  `border border-border`, so `media-viewer-03`'s shared opener changes `post-card`'s pixels.
- **`data-layer-01` and `-02` have wider blast radii than stated**, which changes their tiering: `-01`
  walks into the post-visibility security pair and its pinned `post-visibility-rule.test.mjs`
  (`RULE_FACTS` at `:332`), and `-02` walks into `image-facts.test.mjs` plus `meanChroma`.
- **`directory-profile-15`'s diagnosis survives but both supporting facts are wrong**:
  `admin/people/actions.ts` does **not** import `adminDeleteUser`, and the four pins that hard-code the
  file path are `gate-coverage:219`, `admin-guard-rule:19`, `unattended-rule:305` and
  `scripts/qa/audit-status.mjs:246` — the last a check-gate script, not a test.
- **`directory-profile-02` (B7): the `/directory` visual baseline masks `main svg.touch-none`**, which
  `ssr: false` removes from the server HTML. Expect the mask to stop matching and update it knowingly.
- **`data-layer-10`: deleting the `loaded` parameter breaks C-174** at `profile-editor-rule.test.mjs:83`,
  and its export half is **ten** call sites, not one.
- **A11 (`docs-02`): do not overcorrect.** `media.md`'s 480 px / q72 thumbnail row is *right*; its
  1600 px / q80 row is right **for the FormData fallback only**; only `originalUrl` (3000 px) never
  existed. Document **two** Collection encode paths — direct is 40 MP at q100, fallback is 1600 px at
  q80 — or you replace one wrong fact with another. `TRAPS.md`'s flat "does NOT downscale" and
  `schema.prisma:270`'s `// 1600px` comment have the same gap.
- **`docs-01`: archiving audit 1's `work/` is not free** — `report.md` and `fix-prompt.md` cite it
  13 times; rewrite those citations in the same commit.
- **`lab-01`'s member-JS paragraph is refuted** — and so was my own stronger version of it. The lab is
  not free to members: 49 of 52 routes shrink without it, ~0.1 % on average, 23 KB on `/verify-email`.
  Do not cite "zero bytes"; see ORCH-02.
- **`lab-05` says delete `Sheared`. Do not** — it has three in-file uses at
  `lab/type/_specimens.tsx:101,118,144`.
- **`shell-primitives-12` says `THEME_COLORS` must stay exported. It need not** — the pin reads source
  text and never mentions `export`.
- **`dead-code-09` misdescribes one site**: at `photo-river.tsx:472` the render prop is
  `(p, i, cell)` and `p` **is** used; the unused parameter is the middle one.

**Ordering the later waves added.**
- `fresh-code-20` before `feed-posts-15` — its class strings live inside the region 15 wants to move.
- `fresh-code-07` and `fresh-code-21` both rewrite `directory-client.tsx` — one session. Take
  `fresh-code-07`'s `fullWidth` steps over `directory-profile-17e`'s, but note **both miss
  `people-list.tsx:122-123`**.
- `media-viewer-01` before `media-viewer-03` — 03's shared opener wants 01's preload module.
- `catchups-10`, then `catchups-03`, then `catchups-02`'s prompt-library half **and measure the home
  chunk**, because 02 turns `catchups-core` (922 lines) into a client value import.

**Rows whose stated saving is unproven or negative.**
- **`member-surfaces-13` may ADD bytes to `/support`.** Its premise is that `animate` / `useInView`
  already ship; across non-lab source they do not appear on that route. Measure before you swap the
  hand-rolled rAF count-up for `motion`.
- **`shell-primitives-14`'s shared `onDark` constant would visibly change a button**: love uses
  `text-white/85`, share uses `text-white/80`. Pick one deliberately and screenshot it.
- **`landing-mascot-avatars-15`'s suggested `takeOffRaw(0)` does not typecheck** — the signature is
  `(dir: 1 | -1 = 1)`. Widen it first.
- **`member-surfaces-02` (B12) saves ~22.6 KB for both components in one chunk, not ~44 KB.** The
  finder's chunk markers were JSX prop names that live in the caller's chunk; the honest proof is
  callee-body strings.
- **B2 and B3's route counts are both softer than the reports say.** Two verifiers disagree on how
  many routes B2 frees (23–25 vs 28), and B3's 8,508 B chunk is isolated on only 10 of the 26 routes
  that carry it. Quote a measured delta, never a route count × chunk size.

**Two things only the owner or a browser can settle.**
- `collection-08` and every other column drop want their `SELECT` run against **production and demo**
  before anything is dropped.
- Whether the stranded-originals dry run returns 0 — nobody in this audit could run it.

---

## Ledger

Update this every session. One row per phase attempted, with what actually happened — including what
you could not do and why.

| Date | Phase | Rows done | Measured result | Notes / what the next session must know |
|---|---|---|---|---|
| 2026-09-04 | — | audit closed | see `report.md` §1b | Nothing fixed yet except ORCH-04 (`74cc61a`). Verification covered 84 of 369 findings; the other 285 have orchestrator spot-checks only. |
| 2026-09-05 | **E — partial (11 of 15)** | E1, E2, E3, E4a, E4b, E5a, E6a, E6b, E7a, E9, E10a, E10b | **Every drift the phase existed for is closed.** Two upload surfaces gained the 60 s abort they lacked, so a phone that loses signal mid-upload no longer leaves the button on "Adding..." for the session; the Catch-up answer stopped refusing at 5 MB the ordinary phone photograph the shrinker exists to make uploadable; the settings avatar stopped missing a blank-MIME HEIC and telling the member "that doesn't look like a JPG"; the four emails stopped being written twice, and the two notices got back the CTA label their plain-text readers never had; `import-album.mjs` — the one script that writes photographs — got the demo-destination guard the other seven had. **Source: −619 / +976 across 48 files** (the +976 is mostly the two new test files, the new shared modules and the comments arguing the shared shapes; the de-duplication itself is roughly line-neutral, as the audit said it would be). Scripts alone: **−161 / +68**. **Two live defects came out with the de-duplication, neither of them the row's stated point**: `security-regressions.test.mjs` -- the sweep pinning C2, arbitrary unrecoverable R2 deletion, closed -- still found server-action files with the `git grep` shape C-189 removed from its sibling, so an untracked or single-quoted action file produced NO assertion rather than a failing one (proved with both probes); and `balancedBody` returned a function's RETURN TYPE instead of its body whenever that type was a bare object rather than a generic, which is the shape of `audienceWhere`, where the post-visibility author exemption is pinned. `npm run check` (102 tests, up from 101), `npm run visual` **25/25**, `npm run verify:crawl` **20/20** and every manual gate green. 11 commits, `2808ab4`..`08d8ac6`. | Read "What Phase E left, and what it corrected" below before starting E5. |
| 2026-09-05 | **C — complete** | C1, C2, C3 (both halves), C4, C5, C6 (both halves), C7, C8, C9, C10, C11 | Nine routes measured with `pg_stat_statements` against the same files at the phase's start commit (`cfdf82f`), minimum of two to four samples each: `/feed` **24 -> 19**, `/about` **12 -> 8**, `/collection` **27 -> 19**, `/directory` **21 -> 18**, `/letters` **15 -> 11**, `/admin/analytics?view=people` **38 -> 24**, `/profile/[id]` **25 -> 19**, `/letters/[id]` **21 -> 16**, `/catchups/[id]` **33 -> 27**. Sum **216 -> 161, -25%**. Four of those come off EVERY authenticated page: the presence UPDATE, the duplicate unread count, and two from the Catch-up advance. Plus one fewer client action per page load (the bell's mount call). `npm run check`, `npm run visual` (25/25) and `npm run verify:crawl` (20/20) green at the end. 12 commits, `29582b3`..`ce223a0`. | Read the six rows below before Phase D. |
| 2026-09-05 | **B — complete** | B1, B2, B3, B4, B5, B6 (both halves), B7 (both halves), B8, B10 (+ A18 + media-viewer-03), B11, B12, B13. B9 measured and **reverted** | Non-lab first-load JS: median **1,094 -> 992 KB**, sum across 51 routes **53.10 -> 48.99 MB (-4.11 MB)**. `/login` 906 -> 756, `/` 899 -> 749, `/signup` 920 -> 771, `/welcome` 1,190 -> 1,042, `/letters/[id]` 1,116 -> 984, `/directory` 1,229 -> 1,126, `/about` 1,063 -> 963, `/collection` 1,104 -> 1,030, `/profile/[id]` 1,258 -> 1,199, `/feed` 1,224 -> 1,201. Lab sum 37.48 -> 36.70 MB. Post-hydration: the 72,472 B motion barrel chunk gone. Source: **-113 lines** net across the two de-duplications. Every row measured between two production builds; `npm run check`, `npm run visual` (25/25) and `npm run verify:crawl` (20/20) green at the end. 16 commits, `7c47594`..`387477a`. | Read the six rows below before Phase C. |
| 2026-09-05 | **A — complete** | A1, A1b, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A16, A17. **A18 deferred to B10, A19 declined** (see below) | CSS on every route **238,434 → 160,420 B raw**, 33,666 → 24,594 gz (−32.7% / −26.9%), measured between two production builds. Lab sheet 147,484 B on 48 routes, **0 non-lab**. Lockfile **1,083 → 848** (−235). Deps **33+18 → 32+17**. Tracked −420,350 B. Routes 52 → 51. Test files 102 → 101. `npm run check` and `npm run visual` green throughout; 21 commits, `e16c585`..`94f76d9`. | Read the four rows below before Phase B. |
| 2026-09-07 | **E — units 1-4; D — units 1-2** | E5, E6, E12 (bar `catchups-02`), E11's feed/notification, admin and directory halves; D1, D4, D8, D11 (bar its Catch-ups halves) | **Phase D removed a measured −390 and −563 source lines in its two units.** The feed's sort and time filters, the second photo-approval UI, `HousePicker` and its two lab rooms (owner's Q17, wider than the row asked), and four unreachable branches are gone; lab registry 48 → 46 routes. Phase E closed the QA-kit, test-kit, feed/notification, admin and directory duplications. `npm run check` 103 → **105 test files**, `npm run visual` **25/25**, `verify:crawl` **20/20**, all green at the end. ~30 commits, `4aff9c1`..`a0b54380`. | **Five defects were found by VERIFYING the workers, not by the audit**, and each is committed with its reasoning: the visual suite was crying wolf on a database write (band mask covered today's height, not the viewport's foot); `npm run screenshot` **printed "Screenshot saved" while writing a blank frame** of a page that never loaded; `toViewerImage`'s `isAdmin` and `replaceUserPlaces`' `userData` were both wider than their callers needed; and **a three-line fix commit truncated `progress.md` from 11,235 to 10,655 lines**, destroying five sessions' history — rebuilt from git in `a0b54380`. **Read a worker's commit STATS, not its report.** |
| 2026-09-05 | **— (campaign gate 1)** | none — questions only | **Every Phase D column `SELECT` run, against production AND demo.** Two of them change an answer the audit had already reached: `User.currentCity` / `secondaryCity`, filed as "two legacy city columns", hold **56 and 5 of 70 members' own data** (demo 2 of 40) — they are not legacy in the sense of empty, and nothing in this campaign may touch them; and `Image.greyscale` is **3 of 53 true**, not zero, so its drop loses a computed flag rather than nothing (recomputable from the picture, so still safe, but say so). Confirmed empty and safe: `Photo.area` and `Photo.freeTags` (**0 of 1,749**), the three Catch-up song columns (**0 of 142**), `Post.groupId` (**0 of 20**), `OutboundEmail.bounceKind` (**0 of 55**). Confirmed FULL and therefore keepers: `Photo.approvedAt`/`approvedById` (**1,749 of 1,749**), `ContentView.firstAt`/`lastAt` (**217 of 217**), `MetricSnapshot.capturedAt` (**561 of 561**). 28 questions written to `## Owner questions`, merged down from 61 asks. | The three "still unrun" lines in the ledger below were wrong and are corrected. **No DDL was run and none will be**: the removal commands go to the owner at gate 2, per the skill's hard stop. |

### What Phase E left, and what it corrected

**Rows still open**: the rest of E5 (one bootstrap, one dev-login, one answer to "which Chrome" --
note that **eleven bare `config({ path })` calls still print dotenv 17's banner** on the stdout of
every hand-run pass; `_env.mjs` passes `quiet: true` and does not), the rest of E6 (`lib-tests-05`'s
pre-filter, which needs a new count guard), **E7b** (`auth-edge-02`, the Turnstile sentinel map),
E8 (the "one hoopoe at a time" primitive), E11 and E12 (the two tails).

**E7b is the one to be careful with, and the fix-prompt's warning about it is right.** Nothing
anywhere pins `TICK_HUMAN_BOX` or `BOT_CHECK_BLOCKED`, so the only proof is a manual
`TURNSTILE_DEV_CHALLENGE=1` pass on **all three** forms. That means an env change and a dev-server
restart before the row is verifiable at all; budget for it rather than discovering it at the end.
E7a is done and did not touch Turnstile.

**Six things this phase learned that the next one should not re-derive.**

1. **A sweep beats a list, and it proved it the same hour.** E2's pin is a walk over `src/` refusing
   any hand-rolled HEIC test, rather than the four-file list the audit specified. It immediately
   found a **sixth** copy nobody had counted (`image-downscale.ts`, testing `/hei[cf]/i` against the
   MIME type by hand). The audit named four; a verifier found the fifth. Where a row is "N copies of
   one idea", write the sweep.
2. **Mutation-test every pin, and expect one direction to be missed.** E3's first pin checked that
   every sentence in an email's TEXT part was in its HTML. Dropping the footnote from the text half
   passed — the drift that matters most is HTML-has-something-text-lacks, which is exactly the bug
   the row was about. The pin needed both directions. Same for E9: the size pin passed while the
   stand-in hand-rolled an `<h1>` again.
3. **`loadEnv` is not a drop-in for a demo script's `process.env[k] = v`.** `loadEnv` refuses to
   override what is already set; the two `scripts/demo` scripts must have `.env.demo` beat whatever
   the shell exports, because they wipe what they connect to. Sharing the parser was right; sharing
   the assignment would have been a safety regression. Both files say so now.
4. **Gate an env-parser swap on VALUES, not keys.** The verifier's warning was exact: comparing key
   sets cannot see a rewritten connection string. Both parsers over the real `.env` and `.env.demo`,
   compared key by key by value: **25 keys, 0 differences**, so the dotenv swap changed nothing that
   day. Run that before the swap, not after.

5. **Adopting a shared helper is how you find the bug in it.** `balancedBody` steps over a
   `Promise<{ users }>` return type by counting angle brackets, so a type written as a bare object
   (`): { AND?: ...; OR: ... } {`) stopped it at the TYPE's brace and it returned the type. That is
   the same failure its own docblock was written about. Nothing was passing wrongly, because all
   four converted pins fail closed -- but a `doesNotMatch` against such a function would have
   passed for ever. **Before converting a hand-rolled slicer, print both slices and look at them.**
6. **Two `indexOf("\n  }")` sites were left alone deliberately**: they slice a try/catch guard and
   an `if` branch, not a function body. Not every hand-rolled slice is the shared helper's job.

**A deliberate behaviour change shipped in E7a**, flagged because it is on a signup gate:
`hasPassedTrivia` used to accept `<ts>.<validsig>.junk` and now refuses it. Unforgeable without
`AUTH_SECRET`, so never a hole; it tightens, and there is a test vector saying so.

### Two live checks Phase E ran, one of them long outstanding

- **The stranded-originals dry run, which A and C both list as unrun, is done**:
  `node scripts/dev/sweep-stranded-originals.mjs` → **0 staged originals under `collection/` in
  `rv-alumni-media`, 0.00 MB, 0 to delete.** Nothing is stranded; the question is closed.
- The demo destination guard, from its new home in `_env.mjs`, against a deliberately wrong
  `.env.demo`: `import-album.mjs` and `tag-professions-pick.mjs` both refuse and name the ref.
- **Every Phase D column `SELECT` is now RUN** (2026-09-05, production and demo). The numbers,
  and the two they change, are in `## Owner questions` Q18. The stranded-originals dry run was
  closed by Phase E. Nothing about a column drop is unmeasured any more.

### What Phase A actually taught, beyond the rows

**The 54% correction rate is real, and three of the corrections would have cost a build or a
member-visible mistake.** Every row below was re-derived before it was applied.

1. **A1's recipe does not work as written, and fails silently.** `@reference "../globals.css"`
   from the lab sheet inherits `@source not "./lab"` — a negated `@source` applies to every sheet
   that reaches it — so the lab sheet compiles to **84 bytes**. A positive `@source "./"` does not
   override it. The shape that works, proved in a scratch probe before any file was touched:
   `src/app/tailwind-theme.css` holds `@theme inline`, the `@custom-variant`s and `@utility
   state-layer`; `globals.css` imports it; `src/app/lab/lab.css` is `@reference "tailwindcss";
   @reference "../tailwind-theme.css"; @import "tailwindcss/utilities.css" layer(utilities)
   source("./");`. Without the first `@reference`, breakpoint variants (`sm:`, `lg:`) silently
   vanish.
2. **Hand-written CSS is invisible to `@source not`.** `.hoopoe .wing` and its four siblings are
   rules, not utilities, so A1 did not reach them and they kept shipping to every member page for
   something only `/lab/v2` renders. They are in `lab.css` now (A8). **If Phase G moves more lab
   CSS, look for rules as well as classes.**
3. **Three tests enumerate `git ls-files`, so a deletion reds `npm run check` until it is
   staged**: `scripts-ledger.test.mjs`, `focus-recipe.test.mjs` (ENOENT — the audit said no test
   named the filter-kit files; one reaches them by enumeration) and, indirectly, anything using
   `test-kit`'s `walk`. And **deleting a `layout.tsx` or a route reds `tsc` until `npm run build`
   regenerates `.next/types/validator.ts`** — a dev-server request does not do it.
4. **Two "safe" widenings found live defects underneath them.** `db-pool-rule.test.mjs`'s band
   checks matched `\d+`, which stops at a JS numeric separator, so `query_timeout: 20_000` had
   always read as **20** and a `600_000` would have read as 600 and passed. And `phase9-probe.mjs`
   had **three** stale assertions, not the one the audit found; two claimed `check.yml` runs the
   security gates, which stopped being true when they moved into `check.mjs`. Mutation-test every
   widened pin, as audit 1's close-out says.

### Rows this session did not do, and why

- **A18** (the viewer's SSR portal guard) is **blocked on B10**, not on anything else. Its own
  finding says "after 01 exists": the fix is to have the three lab rooms import a shared
  `LazyImageViewer`, and that module is what B10 creates. Doing A18 first would add a sixth,
  seventh and eighth hand-rolled `dynamic(() => import(...))` — the exact thing B10 removes.
  **Do it inside B10.**
- **A19** (`@sentry/cli`'s `allowScripts` approval) is **declined**, following its own finding's
  recommendation: the block exists to be pre-answered, and the approval costs nothing at runtime.
  Its `msw` entry did go, having left the tree with `shadcn`.
- **Owner decisions taken this session** (both put to him with the evidence): `_dir-chrome-probe`
  is **retired**, not repaired. `BirdAvatar`'s `ring` keeps today's pixels — the audit's remedy
  (drop the `if (clipped)` guard) was tried and looked at 2x and is **worse**: a 4px ring on a
  28px avatar at `-space-x-2` eats the whole overlap, slicing each glyph and covering the `+` in
  `+18`. The guard is now argued in the source rather than incidental. **Do not re-propose it.**

### Two live checks run, with their answers, so nobody runs them twice

- `SELECT ... FROM "Photo" WHERE url LIKE '%/images/collection/%' OR "thumbUrl" LIKE ...` →
  **0 rows on production, 0 on demo.** That is what let `c3-thumb.webp` go (A8).
- `SELECT count(*) FILTER (WHERE "createdAt" < '2026-07-24'), count(*) FILTER (WHERE link LIKE
  '/notice/%') FROM "Notification"` → **0 and 0, on production and demo**; oldest row 2026-08-05.
  That is what let `/notice/[id]` go eleven months early (A10).
- **Every Phase D column `SELECT` is now RUN** (2026-09-05, production and demo). The numbers,
  and the two they change, are in `## Owner questions` Q18. The stranded-originals dry run was
  closed by Phase E. Nothing about a column drop is unmeasured any more.

### What Phase B actually taught, beyond the rows

**Every row beat its estimate, and two beat it by more than double.** The audit's figures were
floors, not ceilings, because a finder attributes a chunk to the module it grepped for and a
deferral takes that module's whole graph with it.

1. **B2 was estimated at -28 KB and delivered -74.4 KB on 26 routes.** The hoopoe chunk was
   dragging more than the puppet. B12 was estimated at ~22.6 KB and delivered -40.7 KB. B6's
   `/welcome` half was ~115 KB and delivered -129.4 KB; its person-detail half ~53 KB and
   delivered -56.8 KB. **Do not trust a saving downward either** -- B3 landed on 22 routes, not
   the 26 the finding named, because four of them keep the chunk another way.
2. **`ssr: false` is not the default answer, and three rows here did not take it.** The admin
   city picker, the letter page's comments block and the onboarding steps are all drawn AT REST,
   so the split has to be a client-chunk split with the server render intact. The bytes leave
   first-load either way -- measured, not assumed: `/welcome` lost 129 KB with SSR on. Reach for
   `ssr: false` only when the thing genuinely opens on a press.
3. **The audit's warning that B7 would break the `/directory` visual mask did not happen.**
   `settle()` in `e2e/visual.spec.ts` waits on `networkidle` **twice**, which covers a dynamic
   chunk fetch, so `main svg.touch-none` is in the DOM by the time the screenshot is taken. Any
   future `ssr: false` on a masked element is safe for the same reason.
4. **Two findings' supporting facts were wrong in a way that would have changed the fix.**
   `bundle-build-05` says the admin `LocationPicker` "sits behind the admin's edit affordance";
   it is drawn at rest in `PlacesCard`, and `ssr: false` would have popped a control in under an
   admin's cursor. `media-viewer-03` warns that adopting `Opener` verbatim strips post-card's
   border -- true, but `Opener`'s base lacks the border only because **all three** of its call
   sites pass it, so the answer was to put it in the base and delete three copies, not to keep
   two components.
5. **B13 would have traded a round trip for a duplicate query** if `getViewerCities` had not been
   `cache()`d in the same commit: `/profile/[id]` reads it for its counts and `loadPosts` reads it
   again. Phase C will meet this shape repeatedly -- **check what a server-side seed re-runs.**
6. **B9 is closed as a not-finding, with numbers.** The duplicate chunks are real and got worse,
   not better, after B8 (**29 pairs at token-Jaccard 1.0000, 453,882 B**, against the audit's 23
   pairs / 305 KB). `generateComponentChunks: true` costs 0.9% on a cold /feed to save 1.0% across
   a three-page session, which is the audit's own revert condition; `requestCost: 100000` is
   byte-for-byte identical to no flag at all. **The trap it found is in `docs/TRAPS.md` and
   matters to every future bundle number**: under `generateComponentChunks`,
   `route-bundle-stats.json` reports 431-440 KB per route instead of 774-1,230 KB, because the
   component chunks are fetched and not counted. Measure chunking changes in a browser against
   `next start`, never from the JSON.

### What Phase C actually taught, beyond the rows

**Three of the eleven rows were wrong as written, and two of the three would have shipped a defect.**
The audit's 54% correction rate held.

1. **C10's own remedy was the trap it warns about.** It says to add `@@index([lastSeenAt])` to
   `User` because `User_lastSeenAt_idx` is "a plain btree Prisma CAN express". It is **partial**
   (`WHERE "lastSeenAt" IS NOT NULL`, `2026-08-19-analytics.sql:22-23`), so a plain `@@index` is a
   DIFFERENT index and declaring it is exactly how a routine `migrate diff` comes to propose
   dropping a live one. There are **eleven** such objects, not the two TRAPS claimed; the list is
   in `prisma/schema.prisma`'s header now, and both databases' `pg_indexes` are dumped at
   `work/db-indexes-live.json`. **The demo has seven of the eleven** -- logged in `bugs.md`, not
   fixed unasked.
2. **C11 should not be done the way it is written, and was not.** It wants the other Collection
   half's facts fetched on the swap; the block argues the opposite in its own comment and the
   owner's "a swap cannot be caught halfway" is behind that. The finding's own Confidence line
   names that as what would change its mind. The waste was the SHAPE -- three per-half questions
   asked once per half -- and `groupBy` took `/collection` from 27 to 19 with the design intact.
   **Do not re-propose the swap-time fetch.**
3. **C9's remedy was wrong at one of its six sites.** `catchups-round-view.ts` must spread
   `IDENTITY_SELECT` plus three extras, NOT `AUTHOR_CARD_SELECT`, which carries a `verifyState`
   the byline deliberately never draws. The verifier caught this; it would have fetched an unused
   column for every entry of every published Round.

**Two more things worth carrying forward.**

4. **The NextAuth session is JSON, so a `Date` on `session.user` arrives as a string.** C3(a)
   typechecked cleanly and threw `lastSeenAt.getTime is not a function` on every authenticated
   render. `tsc` cannot see it: the declaration in `next-auth.d.ts` said `Date` and nothing checks
   that a declaration survives serialisation. It is in `docs/TRAPS.md` now. The only reason it was
   found in minutes is `touchLastSeen`'s dev-only `console.error` -- the guard CLAUDE.md argues
   for, earning its keep in the exact way it was written for.
5. **A statement count is noisy; take the minimum of several samples, never one.** The database is
   shared with production and the demo, `pg_stat_statements` is global, and an `after()` drain or
   another session's traffic lands in the window. Single readings varied by up to 40 % on `/feed`.
   Three samples and the minimum was stable everywhere.
6. **Prisma issues a relation `include` as its own statement**, which is why several rows beat
   their estimate. C3(b) was estimated at one query and delivered **three**, because each of the
   two reads it replaced carried an include. Count statements, not `findMany` calls.

### Rows Phase C did NOT do the audit's way, and why

- **C11**, above: the design stays, the shape changed.
- **C10's `@@index([lastSeenAt])`**, above: declined, and the schema says why where the temptation is.
- **C6's `feed-posts-16` SQL**: the audit's replacement partitions on `WHERE read` first, which
  keeps a hundred READ rows per member rather than reproducing today's cutoff -- a member with
  ninety unread would keep 190 rows where today they keep ~100. The statement that shipped ranks
  ALL of a member's notifications and deletes the read ones past the hundredth, which is today's
  meaning. Dry run before it shipped: **0 rows** today, busiest member holds 24.
- **`data-layer-09`'s `feedSeenAt` fold** (offered as "or leave it"): left. It is one indexed
  primary-key read on one route, and the session is the app's identity object -- "where this member
  had read up to in the feed" is feed state, not identity, and every page and 128 actions read that
  object.

### Two live checks Phase C ran, with their answers

- The notification cap's dry run: `SELECT count(*) FROM (… row_number() … ) t WHERE rn > 100 AND
  read` -> **0 rows**; the busiest member holds 24 notifications.
- `pg_indexes` on production and demo -> **131 and 129 indexes**; eleven and seven of them
  invisible to Prisma. Saved at `work/db-indexes-live.json`.
- **Every Phase D column `SELECT` is now RUN** (2026-09-05, production and demo). The numbers,
  and the two they change, are in `## Owner questions` Q18. The stranded-originals dry run was
  closed by Phase E. Nothing about a column drop is unmeasured any more.

### How to measure a query row, since the apparatus is now built

**The instrument Phase C used, and the one to reuse: `pg_stat_statements`.** Snapshot
`SELECT queryid, calls, query FROM pg_stat_statements`, fetch the route once with a cookie from
`fetchSessionCookie` (`scripts/qa/_dev-login.mjs`), snapshot again, diff the `calls`. It counts
what the dev server actually sent, needs no production build, and shows you WHICH statements went.
Warm the route first so compilation queries do not count, and take the MINIMUM of three samples --
the database is shared with production and the demo, so the window catches other traffic.

**For BYTES rather than queries**, the Phase B rig still applies:
`next start` on port **3100** with `AUTH_URL=http://localhost:3100 NEXTAUTH_URL=http://localhost:3100
AUTH_TRUST_HOST=1`, and sign in by minting a cookie on the **dev** server (`fetchSessionCookie` from
`scripts/qa/_dev-login.mjs`) and setting it on 3100 -- cookies ignore the port, and without those
env vars NextAuth looks for the `__Secure-` name and bounces you to /login. That is the only way to
measure a production build signed in; `/api/dev-login` 404s on a production build by design.
