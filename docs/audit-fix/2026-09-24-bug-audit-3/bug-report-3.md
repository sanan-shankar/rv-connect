# Pre-release bug & stability audit — round 3

- **Scope:** the whole application. The finders read it at `495ecdd2` (2026-09-24); the audit was paused
  on 2026-09-27 and finished on 2026-10-23/24, when every finding was re-checked against the code as it
  stood then (`88642426`, and `36ed27d3` for the last rounds). 113 commits had landed in between;
  `work/rebaseline.md` lists them. Line numbers below are today's.
- **Audit-only.** No application code, config, schema or test was changed by this audit.
- **Method:** 13 area finders and 12 cross-cutting lenses (read-only), an adversarial validator per zone
  whose only job was to refute, a drift checker that re-ruled every finding confirmed before the pause,
  four completeness rounds (nine critics), the orchestrator's own checks at source and live, and a live pass as a
  throwaway member through every input an unconfirmed member can reach. `work/report-draft-method.md`
  and `work/report-draft-live.md` hold the detail; section 6 is the coverage map.
- **Finding ids** are the finders' own (`T4a-01`, `L10-01`, `C3-01` …), not renumbered: they are already
  stable across 40 reports, 17 verdict files and the ledger, and a new numbering would break every one
  of those references. `work/ledger-final.json` is the machine-readable ledger.

## 1. Executive summary

**Recorded:** 410 findings. **Closed during the audit:** 51 (fixed by other work since the
audit read the code: 16; made obsolete by a rewrite: 9; disproved by a validator: 12;
duplicates: 10; already known: 3; declined by you: 1). **Open:** 359 — **12 High,
92 Medium, 255 Low, and no Critical.** Every open finding but nine was attacked by a validator whose job was
to disprove it, and the survivors carry corrected line numbers. The nine are the last completeness
round's (C8, what happens to things when their owner goes away): the audit closed on your word before a
validator reached them, so they are marked "not adversarially validated" wherever they appear.

**Is the site ready for the public?** It is ready to keep running, and nothing found would take it down
for everyone. Three things should be fixed before more strangers sign up, and all are small: the
office-list check that verifies a stranger as a real classmate, with the Catch-up controls unconfirmed
accounts can press (item 1 below), and the login cookies sent to Sentry (item 2). The rest is a list of things that go wrong for one member at a time, which is what
the fix campaign is for.

**Good news first.** A lot was fixed between the pause and today by other sessions, and the audit
checked each fix rather than taking it on trust: the admin-only lab pages lock themselves (all 25 that
read data, pinned by a test); the photo backup runs green every night since 3 October (the first fix
attempt had failed too; the second worked); every database connection is encrypted and verified, and
Supabase refuses plain ones; a hostile pasted link no longer burns minutes of server time; a slow
database no longer signs members out on a page load; three dead Catch-ups controls work; pages no
longer pre-load in the background (the hidden 18-fold cost the platform work measured); and a corrected
batch year moves the member to the right Catch-up.

**One pattern behind many findings.** Nothing limits what one account, or one script, can spend of
what every member shares: the day's 95 emails, the database's size, Supabase's monthly data, every
member's bell, the free plans' monthly allowances. The limits that exist are per hour or per address; the budgets are
per day or per month. Thirteen findings are instances of that (O-09); they get one design, not thirteen
patches (phase O).

**The five things that matter most**

1. **Anyone can become a verified member, as somebody else** (O-08, High), **and an unconfirmed account
   can run its batch's Catch-up** (L10-01, High). The first: a stranger confirms any throwaway mailbox,
   reads a real classmate's name and batch year off the directory, types them into their own profile,
   and the office-list check verifies them as that classmate at once. Nobody is told, nothing records
   which roster person was matched, and two accounts can both be "the" same alumnus; 81 verified members
   today are ready-made identities to copy. The fix is to auto-verify on an email match only (Q19).
   The second: a batch Catch-up lets
   every member close and publish the Edition early, extend it, open answering or delete questions,
   and none of those buttons checks that the member confirmed their email. Signing up with a batch
   year enrols the account at once. Today 54 unconfirmed accounts sit in 20 batch Catch-ups. Related:
   pressing "Close and send it out" before anyone has answered quietly cuts the week short, and a second
   press publishes an empty Edition to everyone (C3-01). The fix is one check in four places (Phase A).
2. **Every server error sends the member's login cookie and location to Sentry** (T8b-14, High). The
   code and the privacy page say it does not; the installed Sentry version ignores the setting that used
   to stop it. Anyone holding that cookie *is* that member until it expires. Reproduced offline.
   Fix: one filter in the Sentry setup (Phase B), and a look at Sentry's own scrubbing settings (check A).
3. **The Collection loses work** (T4b-03, T4b-01, T4a-01, High). A batch upload with one failure throws
   away the photographs that did upload, captions and all; the photo viewer silently switches to a
   different photograph when the river changes under it; and your own "also add to the Collection"
   tick on a post does nothing, because it counts your 1,740 class photographs against a member's
   quota (Phase E).
4. **Editing a published letter, and Back on a dialog** (T8b-17, T8b-01, High). The edit window is a
   small box with no height limit, so for a typical letter the Save button is off the screen; and
   pressing Back on a dialog that refuses to close (busy, or "discard 40 photographs?") makes the
   *next* Back leave the page and lose the work (Phase F).
5. **The first ceilings on the way to 2,000 members are the free plans' monthly allowances, and abuse
   reaches them first.** You moved production back to Vercel's free Hobby plan on 23 October. Going over
   any Hobby allowance stops that feature for 30 days. Hobby allows 4 hours of server CPU a month; steady
   use measures about 2 at today's 575 members and this week's quiet activity, so a busy month or about
   twice the members crosses it (L5-01, High). Supabase's free 5 GB of data a month is the other one
   (L5-07, High; you deferred that fix until about 1,000 members). A script reaches the Hobby lines far
   sooner: changing a query string on a member photo spends the month's 5,000 image transformations in a
   few thousand requests, after which new photos stop showing for 30 days (C5-01, High), and any page hit
   ten times a second spends a month's million requests in about a day (L8-04, High). Hobby allows one
   firewall rate-limit rule per project (check D). The audit's agents measured on 23 October partly
   before your switch and reasoned about Pro; the Hobby facts here are from Vercel's pages, fetched
   24 October. Section 4 has the numbers.

Also worth knowing: the voice recorder can put back a recording the member removed while it was still
saving, and a double tap during the microphone prompt can leave the microphone open (L7-09); an
anonymous script can fill the newcomers' trivia log, which is kept for a year (C4-01); one person can
spend the whole day's email on password resets (C5-02); changing a query string on any member photo
makes Vercel bill a fresh transformation, so about a million requests would pause the site (C5-01);
and the repository is public, which you have ruled is fine (C1-06), with one consequence you have not
ruled on: the entry question's answers are readable there, and one question accepts any reply
containing "egg" (C5-03, Q18).

## 2. Phased fix plan

Run in the table's order. Each phase is one area, so one worker holds one set of files; Lows ride with
the phase whose files they touch. **A goes first** (it is live today). **B, E and F** carry the other
Highs. **O** is one design (a per-account budget) applied to thirteen doors; it is independent of the
others except G, which shares the mail queue.
C and D both edit the error-reporting helpers (`src/lib/report-error.ts`, the error boundaries): run D
first, or give both to one worker. A and H both edit `src/app/(main)/catchups/actions.ts`: never in
parallel. Every other pair of phases is independent.

| Phase | What | Rows | H / M / L | Owner questions it waits on (only those rows wait) |
|---|---|---:|---|---|
| A | Trust: who counts as verified, and who may press what in a Catch-up | 17 | 2 / 3 / 12 | Q13, Q15, Q16, Q19 |
| B | Privacy: what leaves the site, and what outlives a member | 27 | 1 / 9 / 17 | Q1, Q10, Q14 |
| O | Budgets: what one account or one script may spend of what everyone shares | 12 | 2 / 9 / 1 | — |
| E | The Collection | 27 | 3 / 6 / 18 | Q7 |
| F | Letters, the feed and the composer | 26 | 2 / 6 / 18 | Q17 |
| D | Alarms: the owner hears about every failure | 23 | 0 / 10 / 13 | — |
| C | When something fails, the member sees the truth and can recover | 20 | 0 / 10 / 10 | — |
| G | Sign-up, sign-in and the confirmation mail | 24 | 0 / 11 / 13 | Q3, Q4, Q18 |
| H | Catch-ups: answering, reading, and the words on the clock | 34 | 0 / 12 / 22 | Q2, Q6, Q9, Q11 |
| J | Support and payments | 11 | 0 / 6 / 5 | Q8 |
| I | Admin, moderation and the analytics room | 46 | 0 / 5 / 41 | Q5, Q12 |
| K | Text that breaks things: names, numbers, search, links | 21 | 0 / 2 / 19 | — |
| L | Platform, database, demo and scripts | 46 | 2 / 1 / 43 | — |
| M | The hoopoe | 11 | 0 / 2 / 9 | — |
| N | Feel and truth: presses, taps, comments and docs that lie | 14 | 0 / 0 / 14 | — |

**Rows that must travel together** (one change each; a worker must not split them): L10-01 + V-T2-01
(folded) + T2a-03 + T3-22; C3-01 + T3-06; T4a-01 + V-T1-02 + T1-18 + V-T4a-A (all `collection-intake.ts`);
T8b-01 + T8b-17 + T4b-02 (the Dialog primitive); L7-03 + T9-04 + T8b-07 (lazy-chunk failure and the
missing global boundary); T8b-15 + O-03's residual (L2-03, T1-09, T8a-12); V-O-B + L6-02 (one bidi
strip, every sink); V-O-C + T6-09 (phone trunk zero); L12-02 + V-L-d-01 (Catch-up images never
deleted); L5-02 + L8-04 (one firewall rule, check D); T8b-06 + L11-02 + C4-04 (the privacy page);
T7b-03 + T3-16 (one migration, one comment set); C4-02 + C4-03 + T5-13 + C5-02 + C6-01 (the
confirmation-mail queue, one worker); C4-01 + C5-03 (the trivia gate, a peer session's code); C5-01 +
L8-04 + L5-02 + L5-11 (the Hobby allowances: one config line and check D); O-09 and its thirteen instances (one budget
design, phase O, applied in G to the three that share G's files). The entries' "Travels with" lines carry the rest.

## 3. Owner section

### 3.1 Questions for you

Each is written the way the fix campaign will ask it, with the answer it takes if you don't reply.

#### Q1. A member's reports to the moderators, after the member is gone
- **What I'd change:** keep the reports a member filed when their account is deleted or merged, shown as "filed by a member who has since left".
- **What you'd notice:** the reports page keeps old reports instead of losing them when the reporter leaves.
- **If I guess wrong:** reports you wanted gone stay in the admin list until you resolve them.
- **Options:** (a) keep them, reporter shown as departed; (b) delete them with the member, as today, and change the privacy page to say so.
- **If you don't reply:** (a). The privacy page already promises it. (rows: T7a-01)

#### Q2. A Catch-up ended while people are still answering
- **What I'd change:** when a Keeper ends a Catch-up mid-week, publish what was written so far before it closes.
- **What you'd notice:** ending a Catch-up sends out one last Edition with whatever answers are in.
- **If I guess wrong:** a Keeper who meant to cancel sends a half-empty Edition.
- **Options:** (a) publish first; (b) refuse to end until the week is out; (c) warn plainly that the answers will be thrown away.
- **If you don't reply:** (a). (rows: T2a-07)

#### Q3. Changing your sign-in email and password from inside the site
- **What I'd change:** add "Change email" (a link goes to the new address) and "Change password" (asks for the current one) to Settings.
- **What you'd notice:** two new rows in Settings. A member who mistyped their email at signup can fix it themselves.
- **If I guess wrong:** two more controls in Settings you did not want.
- **Options:** (a) build both; (b) only the email change; (c) neither; you change emails by hand.
- **If you don't reply:** (a). Today a mistyped email that does not bounce is permanent. (rows: T5-01, T6-06)

#### Q4. Telling a blocked member they are blocked
- **What I'd change:** at sign-in, a blocked member sees "This account is paused. Write to us." instead of "wrong password".
- **What you'd notice:** nothing, unless you block someone.
- **If I guess wrong:** a blocked member learns they were blocked.
- **Options:** (a) say it plainly; (b) keep "wrong password", but stop the reset page promising a link that never comes.
- **If you don't reply:** (a). (rows: T5-14)

#### Q5. The "flagged" member state
- **What I'd change:** delete it, and show "reported N times" on a person's admin page instead.
- **What you'd notice:** the Flagged filter and chip leave the admin People list. Nothing could ever set them.
- **If I guess wrong:** you lose a state you meant to build later.
- **Options:** (a) delete it; (b) build it: a button that flags a member.
- **If you don't reply:** (a). (rows: T7a-08)

#### Q6. Blocked and leaving members inside a Catch-up
- **What I'd change:** hide blocked members and members leaving the site from every Catch-up, as the feed already does.
- **What you'd notice:** their names and answers stop showing in Catch-ups; counts drop by one when you block someone.
- **If I guess wrong:** a member's past answers vanish from an Edition people remember reading.
- **Options:** (a) hide them everywhere in Catch-ups; (b) hide them from lists and counts, but keep their published answers.
- **If you don't reply:** (b). Published Editions stay as they were read. (rows: T2a-13, T2b-05)

#### Q7. A photograph ticked into the Collection from a post
- **What I'd change:** nothing in the code. Say on the tick that the Collection gets the feed's smaller copy.
- **What you'd notice:** one line of small print under "Also add to the Collection".
- **If I guess wrong:** you wanted full resolution, and photos added this way stay smaller.
- **Options:** (a) keep the smaller copy and say so; (b) keep the original for the Collection (more storage, slower post).
- **If you don't reply:** (a). (rows: V-T4a-A, which rides on T4a-01)

#### Q8. A supporter with a profile photo picks a bird
- **What I'd change:** tell them on the pick page, before they choose, that their photo will show instead of the bird.
- **What you'd notice:** one sentence on the bird picker for members with a photo.
- **If I guess wrong:** you wanted the paid bird to win over the photo.
- **Options:** (a) photo wins, say so first; (b) a picked bird replaces the photo everywhere.
- **If you don't reply:** (a). (rows: T8a-16)

#### Q9. How a Catch-up's closing time is written
- **What I'd change:** name the last full day: "Last day to answer: Saturday", with "closes 7 am India time" in small print.
- **What you'd notice:** the deadline line changes wording on every Catch-up and in its reminders.
- **If I guess wrong:** the wording reads oddly to you. Today "Answers close Sunday" means the window is already shut on Sunday morning.
- **Options:** (a) last full day, plus the hour in small print; (b) the hour ("closes 7 am Sunday, India time"); (c) move the close to the end of the named day.
- **If you don't reply:** (a). (rows: T7b-15)

#### Q10. What the analytics tool reads from a click
- **What I'd change:** stop PostHog reading the text and the link of anything that shows a person: names, cards, email and phone links.
- **What you'd notice:** click reports in PostHog lose those labels; everything else stays.
- **If I guess wrong:** you lose click detail you use.
- **Options:** (a) mask anything showing a person; (b) mask all text; (c) leave it.
- **If you don't reply:** (a). (rows: T7b-22, T7b-21)

#### Q11. Inviting someone to a Catch-up by link
- **What I'd change:** bring back "Copy invite link" for Keepers. It lost its only button in the September rebuild; old links still work.
- **What you'd notice:** a copy-link row in a Catch-up's settings.
- **If I guess wrong:** you removed it on purpose.
- **Options:** (a) bring it back; (b) it was on purpose, so remove the join-by-link page too.
- **If you don't reply:** (a). (rows: T3-17)

#### Q12. Your test account Jerry is an admin on the live site
- **What I'd change:** leave Jerry out of the admin bells and admin lists, but keep the admin role so checks still work.
- **What you'd notice:** Jerry no longer shows among the admins, and messages from members stop ringing Jerry.
- **If I guess wrong:** you wanted Jerry to be a plain member.
- **Options:** (a) keep admin, hide Jerry from admin fan-outs; (b) make Jerry a plain member.
- **If you don't reply:** (a). (rows: L10-05)

#### Q13. When a new signup joins their batch's Catch-up
- **What I'd change:** keep enrolment at signup, but nobody can press a Catch-up's controls (publish early, extend, remove a question) until their email is confirmed.
- **What you'd notice:** nothing, for confirmed members. An unconfirmed one sees the controls asking them to confirm first.
- **If I guess wrong:** you wanted strangers kept out of batch Catch-ups entirely until vouched for.
- **Options:** (a) controls wait for a confirmed email; (b) also delay joining the batch until confirmed; (c) delay joining until vouched.
- **If you don't reply:** (a). The control fix ships either way. (rows: L10-01)

#### Q14. Backups keep what a member erased
- **What I'd change:** have the nightly photo mirror delete what the live bucket deleted, 30 days later, and say in the privacy page that backups hold erased data for up to 30 days.
- **What you'd notice:** one sentence in the privacy page.
- **If I guess wrong:** a photo deleted by mistake cannot be recovered after 30 days.
- **Options:** (a) 30-day window, stated; (b) keep backups for ever and say so; (c) leave it as it is, unstated.
- **If you don't reply:** (a). (rows: L11-02)

#### Q15. "Close and send it out" before anyone has answered
- **What I'd change:** pressing it on an Edition with no answers says "Nobody has answered yet" and offers "Give everyone 3 more days". It no longer quietly moves the deadline or sends an empty Edition.
- **What you'd notice:** a different message on that one press; nothing else.
- **If I guess wrong:** a Keeper who really wanted an empty Edition out cannot send one.
- **Options:** (a) refuse and offer more time; (b) publish the empty Edition at once; (c) keep today's behaviour, but say what it did.
- **If you don't reply:** (a). (rows: C3-01)

#### Q16. Someone a Keeper removed, using an old invite link
- **What I'd change:** a member a Keeper removed cannot rejoin by an invite link; only a Keeper can add them back.
- **What you'd notice:** nothing, unless someone tries it.
- **If I guess wrong:** a removal you meant as temporary needs a Keeper to undo it.
- **Options:** (a) removal sticks against links; (b) links always work, as today.
- **If you don't reply:** (a). Ask beside Q11. (rows: L12-09)

#### Q17. Editing a letter that is already published
- **What I'd change:** "Edit" on a published letter opens the full letter desk, the same page drafts use, instead of a small box.
- **What you'd notice:** editing a letter looks like writing one.
- **If I guess wrong:** you preferred a quick box for small corrections. The box is fixed either way so Save can be reached.
- **Options:** (a) open the desk; (b) keep the box, made scrollable.
- **If you don't reply:** (b) now, since it is the smaller change; (a) later if you want it. (rows: T8b-17)

#### Q18. The entry question's answers are public
- **What I'd change:** move the trivia questions and answers out of the code (into the database the admin trivia room already uses), write a fresh set because the old answers stay in GitHub's history for good, and make the dinner question need a real dish, not any word containing "egg".
- **What you'd notice:** new entry questions at signup; the admin trivia room is where you edit them.
- **If I guess wrong:** you spend time writing questions for a gate you think of as a courtesy.
- **Options:** (a) move them and write new ones; (b) treat the gate as a speed bump, keep it as it is, and change the privacy page's "to no one else" to say what really keeps strangers out (confirming an email); (c) make the repository private again (old answers still leaked).
- **If you don't reply:** (a). The repository is public by your choice, which is fine for code but not for the gate's answers. (rows: C5-03)

#### Q19. Verifying a new member from the office list by name
- **What I'd change:** verify automatically only when the signup email is on the office list. A match on name and batch year goes to your verify queue with the office-list row beside it, and is refused outright if another account already claimed that person.
- **What you'd notice:** a few more people in your verify queue: the ones who signed up with a different email from the one the school has.
- **If I guess wrong:** you do more verifying by hand.
- **Options:** (a) email match automatic, name match to you; (b) keep both automatic, but refuse a second account claiming the same person; (c) leave it.
- **If you don't reply:** (a). Today anyone with any working mailbox who types a real classmate's name and year is verified as them. 119 members were verified this way. (rows: O-08)


### 3.2 Things only you can do (checks and switches, not decisions)

- **A. Sentry → Settings → Security & Privacy:** confirm "Data Scrubber" and "Use Default Scrubbers" are
  on, and search stored issues for `authjs`. If a session token was stored, rotating `AUTH_SECRET`
  signs everyone out; that is your call. (rows: T8b-14)
- **B. Vercel → Usage, weekly: Active CPU and Image Transformations.** Hobby since 23 October; the meter is
  the trailing 30 days (it read 4h13m of 4h right after the switch, carrying the pre-fix week), and Vercel
  emails at 75%. `vercel metrics` stops working on Hobby, so the dashboard is the only meter. (rows: L5-01,
  L5-11, C5-01, V-L-c-01)
- **C. Hobby's terms.** Vercel's fair-use rules limit Hobby to non-commercial, personal use; the site takes
  contributions on /support. Your call whether that matters. (Skew Protection, which the audit first
  listed here, is Pro-only, so L8-06 becomes a code row.)
- **D. Vercel → Firewall: add the one rate-limit rule Hobby allows per project** (production and demo).
  Neither has any, and the demo's traffic counts against the same account's allowances. One rule also
  closes the sign-in flood that drains Upstash. (rows: L8-04, L5-02, C5-01)
- **E. Supabase → Organization → Usage → Egress:** this cycle's reading. It is the first limit (section 4);
  the app records nothing about it. (rows: L5-07)
- **F. Sentry → Spike Protection on.** (rows: T5-10, T8b-18)
- **G. Cloudflare → R2:** add a lifecycle rule on `staging/` (the repo records it was never added); and
  check the app's R2 keys reach only the live bucket, not the backup. (rows: T4a-03, L11 lead)
- **H. Resend → Webhooks:** subscribe the webhook to `email.failed` and `email.suppressed`. (rows: L11-05)
- **I. The demo:** confirm `.env.demo` holds no R2 keys (if it does, the photo-import undo could delete
  production photographs); consider pausing the demo's Vercel project, which has not built since
  7 August but still runs two crons and shares the budget; run `npx tsx scripts/demo/verify-guard.mts`
  when it returns. (rows: T4a-06, L8-04, L12)
- **J. Move `sanan's stuff/` out of the project folder.** It holds a plain-text `recovery-codes.txt`
  that every Claude session working in this checkout can read. It is gitignored, so it was never
  published. (C2)
- **K. Supabase → Database → Pooler:** the pool size (a dashboard fact the audit could not read). (L5)

## 4. The 2,000-member dossier

**What breaks first, in order** (corrected at today's code and measurements, `work/verdicts/V-L-c.md`
"Dossier at HEAD"):

1. **Supabase Free egress, 5 GB a month, organisation-wide** (L5-07). Measured at about 60 KB per real
   page view in early October, rising to about 100–110 KB by 2,000 members, because the directory sends
   every placed member's map pin on every render and search step. Where the line is crossed depends on
   how active members are, not only how many there are: about 700 members at launch-week activity
   (3.4 views per member per day), about 1,400 at early-October activity (1.3), about 3,200 at this
   week's (0.37). These are estimates from one measured per-view figure; the Supabase usage page is the
   real number (check E). You deferred the cut on 8 October ("revisit before ~1,000"); about 575 members
   today. Supabase Pro ($25 a month) lifts the line.
2. **Vercel Hobby's 4 hours of Active CPU a month** (L5-01). You moved back to Hobby on 23 October.
   Measured steady use is about 4 minutes a day, about 2 hours a month, at about 575 members and this
   week's quiet activity (0.37 views per member per day; the platform-health re-measure in memory). It
   grows with page views, so a busy month or about twice today's members crosses it, and going over stops
   functions for 30 days. The meter is the trailing 30 days.
3. **Abuse against the Hobby allowances** (O-09's class). Hobby includes 5,000 image transformations,
   1,000,000 CDN requests, 1,000,000 function invocations and 10 GB of Fast Origin Transfer a month,
   shared by every project in the account, the demo included, and a spent allowance stops that feature
   for 30 days. A few thousand query-string variations of one member photo spend the transformations
   (C5-01, L5-11); a script at ten requests a second spends the requests in about a day (L8-04); a
   10-per-second sign-in flood drains Upstash's month in about 7 hours, after which every rate limit is
   off (L5-02). Hobby allows one firewall rate-limit rule per project (check D). The $50 spend cap the
   L8 lens described belonged to Pro and went with it.
4. **Operational, not capacity:** a tab on the previous build after a deploy (L8-06; Skew Protection is
   Pro-only, so this needs a code fix), pool hygiene under Fluid compute (L5-04, L5-05).

**Not what breaks first:** the connection pool (peak 12 of 60 connections; 16 concurrent visits measured
at the busiest moment, roughly 110 at 2,000 members, each statement taking milliseconds); the 500 MB
database line (now an organisation billing quota; the database is 128.5 MB, of which the place list is
101 MB, projected at 170–220 MB at 2,000 members after a year); whole-table counts and missing indexes
(real at 10–100 times today's data, which the community is not producing: in one month comments grew
by 2 and posts by 8).

**The lists** (all in `work/reports/L5.md`, re-ruled in `V-L-c.md`): unbounded reads (§1: the
Collection geometry, the directory pins, Catch-up covers, and the new composer first-names route; their
real cost is egress), missing indexes (§2: `Comment.authorId`, `CatchupEntry.authorId`,
`Notification.link`, `PollOption.postId`, `User.createdAt`, `Visit.startedAt`, `CatchupEntry.audioUrl`;
all latent at measured sizes), fanout (§3: smaller since Editions start by hand), the quota table (§4),
growth projections (§5, overstated 10–100x for member content) and a k6 load-test plan for a *preview*
deployment (§6, with five edits listed in V-L-c: it must use a separate Supabase organisation).
`r2.dev` is settled: every stored image is on `images.rishivalley.space`.

## 5. Verified-clean map

What was examined and came back clean, so the fix sessions and the next audit know what was actually
checked, not just what was found. The full taxonomy table (every row 6a–6k of the audit prompt, which
agent applied it where, and whether it came back clean, with findings, or thin) is in
`work/reports/C2.md`; each report's own `## Verified clean` section lists its clean checks line by line.
The headlines:

- **Clean across the whole codebase:** `map(async …)` ordering (four sites, one known fault); parsing and
  compare arithmetic (radix, float equality, money in paise); collection modified during iteration and
  slice off-by-ones; request waterfalls in production terms (Mumbai region beside the Mumbai database).
- **Auth:** `/api/auth/stale` (no open redirect, CSRF or loop); the email change's authentication, rate
  limits, compare-and-swap and audit row; the session re-reads the address on every request; Stage 2
  and the roster match still require a confirmed address and a verified profile; every lab page that
  reads data checks the admin role, pinned by `gate-coverage.test.mjs`.
- **Catch-ups:** every Edition phase change rings its bell inside the same transaction; two members
  pressing Start make one Edition; every clock-starting action refuses an idle Edition; batch Catch-ups
  still refuse rename, end, add, remove and Keeper changes; the voice answers' server reads and the
  purge of recordings with the account.
- **Scripts:** all 77 scripts' imports resolve and every route they name exists; each script read is
  listed in `C1.md` with what it writes.
- **Mascot core files** unchanged since the audit base; the bird dealt at signup reached all 24 signups
  since its deploy.
- **The root is closed:** 15 tracked config and entry files; `e2e/.shots` is being cleared.

## 6. Coverage map

| Stage | Agents | Output |
|---|---|---|
| Orientation | orchestrator | `work/findings.md` (live fact sheet, vendor limits), `glasswing-ranking.md`, `dedup-baseline.md`, `charters.md` |
| Finders, 13 areas | T1 feed/letters, T2a+T2b Catch-ups engine, T3 Catch-ups UI, T4a+T4b Collection, T5 auth, T6 directory/profile, T7a admin, T7b analytics/notifications, T8a support/payments/demo, T8b shell/primitives/observability, T9 mascot | `work/reports/T*.md` |
| Lenses, 12 | L1 concurrency, L2 caching/routes, L3 dates, L4 silent failures, L5 scale/2k, L6 input validation, L7 client React, L8 platform limits, L9 tests and comment lies, L10 identity states, L11 jobs/webhooks, L12 write-path invariants | `work/reports/L*.md` |
| Orchestrator | own reads and live proofs | `work/reports/O.md`, `work/live/` |
| Validators, 15 zones + drift + rounds | V-T1 … V-T9, V-O-L1, V-L-a … V-L-d, V-DRIFT (re-ruled the zones finished before the pause), V-C, V-R4a, V-R4b (the completeness rounds; C8 was not reached) | `work/verdicts/*.md` |
| Completeness rounds | C1 scripts against the one database; C2 taxonomy critic and repo bloat; C3 the four hottest files; C4 server code written after the audit base; C5 every anonymous surface and the confirmation-mail state machine; C6 what a signed-in member, at each trust stage, can make the server write, send or spend; C7a and C7b every file nobody had read closely (149); C8 what happens to everything when its owner goes away | `work/reports/C*.md` |
| Compile | two writers drafted the High and Medium entries; the orchestrator read them, ruled the disagreements, and wrote the rest | `work/compile/` |

**Models:** the first half of the finders ran on Fable 5.1; from 2026-09-24 07:55 BST everything ran on
Opus 5.5. **Consciously left out:** live writes as a confirmed member (posts, letters, answers): a
confirmed throwaway could not be made without the owner's inbox, and Jerry is not an audit account, so
those paths are argued from code and the entries say so; the demo database (it writes, so
`verify-guard` was not run; check I); dashboards only the owner can read (checks A–K); and the trivia
admin page a peer session was still building on 2026-10-24 (read at `36ed27d3`). **Completeness:**
the stop rule (two consecutive dry rounds) was **not met**. Round 1 (C1 scripts, C3 hot files),
round 2 (C2 taxonomy, C4 new server code), round 3 (C5 anonymous surfaces and the mail state machine) and
round 4 (C6 member abuse, C7a and C7b cold files, C8 lifecycle cascades) each found new Medium findings;
C2 and C7b alone came back dry or thin. Round 4's Mediums were mostly instances of one class, filed as
O-09, and the rule for any later round is that a new instance of that class extends O-09 rather than
counting as new. The owner closed the audit after round 4 ("close now. i'll run the huge fix session
separately", 2026-10-24) so the fixing could start. **For audit 4, the seams still worth a round:**
correctness of what members see across every list (counts, ordering, pagination, stale data after a
mutation: C7a and C8-07 found instances), admin and moderation tooling as a whole (C8-03 showed a
whole surface with no takedown), and a validator over C8's nine findings.

## 7. Cleanup

The throwaway account "Audit TestBird" was created through the real signup on 2026-09-24 and deleted on
2026-09-25 in one guarded transaction; on 2026-09-27 the orchestrator confirmed nothing remains. The one
thing that cannot be undone is the verification email production sent to the owner's inbox (O-05).
No scratch file of the audit remains outside `work/`; the ledger tools ran from `/tmp` and are gone.

## 8. Findings

The High and Medium entries are written for the fix session to act on. The Lows are a table: each row
names the report block and the verdict to read, and the verdict's corrections win.

### Phase A — Trust: who counts as verified, and who may press what in a Catch-up

#### L10-01 — A stranger who signs up claiming a batch year joins that class's Catch-up unproven, reads it, and runs its Edition
**High** · **Confirmed** (data: 20 live batch Catch-ups hold 54 unconfirmed members; mechanism re-derived by validator and orchestrator)
- **Where:** `src/app/(main)/catchups/actions.ts:396-432` (`loadKeeperEdition` with `allowBatch` skips every role and stage check; its callers `curatePrompt :948`, `openAnswering :1018`, `closeAndPublish :1092`, `extendDeadline :1282` never call `requireVerifiedMember()`, while `startEdition :1234` and `setEditionTimeCapsule :1382` do); `src/components/auth/actions.ts:229-235` (`joinBatchGroup` at signup, before any confirmation; `src/lib/batch-catchups.ts:97-125`, floor counts every member `:177`); `src/app/api/users/search/route.ts:44-62` (Keeper pickers: no `emailVerified`/`verifyState` arm); `catchups/actions.ts:2349` (`setCatchupKeeper`, no stage check; also `endCatchup :780`, `removeCatchupMember :2179`).
- **What happens:** the trust model says reading inside a private group and every group-reaching write are Stage 2, and the file says so itself (`:591-593`, `:1351-1352`). In practice an account that confirmed nothing is enrolled in its claimed batch at signup, reads the class roster with profile links and every published Edition, and once a real classmate presses Start it can delete questions, open answering, extend without bound, or close and publish early with a bell to everyone. Editing the batch year moves it to another class at once (`profile-actions.ts:253`). Keepers' pickers enrol unproven accounts into people Catch-ups the same way, and the hat can pass to one.
- **Fix direction:** first, `requireVerifiedMember()` after `auth()` in every `allowBatch` verb and in the people-Catch-up Keeper verbs (`setCatchupKeeper`, `removeCatchupMember`, `endCatchup`), mirroring `startEdition`; succession skips unproven members; the search route excludes unconfirmed accounts (and unvouched ones under `alumniOnly`) or returns `verifyState`. Then the membership decision: enrol at confirmation/verification (move `joinBatchGroup` out of `registerUser`; heal and floor count only proven alumni) or gate reading at Stage 1/2 the way `photo-visibility-rule.ts` gates class photographs. The five Keeper actions the finder listed that `eb855c71` deleted (cadence, pause, resume, nudge, start-next) are moot.
- **Pin it:** `src/lib/batch-catchup-keeper-rule.test.mjs` or `gate-coverage.test.mjs`: every function passing `allowBatch: true`, and every Keeper verb that reaches other members, also calls `requireVerifiedMember`; `people-search-rule.test.mjs`: the `where` excludes `emailVerified: null`; a `batch-catchups.test.mjs` case that signup no longer enrols (if the owner picks that branch).
- **Travels with:** V-T2-01 (folded here as door 3), T2a-03 and T3-22 (same `addCatchupMembers` fix unit, door 2), C3-01 and T3-06 (same `allowBatch` verbs).
- **Owner question:** Q13 (when an unconfirmed account may press Catch-up controls, and when it joins). The control gates do not wait on it.

#### O-08 — A stranger can become a verified member as a real classmate: confirm any mailbox, copy a name and batch year off the directory
**High** · **Confirmed** (source, re-derived by the validator; data: 119 accounts verified from the office list, about 66 of them by name and year; 81 verified members have an exact roster match, each a copyable identity)
- **Where:** `src/lib/roster.ts:48-56` (requires a confirmed address; the comment closes only the waiting-account version of this attack), `:58-78` (email match first, then name + batch year against every roster row for the account's two years, no check that the roster person already has an account), `:84-93` (sets `verified`, `office_list`); `src/lib/roster-rule.ts:46-60` (first and last name tokens); the profile save re-runs the check on a name or year change.
- **What happens:** a stranger confirms a throwaway mailbox (Stage 1), reads every member's name and batch year from the directory's year filter or one `users-by-batch?detail=1` call, types one pair into their own profile, and is verified as that classmate: Stage 2, posting under the name, reading every member's contact details. Verification is never re-checked, so they can rename afterwards. No audit row, no admin bell; "ask to be verified" returns before its admin notice when the roster matches. Nothing records which roster row an account matched, so two accounts can both be "the" same person.
- **Fix direction:** auto-verify on an email match only; a name + year match goes to the admin's verify queue with the roster row shown beside it; record the matched roster row on the account and refuse a second account claiming it; write an audit row for every automatic verification. Take Q19's default until the owner answers: it is the safe branch.
- **Pin it:** `src/lib/roster-rule.test.mjs` (or a new `roster.test.mjs`): a name-only match does not set `verified`; a second account matching an already-claimed roster row is refused.
- **Travels with:** T7a-06 and T6-01 (the same auto-verify re-verifies an account an admin unverified; one row marker fixes both).
- **Owner question:** Q19.

#### C3-01 — "Close and send it out" pressed before anyone answers silently cuts the week; a second press publishes an empty Edition
**Medium** · **Confirmed** (executed: the pure functions were run in /tmp; orchestrator re-derived at source; no adversarial validator has read it yet)
- **Where:** `src/app/(main)/catchups/actions.ts:1110-1136` (zero entries takes the clock's too-few branch: CAS, a second "answers are open" bell with no `excludeUserId`, returns `extended: true` plus a message); `src/lib/catchups-core.ts:869-881` (`extendPatch` sets `answersCloseAt = now + 3 days` and spends `REMINDER_EXTENDED`; contrast `extendPhasePatch :806-820`, which anchors on `max(deadline, now)`); `src/components/catchups/settings/settings-surface.tsx:774-781` (`run()` toasts only `error`; the success message is discarded); confirm copy `:669-671` ("Answering stops now and the Edition comes out").
- **What happens:** a press on day one of a seven-day window moves the deadline three days EARLIER, rings everyone again, and the presser sees nothing; pressing again (the bit is spent) publishes an Edition with no answers to every member, and it stays in every archive. Left alone, the shortened window ends and the clock publishes it empty itself. On a batch Catch-up any member holds this button (L10-01).
- **Fix direction:** the owner picks the rule for a hand press with zero answers: refuse with a sentence, leaving `answersCloseAt` and `remindersSent` untouched, or publish as the confirm copy promises. If an extension is kept it must anchor on `max(answersCloseAt, now)`, pass `excludeUserId`, and the surface must show a non-error `message`. Confirm copy and result must describe the same outcome.
- **Pin it:** `src/lib/catchups-core.test.mjs`: an early-press plan never yields an `answersCloseAt` earlier than the stored one; a source pin that `settings-surface.tsx` surfaces `closeAndPublish`'s `message`.
- **Travels with:** L10-01 (who may press it), T3-06 (same surface, same optimistic-result gap).
- **Owner question:** Q15.

#### L12-09 — A member a Keeper removes can rejoin at once through the invite link every member's browser already holds
**Medium** · **Confirmed** (source; validator re-derived at HEAD)
- **Where:** `src/app/(main)/catchups/actions.ts:2179-2240` (`removeCatchupMember` deletes the membership and bells, rotates nothing); `:587-650` (`joinCatchupByToken`: the token is the whole authorisation, refuses only teachers, unverified and ended); `:538` (the only `newInviteToken()` call, at creation); `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:426` (`inviteToken` in the view model of every member, sent to the client component at `:551`).
- **What happens:** the docblock and `docs/spec/catchups.md` say removal ends access; a removed member who kept the link (from a chat, or from the page data of any home they loaded) opens `/catchups/join/<token>`, presses Join, and is back in with every Edition readable and bells resumed. The Keeper is not told and has no way to reset the link. Two Catch-ups carry a token, one active; batch Catch-ups carry none.
- **Fix direction:** either way, stop shipping the bearer token to non-Keepers (select it only when `isEffectiveKeeper`). If removal should stick, rotate `inviteToken` inside `removeCatchupMember`'s transaction; if rejoining is fine, say so in the docblock and spec §5.
- **Pin it:** `src/lib/catchup-lifecycle.test.mjs`: `removeCatchupMember` writes a fresh `inviteToken`; a source pin that the home's view model includes `inviteToken` only for a Keeper.
- **Travels with:** T3-17 (Low: the link has no surface; same owner question).
- **Owner question:** Q16, asked beside Q11.

#### T3-06 — Tapping a picked "Give everyone longer" pill again adds the extension again, and the row still says one
**Medium** · **Confirmed** (source; validator re-derived at HEAD and widened the population)
- **Where:** `src/components/catchups/settings/settings-surface.tsx:801-805` (the extend branch of `pick` has no `next === was` guard, unlike reminders `:796`); `:762` (`extended` is never re-synced from props, unlike `:771-772`); `:187-196` (row line from local state); `src/app/(main)/catchups/actions.ts:1282-1339` (`extendDeadline`, `allowBatch: true :1293`; CAS `:1308-1314` compares against its own fresh read, so the docblock's "the second one loses" `:1275-1277` never holds).
- **What happens:** a Keeper picks "A week", reopens the row, sees "A week" still pressed, taps it to turn it off and adds another week; the row still reads "A week more" and the real deadline is hidden. On a batch Catch-up every member holds the pill, so any two members' taps stack with no ceiling, and `extended` survives into the next Edition's row.
- **Fix direction:** after a pick show the new deadline from the action's return and disable the picked pill (or make extend a confirmation); pass the page's `answersCloseAt` into the CAS so a stale tap is refused; reset `extended` when `c.editionId` changes; a ceiling on total extension per Edition is a reasonable addition now that a whole batch holds it.
- **Pin it:** `src/lib/catchup-lifecycle.test.mjs`: two `extendDeadline` calls with the same expected deadline, the second refused.
- **Travels with:** L10-01 (stage gate on the same verb), C3-01 (same surface).

### Phase B — Privacy: what leaves the site, and what outlives a member

#### T8b-14 — Every server error sends the member's live session cookie, city, coordinates and search terms to Sentry
**High** · **Confirmed** (executed: reproduced offline twice through `@sentry/nextjs` 10.70's own `init`, `captureRequestError` and `captureException`, `beforeSend` printing and sending nothing)
- **Where:** `src/instrumentation.ts:50-53` (comment says PII off strips cookies and headers; `sendDefaultPii: false`), `:92` (`onRequestError = Sentry.captureRequestError`); `node_modules/@sentry/core/build/cjs/integrations/requestdata.js:14-36, 111-138` (PII off now resolves to deny-list objects, and any non-`false` value means "include"); `src/lib/report-error.ts:37` (`reportSwallowed`, which inherits the request scope, including `auth.ts:599` during a database stall).
- **What happens:** expected per the comment and the privacy page's processor line (`privacy/page.tsx:140`): no cookies, IPs or headers leave. Actual: each server error or swallowed report inside a request carries `request.cookies["__Secure-authjs.session-token"]` (a bearer credential valid up to 90 days), the raw `cookie` header, `x-vercel-ip-city/latitude/longitude/postal-code`, `referer` and the query string (directory searches). Only IP-named headers are removed. It comes in bursts exactly when the site is failing.
- **Fix direction:** one `beforeSend` (and `beforeSendTransaction`) in the shared `common` options that deletes `request.cookies`, `request.headers.cookie`, every `x-vercel-ip-*`, `referer`, and strips the query from `url`, `query_string` and `contexts.nextjs.request_path` (or keeps a header allowlist). Trap: do not set `dataCollection` alone; supplying it switches the base to the permissive defaults (`resolveDataCollectionOptions.js`). Rewrite the comment. Owner check A (draft): Sentry's Data Scrubber settings and a search of stored issues for `authjs`; rotating `AUTH_SECRET` if a token was stored is his call.
- **Pin it:** a new offline `node --test` (scrubber exported from `instrumentation.ts` or a small `sentry-scrub.ts`) that builds an event through `@sentry/nextjs` with a cookie header and `x-vercel-ip-*` headers and asserts none survive.
- **Travels with:** T8b-06 (its ninth item: the privacy page lists Sentry for error reporting only).

#### C8-01 — An erased or replaced photograph stays viewable through the site's own image address for up to a year
**Medium** · **Suspected** (the mechanism is documented by Next and Vercel and nothing in the repo purges; proving it needs a deletion on the live site: delete a throwaway post's photo, then request its `/_next/image` address) · not adversarially validated
- **Where:** `src/lib/storage.ts:131, 184, 218` (every stored object: `public, max-age=31536000, immutable`); `src/proxy.ts:422-424` (`/_next/image` needs no session); nothing calls Vercel's purge for a source image.
- **What happens:** after a post is deleted, an avatar replaced, an account erased or merged, the optimizer's resized copies keep answering for up to the source's max-age, a year, across redeploys. The R2 object and Cloudflare's edge are gone at once; the copy at the site's own address is not.
- **Fix direction:** either a short shared TTL on stored objects (`max-age` of hours, a backfill of the header on existing objects, a low `images.minimumCacheTTL`; costs some re-transformations), or call Vercel's purge-by-source-image from `purgeImageUrls` and `drainPendingImagePurges`, the one place bytes are deleted.
- **Pin it:** a rule test that `storage.ts`'s `CacheControl` is not one-year immutable, or that the purge helpers call the Vercel purge.
- **Travels with:** C8-02, L11-02 (what erasure really erases), T8b-06 (the privacy page).

#### C8-02 — An admin's takedown of a post leaves its photographs at their public addresses (three live today)
**Medium** · **Confirmed** (live: the finder found all three hidden posts' photographs still answering 200, one hidden since July; the orchestrator confirmed at source that `adminHidePost` only sets `isHidden`) · not adversarially validated: found by the last completeness round
- **Where:** `src/app/(main)/admin/reports/actions.ts` (`adminHidePost`: `data: { isHidden: true }`, no image purge), the feed's `adminRemovePost`; compare the Collection's takedown, `src/app/(main)/collection/actions.ts:1189` (`purgeImageUrls(photoStoredUrls(photo), "moderation")`).
- **What happens:** moderation removes the words and not the picture. The case that matters most, a photograph posted without someone's consent, is the one it does not handle: the image stays at its address for anyone who has it.
- **Fix direction:** decide first whether a hide must stay reversible (an unhide after a purge restores a post without its photographs). If the photographs should go: after the hide commits, `purgeImageUrls(parseJsonArray(post.images), "moderation")` with `deletePostWithImages`' "still named by another post" check, and decide what the author sees in place of them (the Collection accepts a broken frame for the uploader, T7a-20).
- **Pin it:** extend `notification-reach.test.mjs`'s takedown discovery (L9-08): every `isHidden: true` write on `Post` or `Photo` is followed by `purgeImageUrls`.
- **Travels with:** C8-01, C8-03, L9-08.

#### L11-02 — The backups keep forever what the privacy page says is erased: purged members, removed photos, GPS-carrying originals
**Medium** · **Confirmed** (source; run logs counted 330 staged originals copied into the backup)
- **Where:** `.github/workflows/backup.yml:321` (`case "$D" in *-01) continue;; esac   # keep monthlies forever`, in the prune at `:304-326`); `:369-393` (media sync, "NO --delete, ever", no `--exclude "staging/*"`); `src/app/(policies)/privacy/page.tsx:170-178` ("permanently erased, including the stored image files … Backups age out on their own cycle within a few weeks"); `src/lib/account-purge.ts` (deletes from the live bucket only; nothing in `src/` or `scripts/` names `R2_BACKUP_BUCKET`).
- **What happens:** a member who asks to be deleted stays whole in every first-of-month dump forever; their photos, avatar and voice answers, every photo an admin removed, and 330 staged phone originals (with GPS) stay in the media mirror forever. The page tells members backups age out within weeks.
- **Fix direction:** owner decision first on how long a backup may keep an erased member. Then either make the backups forget on a clock (exclude `staging/` from the sync, a delayed delete of mirror keys whose live twin has been gone N days, cap the monthly dumps, and delete the 330 staged originals already in `media/staging/`), or rewrite the privacy sentence to say what is kept and for how long.
- **Pin it:** a new backup-rule test that the sync excludes `staging/`; the privacy-contract test T8b-06 proposes, reading retention from `backup.yml`.
- **Travels with:** T8b-06 (same privacy sentence), T4a-03 (staged originals never cleaned from the live bucket).
- **Owner question:** Q14.

#### T6-03 — The "copy of your data" download leaves out reactions, bookmarks, profession tags and telemetry, and its ids dangle
**Medium** · **Confirmed** (source plus data: 9 exports ever; 7 bookmarks, 14 comment likes, 48 photo loves, 554 Catch-up loves, 191 profession-tagged members, none of it in any export)
- **Where:** `src/app/api/account/export/route.ts:150-289` (ten sections; no `bookmarks`, `commentLikes`, `pollVotes`, `photoLoves`, `catchupLoves`, `catchupPrefs`, `catchupsKept`, `catchupReads`, `notifications`, `visits`, `searches`, `contentViews`, `adminThreads`); `:98-134` (profile select omits `professionTags`, `professionTagSource`, `showEmail`, `theme`, `birdOverride`, `guideSeenAt` and others); `:314-315` (strips `id` from every row, so `comments[].postId` and `likes[].postId` point at nothing); `:28-30` ("the request the law says must be complete").
- **What happens:** the privacy page (`privacy/page.tsx:184-185`) promises "a copy of your data, as one file". A member gets their post likes but not their loves on photos and Catch-up answers, no bookmarks or poll votes, nothing of what the site recorded about them, not the profession tag the directory files them under, and comments they cannot match to anything.
- **Fix direction:** keep the streaming shape; add a section per owned User relation, the missing profile columns, and keep each row's `id` (or a label beside `postId`/`entryId`). Anything deliberately left out (telemetry, if the owner says so) goes in an explicit "out" list that the header comment and the privacy page both state. Separately, mid-stream failure ends in truncated JSON with no message (`:325-330`).
- **Pin it:** a new schema-walking test (shape of `src/lib/cascade-rule.test.mjs`) that fails when a User relation has neither a section nor an entry in the "deliberately out" list; `comment-target-rule.test.mjs` grows to pin a label.
- **Travels with:** T8b-06 (item 3, the page's sentence).

#### T7a-01 — Deleting or merging a member destroys every moderation report they filed, against the privacy page's promise
**Medium** · **Confirmed** (source plus data: live FK `Report_reporterId_fkey` is `ON DELETE RESTRICT`; one orphaned report thread exists)
- **Where:** `src/lib/account-purge.ts:362` (`tx.report.deleteMany({ where: { reporterId } })` before the user delete); `src/app/(main)/admin/people/actions.ts:410-412` (the merge deletes the duplicate's filed reports, then `user.delete` cascades every report filed AGAINST the duplicate); `prisma/schema.prisma:836-838` (`reporter` required, no `onDelete`; `reportedUser` Cascade); `src/app/(policies)/privacy/page.tsx:175-176` ("reports that were part of moderation decisions" outlive deletion).
- **What happens:** a member reports a harasser, then deletes their own account (or an admin deletes or merges them): the pending report leaves the queue without trace and the harasser's "reported N times" history shrinks. A merge also wipes the "reported" history of the human behind a duplicate.
- **Fix direction:** `Report.reporterId` nullable with `onDelete: SetNull` (a dated file in `prisma/migrations-manual/`, never `db push`), drop the two `deleteMany` lines, render "filed by a member who has since left" where `reporter` is null (`report-list.tsx`, `admin-worklist-query.ts`). The merge MOVES the duplicate's filed reports and re-points `reportedUserId` to the target, shedding rows that would collide on `@@unique([reporterId, reportedUserId])` and on the partial unique `Report_open_post_per_reporter_key`. `Comment.authorId` and `AdminMessage.authorId` already have the SetNull shape.
- **Pin it:** `src/lib/cascade-rule.test.mjs` (the `reporter` edge is SetNull); `src/lib/purge-rule.test.mjs` (`purgeUserAccount` has no `report.deleteMany`).
- **Travels with:** T7a-02 (same table, same orphaned-thread evidence), T8b-06 (item 4, the page's sentence).
- **Owner question:** Q1.

#### T7a-02 — When an author deletes a reported post, the report vanishes unsettled and the reporter is never answered
**Medium** · **Confirmed** (source plus data: one report-kind admin thread with `reportId` null)
- **Where:** `prisma/schema.prisma:837` (`Report.post` `onDelete: Cascade`); `src/app/(main)/feed/actions.ts:72-119` (`deletePostWithImages`, reached from `deletePost :526-546`, clears bells `:115` but never touches Report or AdminThread); `src/lib/admin-threads-server.ts:119-124` (`noteOnReportThread`, reached only from `settleReport`); `prisma/schema.prisma:929-938` (`AdminThread.reportId` SetNull "keeps the conversation alive").
- **What happens:** the reporter was told "An admin will read it." (`report-action.ts:220`); the author deletes the post before an admin looks, the Report row cascades away, the queue and counts drop it, and the reporter's thread sits in Messages with no closing line, forever.
- **Fix direction:** either keep the row (`postId` SetNull plus an excerpt and author id stored at filing, so the queue can still say what it was about) or keep the cascade and have `deletePostWithImages` settle pending reports and write `noteOnReportThread(…, "The post you reported has since been removed by its author.")` in the same transaction. The first keeps the history the Reports page exists for; the second is smaller.
- **Pin it:** a source test in the report area (beside `threads-rule.test.mjs`) that `deletePostWithImages` notes the report thread, or that the Report-to-Post edge is SetNull in `cascade-rule.test.mjs`.
- **Travels with:** T7a-01 (same Report schema migration if the SetNull route is taken).

#### T7a-04 — After a member is purged, other members' bells point at their erased letters and posts for a month
**Medium** · **Confirmed** (source; 0 dangling rows today because the purges predate letter bells)
- **Where:** `src/lib/account-purge.ts:344-397` (the purge transaction never touches `Notification`; posts go by FK cascade, `prisma/schema.prisma:723`); `src/lib/post-notifications.ts:81-91` (`clearPostNotifications`, used by `deletePostWithImages` at `feed/actions.ts:115` and by `adminRemovePost :574`, never by the purge); `src/lib/mention-notifications.ts:104` (mention bells, a fourth row type since `1f44f1e9`).
- **What happens:** after a purge, a "replied", "liked" or "mentioned you" bell in another member's list opens the 404 page (letters) or a feed with nothing to scroll to, and its text still carries the erased member's name, until the 30-day sweep. C-054 closed this for explicit deletes only.
- **Fix direction:** inside the purge transaction, before the user delete, read the member's post ids and kinds and delete notifications whose `link` is in `posts.map(postNotificationLink)`; whether to also clear rows whose `message` names the member is a product call.
- **Pin it:** `src/lib/purge-rule.test.mjs`: `purgeUserAccount` names `postNotificationLink` / `notification.deleteMany` before `user.deleteMany`.
- **Travels with:** —

#### T7b-22 — Analytics records the text and link of every click, including other members' names, emails and phone numbers
**Medium** · **Confirmed** (source: config and the installed posthog-js 1.418.1 builder read by finder, validator and orchestrator; the one-tap network proof was not run)
- **Where:** `src/components/analytics/posthog-client.ts:91` (`autocapture: true`), `:133` (`mask_all_element_attributes: false`), no `mask_all_text`; `src/components/profile/get-in-touch.tsx:92-110` (plain `<a href>` for `mailto:`/`tel:` built at `profile/[id]/page.tsx:294, 307`); `src/components/analytics/posthog-identify.tsx:10-13` (promises no name, email or phone is sent).
- **What happens:** every directory card, name, letter title or post a member clicks leaves as `$el_text`, and a tap on a batchmate's email or phone link sends `attr__href: "mailto:…"`/`"tel:…"` to PostHog under the tapper's identified profile. The batchmate agreed to show those to members, not to a vendor; two code comments and the privacy page (`:71`, `:139`) say otherwise.
- **Fix direction:** `mask_all_text: true` AND a `ph-no-capture` class on `get-in-touch.tsx`'s rows, directory cards and every surface rendering another member's details, or autocapture off with named `capture()` calls. Trap the validator found: `mask_all_element_attributes: true` does NOT stop it; posthog-js writes the nearest anchor's `href` as `attr__href` after the attribute loop regardless. Correct the two comments and the privacy text.
- **Pin it:** a source test (spirit of `src/lib/presence-rule.test.mjs`) asserting `mask_all_text: true` and a `ph-no-capture` class on `get-in-touch.tsx`'s anchor.
- **Travels with:** T7b-21 (Low, same file's identity lifecycle).
- **Owner question:** Q10.

#### T8b-06 — The privacy page promises things the code does not do and omits the telemetry kept longest
**Medium** · **Confirmed** (source; items 1-5 are hard contradictions, 6-9 completeness)
- **Where:** `src/app/(policies)/privacy/page.tsx` (lines at HEAD, which gained the entry-question rows: "settings" `:105, :167, :184`; reports outlive deletion `:175-176`; retention table `:150-161`; usage records `:69-72`; Vercel/Cloudflare/Sentry/PostHog `:135-140`; cookies `:196-199`); `src/lib/retention.ts:121-142` (`CUTOFF_STEPS`: no `ContentView` step); `prisma/schema.prisma:1564-1594` (`ContentView`, never expired).
- **What happens:** the page sends members to a settings page that does not exist, says they can change everything (the sign-in email cannot be), promises a complete export (T6-03), promises reports outlive deletion (T7a-01), has no retention row for visits, searches or the "which pages you opened" table (which nothing ever deletes), calls the analytics "basic" and PostHog "first-party", says the site runs in the United States (functions are in Mumbai), and lists Sentry for error reporting while it receives session cookies and locations (T8b-14). Kept and not to touch: the email kinds, the table's existing numbers, 60 days, the CDN caveat.
- **Fix direction:** rewrite the sentences (words, not code); add rows for visit statistics and search history (90 days) and for pages opened, the latter backed by a new `contentViews` step in `CUTOFF_STEPS` (`lastAt < cutoff(KEEP_DAYS.presence)` is the honest default). Items that depend on a code fix (T6-03, T7a-01, T8b-14, L11-02) get either the fix or an honest sentence until it lands.
- **Pin it:** a new `privacy-contract.test.mjs` that greps the page for `KEEP_DAYS` numbers and fails on "settings"; extend the retention pin in `src/lib/presence-rule.test.mjs` to `ContentView`.
- **Travels with:** T6-03, T7a-01, T8b-14, L11-02 (each one sentence on this page); T5-01 (Phase G, the email-change sentence); C4-04 (Low, not yet validated: the `rv_trivia_id` cookie is missing from the same cookie sentence).

### Phase O — Budgets: what one account or one script may spend of what everyone shares

#### C5-01 — Changing a query string on any member photo makes Vercel transform it again, so a few thousand requests spend Hobby's month of image transformations
**High** (raised 2026-10-24 for Hobby, where production has been since 2026-10-23) · **Confirmed** (executed: Next's own `hasRemoteMatch` run as a pure function; the Vercel cache-key half is "likely")
- **Where:** `next.config.ts:382-386` (`remotePatterns` pins protocol and host only: no `search`, no `pathname`); `node_modules/next/dist/shared/lib/match-remote-pattern.js:46-50` (an absent `search` admits any query string); three comments that say this door is closed (the one at `next.config.ts:383-385` among them).
- **What happens:** `/_next/image?url=https://images.rishivalley.space/<photo>?n=1&w=3840&q=75`, then `?n=2` and so on: each is a new source URL, so each is a fresh transformation, with no account. Hobby includes 5,000 a month across the account (the site's own use is roughly 1,300); a few thousand such requests spend the rest, and new photographs then stop rendering for 30 days (L5-11). The finder measured this against Pro's $50 cap (about 1.1 million requests); on Hobby it is three orders of magnitude cheaper.
- **Fix direction:** add `search: ""` to every remote pattern (stored image URLs carry no query string), and a `pathname` per prefix actually served through the optimizer so full-resolution Collection originals cannot be requested at 3840 px; add `/_next/image` to the firewall rule of check D; correct the three comments.
- **Pin it:** an evaluated-config test (load `next.config.ts`; extends L9-01's suggestion): every remote pattern pins `search` to the empty string.
- **Travels with:** L8-04 (one budget, no firewall), L9-01.

#### L8-04 — With no firewall rule, a script at the public demo or production's signed-out pages can spend a month of Hobby's allowances in about a day
**High** (raised 2026-10-24: production is on Hobby since 2026-10-23, where a spent allowance stops the feature for 30 days; the finding below was written on Pro) · **Confirmed** (data: `vercel api` finds no firewall configuration on either project and both in one team; vendor: the spend-management page's "pauses the production deployment for all projects on your team", re-fetched 2026-10-24)
- **Where:** `src/proxy.ts:136-151` (the demo is public by design); `src/app/api/demo/reset/route.ts:41, 51-52, 81-101` (unauthenticated `POST` reseeding the demo; the brake is `MIN_GAP_MS` in module memory, reset to 0 on failure at `:98`); production's own `/`, `/login`, `/signup` (each a function render plus a proxy invocation).
- **What happens:** both projects draw on one Vercel budget; the owner's $50 on-demand cap with pause ON (set 2026-10-08) turns a flood into an outage: rishivalley.space answers `503 DEPLOYMENT_PAUSED` until he resumes it by hand, and raising the cap does not unpause. A rendered page costs ~$9 per million requests, so the $20 credit plus $50 is ~8 M requests, about a day at 100/s. The demo's Supabase half is real but measured negligible (14.9 MB). This rests on the team being on Pro (V-L-c-01's billing check).
- **Fix direction:** owner, dashboard: one WAF rate-limit rule per project (production: `/`, `/login`, `/signup`, `POST /api/auth/callback/credentials`; demo: everything); pause or delete the demo's Vercel project while it is deferred (it serves 500s from the 2026-08-07 build and still runs two crons a day); keep the cap and turn on SMS at 100%. In code: gate `POST /api/demo/reset` on something stronger than per-instance memory and do not reset the brake on failure.
- **On Hobby (2026-10-23 on):** there is no spend cap to reach; instead Hobby includes 1,000,000 CDN requests and 1,000,000 function invocations a month across every project in the account, the demo included, and a spent allowance stops that feature for 30 days (Vercel's Hobby page, fetched 2026-10-24). A script at ten requests a second spends a million in about 28 hours. Hobby allows one WAF rate-limit rule per project (three custom rules in all), which is still the fix.
- **Pin it:** a line in `docs/spec/demo.md` naming team/organisation separation and the firewall rule as requirements; a source pin that the reset route's brake is not reset in its catch.
- **Travels with:** L5-02 (the same WAF rule)

#### C6-02 — One verified account can ring every member's bell at will, and a rename rings them all again
**Medium** · **Confirmed** (source; validator re-derived)
- **Where:** `src/lib/mention-notifications.ts:26-36, 77-79, 107-121` (20 mentions per save, deduped on a message containing the sender's current name); `src/app/(main)/feed/actions.ts:585-593, 783-801` (`editPost` has no meter; each save's new mentions are told); `src/lib/post-notifications.ts:52-59` with `feed/actions.ts:873-878` (like bells deduped on the sentence); `src/components/profile/profile-actions.ts:100-128, 241` (a name change: unmetered, unaudited).
- **What happens:** about 29 saves of one post reach all 575 members; `publishDraft` and `toggleLike` are unmetered too; and because every dedupe keys on a sentence holding the sender's name, a free rename re-rings everyone. Unread bells stay 30 days.
- **Fix direction:** meter the bells per actor (in `notifyMentioned`), or meter `editPost`/`publishDraft`; dedupe on the sender, not the sentence (an `actorId` on `Notification`, the Catch-up heart's `notifyLove` is the safe model); a per-post lifetime ceiling on distinct members told; audit or throttle name changes.
- **Pin it:** a second `notifyMentioned` on the same post with a changed `actorName` writes nothing; `editPost` passes a meter; a post's distinct members told cannot exceed N across saves.
- **Travels with:** O-09, V-L-b-01 (bells after commit).

#### C6-03 — An account that never confirmed its email can write a 20,000-character draft every ten seconds, kept for ever
**Medium** · **Confirmed** (source; the validator re-derived the bytes and days)
- **Where:** `src/app/(main)/feed/actions.ts:147-157` (a letter draft skips `requireVerifiedMember`; the `posts` meter, 10 per 10 minutes, is the only bound, and it fails open once Upstash's month is spent); `:293-299` (each draft also schedules up to 16 link previews); no draft ceiling or expiry anywhere; `src/lib/rate-limit.ts:71-74` (the comment that says a Stage 0 account "can write nothing").
- **What happens:** about 86 MB a day per account, kept indefinitely because never-confirmed accounts are never purged; ten accounts reach the 350 MB alarm in hours. Nothing in the admin area counts drafts (the nightly snapshot's letter count includes them by accident, T7b-14).
- **Fix direction:** a per-account draft ceiling (count, e.g. 20, which the strip already shows, and total characters), refused with a sentence; drafts of a never-confirmed account expire after N days; no link previews for a draft whose author is below Stage 2 (resolve at publish). Correct the signup meter's comment.
- **Pin it:** `createPost` refuses the ceiling-plus-one draft; a test-kit list of every row-creating action a Stage 0 session reaches, each paired with its ceiling.
- **Travels with:** O-09, L12-01 (if it is fixed by widening `editPost` to Stage 0, it adds a Stage 0 link-preview path), T2b-02, T1-08.

#### C6-04 — The search log has no per-member ceiling: alternating two words writes a row per keystroke, about 170,000 a day
**Medium** · **Confirmed** (source)
- **Where:** `src/lib/search-log.ts:49-103` (dedupes only a prefix continuation within 60 s); callers `src/app/api/places/search/route.ts:63, 147-155` (Stage 0, 120 a minute), `src/app/api/users/search/route.ts:88-95`, `src/app/(main)/feed/page.tsx:43-45` (any `?q=`, unmetered); `src/lib/retention.ts:57-74` (kept 90 days); compare `MAX_VISITS_PER_DAY = 40` in `src/lib/last-seen.ts`.
- **What happens:** one account writes about 172,800 rows a day through the city picker alone, kept 90 days, and the rows flood the owner's analytics Reach view.
- **Fix direction:** a per-member daily ceiling in `logSearch` (the `Visit` shape; 200 a day is far above any person), refused silently like every other telemetry write; optionally log page-level searches only.
- **Pin it:** `logSearch` writes at most N rows a day for one member with alternating queries.
- **Travels with:** O-09.

#### C6-05 — No read is metered, so one signed-in account can spend Supabase's monthly data allowance in hours
**Medium** · **Suspected** (the bytes are measured; the time to 5 GB depends on how fast one client can call, 30 minutes to 2 hours)
- **Where:** `src/app/(main)/collection/actions.ts:747-769, 850-857` (`loadPhotos`: `auth()` only; the valley needs no stage; `order: "taken"` returns 241 rows, about 150 KB a call); `src/app/api/users-by-batch/route.ts:23, 40-50` (`detail=1`, up to 5,000 members a call; Stage 1, 120 a minute: about 360 MB an hour); `src/lib/api-gate.ts:93-110`.
- **What happens:** about 25,000 to 33,000 `loadPhotos` calls spend the organisation's 5 GB, so one account can push the whole site over Supabase's free line in an afternoon; the batch endpoint does it in about 14 hours inside its own meter. This inverts the dossier's "egress is organic, the spend cap is abuse" for a signed-in caller.
- **Fix direction:** cache what is identical across members (the valley river's pages differ per viewer only in their own hearts: split those out; the same for first names and the directory pins, L5-07's lever); one cheap per-member read meter on the bulk read actions; size `users-by-batch?detail=1` to what a page draws.
- **Pin it:** a sweep that every exported `load*` action passes a meter or reads through a shared cache.
- **Travels with:** O-09, L5-07 (the same cut, owner-deferred until about 1,000 members; the meter half does not wait).

#### L5-02 — A sign-in flood from one machine exhausts the month's Upstash quota in hours, after which every rate limit in the app is off
**Medium** (re-ruled from Critical: the database half was fixed by `e29823cb`, refusal rows capped at 120 an hour) · **Confirmed** (source; executed: `login-attempt-cap-rule.test.mjs` 2/2; vendor: Upstash Free is 500K commands a month)
- **Where:** `src/lib/auth.ts:106-113` (two `hasBudget` reads, one Upstash command each, before Turnstile is consulted, even for a caller already over the limit); `src/lib/auth.ts:175-182` (two more without a token); `src/lib/rate-limit.ts:307-310` (`hasBudget` fails open on any Upstash error; `rateLimit` likewise at `:288-291`).
- **What happens:** every refused attempt still spends 2-4 Upstash commands, so a single source at 10 requests a second empties 500K in about seven hours. For the rest of the month every limiter fails open: sign-in, sign-up, reset, trivia, posts and uploads are unmetered, and token-less attempts reach the cost-12 bcrypt (`auth.ts:210`), ~0.25 CPU-s each, billed on Pro toward the $50 cap that pauses production (L8-04). Side effect of the cap: during a flood the 120 rows an hour are shared by every reason, so the analytics room's "who cannot sign in" panel goes blind then.
- **Fix direction:** one Vercel WAF rate-limit rule (Pro allows 40 per project) on `POST /api/auth/callback/credentials`, fixed window, IP-keyed: it stops a flood before the proxy, the function, Upstash and Postgres, and it is the same rule L8-04 asks for. A dashboard action only the owner can take; add it to "things only you can do".
- **Pin it:** none mechanical for the WAF; a line in `docs/OPERATIONS.md` naming the rule and its path.
- **Travels with:** L8-04 (the same WAF rule)

#### L5-11 — New avatars and Catch-up photographs stop rendering once a month's 5,000 image transformations are spent
**Medium** · **Confirmed** (vendor: Hobby includes 5,000 image transformations a month and a spent allowance stops for 30 days; the site's own use is roughly 1,300) · revived 2026-10-24 with the move back to Hobby
- **Where:** every `next/image` with a remote source (`next.config.ts:382-386`); the widths ladder `next.config.ts:394` and `src/lib/image-cdn.ts` (each distinct width of each image is a transformation).
- **What happens:** organic use is about a quarter of the allowance today and grows with every new photograph and member; C5-01 lets anyone spend the rest in a few thousand requests. Once spent, images not already in the cache show their alt text for 30 days.
- **Fix direction:** close C5-01 first (`search: ""`); trim the width ladder to what layouts request; consider serving already-sized WebP straight from R2 (`unoptimized`) for avatars and Catch-up pictures, which are stored small, so they never spend a transformation.
- **Pin it:** the evaluated-config test C5-01 adds; a count of distinct widths per image surface.
- **Travels with:** C5-01, O-09.

#### O-09 — CLASS: nothing bounds what one account, or one script, may spend of what every member shares
**Medium** · **Confirmed** (each instance proved at source by its finder and checked by a validator or the orchestrator)
- **Where:** the instances, each with its own entry or Low row: C4-01, C5-01, C5-02, C6-01, C6-02, C6-03, C6-04, C6-05, L5-02, L8-04, T2a-03, T2b-02, C3-02. The meters are `src/lib/rate-limit.ts` (per IP or per account, per minute or hour) and `src/lib/email-queue.ts:435-442` (per account, per hour).
- **What happens:** the budgets everyone shares are per day or per month (95 emails a day, 500 MB, 5 GB of egress, 500K Upstash commands, Vercel Hobby's monthly allowances, every member's bell); the bounds are per hour and per address, and several doors have none. One determined account, or one script, can stop the mail, fill the database, ring every member's bell or pause the site.
- **Fix direction:** one design, reviewed before any instance is closed: (1) a per-account daily budget helper beside `rateLimit`, for writes that fan out to other members, rows that persist, and mail to the account's own address; (2) per-recipient daily caps in `enqueueMail` across every kind, and a share of the day reserved for confirmations and resets; (3) a per-member read meter on the bulk cross-user reads, and a shared cache for the ones every member gets the same answer to; (4) each log's retention sized to its cap; (5) the firewall rule of check D in front. Then apply it instance by instance.
- **Pin it:** a shape test that every server action and route calls the budget helper or sits on a reviewed exemption list (the `gate-coverage.test.mjs` pattern).
- **Travels with:** all thirteen instances; C4-01, C5-02 and C6-01 are applied in Phase G, which shares their files.

#### T2a-03 — A Keeper can add any number of people to a Catch-up; the 100-person cap only limits one request
**Medium** · **Confirmed** (source; validator re-derived at HEAD; the notify half is FIXED-SINCE `077eaacf`)
- **Where:** `src/app/(main)/catchups/actions.ts:2065-2122` (`addCatchupMembers`: Zod `.max(MAX_CATCHUP_PEOPLE)` on the call `:2079`, no roster count before `createMany :2119`, no `rateLimit`); `src/components/catchups/home/people-door.tsx:195` (the UI adds one id per call, so a Keeper passes 100 in normal use); `src/lib/catchup-caps.ts:15-24` (says the cap bounds reach and roster).
- **What happens:** the spec and the cap's comment promise a roster of at most 100; a Keeper can keep adding, one at a time through the People door or by repeated calls, and every phase bell and daily reminder then fans out per member. Added members are now told (`notifyAdded`, `:2141-2158`); the nudge the finder cited is deleted.
- **Fix direction:** count existing members plus new ones inside the same transaction as the `createMany` and refuse past `MAX_CATCHUP_PEOPLE` with the picker's sentence; put the action under the `catchups` meter; drop the `anonymous` system row and unproven ids in the same pass.
- **Pin it:** `src/lib/catchup-lifecycle.test.mjs`: `addCatchupMembers` refuses when existing + new exceeds the cap and calls `rateLimit("catchups", …)`.
- **Travels with:** L10-01 (door 2, unproven ids), T3-22 (Low: the door re-offers existing members and toasts "X is in." for `added: 0`).

#### T2b-02 — A member can make the server fetch and store link previews without limit, and nothing ever deletes one
**Medium** · **Confirmed** (source; 8 preview rows today)
- **Where:** `src/lib/link-preview.ts:90-91` (`MAX_PER_CALL = 16` per call, not per member), `:286-300` (each link: a 512 KB page fetch, a 5 MB image fetch, a decode, one permanent object), `:356` (one row per distinct normalised URL; `link-preview-core.ts:136-145` keeps query parameters, so `?n=1`, `?n=2` are distinct); unmetered schedulers `src/app/(main)/catchups/actions.ts:1641` (`submitEntry`, no `rateLimit`), `src/app/(main)/feed/actions.ts:417` (`publishDraft`) and `:774` (`editPost`, which is the letters desk's autosave); `src/lib/storage.ts:70-72` (`link-previews/` outside `KNOWN_ROOTS`, so no code path can delete a thumbnail; no `LinkPreview` in `retention.ts` or `account-purge.ts`).
- **What happens:** per link the cost is bounded; per member it is not. A member (or a script with a member's session) saving a body of distinct URLs, or just pausing while writing a letter full of links, schedules up to 16 server fetches per save, each leaving a permanent row and object.
- **Fix direction:** meter inside `scheduleLinkPreviews`/`ensureLinkPreviews`, keyed on the member, counting new URLs, so all four doors share it; cap distinct links per body with a sentence; a retention step that deletes rows (and their objects, by key through `delImageByKey`) whose URL no longer appears in any body and whose `fetchedAt` is old. An R2 lifecycle rule cannot be used while rows point at the objects.
- **Pin it:** a rule test that the new bucket exists and `scheduleLinkPreviews` consults it; a retention test that a stale unreferenced row and its object go; a `src/lib/security-regressions.test.mjs` pin that `link-previews/` never joins `KNOWN_ROOTS`.
- **Travels with:** —

### Phase E — The Collection

#### T4a-01 — The owner's "Also add to the Collection" tick on a post silently does nothing
**High** · **Confirmed** (data: the account the class album was imported under holds 1,740 class Photo rows, 0 valley; mechanism re-derived by validator and orchestrator)
- **Where:** `src/lib/collection-intake.ts:72` (counts every Photo row the uploader has, both halves), `:86-87` (`room = max(0, MAX_PHOTOS_PER_ACCOUNT - existing); if (room === 0) return 0;`, no log), `:79` (role read for auto-approval only, never for the quota exemption); against `src/app/(main)/collection/actions.ts:99-121` (`photoQuotaError`: admin exempt `:110`, count per scope `:116`); caller `src/app/(main)/feed/actions.ts:339-346` (inside `after()`, nobody to tell).
- **What happens:** the quota rule says the ceiling is per half and an admin has none ("of course no limits for uploading should be there for me", 2026-09-01). The composer helper counts both halves and exempts nobody, so the owner ticks the box, the post publishes, and no photograph is copied, with no toast and no log line. Any member who fills one half loses the tick for the other.
- **Fix direction:** one shared quota helper beside `isPhotoAutoApproved` in `collection-photo.ts` (admin exempt; count `{ uploaderId, scope: "valley" }`, since the tick always lands in the valley) called by both `photoQuotaError` and the intake; report the "no room" early return.
- **Pin it:** a `node --test` on the shared helper (admin: no ceiling; 1,000 class rows and 0 valley: room in the valley); a pin in `src/lib/image-purge-rule.test.mjs` or `security-regressions.test.mjs` that `collection-intake.ts` never counts Photo rows with an unscoped `where`.
- **Travels with:** V-T1-02 and V-T4a-A (Low; same file, one unit per the orchestrator's ruling).
- **Owner question:** Q7 rides on V-T4a-A; the quota fix does not wait on it.

#### T4b-01 — The Collection's photo viewer silently switches to a different photograph when the river reloads under it
**High** · **Confirmed** (source; orchestrator hand-verified, validator re-derived at HEAD; the edit-year path is deterministic)
- **Where:** `src/components/common/image-viewer.tsx:267` (`useState(initialIndex)`: the viewer holds a slot, never an identity), `:339-341` (`current = images[at]`), `:805` (`key={at}`); `src/components/collection/collection-client.tsx:1314-1318` (`viewerImages` rebuilt from live `photos`), rewritten under the open viewer at `:523` (band arrival), `:553-576` (the reshape effect after a revalidate), `:233-252` (the seed guard); trigger `src/app/(main)/collection/actions.ts:1283-1284` (`editPhoto` revalidates).
- **What happens:** in "Year taken" order a member opens a photograph, presses the pencil, changes the year, saves: the photograph behind the dialog is now a different one, and the pencil edits that one. Every day, too: a neighbouring year arriving while a photograph is open, or a newcomer approved since the page opened (in "Recently added"), swaps the picture in place with no press.
- **Fix direction:** track the photograph, not the slot: give `ViewerImage` an `id` (default `src`) and re-find it with `findIndex` when `images` changes (close if gone); key the frame on `current.id`. Doing it in the viewer fixes every caller.
- **Pin it:** a `node --test` on a pure "index after the list changed" helper; an invariant in `e2e/collection-journeys.spec.ts` that `dialog img[src]` is unchanged across a forced band arrival (the edit-year path on the test account's own photograph).
- **Travels with:** —

#### T4b-03 — When any photo in a Collection batch fails, the failed ones are thrown away with their captions
**High** · **Confirmed** (source; orchestrator hand-verified, validator re-derived at HEAD; not fixed by `9c992844`)
- **Where:** `src/components/collection/contribute-room.tsx:813-826` (the loop pushes the raw `err.message`), `:844-847` (only `done === 0` keeps the wall), `:858-866` (unconditional cleanup: revoke every preview, `setPhotos([])` `:862`, `setMeta({})` `:863`); `:752, 773` (both contribute actions awaited with no `callAction`); `src/lib/rate-limit.ts:113-128` (`collectionUploads` 1000/h, shared with presign).
- **What happens:** the spec says failures are retried individually and never lose the batch. A photographer's third drop of the morning meets the meter at photo 51 of 150: the Finish says fifty are in, a toast says 100 did not go through, and the 100 are gone from the wall with their captions and buckets, their originals orphaned in `staging/`. A single transient failure removes that one photograph, and the member reads a raw "Failed to fetch".
- **Fix direction:** after the loop remove only the filed ids, keep their `meta`, revoke only filed previews, and offer "N did not go through, try again" over what is left (a kept staged `key` makes the retry a second contribute call, not a re-upload); route both awaits through `callAction`; when the failure is the meter, say when it resets.
- **Pin it:** a pure "settle the batch" function (batch, filed ids, failures: what stays, what is revoked) with `node --test`; a source pin that every `contributePhoto*` await in `contribute-room.tsx` goes through `callAction`.
- **Travels with:** T4b-04 (same settle function), V-T4-01 (Low, the email-gate branch at `:822`).

#### T4a-02 — A year holding more than 600 photographs is silently cut to 600 in the "Year taken" river
**Medium** · **Confirmed** (source; latent: the largest year today is 465, class 2022)
- **Where:** `src/app/(main)/collection/actions.ts:998` (`take: 600` in `loadBand`, docblock `:962-964`, no continuation); `src/components/collection/collection-client.tsx:515, 519` (holds whatever arrived and `reshapeBand`s the box to it), `:881` (the cursor walk stands down whenever boxes exist); `src/lib/river-geometry.ts:186-221` (`holdsBand`/`reshapeBand`).
- **What happens:** once a class puts more than 600 photographs into one year, photographs 601 onward of that year are unreachable in "Year taken" while present in "Recently added", and the rail's mark is still drawn at the true length.
- **Fix direction:** page within a year (a `takenKey,id` cursor when `rows.length === 600`, the client asks until the count matches the index), or make the shortfall keep asking instead of reshaping; `reshapeBand` adopts a band only when the server says it is complete.
- **Pin it:** `src/lib/river-geometry.test.mjs`: a partial band is never adopted as complete.
- **Travels with:** —

#### T4a-03 — Photos a member drops then removes or discards stay in public storage forever, GPS included
**Medium** · **Confirmed** (source plus the repo's own record that the lifecycle rule "was never added", `docs/history/progress-2026-09.md:8431`)
- **Where:** `src/components/collection/contribute-room.tsx:705-712` (`remove()` revokes the preview, never touches `p.key`) and `:312-322` (the Discard confirm, same); `src/app/(main)/collection/actions.ts:398-400` (auth and demo refusals return before the key check, so a lapsed session's staged key is never purged); `src/app/api/upload/presign/route.ts:90` ("Under `staging/` one lifecycle rule closes it permanently").
- **What happens:** a member drops 200 photographs (each full-resolution original climbs to `staging/` at a public URL), then removes twelve, discards the rest, or their session lapses before Add. Those originals, with the phone's GPS, stay in the bucket forever; nothing in the app can enumerate it and no rule clears it. Since 2026-09-27 abandoned voice recordings stage there too.
- **Fix direction:** both halves. Owner action: add the R2 lifecycle rule on prefix `staging/` (for example one day) and record it in `docs/OPERATIONS.md` and the presign comment. In-app: a `discardStaged(keys[])` action (key regex plus `keyBelongsTo`, exactly as `contributePhotoDirect` checks) called from `remove()` and the Discard confirm. An expired session cannot prove ownership, so that case stays the rule's.
- **Pin it:** a pin in `src/lib/image-purge-rule.test.mjs` that `remove` and the discard path call the purge action; an `OPERATIONS.md` line the tests can grep.
- **Travels with:** L11-02 (the backup has already copied 330 staged originals), T4b-03 (failed photos' staged keys).
- **Owner action:** add the R2 lifecycle rule on `staging/` (recorded as never added); the in-app cleanup ships regardless.

#### T4b-04 — "Add more" and remove stay live during a batch: new photos vanish and a removed photo is added anyway
**Medium** · **Confirmed** (source; validator re-derived at HEAD)
- **Where:** `src/components/collection/contribute-room.tsx:1023-1030` ("Add more", no `disabled={adding}`), `onRemove={remove}` handed to the stage (`contribute-stage.tsx:304-311`, the remove button always live); `:802` (the batch is one snapshot), `:813` (the loop), `:862-863` (`setPhotos([])`, `setMeta({})` at the end); `:316` (Discard copy "They have not been added to the Collection yet.").
- **What happens:** photos added mid-batch (Add more, or paste) climb to storage and are then discarded by the end-of-batch clear; a photo the member removes mid-batch is filed anyway from the snapshot; closing mid-batch says none have been added when twelve have.
- **Fix direction:** while `adding`, disable "Add more", paste and the stage's remove, or have the loop skip ids no longer on the wall; keep anything that arrived during filing (T4b-03's "remove only the filed" does this); make the Discard copy count `filing.done`.
- **Pin it:** the T4b-03 "settle the batch" test with "arrived during filing" and "removed during filing" cases.
- **Travels with:** T4b-03.

#### T4b-05 — A member with no class opening a Class Collection link gets an empty page with a working Contribute and no way back
**Medium** · **Confirmed** (source plus data: 20 of 572 members qualify, 17 with no batch year, 3 unverified)
- **Where:** `src/app/(main)/collection/collection-data.ts:70` (scope checked as vocabulary, never entitlement; the comment `:64-69` promises the public half instead), `:132-137` (`classWhere` null for them), `:217` (`here = scopeFacts[scope] ?? scopeFacts.valley`); `src/components/collection/collection-client.tsx:1451, 1457, 1734` (class title, no caret since `scope-caret.tsx:49` hides it, Contribute opens "Add to the Class Collection"); refusal only at Add, `collection/actions.ts:140-160`.
- **What happens:** a classmate shares `/collection?scope=class`; a teacher, a member with a blank batch year or an unverified classmate sees "The Class Collection", blank paper, no sentence and no switch out; Contribute uploads every photo in full and each Add then fails (and T4b-03 throws them away).
- **Fix direction:** in `collectionPageData`, when `scope === "class"` and `classWhere` is null, render the valley and hand the client `filters.scope = "valley"` so the URL sync corrects the address, as the comment promises; never draw Contribute when `scope === "class" && !canSeeClass`.
- **Pin it:** a `node --test` on the scope resolution once it is a pure helper; a case in `e2e/collection-journeys.spec.ts` with an account lacking a batch year.
- **Travels with:** T4b-06 (same per-half facts in `collection-data.ts`).

#### T4b-06 — After switching halves, the contribute room shows the other half's room left, and promises an admin review that never happens
**Medium** · **Confirmed** (source plus data: 0 of 572 members are `photoTrusted`)
- **Where:** `src/components/collection/collection-client.tsx:288` (`facts` carries per-half `roomLeft`, read nowhere) and `:1737-1738` (`autoApproved={autoApproved}`, `roomLeft={roomLeft}`: the server-rendered half's flat props); `src/app/(main)/collection/collection-data.ts:232` (one `autoApproved` for both halves); `collection/actions.ts:294, 579` (every class contribution skips the queue); copy `contribute-room.tsx:1051, 1276, 1343`.
- **What happens:** a member with 990 valley photos switches to the class and is told only 10 more will fit (the class had room for 1,000), or the reverse lets a 200-drop climb and then fail. Every non-admin contributing to the class reads "An admin looks at new photographs before they appear" and, at the end, "with an admin to look at", while the photos are already visible to the whole class.
- **Fix direction:** pass `facts.roomLeft`; make `autoApproved` per half in `scopeFacts` (`half === "class" || isPhotoAutoApproved(...)`) and pass `facts.autoApproved`; the class Finish says "in the Class Collection now".
- **Pin it:** a `factsFor(scope)` helper with `node --test`, or a source pin that `ContributeDialog` receives `facts.*` only.
- **Travels with:** T4b-05.

#### T4b-07 — A heart or edit made from a shared photo link does not reach the same photo in the river; the next tap un-hearts it
**Medium** · **Confirmed** (source; validator re-derived at HEAD)
- **Where:** `src/components/collection/collection-client.tsx:1351-1356` (`patch` writes one strip through `setListFor :1297-1312`), callers `handleToggleLove :1376-1389` and `onSaved :1751-1754`; contrast `forget :1393-1415` (writes `held`, `photos`, both queues and `linked`); `src/components/posts/use-engagement.ts:80` (`settledHeart` adopts the server row, so a stale `before` inverts the tap).
- **What happens:** a member arrives from the feed rail's "From the Collection" card, hearts the photo, closes it, then opens the same photo from its tile below: the heart is empty, and tapping it un-hearts the real row. An edit made there leaves the tile's old caption and year for the session.
- **Fix direction:** make `patch` id-keyed across every strip, exactly as `forget` already is.
- **Pin it:** a pure `patchEverywhere` helper with `node --test`; extend the C-133 pin in `src/lib/heart.test.mjs` to "two strips, one row".
- **Travels with:** —

### Phase F — Letters, the feed and the composer

#### T8b-01 — Back on a dialog that refuses to close spends the history entry, so the next Back leaves the page and its work
**High** · **Confirmed** (live: the orchestrator reproduced the Collection instance, T4b-02: Back, "Discard?", Cancel, Back, the page is gone)
- **Where:** `src/components/ui/dialog.tsx:15-29` (`useBackCloses(open ?? uncontrolledOpen, () => actions.current?.close())` `:20`; its comment promises a dialog that refuses mid-save keeps refusing); `src/lib/back-closes.ts:172-182` (`onPop` splices the layer off the stack, then calls `close()`, before the caller has answered), `:194-197` (`release` returns when the layer is gone), `:223` (the effect keyed on `[open]`, so a refusal re-arms nothing); refusing sites `src/components/collection/contribute-room.tsx:229-238`, `common/confirm-dialog.tsx:71-75`, `collection/edit-photo-dialog.tsx:142`, `settings/avatar-crop-dialog.tsx:269-273`, `admin/moderation-dialog.tsx:59-66`.
- **What happens:** the module's promise is that an open dialog always owns a history entry, so Back can never reach the page beneath. Actually Back pops the entry, the caller refuses (busy or unsaved), the dialog stays open with no entry, and the next Back (or a repeated swipe, because nothing visibly happened) leaves the page: the contribute wall with photographs still climbing, a crop, an edit whose save then fails. `use-leave-guard.ts` listens only for `beforeunload`, so nothing asks.
- **Fix direction:** in the primitive, not per site. In `onPop` do not splice: mark `pushed = false`, keep the layer, call `close()`. Decide "refused" without needing a re-render (Base UI does not re-render a controlled dialog on a refused close, so four of the five sites never re-render): have the refusing sites cancel through Base UI's own `details.cancel()` and re-push at once when `details.isCanceled`, plus a deferred re-check (a short timer, not `setTimeout(0)`) that re-pushes if the layer is still open. A late accept after a re-push is self-healing through `release()`. Keep the `i === -1` guard. An "effect with no deps that re-pushes on re-render" alone covers one site in five; do not ship it alone.
- **Pin it:** a fake-history unit test beside `src/lib/back-closes-rule.test.mjs` (refused path: layer kept, one marked entry again; accepted path: stack empty, no rewind), plus a pin that the five sites call `details.cancel()`.
- **Travels with:** T4b-02 (duplicate, the Collection instance; canonical here).

#### T8b-17 — Editing a published letter opens a dialog taller than the screen; Save is off-screen and cannot be reached
**High** · **Confirmed** (source plus data: 7 published letters, median 4,278 characters, max 7,494, six over 1,500; the orchestrator's DOM-injection measurement has not been run)
- **Where:** `src/components/ui/dialog.tsx:113` (the popup className: `fixed top-1/2 … -translate-y-1/2 … sm:max-w-sm`, no `max-h`, no `overflow`); `src/components/posts/edit-post-dialog.tsx:75, 103` (no className on `DialogContent`; `RichTextArea` with `minHeight` 240 and no maximum, `rich-text-area.tsx:98`); callers `src/components/letters/letter-menu.tsx:211` and `posts/post-card.tsx:800`. Five consumers patched it locally (`edit-photo-dialog.tsx:157` and others).
- **What happens:** a member fixing a typo in their published letter gets a 384 px dialog roughly three times the height of a laptop window, centred, with the title above the top and Save and the close button below the bottom; the modal scroll lock holds the page and a fixed box has no scroll, so the only way out is to close and lose the edit. This dialog is the only edit path for a published letter (the desk refuses anything but a draft, `letters/[id]/edit/page.tsx:51-54`).
- **Fix direction:** in the primitive, `max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain` on the popup so no dialog can outgrow the screen; for letters also a wider dialog and a bounded, scrolling text area, unless the owner prefers "Edit" on a published letter to open the whole-page desk (his register rule, `edit-post-dialog.tsx:17-20`).
- **Pin it:** a grep test in the shape of `src/lib/focus-recipe.test.mjs` that the popup className carries `max-h-` and `overflow-y-auto`; a visual-suite state for the edit dialog over a long fixture letter.
- **Travels with:** —
- **Owner question:** Q17 (optional; the dialog fix does not wait on it).

#### L12-01 — A member not yet verified can save a letter draft once; every later save is refused as "posting"
**Medium** · **Confirmed** (source; validator re-derived at HEAD; 0 drafts exist today, so nobody is stuck right now)
- **Where:** `src/app/(main)/feed/actions.ts:147-152` (`createPost` exempts a letter draft from `requireVerifiedMember`, the owner's M32 decision); `:585-593` (`editPost` calls `requireVerifiedMember()` unconditionally, before the row is read); callers `src/components/posts/use-letter-persistence.ts:331` (autosave) and `:430` (exit save), `create-post-form.tsx:529` (a resumed draft's Save); `src/lib/draft-rule.ts` (the shared predicate, pinned for `createPost` only).
- **What happens:** an unconfirmed or unvouched member writes a letter and saves a draft (allowed); from then on every 2.5 s autosave is refused with "Confirm your email address before you post" (or the unvouched sentence), the words live only in this browser, and the server copy is frozen at the first save. They are told they are posting when they are not.
- **Fix direction:** in `editPost`, read the row first and skip the gate when it is a letter draft, through the same predicate `createPost` uses (one helper both call); keep the gate for published rows and keep `publishDraft`'s gate as is. Images stay safe because uploading is Stage 2 on its own.
- **Pin it:** extend `src/lib/draft-rule.test.mjs`: every writer of a letter draft (`createPost`, `editPost`) decides its gate through the shared predicate.
- **Travels with:** —

#### L6-05 — One hostile letter or post costs seconds of server time on every view, and slows every feed card that shows it
**Medium** · **Confirmed** (executed: timed at HEAD with the real modules, Node 26)
- **Where:** `src/lib/link-preview-core.ts:53-72` (`trimTail` re-splits the whole link for every trailing `)` or `]`: quadratic); `src/lib/rich-text.ts:24` (`MENTION_PATTERN` with an unbounded `[^\]]+`, used at `:166-173`); callers since `cd1ec452` include `src/components/posts/post-card.tsx:247, 550` (render runs inline on every card render), `src/app/(main)/letters/[id]/(read)/page.tsx:147, 268`, `feed/actions.ts:299, 417, 774`, plus the Catch-up reader.
- **What happens:** a link ending in 20,000 closers (the letter cap) costs 2.5 s per scan, about 5 s of server CPU on every open of that letter and 2.5 s in the author's own save; a 5,000-character post costs about 0.3 s on every render of its card on every member's phone (including each heart tap); `"@[".repeat(10000)` costs about 0.3 s per render. The trigger is deliberate, by a verified member, but the cost lands on everyone who scrolls past.
- **Fix direction:** count the brackets once in `trimTail` and decrement as characters are stripped; bound the mention name (`[^\]\n]{1,100}`, no name exceeds `FULL_NAME_MAX`).
- **Pin it:** a timing-budget case beside the renderer's attack tests in `src/lib/rich-text.test.mjs` / `link-preview-core.test.mjs`: the 20,000-character closer run and the `@[` run each render under about 20 ms.
- **Travels with:** —

#### T1-01 — Bold or italic applied to a selection ending in a space publishes as literal asterisks
**Medium** · **Confirmed** (executed: the real serializer and renderer, `<b>hello </b>world` gives `**hello **world` on the card)
- **Where:** `src/lib/rich-text-editing.ts:61-64` (the serializer wraps the run verbatim, whitespace included); `src/lib/rich-text.ts:78-84` (the renderer's edge rule refuses a run that starts or ends on whitespace, deliberately); surfaces `src/components/posts/create-post-form.tsx:448` (Ctrl/Cmd+B), `src/components/common/rich-text-area.tsx:74, 96` (the edit dialog's field), `src/components/catchups/answer/answer-card.tsx:151` (Catch-up answers).
- **What happens:** a member double-clicks a word on Windows (which selects the trailing space), presses Ctrl+B, sees it bold, and publishes `**hello **world` with the asterisks visible on the card, the letter page, every teaser and in Catch-up answers. Same for italic, underline, strike and a leading space.
- **Fix direction:** in the one shared serializer, move leading and trailing whitespace of a formatted run outside the markers (`**hello** `); leave the renderer's rule alone.
- **Pin it:** `src/lib/rich-text-editing.test.mjs`: the four whitespace-edge cases plus a serialize-then-render round trip.
- **Travels with:** —

#### T1-02 — Saving a new letter draft while still typing creates a second draft of the same letter
**Medium** · **Confirmed** (source; validator re-derived; the trigger is an edit inside the save's round trip, so a slow-connection case)
- **Where:** `src/components/posts/create-post-form.tsx:564-579` (`markSaved` then `onDraftSaved`), `:617-619` (`finally` clears the submit latch before the navigation commits), `:679-691` (the sheet stays editable); `src/components/letters/letter-desk.tsx:117-122` (`router.replace` to the edit page unmounts the `/letters/new` desk); `src/components/posts/use-letter-persistence.ts:387-442` (the unmount exit-save, whose instance never learned the new row, takes the `createPost` branch `:431-434`); `src/app/(main)/feed/actions.ts:247-273` (the twin guard matches content exactly, `:250`).
- **What happens:** the member presses Save as draft on a fresh letter, clicks back in and types a few characters before the toast, lands on the edit page holding the older text, sees two "Saved to your drafts" toasts, and finds a second draft in the strip with the newer words and the same photographs.
- **Fix direction:** decide once, in the hook, "which versioned write, if any, and with which base": the composer hands the hook the row it just created (an `adoptRow(id)` stored in a ref the exit-save reads), and the exit-save never `createPost`s a letter whose row exists.
- **Pin it:** extract the exit-save decision into a pure function pinned by `node --test` (beside `src/lib/draft-rule.test.mjs`).
- **Travels with:** T1-03, T1-23, V-T1-01 (Low): one unit in `use-letter-persistence.ts`.

#### T1-03 — Leaving the letter desk during an autosave fires a second save that tells the writer the letter did not save
**Medium** · **Confirmed** (source; the validator traced Next's action queue: a navigation discards the queued autosave while its fetch continues, so the two writes are truly concurrent)
- **Where:** `src/components/posts/use-letter-persistence.ts:306` (`autosaveRunRef` set), `:387-442` (the exit-save reads `baseUpdatedAtRef` at `:429` and never waits for the in-flight autosave; contrast the explicit Save, which awaits it at `create-post-form.tsx:483`); `src/app/(main)/feed/actions.ts:741-747` (version guard `updateMany … updatedAt: base`), refusal text `:761-766`.
- **What happens:** the member pauses (autosave fires) and clicks "All letters" within its round trip. Usually the autosave wins and the exit save is refused: a red "That letter did not save. It is kept on this device." over a row that holds those words. Rarely the reverse: the older words are stashed and next visit offers them as "a newer copy of this letter", and accepting reverts the letter.
- **Fix direction:** chain the exit save onto `autosaveRunRef.current` (the refs are shared, so the chained call sees the new base), or skip it when the in-flight payload already equals the exit snapshot.
- **Pin it:** a sequencing test with a fake `editPost`, the way `src/lib/heart.test.mjs` drives its queue.
- **Travels with:** T1-02, T1-23, V-T1-01 (Low).

#### T1-23 — Two tabs on one letter draft share one device copy; the refused tab's "Kept on this device" is wiped by the other
**Medium** · **Confirmed** (source; reach is two tabs of one browser, not two devices)
- **Where:** `src/components/posts/use-letter-persistence.ts:44-45` (`localDraftKey` has user and post, no tab), `:340` (a successful autosave clears the key), `:346` (a refused autosave stashes there), `:179-183` (the idle crash net overwrites the key with this tab's words); `src/components/letters/letter-desk.tsx:93` ("Not saving. Kept on this device."); version guard `src/app/(main)/feed/actions.ts:741-747`.
- **What happens:** tab B's save is refused (correctly) and B is told its words are kept on this device; tab A's next idle pause overwrites the shared key and A's next save clears it. Once B is closed, B's paragraphs exist nowhere.
- **Fix direction:** key the stash per tab (`sessionStorage`, or a per-tab suffix), or never clear a local copy whose content differs from what this tab just saved; make the refused tab's message say what is true ("This letter changed in another tab. Copy your text before reloading").
- **Pin it:** a pure `shouldClearLocalCopy(saved, local)` with `node --test`.
- **Travels with:** T1-02, T1-03, V-T1-01 (Low).

### Phase D — Alarms: the owner hears about every failure

#### L11-05 — Mail the provider later fails or suppresses still reads "We sent a link" forever and never reaches the admin
**Medium** · **Suspected** (code certain; the member-facing half depends on Resend accepting a suppressed send with an id and posting `email.suppressed`, as its docs and the installed SDK types say; settle with a resend to an address on Resend's suppression list and a read of the row; 0 rows carry the fingerprint today)
- **Where:** `src/app/api/resend/webhook/route.ts:104-143` (patches only `delivered`, `bounced`, `complained`, `delivery_delayed`; everything else is acknowledged and dropped at `:143`); `node_modules/resend/dist/index.d.mts:2164, 2297-2310` (`email.failed`, `email.suppressed` with `email_id`); `src/lib/email-queue.ts:1012-1016` (the banner reads the latest verify row: `sent` means "sent"); `src/components/admin/mail/mail-rows.tsx:117-121` (`lastError` printed red under any row).
- **What happens:** a member's confirmation bounces, they press "Send it again", Resend suppresses it, and the row stays `sent`: the banner flips from "bounced, Use another email" (the self-fix `c41893f0` built) back to "We sent a link", every press repeats it, and the worklist shows only the first bounce. A domain-verification or quota failure turns every accepted send into `email.failed` with nothing red anywhere. Separately, the ordinary delayed-then-delivered sequence leaves "delivery delayed" in red under mail that arrived.
- **Fix direction:** handle `email.failed` and `email.suppressed` like a bounce (`status: "failed"`, `lastError` from `data.failed.reason` / `data.suppressed.message`); `delivered` clears a "delayed" `lastError`; `delivery_delayed` is a no-op on a row already `failed` or delivered. A small pure `patchForEvent(type, current)` makes it testable. Owner step: subscribe the webhook to the two events in Resend, or it never receives them.
- **Pin it:** `src/lib/mail-queue-rule.test.mjs` (handled list includes both events) plus unit cases for `patchForEvent` (delayed→delivered, bounced→delayed, suppressed).
- **Travels with:** T5-01 (Phase G, where a suppressed member goes next).
- **Owner action:** subscribe the Resend webhook to `email.failed` and `email.suppressed`.

#### L4-02 — Nine "never throws" writers fail silently in production; the three statistics writers cannot even warn in development
**Medium** · **Confirmed** (source; validator re-derived at HEAD)
- **Where:** `src/lib/last-seen.ts:277, 282, 321-322` (`recordPageView` runs only when `statsWritesEnabled()`, its catch logs only when `NODE_ENV !== "production"`); `src/lib/search-log.ts:55, 99` and `src/lib/content-view.ts:29, 39` (same pair); `src/lib/stats-exclusion.ts:46` (`statsWritesEnabled()` = production or `PRESENCE_IN_DEV=1`); ungated but production-silent: `last-seen.ts:313` (`touchLastSeen`), `login-attempt.ts:81-86`, `audit.ts:84-88`, `catchup-reads.ts:42-49`, `feed/actions.ts:1488-1492` (`markFeedSeen`), `auth-tokens.ts:217-220`.
- **What happens:** a schema change that breaks the Visit, SearchLog or ContentView write is invisible everywhere (the writer never runs where its witness could fire), which is the touchLastSeen incident CLAUDE.md gotcha 8 exists to prevent. A broken LoginAttempt write reads as "nobody is locked out", a broken AuditLog write loses the record of a purge that happened, and a broken read-mark leaves members' "new" markers standing. No member sees an error by design.
- **Fix direction:** route every one of these catches through one throttled reporter (`reportSwallowed` with a per-key, per-instance throttle, which `rate-limit.ts` and `auth.ts` each hand-roll today), keeping "never throws"; for the stats writers, make the dev witness reachable (log once that writes are off, or a rolled-back probe in a unit test).
- **Pin it:** the `swallow-rule.test.mjs` L4-08 proposes; `src/lib/stats-exclusion-rule.test.mjs` and `src/lib/catchup-reads.test.mjs:57-63` pin the dev-only witness today and must move with the fix.
- **Travels with:** L4-08 (the gate and the shared throttled reporter), T5-10.

#### L4-03 — A storage outage or revoked R2 key raises no alarm: uploads apologise, deletions pile up, the nightly job stays green
**Medium** · **Confirmed** (source; validator re-derived every site at HEAD)
- **Where:** `src/app/(main)/collection/actions.ts:280-281, 572-573` (`contributePhoto` and `contributePhotoDirect` map the storage error to a sentence with no log line at all; the feed, avatar and audio paths `console.error` only); `src/lib/retention.ts:347-362` (the `pendingImages` step returns `drained.deleted`, refusals never reach `errors`; `imagesStillPending` lives only in the audit row's JSON, no reader); `src/app/api/retention/sweep/route.ts:68` (502 only on `errors`); `src/lib/storage.ts:252, 297` (`readObjectHead`/`headObjectSize` turn a storage failure into `null`, which the audio route reports as the member's file being wrong).
- **What happens:** on the day an R2 token expires or Cloudflare has an incident, members cannot add a photo anywhere and are told to try again in a moment, forever; every removal and account purge leaves its photos publicly fetchable; the sweep retries, fails them all, answers 200. The owner learns it from a member.
- **Fix direction:** report (throttled) in each upload catch when `isStorageFailure` is true (a sharp refusal of an odd file is not an incident); the sweep writes an `errors` entry, so it answers 502, when `drained.failed > 0` or `imagesStillPending` grew; the two read helpers return a distinguishable "unreadable" so the audio route can blame storage, not the file.
- **Pin it:** extend `src/lib/image-purge-rule.test.mjs`: every catch calling `describeProcessingError` also reports; a sweep unit test that a drain with `failed > 0` yields a non-empty `errors`.
- **Travels with:** L4-08 (shared reporter).

#### L4-06 — When the rate-limit backend hangs, every limit silently turns off and each metered action waits three seconds
**Medium** · **Confirmed** (executed: offline probe with the installed `@upstash/ratelimit` 2.0.8 at HEAD, non-routable host and bad DNS name both resolve in 3,002 ms with `{ success: true, reason: "timeout" }`, no throw)
- **Where:** `src/lib/rate-limit.ts:278-298` (`rateLimit` reads only `success`) and `:315-324` (`consume`), neither reads `reason`; `:240` (`timeout: 3000`); `:266-272` (`reportLimiterFailure`, reachable only from a throw); `:210-222` (missing Upstash env: one `console.warn` per instance, then every limit returns "allowed" without reaching the reporter).
- **What happens:** during an Upstash network outage (DNS failure and packet loss included; only a fast HTTP error throws), the reset, signup, trivia, posting, commenting, upload, search and contribution meters are all off, every metered action is three seconds slower for every member, and nothing is reported. A renamed or disconnected env var does the same permanently.
- **Fix direction:** read the verdict: `if (r.reason === "timeout") reportLimiterFailure(name, "timeout", …)` in `rateLimit` and `consume`; in production report missing env once per instance (the demo is excluded by `IS_DEMO`). Build the Redis client with no retries and a per-request `signal: () => AbortSignal.timeout(~1500)`, which also fixes T5-03; consider a one-minute circuit breaker.
- **Pin it:** a new unit test with an injected limiter whose `limit()` resolves `{ success: true, reason: "timeout" }`, asserting the reporter is called.
- **Travels with:** T5-03 (same Redis client fix), T5-10 (the reporter's cost).

#### L4-08 — "Reported, not just logged" is enforced in one file; everywhere else the code treats a console line as an alarm
**Medium** · **Confirmed** (source: greps at HEAD, `reportSwallowed` in 23 call sites in 12 files, none under `src/app`; about 71 console witnesses in 41 server files)
- **Where:** `src/lib/catchup-lifecycle.test.mjs` (the only enforcement, over `src/lib/catchups.ts` alone, with an `isMissingCatchupTable` exemption at `:349`); `src/lib/report-error.ts:13-19` (the house diagnosis: a console line on Vercel is read by nobody); comments that call a console line an alarm, e.g. `src/lib/turnstile.ts:188-194`, `docs/SECURITY.md:268-269`, `src/lib/image-purge.ts:38-40`; `src/instrumentation.ts:11-17` (says database errors are caught; only what is thrown is).
- **What happens:** the diagnosis was applied to the Catch-up engine, the sweep, the mail drain and the limiter, by hand, file by file; every territory in the audit found its own silent instance (T5-02, T2a-04, L4-02, L4-03, L4-06 and Lows), and the platform-health work added reporters the same way, with a second hand-rolled throttle (`auth.ts:591-602`).
- **Fix direction:** one throttled, fingerprinted reporter that is cheaper to call than `console.error` (fold `rate-limit.ts:262-272` and `auth.ts:591-602` into it); a single sweep of the server tree in which every catch that neither rethrows nor reports carries a `// console-only: <why>` tag; correct the comments and `docs/OPERATIONS.md` §3 to say what reaches Sentry.
- **Pin it:** a new `swallow-rule.test.mjs` generalising the `catchup-lifecycle.test.mjs` sweep to `src/lib/**`, every `actions.ts` and `src/app/api/**/route.ts`, dropping the exemption (one test, which is also T5-02's).
- **Travels with:** T5-02, L4-02, L4-03, T2a-04, T5-10 (one reporter, one gate); L4-01 (Phase H, the exemption).

#### O-05 — Mail queued while testing on a laptop is sent for real by production, live token and all
**Medium** · **Confirmed** (live: a throwaway signup on localhost on 2026-09-24 was queued locally at 01:21:33 UTC and sent by production at 01:43:55 with a Resend id, delivered 01:44:00, no send in the dev log)
- **Where:** `src/lib/email.ts:168-185` (the development guard and its comment promising localhost sends no live mail); `src/lib/email-queue.ts:817-838` (the drain's selection, which leaves a row a local drain may not claim "for production to send"); `src/lib/mail-policy.ts:252-288` (`localDrainRecipient`, the one-direction lock); `src/app/(main)/layout.tsx:125-131` (`after(drainMailQueue)` on every production page view).
- **What happens:** any flow exercised locally with a real address (a "forgot password" for a member's address while reproducing a bug, a signup, a resend) mails that address a live link from the real domain the next time any member loads a page in production, and spends the 100-a-day budget launch confirmations need. `OutboundEmail` has no column saying where a row came from.
- **Fix direction:** either stamp an `origin` on each row from `VERCEL_ENV` (a dated additive file in `prisma/migrations-manual/`, default `production`) and let each environment's drain claim only its own rows, or, with no migration, apply the one-address rule at enqueue time outside production (anything but `ADMIN_EMAIL` or an undeliverable TLD is printed and never written). Correct the `email.ts` comment either way.
- **Pin it:** `src/lib/mail-policy.test.mjs`: a row from another environment is not drain-eligible (or the enqueue-time rule refuses a real address outside production).
- **Travels with:** L11-04 (Low, the reverse direction).

#### T2a-04 — Every Catch-up action failure becomes "Something went wrong" plus a log line nobody reads
**Medium** · **Confirmed** (source; validator re-derived at HEAD)
- **Where:** `src/app/(main)/catchups/actions.ts:201-211` (`runAction`: the P2021 branch `:205-206` and the catch-all `console.error` `:208`, sentence `:209`), wrapping 22 of the file's 23 exported actions; `src/lib/report-error.ts` (the reporter the engine got for the same hole, C-149).
- **What happens:** any unexpected exception in a Catch-up action (a P2025 when two people curate the same question, `curatePrompt :979-980, :1007`; a transaction timeout under pool pressure; a `notifyLove` throw after the love was saved, `toggleEntryLove :1706-1717`) tells the member to try again and never reaches the owner; a schema change that breaks an action shows "Something went wrong" indefinitely with Sentry green.
- **Fix direction:** `runAction` takes a label and calls the shared throttled reporter in both branches (the P2021 branch is L4-01's half), keeping the friendly `{ error }` shape; or rethrow non-P2021 errors and let Next report them as every other actions file does.
- **Pin it:** `src/lib/catchup-lifecycle.test.mjs`: `runAction`'s body calls `reportSwallowed(` (or the L4-08 `swallow-rule` test covers it).
- **Travels with:** L4-01 (Phase H, same function), L4-08.

#### T5-02 — A sign-in outage, a broken bot check or a missing mail key never reaches the owner; only console lines record them
**Medium** · **Confirmed** (source: `consoleIntegration()` records breadcrumbs only, no `captureConsoleIntegration`; V-DRIFT: the session-read half is fixed by `e286daf0`)
- **Where:** `src/lib/auth.ts:315` (the door's catch turns a database failure into `LoginUnavailable`, a `CredentialsSignin` that `@auth/core` logs and answers normally); `src/lib/turnstile.ts` (secret missing, siteverify refused, wrong host, unreachable: console only); `src/lib/email-queue.ts:127` (key missing) and `src/lib/email.ts:196, 225, 230, 244`; `src/components/auth/actions.ts:34` and `email-actions.ts:246` (signup and reset bot-check refusals recorded nowhere, not even a log line for `no-token`).
- **What happens:** sign-in can be down for everyone, Turnstile can turn every new member away at launch, or a stripped `RESEND_API_KEY` can stop every confirmation, and the owner hears of it only from a member or by trying himself. `docs/SECURITY.md:268-269` and `turnstile.ts:188-194` say these lines reach Sentry; they do not. Already reported, do not re-wire: `email-queue.ts` sent-write, targeted send, scheduled drain and lease; signup's `joinBatchGroup`; reset's post-commit block; the session read (`auth.ts:599`).
- **Fix direction:** the shared throttled, fingerprinted reporter at the door's catch, the Turnstile configuration and refusal branches, the key-missing and lost-claim lines, and the signup/reset refusals (or a `LoginAttempt`-style row for them); the layout's `after(drain)` catch `(main)/layout.tsx:129`. Do not switch on `captureConsoleIntegration` (every wrong password logs `[auth][error] CredentialsSignin`). Correct the two documents.
- **Pin it:** the L4-08 `swallow-rule.test.mjs` over these files; a doc pin that `docs/SECURITY.md` does not claim console output reaches Sentry.
- **Travels with:** L4-08 (same gate), T5-10 (throttle).

#### T5-03 — When the rate-limit backend is unreachable, sign-in stalls 4 to 67 seconds instead of failing open
**Medium** · **Confirmed** (executed: offline probe with the repo's `@upstash/ratelimit` 2.0.8 and `@upstash/redis` 1.38.2, `getRemaining()` threw after 4,336 ms on a DNS failure and 66,637 ms on a blackholed address while `limit()` resolved in 3 s)
- **Where:** `src/lib/rate-limit.ts:300-311` (`hasBudget` awaits `limiter.getRemaining`, which the 3 s race does not cover); `:221` (`new Redis({ url, token })`: default five retries with exponential backoff, no `signal`); door `src/lib/auth.ts:107-108, 175`; reauth `src/components/settings/actions.ts:204`; new callers `src/components/auth/change-email-actions.ts:93, 104`.
- **What happens:** the file's header promises a Redis blink cannot take down sign-in; during an Upstash network outage every sign-in, account-deletion reauth and email change waits about 4 s (fast failure) or over a minute (packet loss) before failing open. Members already signed in are untouched; a 401 or 5xx fails open at once.
- **Fix direction:** build the Redis client with `retry: { retries: 0 }` (or 1) and `signal: () => AbortSignal.timeout(~1500)` (the client accepts a function, one fresh signal per request), and race `getRemaining` in `hasBudget` exactly as `limit` is raced. Fix the comment at `:240` to say which call the timeout covers.
- **Pin it:** a new unit test on `hasBudget` with an injected limiter whose `getRemaining` never resolves, asserting `true` within the deadline.
- **Travels with:** L4-06 (same client change), T5-10.

#### T5-10 — A wrong Upstash token or an exhausted quota can spend the month's Sentry allowance, then real errors are dropped
**Medium** · **Suspected** (mechanism certain: a 401 throws on every call and is reported once a minute per limiter step per warm instance; the event volume depends on load and instance count; settle with a rotated token on a preview deployment and a count of Sentry events per hour)
- **Where:** `src/lib/rate-limit.ts:263-272` (`REPORT_EVERY_MS = 60_000` in a per-instance `Map`, keyed `name:step`); `src/lib/report-error.ts` (each is a full `captureException` event); `src/instrumentation.ts:35-37` (the free plan is 5,000 errors a month); `node_modules/@upstash/redis/nodejs.js:216-227` (a non-2xx throws at once, no retry).
- **What happens:** a rotated-but-not-updated token, an Upstash 5xx, or the free command quota running out (which L5-02 shows one sign-in bot can do in hours) makes every limiter throw on every call; with 19 limiters, up to three steps and several warm instances, the owner's month of Sentry events can be gone before he wakes, after which the next genuine 500 is dropped. Network-level outages do not reach this path (L4-06).
- **Fix direction:** an hourly cap per key per process and a fingerprint (`["rate-limit-backend"]`) so an outage is one issue with a count; sample `tags.swallowed` events past N per hour in `beforeSend`. This is the throttle L4-08's shared reporter should carry. Owner check D (draft): Sentry Spike Protection on.
- **Pin it:** a new unit test on `reportLimiterFailure` with a fake clock asserting the hourly cap.
- **Travels with:** L4-08, L4-06, T5-03, T8b-18 (Low, same owner check).

### Phase C — When something fails, the member sees the truth and can recover

#### L2-03 — After a session is revoked or the session read stalls, in-app clicks show blank pages inside the old shell, never sign-in
**Medium** · **Confirmed** (source; validator re-derived at HEAD, no client session watcher exists)
- **Where:** `src/app/(main)/layout.tsx:26-46` (the only redirect to sign-in, and since `e286daf0` the only reader of `sessionWasUnavailable()` `:33-35`; the layout does not re-run on a client navigation); page null-shapes `src/app/(main)/feed/page.tsx:30`, `letters/(index)/page.tsx:42`, `messages/(index)/page.tsx:41`, `directory/page.tsx:167-168` (null session locks names: "Confirm your email to browse the people"), also `letters/new/page.tsx:15`, `support/page.tsx:31`, `collection/collection-data.ts:108`.
- **What happens:** after a password reset, block or deletion request on another device (the cookie is still present, so the proxy passes it), or a pool timeout inside the session read, the member's next in-app click renders "No stories yet", a confirmed member is told to confirm their email, the Collection is blank, all under a sidebar still showing their name. Nothing sends them to sign in until a hard reload. The hard-load face now throws to the error screen, so the two faces disagree.
- **Fix direction:** a page that gates on the session must distinguish "no session" from "empty result": redirect to sign-in (through `redirectToSignIn()`) on a null session, and rethrow when `sessionWasUnavailable()` is set, so soft and hard loads behave alike. A typed throw from `auth()`'s null-on-failure path that pages rethrow is the cleaner version and also fixes T1-09 and T8a-12's stall half.
- **Pin it:** extend `src/lib/session-unavailable-rule.test.mjs`: every `(main)` page that reads `auth()` either redirects or rethrows on a null session (no bare `return null`).
- **Travels with:** T8a-12 and T1-09 (Low) (same null-session-means-signed-out root), T8b-02, T8b-15.

#### L2-06 — A failed sidebar-rail or celebration query replaces the whole feed with the error screen
**Medium** · **Confirmed** (source; the trigger, a pool timeout, was observed live in the shell at 02:33 BST on 2026-09-24)
- **Where:** `src/app/(main)/feed/page.tsx:77` (`<CelebrationSignals>`, a three-query `Promise.all` in `celebration-signals.tsx:30-31`) and `:115` (`<FeedRail>`: `LettersModule`, `CollectionModule`, `DirectoryModule`, `feed-rail.tsx:34-36`), none behind `<Suspense>` or a catch; `src/app/(main)/error.tsx:44` (the only boundary, `reset`-bound).
- **What happens:** under pool pressure one rail count throws, `(main)/error.tsx` replaces the content column, and the client feed column never mounts, so the member loses the feed over a sidebar module; "Try again" cannot recover (T8b-15). `PulseModule` (cited by the finder) is deleted.
- **Fix direction:** each rail module and `CelebrationSignals` behind its own `<Suspense>` with a small fallback and a local catch (or a `try/catch` returning `null` inside each), so a decorative query costs only itself. The page's own three-query `Promise.all` (`:47`) still shares the boundary; isolating the rail removes about five of eight queries from the failure surface.
- **Pin it:** a new source rule beside `loading-boundary-rule.test.mjs` that every module rendered by `feed-rail.tsx` and `CelebrationSignals` has a catch or a boundary.
- **Travels with:** T8b-02, T8b-15 (same "a decorative read takes the page" family).

#### L7-01 — Every signed-in page, and its loading skeleton, is invisible until JavaScript and the motion chunk arrive
**Medium** · **Confirmed** (live: the `opacity:0` server style curled on `/login`, 2026-09-27 and 2026-10-23; the (main) template is the same construct, source)
- **Where:** `src/app/(main)/template.tsx:28-38` (`<m.div initial={{ opacity: 0, y: 8 }}>` wraps every page, `loading.tsx` and `(main)/error.tsx`, per Next's `template.md:47`); `src/components/common/motion-features.tsx:37-40` (`LazyMotion features={loadDomMax}`, async, no `catch` in framer-motion's `LazyMotion`); `docs/spec/DESIGN-SYSTEM.md:461-466` (the loading rule this defeats).
- **What happens:** on every hard load (opening the app, refresh, a link from email or WhatsApp, the PWA icon) the shell paints over an empty page area until the route hydrates and the motion chunk downloads; the warm-shimmer skeletons are streamed at opacity 0 and never seen on the loads they exist for. If the motion chunk fails, every signed-in page stays blank for the session, with no error and no report.
- **Fix direction:** do not hide on the first render: skip the entrance on the initial load (`initial={false}` until a module-level "first commit happened" flag is set) or make the entrance a CSS animation keyed on navigation. Separately give `LazyMotion` a loader that cannot strand the app (retry once, then a no-op feature set).
- **Pin it:** extend `e2e/loading-fallbacks.spec.ts` to assert the first flush has no `opacity:0` on the template wrapper (today it asserts class strings, so an invisible skeleton passes).
- **Travels with:** T8b-07 (Low, its motion-chunk erratum: `FadeRise` and 73 other `initial={{ opacity: 0 }}` sites), T8b-19 (Low, the landing's same mechanism).

#### L7-03 — After a deploy, the first tap on anything loaded lazily replaces the page with an error that "Try again" repeats
**Medium** · **Suspected** (the failure path once a chunk fetch fails is certain in Next's loader; settle it signed in as the test account in chrome-devtools: block the comments chunk, press a post's comment count, then press "Try again")
- **Where:** `node_modules/next/dist/esm/shared/lib/lazy-dynamic/loadable.js` (`React.lazy(() => opts.loader().then(convertModule))`, no catch; the rejection is cached); no `src/app/global-error.tsx` and no `ChunkLoadError` handling in `src`; `dynamic()` in 17 files outside /lab, e.g. `src/components/posts/post-card.tsx:75-88`, `posts/create-post-form.tsx:52-61` (MentionDropdown on typing `@`), `common/lazy-image-viewer.tsx:28-33`, and `guide/guide-layer.tsx:37-42` (mounted by the layout, so the ROOT boundary takes the sidebar too).
- **What happens:** a member leaves a tab open across a deploy (Skew Protection is off, L8-06), comes back, types `@` in a new post: the old chunk is gone, the feed is replaced by "Something went wrong", the composer and its text are lost (feed posts keep no device copy), and "Try again" re-throws the cached rejection until a reload. Same for the first photo, comments, Report, Edit, Contribute, an onboarding step. A dozen bare `void import()` warmers also reject unhandled.
- **Fix direction:** one wrapper for every lazy import: retry once, then resolve to a small fallback component ("This did not load. Reload the page.") instead of rejecting; a `ChunkLoadError`-aware reload (once per session) in the `(main)` and root boundaries; catch the bare warmers.
- **Pin it:** a source rule in the shape of `src/lib/unattended-rule.test.mjs` that every `dynamic(` in `src` goes through the wrapper; an e2e that aborts one lazy chunk and asserts the page survives the press.
- **Travels with:** T9-04 (the no-tap instance), L8-06 (the platform half), T8b-07 (Low, missing `global-error.tsx`), T8b-15 (the button).

#### L8-06 — After a deploy, open tabs get "Check your connection" on every save, which no retry fixes; Skew Protection is off
**Medium** · **Confirmed** (data: `skewProtectionMaxAge: 0` read from the Vercel project API on 2026-10-23 and 2026-10-24; mechanism in Next's source)
- **Where:** `src/lib/call-action.ts:43-59` (every rejection becomes `ACTION_FAILED` `:23`, "That did not go through. Check your connection and try again", though the header `:5-7` names deploy skew as a cause); `node_modules/next/dist/server/app-render/action-handler.js:589, 743` ("Failed to find Server Action", `x-nextjs-action-not-found`) and `server-action-reducer.js:104` (`UnrecognizedActionError`); `src/components/posts/use-letter-persistence.ts:328, 335`.
- **What happens:** production deploys every few days; any tab opened before one then answers every heart, comment, Load more or autosave with the connection sentence, for as long as the tab lives. The member needs a reload, which is the one thing the sentence does not say.
- **Fix direction:** Skew Protection is Pro and Enterprise only (Vercel's page, fetched 2026-10-24), and production is on Hobby since 2026-10-23, so the code half is the whole fix. Code: in `callAction`, recognise `unstable_isUnrecognizedActionError(err)` and answer "The site was just updated. Reload the page to carry on." (still needed for tabs older than the maximum age). This is the same code change as O-04's (Low) generic sentence; do them as one.
- **Pin it:** a new `src/lib/call-action.test.mjs` case: a rejected `UnrecognizedActionError` maps to the reload sentence; a line in `docs/OPERATIONS.md` recording the setting.
- **Travels with:** O-04 (Low), T5-06 (same `callAction` catch), L7-03 and T9-04 (the switch also covers lazy chunks).
- **Owner action:** turn Skew Protection on (Vercel → Project → Settings → Advanced).

#### T5-06 — A member whose cookie has lapsed or been cleared is told "check your connection" on every save
**Medium** · **Confirmed** (source; validator traced the proxy, Next's action forwarder and reducer; V-DRIFT found the reach widened by `dcad8dd8`)
- **Where:** `src/proxy.ts:307-328` (no session cookie: `/api` gets 401 `:318-320`, everything else including a server-action POST is 307'd to `/login?next=` `:328`); `src/lib/call-action.ts:43-59` (the reducer's rejection becomes `ACTION_FAILED`); `src/app/api/auth/stale/route.ts` with `sessionIsStale` `src/lib/auth.ts:557-562` (a hard load now deletes a revoked, expired or undecodable cookie); `src/lib/auth.ts:319-349` (absolute 90-day expiry).
- **What happens:** a save from a tab whose cookie is absent (the 90-day lapse, which the launch cohort hits on one day, or, since `dcad8dd8`, any revocation once another tab has hard-loaded) loops proxy 307, `/login`'s action forwarder, 307 again, `200 {}`, and the member sees "That did not go through. Check your connection and try again." A reload then sends them to sign in and loses what they typed, except on the letters desk, which keeps a device copy.
- **Fix direction:** in `proxy.ts`, before the page redirect, answer a POST carrying `next-action` with 303 and an `x-action-redirect: /login?next=…;replace` header and NO `Location` (a `Location` re-enters the replay loop); the reducer then hard-navigates to sign-in. In `callAction`, rethrow a NEXT_REDIRECT rejection (`isRedirectError` or `unstable_rethrow`) instead of mapping it. A `401 text/plain` alternative only shows its sentence if the content type is exactly `text/plain`; prefer the 303. `/login` can then say the sign-in ran out.
- **Pin it:** `src/lib/proxy-rule.test.mjs` (an action-shaped POST with no cookie answers 303 with `x-action-redirect` and no `Location`); `src/lib/call-action.test.mjs` (a NEXT_REDIRECT rejection is rethrown).
- **Travels with:** T8b-03 (merged here), L8-06 and O-04 (Low) (same `callAction` catch).

#### T8a-12 — A session read that stalls after payment shows "Not authenticated" in red and re-enables Contribute
**Medium** · **Confirmed** (source; validator traced `@auth/core` returning a null session on a callback throw; V-DRIFT: `e286daf0` left this path live)
- **Where:** `src/app/(main)/support/actions.ts:153-154` (`confirmContribution` checks `auth()` before the payment signature); `src/components/support/support-contribute.tsx:239-242` (a returned `{ error }` runs `setWorking(false); toast.error(...)`, against its own comment `:222-226`; only the thrown branch `:228-238` says "Your payment went through"); `src/lib/auth.ts:370-404, 541-548` (session callback and `guardedSession`: a pool timeout or a revoked cookie gives `null`).
- **What happens:** the member's bank or UPI app has just confirmed; the page says "Not authenticated" in red and the "Contribute ₹1,000" button is live again, inviting a second payment (the webhook records the first regardless, so a second is a real double charge the owner refunds by hand). "Nothing has been recorded" in the signature-failure sentence is also false once the webhook lands.
- **Fix direction:** either half closes it. Client: after the handler runs, no post-payment outcome re-enables the button or speaks in red about the payment; every `{ error }` except a signature mismatch takes the "went through, the page could not keep up" branch. Server: verify the HMAC first and CAS the row by `razorpayOrderId` without needing a session (the row's `userId` was fixed at `startContribution`).
- **Pin it:** a source pin (beside `src/lib/contribution-state.test.mjs`) that the post-payment `{ error }` branch in `support-contribute.tsx` does not call `setWorking(false)`.
- **Travels with:** L2-03 (same null-session root).

#### T8b-02 — One slow query in the signed-in shell throws the whole app to a full-screen error with no navigation
**Medium** · **Confirmed** (live: the orchestrator saw the root boundary's text with `timeout exceeded when trying to connect` thrown from `<MainLayout>`, 2026-09-24 02:33 BST)
- **Where:** `src/app/(main)/layout.tsx:92-111` (four-way `Promise.all`: `unreadNotificationCount`, `verificationMailState`, the inline `prisma.catchup.findFirst :107`, none with a catch); `src/lib/notification-count.ts:14-18`; `src/app/error.tsx:25` (the root boundary: no shell, `reset`-only); `src/app/(main)/error.tsx` (wraps only the page, so a throw in the layout passes it).
- **What happens:** nothing paints while the layout waits (its awaits sit above every `loading.tsx`); then, depending on which query lost the pool race, the member gets the root apology with no sidebar, the page apology inside the shell, or a normal page (`advanceDueCatchups` swallows, `catchups.ts:493-499`). Since `e286daf0` a stalled session read is sent to the same root screen on purpose.
- **Fix direction:** the three non-essential reads degrade instead of throw (`0` / `null` / `null` plus one `reportSwallowed`), so the shell paints with a zero badge for one view; optionally stream `unreadCount` and `hasCatchup` to the sidebar as promises behind Suspense so `loading.tsx` paints on `auth()` alone.
- **Pin it:** extend `src/lib/session-unavailable-rule.test.mjs` (or a new layout rule) that each of the three helpers in the layout's `Promise.all` carries a catch.
- **Travels with:** T8b-15 (the root boundary's button), L2-06, T5-02 (Phase D, the outage is invisible).

#### T8b-15 — "Try again" on every error screen re-shows the same failure; only a manual reload escapes
**Medium** · **Confirmed** (source: installed Next 16.3.8 `error-boundary.js` and its docs; the orchestrator's 02:33 BST observation fits)
- **Where:** `src/app/error.tsx:25`, `src/app/(main)/error.tsx:44`, `src/app/(auth)/error.tsx:34` (each binds `onClick={reset}`); `node_modules/next/dist/client/components/error-boundary.js:43, 114` (`retry` = refresh then reset, passed beside `reset`); Next's `error.md:121, 157` ("In most cases, you should use `retry()` instead").
- **What happens:** pressing "Try again" clears the boundary and re-renders the same cached errored payload with no request, so the same screen comes back. On the root boundary it is the only control. V-DRIFT: since `e286daf0` a database stall on a hard load is designed to land on the root boundary, whose comment says "Try again" re-asks, so O-03's fix leaves the member on a screen whose only button cannot recover.
- **Fix direction:** bind `retry` instead of `reset` in all three files (and in T8b-07's future `global-error.tsx`); give the root boundary a way out ("Go to the feed" or a plain reload).
- **Pin it:** a grep test beside `src/lib/loading-boundary-rule.test.mjs`: every `src/app/**/error.tsx` binds `retry` and does not reference `reset`.
- **Travels with:** T8b-02, T8b-07 (Low, `global-error.tsx`), L7-03 and T9-04 (both land on these buttons).

#### T9-04 — The idle sidebar bird can replace the whole signed-in shell with an error screen, with no tap, every 90-120 s
**Medium** · **Suspected** (mechanism certain; settle it as the test account on a FRESH tab opened straight onto `/letters` at 1440x900: emulate offline, press Ctrl+Shift+H, expect the root error screen; restore network, "Try again", Ctrl+Shift+H again, expect it again)
- **Where:** `src/components/mascot/sidebar-hoopoe.tsx:56` (`dynamic(() => import("./hoopoe")…, { ssr: false })`), `:127-135` (`tryEnter` → `setMounted(true)` from an idle timer); mounted from the (main) layout via `AppShell` → `Sidebar` (`src/components/layout/sidebar.tsx:676`), so the ROOT boundary `src/app/error.tsx` catches it; siblings `mascot/moments/logo-easter-egg-hoopoe.tsx:35, 56`, `mascot/mascot-flight-layer.tsx:48`.
- **What happens:** if the bird's chunk cannot be fetched (a tab outliving a deploy, a flaky connection, a blocker), the idle summon throws inside the layout and the sidebar and page vanish behind "Something went wrong"; the cached rejection repeats it every 90-120 s until a reload, while the member was only reading. Pages that import the rig statically (`/feed`, `/welcome`, `/directory`, `/messages`) are mostly spared; `/letters`, the Catch-ups list and `/support` are where it bites.
- **Fix direction:** the L7-03 lazy-import wrapper covers it (a decorative loader resolves to `() => null` on failure); keep `void loadPeek()` from producing an unhandled rejection.
- **Pin it:** the L7-03 source rule; an e2e that aborts the rig's chunk (`page.route`) and summons the sidebar bird, asserting the page is still the page.
- **Travels with:** L7-03 (canonical census, one fix unit), T8b-07 (Low), T8b-15.

### Phase G — Sign-up, sign-in and the confirmation mail

#### C4-01 — An anonymous script can take over the trivia room in its first hour and, at the hourly cap kept a year, outgrow the database
**Medium** · **Confirmed** (data: row sizes measured read-only, 344 B and 136 B; arithmetic re-derived by the validator)
- **Where:** `src/components/auth/trivia-actions.ts:55-77` (`getTriviaQuestion`: public, no meter, writes `dontknow`/`shown` with up to 200 typed characters on every call; `:45-47` "no limit on swapping"); `:100-108` (`checkTrivia` writes a `limited` row with the typed answer even after the per-IP meter refused); `src/lib/trivia-log.ts:37-53, 126-141` (`TRIVIA_ROWS_PER_HOUR = 600` site-wide, count-then-insert; a cookieless call mints a new browser id, `:73-88`); `src/lib/retention.ts:83` (`gateLog: 365`).
- **What happens:** the cap is first come, first served for the whole site, so a script spending 600 slots an hour leaves none for real newcomers: their rows are dropped without a trace and the room's funnel is computed from the script. Kept a year, the cap's steady state is about 5.3 million rows, about 2.5 GB, five times the free plan; at the cap the table grows about 7 MB a day, so the 350 MB alarm fires in about a month and the database reaches its limit in about seven weeks. Five places promise a bot cannot do this (`trivia-log.ts:37-49`, `docs/spec/admin.md:699`, `docs/SECURITY.md:105-109`, `src/lib/admin-trivia.ts:20-24`, `src/lib/gate-coverage.test.mjs:42`).
- **Fix direction:** meter the writer per source before `recordTrivia` (a generous per-IP bucket, e.g. 60 rows an hour; drop the row, not the visitor's answer); a refused `checkTrivia` writes at most a counter, not a row with text; size retention to the cap (raw `shown`/`skipped` rows can go after 90 days). Make the five promises true. Check `git log` on these files first: a peer session was building this code on 2026-10-24.
- **Pin it:** extend `src/lib/trivia-log-rule.test.mjs`: a per-source meter precedes `recordTrivia` in `getTriviaQuestion`; the refused branch records no answer text; `TRIVIA_ROWS_PER_HOUR × 24 × gateLog days × 485 B` stays under a stated budget.
- **Travels with:** L5-02 (the same shape on the sign-in door; its verified-clean line "trivia refuses before it writes" is false since `42ec6fe7`), C2's L4-02 extension (these writers are silent in production), L8-04 (check D, a firewall rule, also bounds it).

#### C4-02 — After "Use another email", the banner blames the new address for the old one's bounce, and the gate stays shut
**Medium** · **Confirmed** (source; both triggers re-derived by the validator; live data shows a member at four confirmation mails in one hour, one short of the limit)
- **Where:** `src/lib/email-queue.ts:985-1018` (`verificationMailState` reads the newest verify row of any address); `src/app/(main)/layout.tsx:200-205` (labels a bounce with the current address); `src/lib/verification-mail.ts:29-36` (the queue's refusal is dropped, T5-13); `src/lib/email-queue.ts:435-440, 496-502` (5 verify mails an hour per member); `src/components/auth/change-email-actions.ts:164-191` (the comment promising "Send me the link" after a reload, which never appears); `src/lib/mail-policy.ts:357-365` (no row for the new address keeps the gate shut).
- **What happens:** the move dialog only opens from the bounced state, so at a move the newest row is the old address's bounce. If the new address's mail is not queued (the hourly limit was spent pressing "Send it again", or a step after the move throws), the member is told "Your link is on its way to n***@new", then the banner says "n***@new didn't accept it". The gate stays shut, and the only control left spends another of three moves a month.
- **Fix direction:** make `verificationMailState` address-aware (only rows whose `to` matches the current address, case-insensitively, as the fold already does), so a moved member with no row reads `none` and gets "Send me the link"; return the queue's answer through `sendVerificationEmail` (T5-13) and have the move say so honestly when the mail could not be queued; consider exempting a move's first mail from the hourly limit. Add `to` to `claimAndSend`'s claim (C4-03) in the same change.
- **Pin it:** a unit test on a pure `stateFor(rows, currentEmail)` extracted from `verificationMailState` (rows to the old address only → `none`); a source pin that `changeUnconfirmedEmail` reads `sendVerificationEmail`'s `queued`.
- **Travels with:** C4-03, T5-13.

#### C5-02 — One person can spend the whole day's mail on password resets, every day, so nobody else's reset or confirmation goes out
**Medium** · **Confirmed** (source: the meters' constants; the orchestrator re-derived the arithmetic)
- **Where:** `src/lib/rate-limit.ts:76-79` (`reset`: 5 per 15 minutes per IP, nothing per day); `src/lib/email-queue.ts:435-437` (per account 4 per 30 minutes, 8 an hour; `src/lib/auth-tokens.ts:56-59` the same for the token); `src/components/auth/email-actions.ts:238-249` (the M3 comment promising one caller can no longer burn the day's ~95 mails); the policies print a live login address as the contact.
- **What happens:** resets may spend the whole daily budget, and the bounds are per IP and per account, never per recipient per day. One known address empties the day in about 12 hours; two or three from one IP in about 5. Every real reset and confirmation then waits until 05:30 IST, the targeted inbox fills with resets, and an empty budget also leaves new signups' email gate open.
- **Fix direction:** cap what one address may receive per day (e.g. 3 resets per address per 24 hours, enforced in `enqueueMail` for `kind: "reset"`); cap resets' share of the day below the whole budget; a per-IP daily ceiling on the reset door. Consider a role inbox, not a login address, as the policies' contact.
- **Pin it:** a pure `mail-policy` rule "resets for one address in 24 h ≤ K" with a test, and a test that resets cannot consume more than the day minus a reserve.
- **Travels with:** C4-02 and T5-13 (same queue; one worker).

#### C5-03 — The entry question no longer keeps strangers out: its answers are public, and one question accepts any reply containing "egg"
**Medium** · **Confirmed** (executed: the real `judge()` passes "veggies"; the bank is on the public `origin/main`, checked by the orchestrator)
- **Where:** `src/lib/trivia-bank.ts:63-190` (every question and accepted answer, in the public repository; `:11-15` "the answers must never reach a browser", guarded only by a client-import test); `:129-148` (the Thursday-dinner question: no answers, a `contains` list) with `:277` (`guess.includes(c)` on the normalised guess); `src/components/auth/trivia-actions.ts:40-48` (swapping questions is free and unlimited).
- **What happens:** the gate is the first thing between a stranger and the feed, the letters and the map, and the privacy page promises what members share is shown "to no one else". Anyone can read every answer on GitHub, or swap until the dinner question appears and type "veggies".
- **Fix direction:** owner decision first (Q18). If the gate should hold: move the questions and answers out of the repository (the `TriviaAnswer` table the admin room already writes, or an env-held JSON), write new questions since the old ones stay in git history, keep `trivia-bank.ts` as the judge only, tighten `contains` (the mention must be most of the guess), and meter swaps per IP. If the gate is a courtesy: say in the privacy page what actually stands between a stranger and the feed.
- **Pin it:** a test that `trivia-bank.ts` holds no answer strings; a `judge` test that "veggies" and a six-dish list fail the dinner question.
- **Travels with:** C4-01 (same files, a peer session's code; check `git log` first).
- **Owner question:** Q18.

#### C6-01 — Two accounts can queue more mail to their own addresses than the site sends in a day, so no new member's confirmation goes out
**Medium** · **Confirmed** (source; the live mail baseline matches: peak day 88 of 95 sends, so ordinary use already brushes the cap)
- **Where:** `src/components/auth/email-actions.ts:42-80` (`resendVerification`, 5 an hour); `src/components/settings/actions.ts:181-259` (`requestAccountDeletion`, no stage gate, ends the session, enqueues `deletion-scheduled`); `src/lib/auth.ts:268-295` (signing in cancels it at once, so request, sign in, request is a loop); `src/lib/email-queue.ts:435-442, 466` (per-account hourly bounds only; `deletion-scheduled` never folds); `src/lib/mail-policy.ts:26-34, 46-48` (priority 20, a reserved kind that may spend the day to zero).
- **What happens:** eight mails an hour per account to its own never-proven address; two accounts queue more than the day's 95. They drain first overnight, so new members' confirmations are never sent, every reset waits for 05:30 IST, and real members' "password changed" and "account will be deleted" notices, at the same priority and oldest first, are in practice never sent.
- **Fix direction:** one per-recipient ceiling across all kinds per rolling 24 hours in `enqueueMail` (also closes C5-02); never send `deletion-scheduled` to an address that was never confirmed; fold it like verify and reset; a per-account daily verify ceiling; a cool-down on re-requesting deletion right after a cancel.
- **Pin it:** a `mail-policy` test that one address's kinds together cannot exceed K a day; a source pin that `requestAccountDeletion` does not enqueue for an unconfirmed account.
- **Travels with:** C5-02, C4-02, T5-13, O-09.

#### L7-02 — On an iPhone, tapping into a small text field zooms the page and leaves it zoomed
**Medium** · **Suspected** (one real iPhone tapping "Write a comment…" settles it, or Playwright `webkit` in the iPhone 13 profile reading `visualViewport.scale` after the tap; the font sizes themselves are read from source)
- **Where:** `src/app/layout.tsx:63-68` (viewport sets no `maximumScale`); `src/components/posts/comments-section.tsx:584-587` (comment textarea `text-sm`); `src/components/layout/search-pill.tsx:228-240` (`text-[13.5px]`); `src/components/ui/combobox.tsx:42-48` (onboarding city picker, `text-sm`). The report (`reports/L7.md`, L7-02) lists nine more: profile pens, poll options, filter search, batch-range selects, house picker, message composer, song answer, support amount, an admin select.
- **What happens:** iOS WebKit zooms any field under 16px on focus. The comment box, header search, a new member's city picker and every profile field are 13-15px at phone width, so the page magnifies on tap and stays magnified with a sideways scroll until the member pinches back.
- **Fix direction:** 16px at phone width, the design size from `md:` up, the way `ui/input.tsx`/`ui/textarea.tsx` already do; include the pens, which inherit their row's 15px while editing. `maximumScale: 1` also stops it but kills pinch-zoom: a design-system decision, not the fix. Drop the report's "the owner is on Android so nobody saw it" premise (`next.config.ts:268-271` exists for real-iPhone testing).
- **Pin it:** a sweep in the protocol audit (`scripts/qa/protocol-audit.mjs`): any input, textarea, select, `ComboboxInput` or contentEditable whose unprefixed font size resolves under 16px fails.
- **Travels with:** —

#### T5-01 — A member whose mistyped signup address does not bounce can never correct it; the app's advice points at edits that do not exist
**Medium** (re-ruled from High: `c41893f0` fixed the bounced case) · **Confirmed** (source; data: 24 unconfirmed members, none on a common typo domain yet)
- **Where:** `src/components/auth/verify-email-banner.tsx:274-281` ("Use another email" exists only in state `bounced`); `src/app/(main)/admin/mail/actions.ts:53-56` (`retryMail` writes `RETRY_RESET`, never `to`; sends go to the frozen `row.to`, `src/lib/email-queue.ts:333, 508, 601`); `src/components/auth/email-actions.ts:110` ("Check the email address on your profile"); `src/app/(main)/admin/people/actions.ts:93` (admin editor refuses email by design).
- **What happens:** a typo that delivers to someone else's real inbox, or ends `failed`/`suppressed` rather than bounced (L11-05), leaves the member unconfirmed for good: resend and the admin's Retry go to the frozen address, the profile row the copy points at edits only the display address and says "Saved" (T6-06), reset answers ok and mails nobody, and there is no signed-in password change. Their only exits: write to the owner from /messages, or the owner deletes the account so they sign up again.
- **Fix direction:** an admin "change their sign-in address" verb on the person page (signup's canonical form, refuse a `lower(email)` collision, `emailVerified: null`, re-address queued verify rows the way `change-email-actions.ts` already does, an audit line); `retryMail` or `render()` re-resolves `to` from the user row when `userId` is set; fix the "on your profile" copy (the report's third copy target, the stale-link lines in `verify-client.tsx` / `reset-client.tsx`, became reachable with `c41893f0` and is now right). Self-service change outside `bounced`, and an in-app password change, are the owner's call.
- **Pin it:** `src/lib/mail-policy.test.mjs`: a retry of a row whose user's email changed targets the current address; extend `src/lib/email-normalization-rule.test.mjs` to the new writer; a string test that `email-actions.ts` no longer promises a profile edit.
- **Travels with:** T6-06 (the profile row that makes the copy a trap)
- **Owner question:** Q3.

#### T5-04 — Simultaneous tokenless sign-ins all pass the five-an-hour allowance, and the eventual refusal gives the wrong advice
**Medium** · **Confirmed** (source)
- **Where:** `src/lib/auth.ts:175-181` (read at :175, spend at :178, verdict at :179-181; the comment at :176-177 claims a racer "cannot outrun its own meter"); `src/lib/rate-limit.ts:300-324` (`hasBudget` reads, `consume` spends: two separate Upstash calls); `src/lib/rate-limit.ts:42-46` (`login-account`'s "stopped by the tenth guess" has the same burst gap); `src/app/(auth)/login/login-client.tsx:177-183`.
- **What happens:** N concurrent tokenless sign-ins from one address all read "budget left" and all get a bcrypt-checked guess; only the next sequential attempt is refused. Each costs a cost-12 bcrypt (~0.25 CPU-s, the dummy compare at `auth.ts:210` for unknown addresses). Once the allowance is spent the member is told "Refresh the page and try once more", the exact loop `turnstile-widget.tsx:31-36` calls the bug.
- **Fix direction:** this meter spends on success and failure alike, so replace the pair with one atomic `rateLimit("login-unverified", ip)`. Give the spent allowance its own `CredentialsSignin` code and a sentence ("try again in an hour, or from a network where the check can load"). For the failure-only meters (`login-ip`, `login-account`, `reauth`), either state the burst window in the comment or spend-then-refund, and correct `rate-limit.ts:42-46`.
- **Pin it:** `src/lib/security-regressions.test.mjs`: `auth.ts` must not contain `hasBudget("login-unverified"`; a login-client test that the new code maps to its own sentence.
- **Travels with:** —

#### T5-05 — Thirty minutes after passing the entry question, the signup form dead-ends with a question that is no longer on screen
**Medium** · **Confirmed** (source)
- **Where:** `src/components/auth/trivia-actions.ts:30` (`TOKEN_TTL_MS` 30 min), `:137-144` (pass cookie `maxAge` 30 min), `:149-158` (`hasPassedTrivia`); `src/components/auth/actions.ts:24-26` (refusal); `src/app/(auth)/signup/signup-client.tsx:29, 175` (`step` only ever goes trivia → register).
- **What happens:** a member who takes over half an hour on the nine fields and the three policy documents the consent line asks them to read presses Join and gets "Please answer the entry question before signing up." with no question on the page; the only way out is a reload, which loses everything typed.
- **Fix direction:** on that refusal, return to the trivia step while keeping the form's values, and say so; consider a longer pass window (the pass is browser-bound and buys a bot one rate-limited attempt). At HEAD (`42ec6fe7`, after the validators) the `rv_trivia_id` cookie lives 30 days (`src/lib/trivia-log.ts:62-90`), so the report's "30 minutes from the FIRST attempt" half is gone: the window now runs from the pass.
- **Pin it:** extract the "gate refusal → trivia step, fields kept" rule into a pure module and unit-test it.
- **Travels with:** —

#### T5-07 — A room of alumni on one network is refused at signup and told to wait "a minute" for a window of ten minutes to an hour
**Medium** · **Confirmed** (source for the meter sizes and the copy; data: `dig` finds no AAAA record, so phones on IPv6 carriers share a NAT64 address). Whether a launch-day room actually trips it is load-dependent.
- **Where:** `src/lib/rate-limit.ts:84` (trivia 8 per 10 min per IP), `:75` (signup 10/h), `:79` (reset 5/15 min), `:70` (login-unverified 5/h); `src/lib/rate-limit-message.ts:8` ("Give it a minute and try again."); `src/components/auth/trivia-actions.ts:101-106`; `src/components/auth/actions.ts:106-107`.
- **What happens:** thirty alumni at a reunion venue, staff on the campus network, or members on one carrier's NAT each need a trivia check; the ninth in ten minutes is refused, waits a minute as told, and is refused again. "A minute" is right only for `search`.
- **Fix direction:** the sentence names no duration (or the refusal carries its window class so it can be honest per meter); raise `trivia` to about 20 per 10 min and `signup` to about 30/h per IP, as signup's own comment argues. Drop the report's "Jio/Airtel are mostly IPv6, which helps": with no AAAA record it hurts.
- **Pin it:** a `rate-limit-message` test that the sentence names no duration; a LIMITS test that trivia's hourly allowance is not below signup's.
- **Travels with:** —

#### T5-09 — With only the Turnstile secret configured, nobody can sign up or reset a password, and sign-in drops to five an hour per address
**Medium** · **Confirmed** (source)
- **Where:** `src/lib/turnstile.ts:65-67` (comment: the server "stays consistent by skipping verification too"), `:77-80` and `:145-156` (`checkTurnstile` skips only when the SECRET is missing); `src/components/auth/turnstile-widget.tsx:236` (no site key → no token sent); `src/components/auth/actions.ts:33-34` and `src/components/auth/email-actions.ts:244-246` (hard refusals).
- **What happens:** expected, a missing site key degrades to "no bot check". Actual: with `TURNSTILE_SITE_KEY` unset and the secret set, signup and reset refuse every human with "Refresh the page and try once more" and no widget on the page; sign-in falls to the `login-unverified` allowance (`src/lib/auth.ts:137-186`). The only trace is a `console.warn` per refusal (T5-02).
- **Fix direction:** one `turnstileConfigured()` (both keys present) read by `turnstileSiteKey()` and `checkTurnstile()`; exactly one key set → report through `reportSwallowed` and fail open. The reverse asymmetry already fails open and logs.
- **Pin it:** a pure mode-decision module with a unit test over the four env combinations.
- **Travels with:** L10-03 (a Cloudflare challenge outage closes the same two doors; same fix family)

### Phase H — Catch-ups: answering, reading, and the words on the clock

#### L3-02 — The Catch-ups export, the safety copy taken before every destructive Catch-ups migration, records every timestamp shifted by the laptop's time zone
**Medium** · **Confirmed** (data: the same Catch-up's `createdAt` is 5 h 30 m early in the 09-14 export and 1 h early in the 10-11 export against the live row read `::text`)
- **Where:** `scripts/dev/export-catchups.mjs:81` (`new pg.Client`, no type-1114 parser), `:85` (`iso()` over node-pg's local-time parse); `src/lib/catchups-export.ts:1-30` (the "totally regeneratable", "Dates are ISO strings" promise); `scripts/dev/.anon-cleanup/apply.mjs:127, 146, 157` (gitignored one-off undo file, same shape).
- **What happens:** expected, an archive a rebuild can trust. Actual: every timestamp is shifted by whatever zone the laptop is in (IST in September, BST in October, right only in GMT months), so a rebuild would move every deadline and publication and can put a small-hours deadline on the wrong valley day. The nightly `pg_dump` is correct and remains the real floor.
- **Fix direction:** one shared helper (beside `_env.mjs`) that installs `pg.types.setTypeParser(1114, s => new Date(s.replace(" ", "T") + "Z"))`, used by every raw-pg script including `run-sql.mjs`; or select timestamps `::text` the way `redate.mjs` does. Then mark the five existing exports as shifted (or re-take them) and fix the anon-cleanup undo file before anyone trusts it.
- **Pin it:** a `scripts/qa` rule test that every `new pg.Client`/`new pg.Pool` under `scripts/` goes through the shared helper, in the style of `scripts/qa/hand-run-passes.test.mjs`.
- **Travels with:** —

#### L4-01 — A missing column on any Catch-up table makes all of Catch-ups say "not set up yet", stops the engine, and alerts nobody
**Medium** · **Confirmed** (executed: `isMissingTable` imported in Node at HEAD returns true for a P2022 "column CatchupEntry.x does not exist"; data: two Catch-up column drops pending on the shared database)
- **Where:** `src/lib/prisma-errors.ts:50-57` (the `/does not exist/` message fallback matches a column as well as a table); `src/lib/catchups-core.ts:1290-1292` (`isMissingCatchupTable`); `src/lib/catchups.ts:320, 494` (the engine returns before its `reportSwallowed` at :329; also `src/lib/batch-catchups.ts:265, 399`); `src/app/(main)/catchups/actions.ts:205-206` (`runAction`).
- **What happens:** if a `Catchup*` column is dropped before the code stops naming it, or a new field reaches production before its `ALTER TABLE`, every member sees "Catch-ups are almost ready. Check back in a moment." on five pages (index, home, reader, new, join; lines in `verdicts/V-L-b.md` L4-01), every Catch-up action says "not set up for this community yet", Editions stop moving, and nothing reaches Sentry. The owner hears of it when a member asks.
- **Fix direction:** narrow `isMissingTable` to P2021/42P01 (or a `relation "…" does not exist` message) so a column error is never matched; better, retire the guard, since the tables exist. Any branch that keeps a friendly screen must call `reportSwallowed`. The two pending drops (`2026-10-11-drop-song-columns.sql`, `2026-10-17-drop-rhythm-columns.sql`) are already gated in their headers on the deploy going live; the ADD direction is unguarded.
- **Pin it:** `src/lib/prisma-errors.test.mjs`: a P2022/42703 "column Catchup….x does not exist" is not a missing table. Tighten the swallow sweep in `src/lib/catchup-lifecycle.test.mjs:349` (it passes today because `reportSwallowed(` appears after the early return) and extend it to `catchups/actions.ts` and the five pages.
- **Travels with:** T2a-04 (the console-only catch in the same `runAction`)

#### L7-09 — A voice answer the member removes while it is still saving comes back onto their answer; a double tap leaves the microphone on
**Medium** · **Confirmed** (source; the local repro is in `reports/L7.md` L7-09: Slow 4G, record, Done, bin within a second, reload)
- **Where:** `src/components/catchups/answer/voice-recorder.tsx:226-249` (`send`'s `.then` calls `onStored(stored)` unconditionally; `l.uploading = run` overwrites the previous run), `:449-461` (`remove` calls `onStored(null)` at once), `:262-289` with `:311-322` (`start` checks `l.recording` before the `getUserMedia` await, sets it after), `:801-830` (mic enabled through "asking"; Record again and Remove enabled while saving).
- **What happens:** a member records, presses Done, then taps the bin while "Saving the recording.": the box says "Recording removed", the answer is saved with no audio, then the upload lands and saves it again with the audio, so the batch can play what they took back. A second mic tap during the permission prompt starts two recorders into one chunk array (a garbled file) and leaves one microphone open after Done for the life of the tab.
- **Fix direction:** one generation counter bumped by `start`, `remove` and unmount; every continuation (`getUserMedia` resolution, `send`'s `.then`, `onstop`) checks its own generation and, if stale, stops what it holds and delivers nothing. Disable the mic while asking; a stale upload that lands deletes itself or is followed by `onStored(null)`; `settle()` awaits every run in flight; move `send` out of the state updater in `retry` (`:463-469`, double upload under Strict Mode).
- **Pin it:** the recorder transitions as a pure reducer with a `node:test` that an `uploaded` from a removed or superseded recording emits no `onStored`, and a second `start` while asking is a no-op.
- **Travels with:** —

#### T2a-02 — Renaming a Catch-up never reaches its notifications: every bell keeps announcing it by the original name
**Medium** · **Confirmed** (source; data: 0 of 22 Catch-ups carry a `title` today, so no member has hit it yet)
- **Where:** `src/app/(main)/catchups/actions.ts:670-673` (`renameCatchup` writes `title` only; its docblock at `:650-651` says the rename "reaches nobody"); `src/lib/catchups.ts:111, 127` (`loadMeta` takes `group.name`) and `:394-401` (`openEdition`'s bell); the action notify sites `actions.ts:1062-1068, 1120-1126, 1152-1159, 1186-1192, 1707-1716, 1842-1850, 2152-2157`; `src/lib/catchups-core.ts:391-393` (`catchupDisplayName`, what the pages print).
- **What happens:** a Keeper renames "asdf" to "Old friends"; every page shows the new name, but every bell (Edition started, answers open, reminders, ready to read, sealed, hearts, comments, "added you") still says "asdf", for ever. Since `eb855c71` any member of a people Catch-up can start an Edition, so any of them can send the stale name out.
- **Fix direction:** thread `catchupDisplayName(title, group.name)` into every notify context (`loadMeta`, `openEdition`, `loadCatchupContext`, the action sites). Do not rewrite `Group.name` instead: `renameCatchup`'s contract (`:665-668`) is that clearing the title goes back to the group's name, which a rewrite would destroy. Correct the "reaches nobody" docblock.
- **Pin it:** a `src/lib/catchup-lifecycle.test.mjs` pin that every `notify*` call site passes a name derived through `catchupDisplayName`; a unit test on the questions-open sentence with `title` set.
- **Travels with:** T3-09 (the join page and its toast print `group.name`; same root, T2a-02 canonical)

#### T2a-07 — A Keeper who ends a Catch-up mid-week strands that week's answers where nobody can ever read them
**Medium** · **Confirmed** (source)
- **Where:** `src/app/(main)/catchups/actions.ts:793-796` (`endCatchup` writes `status: "ended"` and leaves the live Edition alone); `src/lib/catchups.ts:262` (an ended Catch-up's Edition never advances); `src/lib/catchups-edition-view.ts:98` (the reader needs `published`); `src/lib/catchups-core.ts:720-735` (`overdueEditionWhere` excludes ended, so the admin room never flags it).
- **What happens:** End during collecting or answering leaves that Edition there for good: the home says "Ended", the Edition URL says not yet published, the admin room shows "Taking answers" under an "Ended" chip. Each writer can still pull their own words from the account export; nobody else ever sees them. The End row (`src/components/catchups/settings/settings-surface.tsx:254-256`, "Nothing new starts. It stays readable") is offered in any Edition state, and its confirm (`:694`, "Everything already out stays readable") does not mention the live Edition. People Catch-ups only (batch ones cannot be ended).
- **Fix direction:** the owner's call between publishing a live Edition first (reuse `closeAndPublish`'s non-capsule branch; a capsule seals), refusing to End while answers exist, or saying plainly they are discarded. Publish-first matches his 2026-10-17 "it ends when it ends". Trap: `closeAndPublish` on a zero-answer Edition re-sets the deadline instead of publishing (C3-01), so the End path must not inherit that branch.
- **Pin it:** a lifecycle test on `endCatchup` with an answering Edition holding an entry.
- **Travels with:** —
- **Owner question:** Q2.

#### T3-04 — After a failed answer save, "Click away and back to try again" does nothing unless the text changes
**Medium** · **Confirmed** (source)
- **Where:** `src/components/catchups/answer/answer-card.tsx:97-102` (`flushBody` returns at `:99` when the text equals `savedRef`, which `:100` advanced before the save); `:205-209` (the red line); `src/components/catchups/answer/answer-experience.tsx:141-146` (the `{ error }` branch never rewinds the card's ref); `answer-card.tsx:83-91` and `:173` (the voice transcript and songs field call the same `flushBody`).
- **What happens:** after a dropped connection, deploy skew or an expired session, the member blurs the field again as told and nothing is sent; Next/Share is the same no-op; the line stays "Not saved" and, if they leave, the paragraph is lost. One answering Edition is live (Batch of 2024, 44 members).
- **Fix direction:** `savedRef` records what the server accepted (set it on success), or `flushBody` always sends while the last status is failed. Separate the refusals a retry cannot fix ("closed", "stale", whose own sentence says reload) from transient ones: only the latter should invite a retry.
- **Pin it:** a pure `shouldFlush(value, lastAccepted, lastStatus)` extracted from `flushBody`, unit-tested.
- **Travels with:** —

#### T3-05 — The "Back to the Catch-up" pill after the last answer links to the page the member is already on
**Medium** · **Confirmed** (source, including Next 16's router: a same-URL navigation keeps `AnswerExperience` mounted; one browser press would show it)
- **Where:** `src/components/catchups/answer/completion-card.tsx:55-57` (`<Link href={/catchups/${catchupId}}>`); `src/components/catchups/answer/answer-experience.tsx:56, 60` (`index` state; the card is `index === total`, drawn at `:254`); `src/components/catchups/home/catchup-home.tsx:248-256` (answering is drawn on the home, no `key`).
- **What happens:** after Share on the last question, the one primary pill navigates to the current URL; the client state that put the card there survives, so the card stays (at best a refetch flicker). It was written when answering was its own page (`[catchupId]/answer/page.tsx:28-35` is now a redirect shim).
- **Fix direction:** make the pill go somewhere true: back to the questions (`goTo(0)`), to `/catchups`, or drop it and let the marks be the way back.
- **Pin it:** an e2e on a throwaway answering Edition (answer every question, press the pill, assert the URL or the view changes).
- **Travels with:** — (T3-18 is the same end screen; worth doing in one sitting)

#### T3-11 — Scrolling a published Edition re-renders every answer and re-parses every answer's text on most frames
**Medium** · **Suspected** (the re-render cadence is certain from source; whether it is perceptible jank needs `performance_start_trace` on the 133-answer Edition at 390x844 while flick-scrolling)
- **Where:** `src/components/catchups/edition/reader.tsx:358-364` (`useSpy`'s `setSpy`, firing every ~0.5 % of a question's height or 0.2 % of the page), `:458` (`spy` held in `EditionReader` state), `:736-748` (every `Section` re-created with fresh ref arrows; `Tile` `:157-217`, `Section` `:227`, no `memo`); `src/components/catchups/edition/reader-parts.tsx:176` (`renderRichText(text, { linkRanges })` in render, no `useMemo`).
- **What happens:** expected, scrolling costs the spy's rect reads and a strip update. Actual: every qualifying frame re-renders all 133 tiles of the largest live Edition and re-runs each body's link scan. One hostile 6,000-character answer costs ~0.22 s per scan (L6-05), so at this cadence it freezes the reader on a phone.
- **Fix direction:** keep `within`/`progress` out of React state (motion values, as the navigator's swell already does), keep only `current`/`labelled` in state; `memo` `Section`/`Tile` with stable ref callbacks; `useMemo` the `renderRichText` result on `text`.
- **Pin it:** a source rule that `Body` memoises `renderRichText`, plus the trace numbers recorded in the fix commit.
- **Travels with:** — (L6-05 is the link-scan cost this multiplies; either fix alone defuses the freeze)

#### T3-17 — A Keeper can no longer copy a Catch-up's invite link; the join page still works for links nobody can get
**Medium** · **Confirmed** (source; data: 1 active people Catch-up carries a token no screen shows)
- **Where:** `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:426` (`inviteToken` shipped to the client, read by no component); `src/components/catchups/home/types.ts:82-84` (comment describes a "Keeper's invite card"); `src/components/catchups/home/people-door.tsx` (rows, Keeper/Remove, `AddSomeone`; no invite); still live behind it: `src/app/(main)/catchups/actions.ts:587` (`joinCatchupByToken`), `src/proxy.ts:39, 217-220, 296`.
- **What happens:** since build phase 7 (`e8307e39`, 2026-09-09) deleted `people-panel.tsx`, a Keeper of a people Catch-up can add only people who already have accounts; a friend who has not signed up cannot be brought in, though every new people Catch-up still mints a token and the join route, its sign-up path and `welcome/page.tsx:54-57` still honour one.
- **Fix direction:** owner's call: restore a Keeper-only "Copy invite link" row in the People door on an active people Catch-up (hidden on batch and ended, as `types.ts:100-105` already says), or retire the join route, `joinCatchupByToken`, the proxy entries and the column in a dated cleanup and correct spec §7.6 / architecture.md:370.
- **Pin it:** extend `src/lib/people-search-rule.test.mjs` to fail when no component under `src/components/catchups/` reads `inviteToken` (or, if retired, when the route still exists).
- **Travels with:** —
- **Owner question:** Q11.

#### T3-18 — A member who leaves one question blank can never finish: "Share" on the last question always sends them back to it
**Medium** · **Confirmed** (source)
- **Where:** `src/components/catchups/answer/answer-experience.tsx:96-107` (`advance` on the last prompt jumps to the first unanswered one, stateless per press), `:69-75` (`answeredIds`); `src/components/catchups/answer/answer-card.tsx:104-108` (the pill is never disabled because skipping is designed in) and `:225-231`.
- **What happens:** a member answers 1, 3 and 4 of 4 and leaves 2 blank on purpose; Share on 4 lands on 2, Next takes them to 3 and 4, Share sends them to 2 again, for ever. The completion card never comes and nothing tells them their answers are already saved. Live: one answering Edition, 52 answers so far.
- **Fix direction:** sweep back once per pass (remember prompts already swept to and show the card on the next Share), or show the card on Share and list what is still blank with a way back to each. The loop has to go either way.
- **Pin it:** a pure `nextIndex(index, total, answered, sweptTo)` with a unit test for the deliberate-skip case.
- **Travels with:** — (T3-05 is the same end screen; worth doing in one sitting)

#### T3-19 — On a phone the control that takes a photograph off an answer is invisible
**Medium** · **Confirmed** (source: the class list and Tailwind 4's `hover:` variant, which sits inside `@media (hover: hover)`)
- **Where:** `src/components/catchups/answer/photo-attachments.tsx:123-130` (class at `:126`: `opacity-0 … group-hover:opacity-100 focus-visible:opacity-100`); `:118-122` with `src/components/common/photo-aim.tsx:146` (the crop button beside it returns null when nothing is cut); for contrast `src/components/catchups/home/people-door.tsx:169` (`[@media(hover:hover)]:opacity-0`).
- **What happens:** on a touch screen the remove button is an invisible 24px target in the corner of the photograph, so a member who attached the wrong picture sees no way to take it off and it goes out with the Edition. 13 of 52 answers on the live answering Edition carry photographs.
- **Fix direction:** the People door's form (`[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100`), or always visible as in the feed composer (`posts/create-post-form.tsx:885`).
- **Pin it:** a protocol-audit or grep rule over `src/components` that flags `opacity-0` paired with `group-hover:opacity-100` without a `(hover:hover)` or coarse-pointer guard.
- **Travels with:** —

#### T7b-15 — Every Catch-up deadline names a day on which answering is already shut, and the last reminder says "tomorrow" and is never withdrawn
**Medium** · **Confirmed** (source and executed: the pure `answerReminderMessage`/`computeStatus` calls in the report; data: the live answering Edition closes 2026-10-25 01:30 UTC)
- **Where:** `src/lib/catchups-core.ts:323` (deadline 01:30 UTC = 07:00 IST) with `:637-668` (`computeStatus`: answering ends at 06:55 IST); the words `:1226` (home), `:1266` (list card), `src/components/catchups/settings/settings-surface.tsx:187, 195` (Keeper row); the bell `catchups-core.ts:1097-1106` written by `src/lib/catchups-notify.ts:242-248`; the publish transition `src/lib/catchups.ts:162-164` deletes no `catchup_reminder`.
- **What happens:** the page says "Answers close Sunday 25 October" while answering ends at 06:55 IST that Sunday, 18:25 Saturday in California; the final reminder, written 07:00 IST the day before, always reads "Answers close tomorrow" (the "Last day to answer" branch is unreachable for a snapped deadline) and stays unread on the badge after the close until the 30-day sweep. Since `6fb896bd` reminders are opt-in (14 members), but the page wording reaches everyone.
- **Fix direction:** name the last full day ("Last day to answer: Saturday 24 October") or the hour on every surface; phrase `answerReminderMessage` against the same last day; delete `catchup_reminder` rows for the Catch-up in the answering → published/sealed transition and for the author in `submitEntry`, with the same type+link delete the extend path uses (`src/app/(main)/catchups/actions.ts:1321-1326`).
- **Pin it:** `src/lib/catchups-core.test.mjs`: the reminder written at close − 23.5 h must not name the close day as available, and `homeStateLine` must name a day on which `computeStatus` still returns `answering` at noon IST; a notify test that publishing leaves no `catchup_reminder` for the Catch-up.
- **Travels with:** —
- **Owner question:** Q9.

### Phase J — Support and payments

#### L1-01 — Two partial refunds on one gift delivered together lose one of them, so every money total over-counts for good
**Medium** · **Confirmed** (source: Postgres READ COMMITTED re-evaluates the second `UPDATE`'s `WHERE` against the first's row and it still passes; the trigger, two partial reversals within milliseconds, is rare; data: 54 contributions, none refunded yet)
- **Where:** `src/app/api/razorpay/webhook/route.ts:391-402` (the reversal `updateMany` writes `refundedAmount` as an absolute value folded from the read at `:178-188`, and its `where` has no `refundedAmount`); `src/lib/contribution-state.ts:126-144` (`foldReversal`, `Math.min(amount, refundedAmount + paise)`).
- **What happens:** two different partial refunds (a Razorpay retry burst, two dashboard resends, a refund and a dispute together) both read refundedAmount 0; the second write overwrites the first. The row records both ids, so neither can ever re-apply, but only one amount. The /support recovery bar, "Given, all time", the admin tiles and the supporter's ledger over-count by the lost refund permanently, and the audit line quotes the wrong cumulative total too, so only Razorpay's dashboard can reveal it.
- **Fix direction:** make the fold atomic: CAS on the value read (`refundedAmount` and `status` in the `where`; on `count === 0`, re-read and fold once), or one `$executeRaw` that sets `"refundedAmount" = LEAST(amount, "refundedAmount" + $paise)`, derives the status with a CASE and appends the id under `NOT ($id = ANY("reversalIds"))`. Trap: the existing `has` guard stops only a re-delivery of the same id; two distinct ids both pass it.
- **Pin it:** a source pin in `src/lib/contribution-state.test.mjs` that the reversal write's `where` names `refundedAmount` (or that the raw statement uses `LEAST`); a mocked-route test with two concurrent distinct reversals if a test harness exists.
- **Travels with:** T8a-02 (the same reversal write and its `notIn` guard)

#### L4-04 — A wrong, rotated or suspended Razorpay key stops every contribution, and nothing records that anyone tried
**Medium** · **Confirmed** (source)
- **Where:** `src/app/(main)/support/actions.ts:133-136` (one console-only catch: "We could not reach the payment gateway. Please try again in a moment."), with the order created before any row at `:99-110` / `:112-122`; `src/lib/razorpay.ts:91-97` (a non-2xx logs and throws; the comment at `:93-94` says a 401 means "OUR keys are wrong").
- **What happens:** with a rotated secret, a test-mode key or an account on hold, every member who presses Contribute is told to try again in a moment, retries into the same wall, and leaves. No `Contribution` row is written, so /admin/support, the nightly `contributions.started` metric and the funnel show a quiet week; the only trace is a function-log line. A database failure after a successful order gets the same wrong sentence.
- **Fix direction:** `reportSwallowed("support", err, { step: "startContribution", status })` in the catch, at least for a non-5xx from Razorpay and for the row write; tell the member a 401/403 apart ("Contributions are paused for a moment; the team has been told"). Optionally record the attempt (an `AuditLog` line) so the admin funnel sees it.
- **Pin it:** a source pin in `src/lib/contribution-state.test.mjs` that `startContribution`'s catch calls `reportSwallowed`.
- **Travels with:** —

#### T8a-02 — A refund that lands while a gift is disputed is dropped without trace, and a later dispute close counts the whole gift again
**Medium** · **Suspected** (mechanism certain from source; whether Razorpay delivers `refund.processed` before a fraud dispute's `closed` is a vendor ordering fact. A mocked-route test with three signed POSTs, dispute.created, refund.processed, dispute.closed, on one row reading `refundedAmount === 0` proves the code half)
- **Where:** `src/app/api/razorpay/webhook/route.ts:391-402` (the `status: { notIn: [...REVERSED_STATUSES] }` guard at `:394` refuses a "disputed" row: count 0, no audit, no console line, 200 returned); `:289-336` (the won/closed branch unfolds from a `refundedAmount` that never learned of the refund); `src/lib/contribution-state.ts:36-39` (`REVERSED_STATUSES` includes "disputed") and `:159-166` (the docblock that already admits the per-reversal paise are missing).
- **What happens:** dispute.created marks the gift disputed; a refund then arrives and is silently thrown away; dispute.won or .closed (Razorpay's docs say a fraud dispute closes after the merchant refunds) restores the row to "paid" with nothing refunded. The money that left is counted as given on every public and admin surface, and the audit line says the chargeback "did not stand". Folds in T8a-03.
- **Fix direction:** let a reversal apply to a disputed row (refuse only `refunded`), keeping "disputed" while recording the paise and the id; give `unfoldDispute` the dispute's own paise (a `disputedAmount` column, or per-id paise beside `reversalIds`), which also closes the documented refund-then-dispute imprecision; write an audit line whenever a reversal is refused. Also noted in the report: dispute.created before payment.captured resurrects a "paid" row with null `paidAt`/`method` after a win.
- **Pin it:** a `src/lib/contribution-state.test.mjs` case for fold-on-disputed and unfold leaving the refund in place.
- **Travels with:** L1-01 (same write; one atomic fold should serve both)

#### T8a-11 — Supporters get a "Pick the bird you want to wear" bell after they have already picked, and it sends them to the pay page
**Medium** · **Confirmed** (live: every payment since 2026-08-30, 4 of 4, produced the bell 8-76 ms after `paidAt`; each payer had already been redirected and picked within 48-150 s)
- **Where:** `src/app/api/razorpay/webhook/route.ts:258-271` (bell created whenever the webhook's CAS moved the row, `link: "/pick-bird"`), with the false premise at `:231-240` ("the browser callback got there first, which is the ORDINARY case"); `src/app/(main)/pick-bird/page.tsx:77` (`redirect("/support")` once the pick is spent); `src/app/(main)/support/actions.ts:290-293` (`chooseBird` clears no notification); `src/components/layout/notification-bell.tsx:262-279` (click → `router.push(link)`).
- **What happens:** the webhook usually beats the browser callback, so a payer whose tab survived gets the redirect to the picker AND a bell. After picking, tapping the bell finds no fresh contribution and lands them on /support, whose one call to action is to pay again, the outcome C-155 was fixed to avoid.
- **Fix direction:** in `chooseBird`, after the `user.update`, mark the caller's unread `contribution_received` rows read (or delete them). For bells already read, a member with a spent pick who reaches /pick-bird gets "You are wearing the <bird>. A new contribution opens another pick." with a link to /birds instead of a bare redirect. Correct the comments at `route.ts:231-240` and the stale "Choose your bird button" comment at `pick-bird/page.tsx:18-19`.
- **Pin it:** a source pin (support rule or `src/lib/contribution-state.test.mjs`) that `chooseBird` clears `contribution_received`.
- **Travels with:** —

#### T8a-15 — A wrong Razorpay webhook secret would silently and permanently lose every refund, chargeback and tab-died payment
**Medium** · **Confirmed** (source plus Razorpay's public webhook FAQ: only non-2xx answers to its own deliveries count towards a disable)
- **Where:** `src/app/api/razorpay/webhook/route.ts:110-128` (mismatch or unsigned → `noteRejection` → `200 { received: true }` at `:127`; the premise at `:111-119`); `src/lib/razorpay.ts:141-142` (the same premise); `route.ts:35` (`REJECTION_NOTE_GAP_MS`, one audit line an hour).
- **What happens:** the 2xx was meant to stop forged posts from getting the webhook disabled (audit-1 M59), but Razorpay never sees what a stranger's POST is answered; what the 2xx does is mark every real delivery as delivered when the secret in Vercel and in the dashboard differ. Then tab-died payments, refunds, disputes and the method backfill vanish with no retry, no 24-hour disable, no alert email; fixing the secret later recovers none. Latent: the secret is right today.
- **Fix direction:** answer a signature mismatch (and an unsigned POST) with 401, so Razorpay retries for 24 hours, then disables and emails the owner, and a same-day fix recovers every event. Keep the hourly audit line; rewrite the comments at `route.ts:111-124` and `razorpay.ts:136-143` with the FAQ's words. This reopens M59, which audit 2 re-affirmed as intact.
- **Pin it:** a source pin in `src/lib/security-regressions.test.mjs` (or `contribution-state.test.mjs`) that the mismatch branch answers non-2xx.
- **Travels with:** —

#### T8a-16 — A supporter with a profile photo spends their one bird pick on a bird nobody sees
**Medium** · **Confirmed** (source; data: 13 of 224 members have a photo, no payer has hit it yet)
- **Where:** `src/components/common/bird-avatar.tsx:90` (photo wins over `birdOverride`; precedence documented at `:10-12`, also `:47`); `src/components/support/bird-picker.tsx:173` ("This becomes your avatar everywhere on the site"); `src/app/(main)/pick-bird/page.tsx:48-51, 80-88` (never reads `photoUrl`); `src/app/(main)/support/actions.ts:290-293` (spends the pick regardless).
- **What happens:** a member with an uploaded photo pays, picks, is told "You are now the Peregrine Falcon", and every avatar on the site still draws their photo; the pick is spent, so "changing it again takes another contribution". Nothing tells them the bird appears only if they remove the photo.
- **Fix direction:** owner's call: (a) keep photo-first and say so on /pick-bird before the pick is spent ("Your photo shows in place of a bird; your bird shows the moment you remove it"), repeated in the confirm bar; or (b) a paid pick outranks the photo in `BirdAvatar` and the other photo-first sites (`letterhead-profile.tsx:362, 769, 799`). Since `ad390fd0` every new member is dealt a `birdOverride` at signup, so (b) must tell a paid pick from a dealt one.
- **Pin it:** a test that the picker receives `photoUrl` and renders the sentence when set (a), or a `BirdAvatar` precedence test (b).
- **Travels with:** —
- **Owner question:** Q8.

### Phase I — Admin, moderation and the analytics room

#### C8-03 — Nothing but the author can take down a Catch-up answer, its photographs or its recording
**Medium** · **Confirmed** (source: no column, no action, no report type) · not adversarially validated
- **Where:** `prisma/schema.prisma:1236-1270` (`CatchupEntry` has no `isHidden`, unlike `Post`, `Comment` and `Photo`); `src/app/(main)/admin/catchups/[catchupId]/page.tsx` (answers read-only, no actions file); blocking leaves answers up (T2b-05).
- **What happens:** an abusive answer in a published Edition can only be removed by erasing its author's whole account, or by hand-written SQL.
- **Fix direction:** owner decision on the shape; the minimum matching the rest of the app: `CatchupEntry.isHidden` (dated migration), an admin "Remove answer" in the reading room that hides it and purges its images and recording (the C8-02 shape), the reader filtering hidden rows, and a Report on an answer.
- **Pin it:** a `gate-coverage.test.mjs`-style assertion that every member-content table with a reader has an admin takedown writer.
- **Travels with:** T2b-05, Q6, C8-02.

#### T7a-03 — No admin screen shows that a member has asked to delete their account, so an admin can merge a duplicate into an account about to be erased
**Medium** · **Confirmed** (source; data: one member has a deletion request maturing about 2026-12-04 and reads as an ordinary verified member in the admin)
- **Where:** `src/app/(main)/admin/people/actions.ts:351-356` (`adminMergeUsers` reads the target as `{ id, photoUrl }`, no `deletionRequestedAt` or `isBlocked` check); `src/app/(main)/admin/people/[id]/page.tsx:33-60` (the select omits `deletionRequestedAt`); `src/lib/admin-people.ts:38-43, 159-173` (no "leaving" state or field); `src/components/admin/people/person-detail.tsx:176-274` (Standing says nothing of it).
- **What happens:** expected, the "leaving" state the directory and search already hide is visible to the admin. Actual: a member who asked to leave looks normal on /admin/people and their page, cannot be filtered for, and the only trace is a line deep in /admin/audit. An admin who merges a duplicate signup into that account moves every post, photograph, answer and contribution into a row the sweep erases on the due night, with no confirmation.
- **Fix direction:** select `deletionRequestedAt` into `PersonRow` and the detail; a "Leaving <valley date>" chip and Standing fact; a `leaving` filter in `STATE_OPTIONS`/`peopleWhere`; `adminMergeUsers` refuses (or asks again for) a target with `deletionRequestedAt` set or `isBlocked: true`.
- **Pin it:** a shape test in `src/lib/admin-rule.test.mjs` that the person page's select and `adminMergeUsers`' target read both name `deletionRequestedAt`.
- **Travels with:** —

#### T7a-06 — An admin's "Remove verification" undoes itself the next time the member, or the admin, touches the account
**Medium** · **Confirmed** (source)
- **Where:** `src/app/(main)/admin/people/actions.ts:633-657` (`adminUnverifyUser` writes `verifyState: "unverified", verifyMethod: null`); `src/lib/roster.ts:57` and `:85-93` (the roster CAS admits `unverified`/`pending`); callers `src/components/auth/verification-actions.ts:49`, `src/components/profile/profile-actions.ts:247-248`, `src/components/auth/email-actions.ts:218, 424`, and the admin's own `admin/people/actions.ts:189`.
- **What happens:** an admin removes verification from a member who is on the office roster; the member presses "Ask to be verified", edits their name or batch, completes a password reset, or the admin corrects their name, and the row is silently back to `verified` / `office_list`. The audit log shows `admin.unverify` and nothing after it; the roster's writes are not audited.
- **Fix direction:** give the admin's refusal a state the roster refuses: `adminUnverifyUser` writes `verifyMethod: "admin_withheld"` (keeping `unverified`) and the roster's CAS and pre-check require `verifyMethod: null`; `adminVerifyUser` already overwrites the method. Trap: `src/lib/admin-rule.test.mjs:161` pins that `adminUpdatePerson` calls `tryRosterAutoVerifyQuietly(`, so keep the call and make the roster refuse the row. "Ask to be verified" should then say an admin has already decided.
- **Pin it:** extend `src/lib/admin-rule.test.mjs`: the withheld sentinel appears in both `adminUnverifyUser`'s data and the roster's `where`.
- **Travels with:** —

#### T7b-02 — On a desktop tab, the feed's bell stays dark for a new notification whenever its count repeats a number the tab has seen before
**Medium** · **Confirmed** (source: the pure rule, and `src/components/layout/unread-store.test.mjs:67` asserts the blind case as "agrees")
- **Where:** `src/components/layout/unread-store.ts:107-116` (`seedVerdict`) and `:123-129` (`seedUnread` adds every prop, fresh ones included, to `seenProps`); `src/components/layout/notification-bell.tsx:203-205` (mount effect; the only other refreshes are `focus` `:192-196` and panel open `:217-235`); `src/components/layout/page-header.tsx:158-163` (the feed header bell remounts with a page-fresh count from `src/app/(main)/feed/page.tsx:47, 100`).
- **What happens:** a member reads their one notification (badge 0), goes to /letters, and a like lands; back on /feed by the sidebar, the page counts 1, but 1 is already in the seen set, so the store keeps 0: no dot, no shake, until they refocus the window or open the panel. For a low-volume member whose count cycles 0 → 1 → 0, that is every notification after the first; bugs.md #5 (no desktop bell outside the feed) leaves nothing to correct it.
- **Fix direction:** `seedUnread(prop, { fresh })`: the page-header bell passes `fresh: true` and the store adopts the number (it is the server's answer); the layout band bell keeps `seedVerdict`. Correct the "exactly three" comment at `unread-store.ts:96-101`.
- **Pin it:** extend `src/components/layout/unread-store.test.mjs`: `seedUnread(1) → setUnread(0) → seedUnread(1, { fresh: true })` leaves `getUnread() === 1`.
- **Travels with:** —

#### T7b-13 — Analytics tiles add up a top-N list instead of counting, so the owner reads numbers that are far too low
**Medium** · **Confirmed** (data: read-only counts with the room's own exclusion, at HEAD)
- **Where:** `src/app/(main)/admin/analytics/page.tsx:524-528` ("Profile opens" sums the top 8, `src/lib/admin-analytics.ts:725-730`); `page.tsx:518-523` ("Got no response from anyone", `LIMIT 30`, `admin-analytics.ts:752-770`); `page.tsx:611-616` ("Searches that found nothing", top 10); `page.tsx:837-842` ("Still locked out", `LIMIT 20`). Same shape: `:617-621` (referrers, top 8), `:622-626` (browser languages, top 8), `:715-719` (notification types, `take: 10`), `:118-123` (on the site now, `take: 40`).
- **What happens:** today "Profile opens" shows 387 against a true 2,829; "Searches that found nothing" 17 against 73; "Browser languages" 8 against 13 stored values that are almost all English; "Got no response from anyone" has hit its cap (30 shown, 86 qualify); "Still locked out" is 18 of a cap of 20, ordered so a one-try person is never listed once it fills. Notification types is right today (9) but the code writes up to 17.
- **Fix direction:** each loader returns a real count beside its display list (a `count(*)`/`sum()` next to the `LIMIT`, or `count(*) OVER ()`), and the tile reads that; languages count distinct primary subtags and drop values that are not BCP-47-shaped (e.g. `chrome://…`); the two actionable lists say "30 of N" / "20 of N".
- **Pin it:** a source test in the spirit of `src/lib/stats-exclusion-rule.test.mjs`: no `StatGrid` `value:` in `page.tsx` may be the `.length` or `.reduce(` of a LIMIT-ed loader list.
- **Travels with:** —

### Phase K — Text that breaks things: names, numbers, search, links

#### C7a-03 — On the profile, a refused field stays on screen under "Saved" once any other field saves, and is never written
**Medium** · **Confirmed** (source, read end to end by the finder; the validator's verdict is in `work/verdicts/V-R4b.md`)
- **Where:** `src/components/profile/pen.tsx:396-424` (`useAutoSave.run` clears the message at the start of every save, and whichever save finishes last sets the mark; `:415-420`, the comment "An error stays put", is false); `src/components/profile/letterhead-profile.tsx:378-390` (the form is seeded once and never re-seeded), `:442-458` (`commitField` records success only; a refused field is never re-sent).
- **What happens:** the cross-field year check says "Check the other year too". The member does, that field saves, the mark reads "Saved", and the year that was refused is still on screen but was never written; the next visit shows the old value. Overlapping saves (a slow connection, the places picker) can hide an error before it is ever shown.
- **Fix direction:** keep failures per field and show "Not saved" until that field saves; on a cross-field refusal, re-send the refused field once its partner saves (or validate and save the pair together); never let a later success clear an unrelated failure. Make the comment true.
- **Pin it:** a pure reducer extracted from `useAutoSave`: fail(A) then succeed(B) leaves A's failure visible; a source pin that `commitField` re-sends a refused field after its partner saves.
- **Travels with:** T6-07 and T6-12 (the same profile fields' rules).

#### T6-04 — After a directory search, Back leaves the old name in the search box over the whole unfiltered membership
**Medium** · **Confirmed** (live: the orchestrator ran `/directory?q=…` → Back → URL `/directory`, "223 people", People tab, pill still showing the name; `findings.md:116`)
- **Where:** `src/components/directory/directory-client.tsx:143` (`query` seeded once from `initialFilters.q`) and `:160-162` (`browseView` seeded once); `:204-208` (the only prop-sync effect, for `users`/`nextCursor`); `src/app/(main)/directory/page.tsx:368` (`<DirectoryClient` mounted with no `key`); `src/components/layout/search-pill.tsx:104` (controlled mode renders the prop).
- **What happens:** expected, Back returns the page to what that URL showed (`docs/spec/directory.md` §2: the URL is the state). Actual: the list and count go back to everyone, but the pill keeps the typed name and the People tab stays selected, so the screen contradicts itself; Forward brings the results back under the same text. The same after a batch tile, and since `b5a87180` after the map pin's "See all" (`seeCityPeople`, `:338-344`).
- **Fix direction:** derive `query` and `browseView` from `initialFilters` when it changes (an effect keyed on the filter values), or `key` `DirectoryClient` on the search-param string so it remounts per URL. `clearAll()` (`:321-324`) already resets `query` by hand and can lean on the same path.
- **Pin it:** `src/lib/directory-rule.test.mjs` (source-shape): an effect on `initialFilters.q` or a `key` on the mount; then a Playwright case (type, Back, pill empty) once seen in the MCP.
- **Travels with:** —

### Phase L — Platform, database, demo and scripts

#### L5-01 — Vercel Hobby's 4 CPU-hours a month is the first ceiling again, and a busy month crosses it
**High** · **Suspected** (measured: about 4 minutes of Active CPU a day, about 2 hours a month, at about 575 members and this week's quiet activity; when it is crossed depends on activity and growth) · revived 2026-10-24: V-L-c ruled it moot on Pro, and the owner moved production back to Hobby on 2026-10-23
- **Where:** the steady CPU is functions plus the proxy (platform-health re-measure, 2026-10-23: functions 2.3 and proxy 1.1 minutes a day); `src/components/analytics/presence-beacon.tsx:30, 56-77` (a view ping on every navigation and a beat every 60 s while visible), `src/app/api/presence/route.ts:29-62` (each a function invocation), `src/proxy.ts:422-424` (the matcher: the proxy runs on every request it does not exclude).
- **What happens:** Hobby stops functions for 30 days once the trailing 30 days' Active CPU passes 4 hours. Steady use is about half of that today; a launch-week month (3.4 views per member per day against today's 0.37) or about twice today's members crosses it. Right after the switch the trailing meter read 4h13m of 4h, because it still held the week before the prefetch fix and the 1–2 October launch spike.
- **Fix direction:** cheap cuts first: lengthen the beacon's beat (or pause it on hidden tabs, which it may already do; check) and exclude static and image paths from the proxy matcher where it still runs; then measure from the dashboard (check B), since `vercel metrics` needs Observability Plus. If the line approaches 75%, the owner's choice is Pro again.
- **Pin it:** a source pin on `BEAT_MS` with its argued interval and a matcher test listing what the proxy must skip; the weekly check B.
- **Travels with:** L8-04 (the same allowances, by abuse), V-L-c-01 (the measuring commands no longer work on Hobby).

#### L5-07 — Supabase Free's 5 GB monthly egress is the first limit ordinary growth hits, and nothing in the app watches it
**High** (re-ruled from Critical: the backup's share was cut by `4487283b`; Supabase warns and grants a grace period first) · **Suspected** (the bytes are measured, ~60 KB per real view in early October and 67 KB raw per unfiltered directory render today; when 5 GB is crossed depends on activity, and Supabase → Organization → Usage → Egress for the current cycle settles it, last reading 0.39 GB for Oct 1-8)
- **Where:** `src/app/(main)/directory/page.tsx:279-287` (pins: every placed member with `PIN_SELECT`, `directory/select.ts:47-54`, on every render and search step, no `take`; `PIN_PEOPLE_CAP` at `:46` trims only what reaches the browser); `src/app/(main)/collection/actions.ts:933-937` (the whole archive's geometry on the first page); `src/app/(main)/catchups/[catchupId]/(home)/page.tsx:293-315` (every published Edition's photo JSON for the covers); `scripts/ops/snapshot.mjs:129` (records database size, nothing about egress).
- **What happens:** every byte a query returns through the pooler counts against 5 GB a month for the whole organisation; past it Supabase e-mails, grants a grace period, then may pause the project, switch it read-only or answer 402 until the cycle resets. Per-view bytes grow with membership (the pins are ~160 B per placed member and the directory is 24% of page views), toward ~100-110 KB per view at 2,000. The crossing is ~700 members at launch-week activity (3.4 views/member/day), ~1,400 at early-October activity, ~3,200 at this week's 0.37. The app records no egress, so Supabase's e-mail is the only alarm.
- **Fix direction:** the owner deferred the per-page cut ("revisit before ~1,000", platform-health handover item 14), and Supabase Pro ($25) lifts the line. What the code can do now regardless: add an egress reading or proxy to the nightly snapshot with a threshold. The levers when the cut is taken: cache the unfiltered pins per version or return per-city counts and fetch a pin's people on open; cache the geometry (`use cache` keyed on filter plus a write version); covers need three URLs per Edition, not every photo JSON; the letters rail (`letters-module.tsx:31-51`) needs a word count, not the body; `api/users/first-names/route.ts` (every member's name per composer focus) is identical for everyone and cacheable.
- **Pin it:** a shape test that the directory's pin query and the Collection's first page do not fetch unbounded row sets the view does not draw; the snapshot metric with its threshold.
- **Travels with:** —
- **Owner decision already taken:** deferred on 2026-10-08, "revisit before ~1,000 members" (platform-health handover item 14). Members today: about 575.

#### L5-04 — The database pool ignores Vercel's suspend lifecycle, so after a quiet spell a member's first query can hit a dead connection
**Medium** · **Suspected** (Vercel's own KB states the mechanism and Fluid is measured on; not observed. Supabase → Reports → pooler client connections overnight, and Vercel runtime logs for "Connection terminated unexpectedly" / P1017 at the first request after an idle gap, would settle it)
- **Where:** `src/lib/prisma.ts:46-55` (`new PrismaPg({ max: 5, connectionTimeoutMillis, query_timeout })`, no `idleTimeoutMillis`, so pg-pool's 10 s default applies; no `attachDatabasePool` anywhere in `src` or `package.json`); `src/lib/prisma.ts:28` (the stale "5 x ~40 concurrent instances" comment).
- **What happens:** idle timers do not run while a Fluid instance is suspended, so its up-to-5 Supavisor connections stay open as phantom client slots, and on resume the next checkout can be a socket Supavisor already dropped: the member's first query fails, which since `e286daf0` shows the error screen on a hard load (and still a null session elsewhere). With ~1,500 views a week, most requests arrive long after the 10 s timer and open fresh verify-full TLS connections.
- **Fix direction:** build a `pg.Pool` at module scope with `idleTimeoutMillis` ~5000 and the TLS options from `db-tls.ts`, pass it to `new PrismaPg(pool)`, call `attachDatabasePool(pool)` from `@vercel/functions`; keep `max: 5`; correct the comment. Keep the HMR client cache in `prisma.ts` working (CLAUDE.md gotcha 8).
- **Pin it:** a source pin (in the style of `src/lib/session-revocation.test.mjs`) that `prisma.ts` builds a `Pool` handed to `attachDatabasePool`.
- **Travels with:** —

### Phase M — The hoopoe

#### T9-01 — The empty-state hoopoes (no search results, nothing saved, no messages) never play their moment or start their resting life
**Medium** · **Confirmed** (source: a mount-only effect reads a ref whose element is rendered one commit later; L7 swept every null-ref effect app-wide and found this the only one that never recovers)
- **Where:** `src/components/mascot/moments/moment-hoopoe.tsx:55-71` (the observer effect, deps `[ref, delay]`, returns at `:57` when the ref is null) and `:104-121` (`MomentStage` returns null at `:115` until solo, so the stage div at `:118` arrives a commit later); `src/components/mascot/moments/one-hoopoe-guard.ts:30-37` (`useSoloHoopoe` starts false); contrast `src/components/mascot/moments/contributed-hoopoe.tsx:165` (stage div always rendered, which is why the Collection's moment works).
- **What happens:** expected per mascot.md, "looks left and right, small head shake. Rests" on no results, a bookmark glance on empty Saved, a wave on empty Messages, then a beat every 7-12 s. Actual: no IntersectionObserver is ever created, `play` never runs and `useHoopoeLife` never starts, so the bird only breathes and blinks: the "it just sits there" the owner asked to be rid of on 2026-09-17. Affects the feed search (`post-feed.tsx:295`), the directory (`directory-client.tsx:741`), empty Saved (`saved-posts-feed.tsx:188`) and empty Messages (`messages/(index)/page.tsx:130`). Decorative; no function lost.
- **Fix direction:** ContributedHoopoe's shape: always render the stage div and gate only `<Hoopoe>` on `solo`; or a callback/state-held element so the effect re-runs when the div exists.
- **Pin it:** a Playwright spec on a no-results state asserting with `expect.poll` that the `[data-part=head]` or `headGaze` transform changes within 3 s, written after seeing it in the MCP.
- **Travels with:** —

#### T9-03 — Any hoopoe can jam after a few minutes: an ambient blink or crest flick cancels a queued verb, and the bird stops answering taps
**Medium** · **Suspected** (every link is read at source and in motion 12.38.0; the odds are computed, not observed. On the public `/hoopoe`, a MutationObserver on `[data-part=crest]`'s `style`, "Well done"/"Thinking" pressed ~20 times a second apart, then "Nod": a jam shows as a crest write during an expression and a Nod that never plays)
- **Where:** `src/components/mascot/hoopoe.tsx:1454-1463` and `:1491-1504` (ambient blink and crest flick, gated only on `!damper.active`); the verbs that write the same values, await them and never hold the damper: `blinkOnce` `:381-385`, `crestFlick` `:417-420`, `crest()` `:423-428`, `express()` `:481-508` via `applyChord` `:325-337`, `rest()` `:1210-1223`; the pump `:292-311` (races each step only against the abort token).
- **What happens:** `MotionValue.start()` tears down the verb's animation without settling its promise, so the queue waits forever. The ambient breathe and blink carry on, but everything queued stops: no later verb plays, `pokePending` latches so every tap is dropped (`:1083`), `isBusy()` stays true so resting beats stop (`use-hoopoe-life.ts:89`). Roughly a 50% chance a resting bird has jammed by minute five; on /signup a jam silences the gate-pass celebration and delays the password tuck to its 8 s cap (`signup-form.tsx:325-338`); ~13% of contributions never start ContributedHoopoe's resting life (`contributed-hoopoe.tsx:156-159`).
- **Fix direction:** one rule for every verb: either each queued verb holds the damper for its duration (`blinkOnce`, `crestFlick`, `crest`, `express`, `rest`, and `turn`/`land`), or the ambient loop does not write while the queue is busy. Independently make the queue immune: race each awaited `finished` against the value's cancellation or give each step a ceiling, and prune `live` on stop so `isBusy()` means busy.
- **Pin it:** a Playwright spec on `/hoopoe` that runs the rail's reactions ~30 times with a test-only prop shortening the ambient timers, then asserts a final Nod plays.
- **Travels with:** —

### Low findings, by phase

Each row's full write-up is its block in the report named, and its corrections are in the verdict named; the verdict wins where they differ.

#### Phase A — Trust: who counts as verified, and who may press what in a Catch-up (12 Low)

| id | finding | read first |
|---|---|---|
| L1-02 | A question removed as answering opens leaves an Edition with nothing to answer, which the C-021 guard cannot see | `reports/L1.md` · `verdicts/V-O-L1.md` |
| L1-03 | The two last Keepers leaving in the same instant leave a Catch-up nobody can tend | `reports/L1.md` · `verdicts/V-O-L1.md` |
| L12-03 | Any signed-in account holding an Edition or answer id drives that Edition's clock through twelve Catch-up actions before it is told it is not a member (confirms T2b's… | `reports/L12.md` · `verdicts/V-L-d.md` |
| T2a-08 | The double-submit guard on creating a Catch-up is a read before the write, so two requests in flight together still mint two Catch-ups and notify up to 99 people twice | `reports/T2a.md` · `verdicts/V-T2.md` |
| T2a-09 | Succession can hand the Keeper's hat to a blocked, deletion-pending or teacher account; the purge path writes "admin" where every other path writes "keeper" | `reports/T2a.md` · `verdicts/V-T2.md` |
| T2a-10 | A member removed by a Keeper keeps their pref row, so re-joining by the invite link lands the Catch-up in their Archived shelf (spec says removal "does the same" as… | `reports/T2a.md` · `verdicts/V-T2.md` |
| T2b-06 | The empty-answer withdrawal deletes by id after the transaction with no content precondition, and versionless first saves make the race reachable (routed lead from L1,… | `reports/T2b.md` · `verdicts/V-T2.md` |
| T2b-09 | A Keeper whose Edition tolerated the 41st question can never reorder it again ("Invalid request.") | `reports/T2b.md` · `verdicts/V-T2.md` |
| T2b-11 | `loadEntryComments` is the one comment action outside `runAction`, and a crafted `take` reaches Prisma as `NaN` and throws out of the action | `reports/T2b.md` · `verdicts/V-T2.md` |
| T3-15 | Taking the Keeper's hat from a group-admin row says "no longer a Keeper" and changes nothing | `reports/T3.md` · `verdicts/V-T3.md` |
| T7a-07 | A merge, and the purge's own succession, hand a Catch-up's Keeper hat over as group role "admin", which the Keeper's revoke can never take back (routed lead, confirmed… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| V-T2-02 | The Catch-up actions advance an Edition before checking that the caller is in its group, the ordering the reader page fixed and the spec forbids (routed lead from T2b,… | `verdicts/V-T2.md` |

#### Phase B — Privacy: what leaves the site, and what outlives a member (17 Low)

| id | finding | read first |
|---|---|---|
| C4-04 | The gate log turned a 30-minute functional cookie into a 30-day identifier on people who never join, and neither the privacy page's cookie list nor "Download your data"… | `reports/C4.md` · `verdicts/V-C.md` |
| C8-08 (not adversarially validated) | An erased member's Catch-up questions survive the purge word for word; the privacy page's list of things that outlive deletion does not include them, and the stated… | `reports/C8.md` |
| L1-04 | The account purge runs RepeatableRead with no P2034 retry, so a heart on the member's post mid-purge fails the purge until tomorrow | `reports/L1.md` · `verdicts/V-O-L1.md` |
| L10-02 | For sixty days after "Delete my account" everything the member wrote stays on the feed, the letters, the comments and the Catch-ups under a name that links to a 404,… | `reports/L10.md` · `verdicts/V-L-b.md` |
| L12-02 | A photograph taken off a Catch-up answer is never deleted from the bucket: the one writer that rewrites an image list without purging what it dropped | `reports/L12.md` · `verdicts/V-L-d.md` |
| L5-09 | `Comment.authorId` has no index, so the member's data export, the account purge and the admin person page scan every comment in the community | `reports/L5.md` · `verdicts/V-L-c.md` |
| L5-10 | `CatchupEntry.authorId` is only the second column of `(promptId, authorId)`, so every per-member answer query (purge, export, admin merge) scans every answer ever written | `reports/L5.md` · `verdicts/V-L-c.md` |
| T7a-09 | Purge failures reach only the console: the nightly job goes red with `purge:<id>` and nothing else, and the admin is told to "check the server log" | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-10 | The purge's cancel-race comment describes READ COMMITTED, but the transaction runs RepeatableRead: a member who signs in during the seconds of their own purge turns the… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-21 | The image drain stops at 500 objects per call, so a member with a big Collection contribution stays publicly fetchable for nights after "Delete my account", and the… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7b-21 | Signing out never ends the PostHog identity: the browser keeps capturing as the member who left, so the next person's signed-out browsing is filed under the previous… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T8a-07 | The member's own data export reports a partially refunded gift as its gross amount | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8a-18 | The two figures /support deliberately never prints ship to every member's browser anyway | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8b-09 | The public landing page links to no policy document: the only public Privacy / Terms / Guidelines links are in the showcase footer, which is switched off | `reports/T8b.md` · `verdicts/V-T8.md` |
| T8b-18 | The public demo reports into production's Sentry project, labelled "production", and nothing on the demo side can change that; the demo that 500s on every data route… | `reports/T8b.md` · `verdicts/V-T8.md` |
| V-L-d-01 | Replacing an uploaded Catch-up picture leaves the old photograph in the bucket for ever, and an upload abandoned in the picker likewise; neither survives into the… | `verdicts/V-L-d.md` |
| V-T7a-02 | A merge drops the duplicate's colliding Catch-up answers without queueing their photographs or recordings, which then sit in R2 forever with no row naming them | `verdicts/V-T7a.md` |

#### Phase C — When something fails, the member sees the truth and can recover (10 Low)

| id | finding | read first |
|---|---|---|
| L7-06 | A network blip between "account made" and "signed in" tells a new member "Something went wrong. Please try again.", and trying again says the email is taken; a blip on… | `reports/L7.md` · `verdicts/V-L-d.md` |
| O-04 | A server action whose POST fails to fetch (overloaded instance, dropped connection, expired cookie) is always "Check your connection and try again", whatever the cause | `reports/O.md` · `verdicts/V-O-L1.md` |
| T1-09 | An expired session reads as an empty feed ("No stories yet") and an empty comment thread, not as a sign-in prompt | `reports/T1.md` · `verdicts/V-T1.md` |
| T6-08 | "Delete my account" can report a connection error after it has already ended every session, and signing back in "to check" cancels the deletion silently | `reports/T6.md` · `verdicts/V-T6.md` |
| T8b-07 | A crash inside the root layout's own client components, or a failed chunk for one of them, shows Next's unstyled "Application error" page; and no client-side error… | `reports/T8b.md` · `verdicts/V-T8.md` |
| T8b-08 | A 404 inside the signed-in shell renders a second `<main>` sized to the whole viewport inside the padded first one, so the apology is taller than the screen and scrolls… | `reports/T8b.md` · `verdicts/V-T8.md` |
| T8b-11 | The proxy says the landing page "stays statically rendered for logged-out visitors"; every route in the app has been dynamic since the root layout began reading the… | `reports/T8b.md` · `verdicts/V-T8.md` |
| T8b-12 | Every revalidating server action re-runs the signed-in shell: about five render-blocking queries and one more behind the response, per action, on top of the page's own | `reports/T8b.md` · `verdicts/V-T8.md` |
| T8b-19 | The landing page, the site's front door, ships every visible element at opacity 0: until JavaScript has downloaded, hydrated, fetched the motion chunk and decoded the… | `reports/T8b.md` · `verdicts/V-T8.md` |
| V-T1-03 | When a new feed search's first page fails, the previous list stays on screen under the new search's banner, and Load more then continues the new query from the old… | `verdicts/V-T1.md` |

#### Phase D — Alarms: the owner hears about every failure (13 Low)

| id | finding | read first |
|---|---|---|
| C2-01 | When R2 stalls instead of erroring, deleting a post, editing a letter, changing an avatar or removing a photograph spins for minutes and then reports a failure for a… | `reports/C2.md` · `verdicts/V-C.md` |
| L11-03 | A mail Resend has accepted is sent a second time two minutes later whenever the one database write that records the acceptance fails: the code parks the row for "the… | `reports/L11.md` · `verdicts/V-L-b.md` |
| L11-04 | A production build run anywhere but Vercel production (the laptop's `next start`, which the phase-4 check and the September performance sessions use, or a Vercel… | `reports/L11.md` · `verdicts/V-L-b.md` |
| L4-05 | The Catch-up people pickers answer every refusal and failure of the people search with a false "nobody": "No one found by that name", "Everyone from your batch is… | `reports/L4.md` · `verdicts/V-L-b.md` |
| L4-07 | `reportSwallowed` never flushes, so a report raised at the end of an invocation — the nightly tick, the sweep, the tail of an `after()` — may never leave the instance | `reports/L4.md` · `verdicts/V-L-b.md` |
| L5-06 | While any mail is waiting for tomorrow's quota (the whole launch: C-161), every hard page load and every revalidating action runs the full drain-lease dance — up to 11… | `reports/L5.md` · `verdicts/V-L-c.md` |
| L8-02 | Every alarm and forensic trail the app writes only to the console is gone a day later (an hour while the site was on Hobby), and three sentences still send the admin to… | `reports/L8.md` · `verdicts/V-L-c.md` |
| T2a-14 | Nothing records that the nightly tick ran, so a dead cron (401 after a secret rotation, a disabled schedule) is invisible until a quiet group notices an Edition that… | `reports/T2a.md` · `verdicts/V-T2.md` |
| T2b-07 | A thumbnail that fails to re-host is never retried and never reported: the card stays imageless for ever, silently | `reports/T2b.md` · `verdicts/V-T2.md` |
| T5-13 | `sendVerificationEmail` throws away the queue's answer, so a resend that was rate-limited reports "Sent to …", and its failure copy sends members to an edit that does… | `reports/T5.md` · `verdicts/V-T5.md` |
| T5-16 | A Resend timeout that actually delivered, then a retry, leaves a reset mail in the inbox whose link says "That link has been used" — the member never used it | `reports/T5.md` · `verdicts/V-T5.md` |
| V-L-b-01 | A bell written after the action's real write has committed is not isolated: when it throws, the member is told the whole action failed, and the retry either undoes the… | `verdicts/V-L-b.md` |
| VT7b-01 | "Which site sent them" has read "Everyone arrived directly" since 2026-09-15: the beacon moved the Visit write onto `/api/presence`, whose Referer is always the site… | `verdicts/V-T7b.md` |

#### Phase E — The Collection (18 Low)

| id | finding | read first |
|---|---|---|
| C1-04 | The photograph applier writes the rest of a batch the hand-run protocol says it must refuse whole: an id from outside the batch, an id answered twice, or a seventh… | `reports/C1.md` · `verdicts/V-C.md` |
| C7a-01 | After a member edits a photograph's caption or date from the viewer, its tile in the river keeps the old date on hover and the old caption as its accessible name until… | `reports/C7a.md` · `verdicts/V-R4b.md` |
| C8-05 (not adversarially validated) | Correcting your batch year (or losing your verification) leaves every Class Collection photograph you contributed filed under the class you left: still shown to them,… | `reports/C8.md` |
| T1-18 | The "Also add to the Collection" copy runs in `after()` under the /feed route's default function budget, and a cut-off leaves staged bytes unrecorded and a photograph… | `reports/T1.md` · `verdicts/V-T1.md` |
| T4a-04 | A downloaded scan files itself under the year it was scanned, not the year it was taken: the stored copy's one kept EXIF tag is written from dates the archive's own… | `reports/T4a.md` · `verdicts/V-T4.md` |
| T4a-06 | The screen-copy and album ledgers carry no database stamp, and both undo/reconcile modes delete bucket objects unconditionally, so a production ledger run with `--env… | `reports/T4a.md` · `verdicts/V-T4.md` |
| T4a-07 | A member can love a photograph they are not allowed to see, and learn that it exists, because `togglePhotoLove` never asks the visibility rule its feed twin asks | `reports/T4a.md` · `verdicts/V-T4.md` |
| T4a-11 | `import-album.mjs` files a photograph under a date the app's own judgement would refuse: DateTimeDigitized or IFD0 DateTime stands in for the shutter time, and the… | `reports/T4a.md` · `verdicts/V-T4.md` |
| T4a-12 | A database hiccup at the moment the row is written loses the member's full-resolution upload entirely, because the staged original is deleted before the row exists | `reports/T4a.md` · `verdicts/V-T4.md` |
| T4a-13 | On 1 January 2030 every photograph dated that year is filed under era "unknown" | `reports/T4a.md` · `verdicts/V-T4.md` |
| T4a-14 | The FormData fallback has no `sourceKey`, so the one contribute path that can be double-submitted makes two photographs from one press | `reports/T4a.md` · `verdicts/V-T4.md` |
| T4b-09 | A `?when=` link, and the `when` in the address bar, do not say where the reader is: a shared year link opens at the top of the archive | `reports/T4b.md` · `verdicts/V-T4.md` |
| T4b-10 | A whole year's thumbnails are decoded at once, fire-and-forget, on every band arrival: up to 600 concurrent decodes on a phone | `reports/T4b.md` · `verdicts/V-T4.md` |
| T4b-12 | The search box has no client-side length cap, so a long paste goes into the address bar and (through T4b-08) into a request URL | `reports/T4b.md` · `verdicts/V-T4.md` |
| T4b-13 | Typing in the edit dialog steers the photograph behind it: arrow keys step the viewer, `+`/`-`/`0` zoom it, and Tab is pulled out of the form into the viewer's hidden… | `reports/T4b.md` · `verdicts/V-T4.md` |
| T7a-20 | Content-list rows for photographs an admin took down draw a broken thumbnail: the bytes were purged, the row kept, and `<img src={thumbUrl}>` is unconditional | `reports/T7a.md` · `verdicts/V-T7a.md` |
| V-T1-02 | The "Also add to the Collection" copy orphans a stored image whenever one of its two PUTs fails: its comment says each PUT is recorded as it lands, but neither is… | `verdicts/V-T1.md` · `verdicts/V-T4.md` |
| V-T4-01 | A contributor whose email is unconfirmed gets the confirm-your-email dialog AND a toast telling them to "try again in a moment" | `verdicts/V-T4.md` |

#### Phase F — Letters, the feed and the composer (18 Low)

| id | finding | read first |
|---|---|---|
| C7a-02 | The crop dialog can show a frame that is not the one saved: it seeds its position once per mount, so a cancelled drag, or a resumed draft whose measurements arrive… | `reports/C7a.md` · `verdicts/V-R4b.md` |
| C8-07 (not adversarially validated) | The Saved tab counts bookmarks the Saved list will never show: a post hidden by an admin, or by a blocked author, or outside the reader's city, stays in the number for… | `reports/C8.md` |
| O-01 | The letters index renders a draft's "Edited <day> <month>" without a time zone: a nightly hydration error, and a date one day off for drafts edited late in the evening | `reports/O.md` · `verdicts/V-O-L1.md` |
| T1-06 | Every draft autosave re-renders the edit page AND the (main) layout on the server, for a surface nothing server-rendered shows | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-07 | The letters index pages by createdAt alone, so two letters published in the same millisecond repeat or vanish at a page boundary | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-08 | The "Your drafts" strip shows at most 20 drafts and never says so | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-10 | Sharing a letter from its feed card copies the feed URL, not the letter's | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-11 | Escape hides the reply box but keeps the draft, so the next Reply on somebody else opens with words meant for the first person | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-13 | Reporting a letter files it, announces it and opens the thread as "a post by X" | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-14 | The server accepts a poll on a letter; nothing renders it | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-15 | A post, a letter body or a letter title made only of whitespace is accepted | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-16 | Removing a photograph from one of two duplicate drafts deletes the bytes the other draft still shows | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-19 | A member whose name begins with an accented or Indic letter cannot be @-mentioned, and typing an email address opens the mention list | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-24 | Saved applies the city arm of the audience rule but not the batch arm, so a saved post can stay on the shelf after the direct link refuses it | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-25 | A crafted keyset cursor past the Date range makes the feed, thread and bell loaders throw instead of serving page one | `reports/T1.md` · `verdicts/V-T1.md` |
| T3-10 | The photo viewer prints a Catch-up answer's formatting markers raw, while the tile beside it renders the same body as rich text | `reports/T3.md` · `verdicts/V-T3.md` |
| V-T1-01 | Two autosaves from one tab overlap whenever a save outlasts the next pause, and the writer is told the letter "has changed somewhere else" | `verdicts/V-T1.md` |
| V-T3-01 | Tapping a photograph on a feed post shows the post's raw markdown as the viewer's caption, and since tagging shipped a tagged member reads as `@[Name](userId)` | `verdicts/V-T3.md` |

#### Phase G — Sign-up, sign-in and the confirmation mail (13 Low)

| id | finding | read first |
|---|---|---|
| C4-03 | A move that lands while the queue is sending the member's waiting confirmation re-addresses the row on paper only: the mail and its link go to the old address, the row… | `reports/C4.md` · `verdicts/V-C.md` |
| C5-04 | During a Resend outage of about twenty minutes, a member waiting on a resend is told "We have hit today's email limit" on a day with budget to spare | `reports/C5.md` |
| C5-05 | Confirming by another route leaves the member's queued confirmation in the line: on a backlog day it still goes out, spending a slot someone else is waiting for | `reports/C5.md` |
| C7b-01 | Pressing Check with nothing typed spends one of the address's eight tries, shakes the bird's head and says "Not quite", and the trivia room then counts that visitor as… | `reports/C7b.md` · `verdicts/V-R4b.md` |
| C7b-02 | The swap arrow has no in-flight guard: a double tap sends two swaps that both exclude the first question, and the room books a phantom showing and an extra "moved on" —… | `reports/C7b.md` · `verdicts/V-R4b.md` |
| C7b-03 | If the first question fails to load, the entry gate sits on "..." for good: Check is disabled, the swap arrow is not drawn, and the toast says "try again" with nothing… | `reports/C7b.md` · `verdicts/V-R4b.md` |
| L10-03 | When Cloudflare's challenge service is down, nobody can sign up and nobody can reset a forgotten password, and each visitor is told their own browser is to blame. The… | `reports/L10.md` · `verdicts/V-L-b.md` |
| L6-07 | A link with a repeated query parameter crashes the public reset and confirm pages (live-proved) and the directory | `reports/L6.md` · `verdicts/V-L-d.md` |
| T5-08 | With `RESEND_API_KEY` missing in production, every unconfirmed member's banner asserts "A link has been sent to your email" and hides the resend button, while the queue… | `reports/T5.md` · `verdicts/V-T5.md` |
| T5-11 | A malformed `rv_human` cookie makes every sign-in from that browser report "This is us, not your password" for five minutes | `reports/T5.md` · `verdicts/V-T5.md` |
| T5-12 | Any NextAuth refusal that is not one of the three known codes prints "Invalid email or password." — a browser that blocks the CSRF cookie is sent into the reset loop… | `reports/T5.md` · `verdicts/V-T5.md` |
| T5-14 | A blocked member is told their password is wrong and that a reset link is "on its way" that will never come — a dead-end loop with no hint to write to a human (owner… | `reports/T5.md` · `verdicts/V-T5.md` |
| T6-06 | The contact editor's email row is seeded with the sign-in address and edits only the shown one; there is no signed-in way to change the password or the login email… | `reports/T6.md` · `verdicts/V-T6.md` |

#### Phase H — Catch-ups: answering, reading, and the words on the clock (22 Low)

| id | finding | read first |
|---|---|---|
| C7a-04 | On a small phone the Edition's question list runs off the bottom of the screen and its last questions cannot be picked: the panel's cap is TALLER on a phone than on a… | `reports/C7a.md` · `verdicts/V-R4b.md` |
| C8-04 (not adversarially validated) | A member removed by a Keeper, or moved out of a batch by a year correction, mid-Edition still has their unpublished answers and questions published to that group… | `reports/C8.md` |
| L2-04 | The Catch-up Edition page runs its edition and membership queries twice per view, because it is the one read surface that skips the `cache()` pattern the rest of the… | `reports/L2.md` · `verdicts/V-L-a.md` |
| L3-03 | Every deadline morning the admin room calls a healthy Edition "past its date" for the 83 minutes between the 07:00 IST deadline and the cron, which for this project… | `reports/L3.md` · `verdicts/V-L-a.md` |
| T2a-11 | Comment lies in the lifecycle files (the code drifted from its stated contract) | `reports/T2a.md` · `verdicts/V-T2.md` |
| T2a-13 | Blocked and deletion-pending accounts stay inside every Catch-up: counted toward the batch floor, listed in People, reminded daily, their answers shown while their… | `reports/T2a.md` · `verdicts/V-T2.md` |
| T2b-03 | The Catch-ups export never creates its `audio/` folder, so every recorded answer fails to copy, and the JSON still says the file is there | `reports/T2b.md` · `verdicts/V-T2.md` |
| T2b-04 | The two-minute recording cap is a byte cap in disguise: a low-bitrate client can attach twenty minutes of audio that passes every check | `reports/T2b.md` · `verdicts/V-T2.md` |
| T2b-05 | Reader shows a blocked member's answers, hearts and votes while hiding their comments on the same page, against the schema's promise that blocking hides everything they… | `reports/T2b.md` · `verdicts/V-T2.md` |
| T2b-08 | The export reads every photograph and recording through the public host with no timeout, the one thing TRAPS says a bulk reader must not do | `reports/T2b.md` · `verdicts/V-T2.md` |
| T2b-10 | `submitEntry`'s replaced-recording check is a sequential scan: `CatchupEntry.audioUrl` has no index | `reports/T2b.md` · `verdicts/V-T2.md` |
| T2b-12 | One empty answer row from before the withdrawal rule sits in a published Edition, and nothing sweeps the class | `reports/T2b.md` · `verdicts/V-T2.md` |
| T2b-13 | Every reader load aggregates every comment AND every heart in the database: both `_count`s in the Edition loader compile to uncorrelated whole-table `GROUP BY`… | `reports/T2b.md` · `verdicts/V-T2.md` |
| T3-08 | The home runs an unbounded, in-memory `distinct` over every answer in an answering Edition to build a list nothing renders | `reports/T3.md` · `verdicts/V-T3.md` |
| T3-09 | The invitation page names the Catch-up by its group's original name, so a renamed Catch-up invites people to something called by a name it no longer has | `reports/T3.md` · `verdicts/V-T3.md` |
| T3-12 | A navigator "glide" keeps driving the window's scroll for up to 900 ms after the reader is gone, so a quick tap on the Catch-up's name lands the home page mid-scroll | `reports/T3.md` · `verdicts/V-T3.md` |
| T3-14 | A member can add themselves to their own new Catch-up and see two chips for one person | `reports/T3.md` · `verdicts/V-T3.md` |
| T3-21 | A photo-wall answer takes one photograph, although the owner set the wall's cap at three | `reports/T3.md` · `verdicts/V-T3.md` |
| T3-22 | The People door's "Add someone" offers people who are already in the Catch-up, and the Keeper, and answers "X is in." when nothing changed | `reports/T3.md` · `verdicts/V-T3.md` |
| T3-23 | Removing someone from a Catch-up is one tap with no confirmation and no undo, on a control a phone always shows 2px from the Keeper sprout | `reports/T3.md` · `verdicts/V-T3.md` |
| T3-24 | On the Catch-ups list, Undo on an archive swallows its own failure: the card stays archived and nothing says so | `reports/T3.md` · `verdicts/V-T3.md` |
| T7b-03 | `2026-09-09-answering-moves-to-the-home.sql` never ran on production: 22 bell rows still point at `/catchups/<id>/answer`, nine of them unread reminders that… | `reports/T7b.md` · `verdicts/V-T7b.md` |

#### Phase I — Admin, moderation and the analytics room (41 Low)

| id | finding | read first |
|---|---|---|
| C1-07 | On the admin People and Content lists, a typed search that is committed by clicking Filters closes the filter panel under the admin's hand a moment later, and a facet… | `reports/C1.md` · `verdicts/V-C.md` |
| C7b-04 | What a newcomer typed can break its row in the trivia room: a long answer with no spaces runs out of its card and under the Accept button (the `break-words` on it is… | `reports/C7b.md` · `verdicts/V-R4b.md` |
| C7b-05 | Accepting an answer longer than 120 characters stores a cut-off copy that matches nothing: the toast says it "now gets in", the row keeps its Accept button, and the… | `reports/C7b.md` · `verdicts/V-R4b.md` |
| C7b-06 | A question's own page never says when the 30,000-row ceiling cut its range, and draws every answer and every turned-away group in that range with no cap | `reports/C7b.md` · `verdicts/V-R4b.md` |
| C7b-07 | The "Day by day" strip's total counts a returning visitor once per day, so its "came" disagrees with The door above it; and on a computer, clicking the day you are… | `reports/C7b.md` · `verdicts/V-R4b.md` |
| C8-06 (not adversarially validated) | A merge leaves the survivor holding the duplicate's uploads under the duplicate's key prefix: answer photographs the survivor's own save then refuses, and a Catch-up… | `reports/C8.md` |
| C8-09 (not adversarially validated) | After a member is erased (and after a merge), the admins' own bells about that member open 404s, and keep a line of the member's words for a month | `reports/C8.md` |
| L10-05 | The designated test profile is an admin in production, so the member messages ring it and every automated screenshot, crawl and visual baseline has only ever rendered… | `reports/L10.md` · `verdicts/V-L-b.md` |
| L10-06 | The Class Collection's second mitigation, "an AuditLog row on every `batchYear` change", never shipped: a member moves between classes without a trace, and the owner… | `reports/L10.md` · `verdicts/V-L-b.md` |
| L12-04 | `adminSetRole` runs the last-admin guard only for the literal `"member"`: any other value skips it and is written straight to `User.role`, so one crafted call removes… | `reports/L12.md` · `verdicts/V-L-d.md` |
| L12-05 | Moderation that destroys a member's work leaves no audit row, although SECURITY.md says `AuditLog` covers "every admin action": 56 photographs erased by an admin in the… | `reports/L12.md` · `verdicts/V-L-d.md` |
| T6-05 | The `anonymous` system account is a person in the directory: listed in the People view, counted in "222 people", found by name search and by the mention picker | `reports/T6.md` · `verdicts/V-T6.md` |
| T7a-05 | An admin's "Delete for good" runs a 30-second transaction plus up to 500 sequential R2 deletes inside a page-hosted server action with no `maxDuration`; if the platform… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-08 | The "flagged" member state is dead: nothing in the app can write it, yet a worklist queue, a rail count, a People filter arm, a chip, a Standing line and two comments… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-11 | Runtime validation is missing on every people action: an admin-typed name has no length cap (the member's own form caps at 100), `role`/`method`/`trusted` are… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-12 | The merge dialog takes a pasted id with no preview of who the target is; a wrong-but-existing id is an irreversible merge into the wrong person, and a blocked or… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-13 | Post reports never count toward "N reports in all" or the person page's "Reported" tally, so the pattern the queue exists to show is invisible for the commonest report… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-14 | Three admin read surfaces have no bound and will not survive two years of 2,000 members: the Catch-ups index loads every Catch-up; the reading room loads every Edition… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-15 | Copy that lies on admin surfaces (five lines, one finding) | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-16 | Two different "members" numbers sit two inches apart: the rail's People count is every row including blocked, the Overview's Members tile excludes them | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-17 | `adminHidePost` throws on a post that vanished between render and press, and the composed "Hide the post" button then reports "Another admin has already settled this… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-19 | The member is told their account is erased "on <valley day D+60>", but the sweep at 02:30 IST purges on the first sweep AFTER request+60d, i.e. the morning of D+61 for… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7a-23 | The `anonymous` system account is an ordinary verified alumnus to every admin control: it can be blocked (hiding the sixteen curated stories), deleted (erasing them) or… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7b-01 | The one metric the nightly snapshot calls irreplaceable ("did last night's backup run") has failed with HTTP 403 on every one of its ~35 runs, the job reports green,… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-04 | `User.lastSeenAt` is stamped from localhost for whoever dev-login signs in as, against `stats-exclusion.ts`'s promise that development "records nothing, whoever is… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-05 | The snapshot stamps "yesterday" on numbers captured 3.3–4.5 hours into today: GitHub's cron lag folds the Indian morning (05:30–10:10 IST) into the previous day's row,… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-06 | "Members nobody has responded to" (the panel that tells the owner to go and say hello) lists accounts that never confirmed their e-mail, unverified sign-ups and the… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-07 | The admin rail's count store ignores `photos` when deciding whether anything changed, so a photograph arriving while another queue shrinks by one leaves the Review… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-08 | Duplicate React keys in the room: letters keyed by title, leaderboard rows keyed by name whenever two members share a name without a batch year, top authors keyed by… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-09 | LoginAttempt has neither the write gate nor the read exclusion, so a local sign-in attempt with a typo'd address, or an audit's probe account, becomes a "person who… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-11 | `prune.mjs` re-implements the sweep's 30-day notification cutoff with its own copy of the number, no test pinning the two together, and runs three hours after the sweep… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-14 | The sparklines under "Letters published" and "Feed posts" count drafts and hidden posts, so the line climbs when nothing was published. Today the tiles read 6 and 12… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-16 | On a shared browser, the second member to sign in within 30 minutes of the first is invisible to presence for their whole sitting: the visit cookie belongs to the first… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-17 | The search log can't see the two things the Reach view asks of it: feed searches never record a result count, so none can ever count as "found nothing"; and an erased… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-18 | An admin's reply has no double-submit guard. C-128 fixed the member's two write paths and missed the third, so a key-repeated Cmd+Enter or a second tab posts the reply… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-19 | A pasted link in a message to the admins is cut off, not wrapped, everywhere the message shows: the member's own thread clips it at the card edge, the admin's thread at… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T7b-20 | The owner's own comments and photo hearts top two of the room's leaderboards, while the Compare tab leaves the same activity out. The exclusion promises "every activity… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T8a-01 | The nightly money history is recorded gross and includes the site's own people, so the permanent series disagrees with every money tile by a third | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8a-14 | The admin funnel counts payments and calls them people: today it reads "4 of 11 people opened a payment and did not finish it" where the truth is 2 of 9, and a refunded… | `reports/T8a.md` · `verdicts/V-T8.md` |
| V-L-a-01 | Reading a member's message on /admin leaves the rail's Messages badge (and the Overview total) at its old number until a reload: the "seen" write happens inside a page… | `verdicts/V-L-a.md` |
| V-T7a-01 | The person page's "Comments" tally counts the member's own deleted comments | `verdicts/V-T7a.md` |

#### Phase J — Support and payments (5 Low)

| id | finding | read first |
|---|---|---|
| T8a-04 | While RAZORPAY_WEBHOOK_SECRET is missing or rotated, the route answers 500 to every event, which is the very behaviour the same file says gets an endpoint switched off… | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8a-05 | chooseBird's "the second is refused" is only true one at a time (L1's lead, confirmed benign, folded) | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8a-06 | /support answers a database failure with "₹0 recovered", the opposite of what the same audit taught /pick-bird | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8a-13 | After a failed attempt inside the Razorpay window, the Contribute button stays live through the successful retry, its confirmation and the redirect | `reports/T8a.md` · `verdicts/V-T8.md` |
| V-T8-01 | A gift paid on a second attempt is recorded with the FAILED attempt's payment method whenever the browser callback wins the race | `verdicts/V-T8.md` |

#### Phase K — Text that breaks things: names, numbers, search, links (19 Low)

| id | finding | read first |
|---|---|---|
| L10-04 | Two tabs or two devices on one profile silently erase each other's work: the contact block, the cities and the houses are each written whole from the saving tab's own… | `reports/L10.md` · `verdicts/V-L-b.md` |
| L12-07 | No action validates the shape of an id: 70-odd id parameters reach Prisma as whatever the caller sent, so a malformed call throws (and files a Sentry event) instead of… | `reports/L12.md` · `verdicts/V-L-d.md` |
| L6-02 | A bidi override in a name, a Catch-up name or a message runs into the app's own sentence in other members' bells and admin inboxes (the whole-app extension of V-O-B) | `reports/L6.md` · `verdicts/V-L-d.md` |
| L6-03 | A value made only of zero-width characters passes every "not empty" rule in the app, so a member can be nameless and a Catch-up, question, choice or caption can be… | `reports/L6.md` · `verdicts/V-L-d.md` |
| L6-04 | A NUL character fails every text write in the app with the wrong sentence, and on two paths it fails after something irreversible already happened | `reports/L6.md` · `verdicts/V-L-d.md` |
| L6-06 | Twelve fields that a member can overfill from the page answer in Zod's raw English ("Too big: expected string to have <=50 characters") | `reports/L6.md` · `verdicts/V-L-d.md` |
| L6-08 | Title-casing corrupts Turkish capitals and brand spellings in names and job titles, and can store a name longer than the cap that then refuses to save | `reports/L6.md` · `verdicts/V-L-d.md` |
| L6-09 | A message to the admins that is one long character cluster gets an empty subject and a "..." bell | `reports/L6.md` · `verdicts/V-L-d.md` |
| L7-08 | Every pause while typing a name in the directory adds a page to the browser's history, so Back walks through each half-typed search before it leaves the directory | `reports/L7.md` · `verdicts/V-L-d.md` |
| O-06 | A null byte in any search box makes the server throw, the member is told to "check your connection", and the page also claims "No posts match your search" | `reports/O.md` · `verdicts/V-O-L1.md` |
| T6-07 | Clearing your batch year or leaving year on the profile leaves the derived board credential standing, where the admin editor clears it | `reports/T6.md` · `verdicts/V-T6.md` |
| T6-09 | A phone number typed with India's trunk zero ("09845033712") is displayed and re-edited as "+098 45033712", and a "+" with no digits survives validation as a phone | `reports/T6.md` · `verdicts/V-T6.md` |
| T6-10 | Two survivors of the C-174 class: a crafted call still turns into a 500 instead of a refusal in `updateContactMethods` (a non-boolean `showEmail`) and… | `reports/T6.md` · `verdicts/V-T6.md` |
| T6-11 | The onboarding register step speaks raw Zod to the member and lets an alumnus write teacher subjects | `reports/T6.md` · `verdicts/V-T6.md` |
| T6-12 | The same columns are capped and ruled differently by their writers: the pen's occupation fields accept 120 characters the server refuses at 100; onboarding's house… | `reports/T6.md` · `verdicts/V-T6.md` |
| T6-13 | `/api/places/search`'s header says altNames has no index; it has a GIN trigram index the planner uses, and the route costs 7 to 450 ms per keystroke depending on cache | `reports/T6.md` · `verdicts/V-T6.md` |
| T6-14 | The saved contact card has no `N` property, which vCard 3.0 requires, and its NOTE can be 4,000 characters on one unfolded line | `reports/T6.md` · `verdicts/V-T6.md` |
| T6-15 | Two hand-made directory URLs mislead: `?type=<anything>` draws a chip and lists the whole membership as "results", and `?cursor=<stale>` on the server-rendered page has… | `reports/T6.md` · `verdicts/V-T6.md` |
| T8b-21 | The batch-range filter lets "From" exceed "To" and then answers with nobody: "Batch: 2020 to 2010", 0 people, and no hint that the range is backwards | `reports/T8b.md` · `verdicts/V-T8.md` |

#### Phase L — Platform, database, demo and scripts (43 Low)

| id | finding | read first |
|---|---|---|
| C1-01 | `npm run screenshot:auth <url>` posts the owner's DEV_LOGIN_SECRET and admin address to whatever site the URL names, and the secret opens an admin session on the… | `reports/C1.md` · `verdicts/V-C.md` |
| C1-02 | Every run of the phase-3 security probe tells a real member "Probe stage2 commented on your post", and leaves that bell row (and an admin "asked to be verified" row… | `reports/C1.md` · `verdicts/V-C.md` |
| C1-03 | The phase-7 security probe asserts the opposite of a live unique index, so it has reported a FAIL on correct behaviour on every run since 2026-08-25, and each run files… | `reports/C1.md` · `verdicts/V-C.md` |
| C1-05 | The one script that deletes every row of the database it connects to has the weakest destination guard in `scripts/`: it never checks the demo project's ref, so a… | `reports/C1.md` · `verdicts/V-C.md` |
| C1-08 | The dependency gate passes without auditing anything when the checkout's path needs URL-escaping or runs through a symlink | `reports/C1.md` · `verdicts/V-C.md` |
| L11-06 | The nightly sweep, the tick and every image deletion also run from the owner's laptop against the one database, and there they are only as correct as the laptop's… | `reports/L11.md` · `verdicts/V-L-b.md` |
| L11-07 | The nightly sweep's budget was sized for its transactions and not for the deletes each purge makes inline, and its GitHub timeout equals the function's: a night with a… | `reports/L11.md` · `verdicts/V-L-b.md` |
| L12-06 | On `next dev`, `setArchived` writes to the production database with no authentication at all, from any machine that can reach the laptop | `reports/L12.md` · `verdicts/V-L-d.md` |
| L12-08 | The demo's second and third layers together leave row creation unbounded: every meter is switched off on the demo, the allowlist admits the tables a script can grow,… | `reports/L12.md` · `verdicts/V-L-d.md` |
| L3-05 | The date gates see one shape each: the rendered-date sweep misses every date written inside JSX braces, a template literal or a ternary; the SQL sweep misses EXTRACT;… | `reports/L3.md` · `verdicts/V-L-a.md` |
| L3-06 | `npm run check` goes red for five and a half hours every New Year's Eve: a valley-day test compares the runner's LOCAL year with the valley's year | `reports/L3.md` · `verdicts/V-L-a.md` |
| L3-07 | The nightly database dump is named by the UTC date it happens to run on, and GitHub runs it up to eight hours late, so a late night and the next on-time night share one… | `reports/L3.md` · `verdicts/V-L-a.md` |
| L5-03 | Every relation count on the hot pages aggregates its WHOLE table on every render: three more instances than T1-17/T2b-13 know about, and measured on this server the… | `reports/L5.md` · `verdicts/V-L-c.md` |
| L5-05 | Under pool pressure the interactive transactions fail at 2 s, not 5 s, and each one that gives up still borrows a connection later to open and roll back a transaction… | `reports/L5.md` · `verdicts/V-L-c.md` |
| L5-08 | Nothing measures the database's size, and at 2,000 members it reaches the Free plan's 500 MB read-only line in roughly one to two years: a 97 MB gazetteer, a view log… | `reports/L5.md` · `verdicts/V-L-c.md` |
| L8-01 | Hobby's 10 GB of Fast Origin Transfer was the allowance nobody counted; on Pro it is cents, and the photograph-download converter is still its largest single spender:… | `reports/L8.md` · `verdicts/V-L-c.md` |
| L8-03 | Every request here passes the proxy, so the real upload ceiling is Routing Middleware's 4 MB, not the 4.5 MB the client limit was sized against: a body just under the… | `reports/L8.md` · `verdicts/V-L-c.md` |
| L8-08 | The decompression-bomb ceiling was sized for one decode per function, but under Fluid compute concurrent image work shares one 2 GB instance: a few large contributions… | `reports/L8.md` · `verdicts/V-L-c.md` |
| L9-01 | The C-134 regression pin cannot see a wildcard host in most of next.config.ts: it is green today with an unlisted `*.spotifycdn.com`, and would stay green with… | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-02 | The comment stripper every shape test relies on deletes real code whenever a string holds `/*`, so negative assertions pass on nothing: the "no DialogDescription" pin… | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-03 | `npm run check`, and so CI, passes with ESLint errors: a rules-of-hooks violation prints FAIL and ships green | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-04 | The CI-parity gate can be defeated three ways it does not look at: a `uses:` step, `continue-on-error` on the gate step, and a security gate flipped to non-blocking | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-05 | Nothing pins the three writes that make session revocation happen: delete `credentialVersion: { increment: 1 }` from the password reset and a phished member's reset… | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-06 | The back-button rule's "nothing but back-closes.ts pops history" cannot see `router.back()`, the call the guide's own history bug was made of | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-07 | Nine sweeps still take their candidate list from git, the fail-open shape C-189 removed from two others: a new file is invisible to them until it is staged, so the… | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-08 | The bell-cleanup sweep (C-054) believes a post can stop being readable two ways; the account purge is a third, and the fix proposed for the admin hide would take that… | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-09 | The visual suite's red on /letters was not a mask gap: it is Next's "1 Issue" badge over the account chip, photographing the O-01 hydration error; two sessions read it… | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-10 | The demo's last write layer lets any allowed model carry a nested write to a refused one, while prisma.ts and the demo test both say it cannot | `reports/L9.md` · `verdicts/V-L-d.md` |
| L9-11 | The security status board, a blocking gate quoted as "74 tracked, 0 open", marks rows fixed on the presence of a word, and at least six of its "fixed" notes are… | `reports/L9.md` · `verdicts/V-L-d.md` |
| T1-17 | Every feed page, letters index and letter page aggregates the WHOLE Comment table (joined to User) to count the comments on the twenty posts it shows | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-20 | `PollOption` has no index on `postId`, and every feed page fetches poll options for its twenty posts | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-21 | `Notification` has no index on `link`, and every post deletion or moderation scans the whole table to clear its bell rows | `reports/T1.md` · `verdicts/V-T1.md` |
| T1-22 | `User` has no index on `createdAt`, and the feed rail's "New in the directory" sorts every member on every feed render | `reports/T1.md` · `verdicts/V-T1.md` |
| T7a-18 | The roster import replaces the table outside a transaction, so a crash between the DELETE and the last chunk leaves a partial roster that vouches for nobody in the… | `reports/T7a.md` · `verdicts/V-T7a.md` |
| T7b-10 | `Visit` has no index on `startedAt`, and nine of the room's queries filter on it, so every open of Live, Rhythms or Reach sequentially scans the whole 90-day table;… | `reports/T7b.md` · `verdicts/V-T7b.md` |
| T8a-08 | The demo database is not a seeded world: 40 people from 2026-08-26 and no posts, photographs, places, Editions or notifications; the record that says "the demo database… | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8a-09 | The demo closes four API prefixes in the proxy with no twin list, no test, and no pin on the money actions' own refusals | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8a-10 | `verify-guard.mts` calls any demo with other than exactly 40 people "DAMAGE" | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8a-17 | The demo bar's Reset reloads to /feed whether or not the reset worked | `reports/T8a.md` · `verdicts/V-T8.md` |
| T8b-10 | The proxy's public-path test admits any path that begins with `//`, and only Next's own repeated-slash redirect stands in front of it | `reports/T8b.md` · `verdicts/V-T8.md` |
| V-L-c-01 | The "measure, never estimate" commands this project is built around now answer `payment_required`, and the same Vercel API that refuses them reports the team's plan as… | `verdicts/V-L-c.md` |
| V-T7a-03 | `phase4-prod-check.mjs` deletes from the dropped "Session" table, so its cleanup throws and leaves a confirmed probe alumnus in production | `verdicts/V-T7a.md` |
| VOL1-01 | Ten laptop scripts, `run-sql.mjs` among them, open the production database with TLS but without checking it is Supabase, and the TLS gate accepts that | `verdicts/V-O-L1.md` |

#### Phase M — The hoopoe (9 Low)

| id | finding | read first |
|---|---|---|
| T9-05 | On the public /hoopoe playground, "Settle down" (or any interruption) during "Surprise me" leaves "Surprise me" disabled until a reload | `reports/T9.md` · `verdicts/V-T9.md` |
| T9-06 | The landing flight's "overtaken flight" fix (audit Low 13) is incomplete: an old flight's cleanup still deletes the new bird and cancels its frame loop | `reports/T9.md` · `verdicts/V-T9.md` |
| T9-07 | The sign-in and join pages can hide their bird for six seconds after a cancelled or slow landing exit | `reports/T9.md` · `verdicts/V-T9.md` |
| T9-08 | Every bird keeps every animation it ever stopped for as long as it is mounted | `reports/T9.md` · `verdicts/V-T9.md` |
| T9-09 | A second celebration in the same visit skips the one-hoopoe check | `reports/T9.md` · `verdicts/V-T9.md` |
| T9-12 | Every feed view pays three extra queries, one a duplicate read of the member's own row, to decide a celebration that has almost always already played | `reports/T9.md` · `verdicts/V-T9.md` |
| T9-13 | A bird resting in a sad, worried, sleepy or curious pose has its crest snapped upright by the ambient flick within 5-11 seconds | `reports/T9.md` · `verdicts/V-T9.md` |
| T9-14 | "See them in the Collection": the bird jumps about 14px sideways as the flyer takes over | `reports/T9.md` · `verdicts/V-T9.md` |
| VT9-01 | On /signup's register step, any error after the first 15 seconds drops the bird's wings off its eyes and leaves them hanging out of place until the password reveal is… | `verdicts/V-T9.md` |

#### Phase N — Feel and truth: presses, taps, comments and docs that lie (14 Low)

| id | finding | read first |
|---|---|---|
| C2-03 | The public setup guide tells a new developer that `ADMIN_EMAIL` makes them admin on first sign-in and that the migrations folder builds a fresh database; neither has… | `reports/C2.md` · `verdicts/V-C.md` |
| C7b-08 | Fifteen links, among them "Start a Catch-up", wrap a `<Button>` inside the `<a>`: two tab stops and a button nested in a link for one action, where the house pattern… | `reports/C7b.md` · `verdicts/V-R4b.md` |
| L7-04 | The press sink on the app's shared Button, every dialog's close button and about fifty other controls never animates: the scale arrives in one frame | `reports/L7.md` · `verdicts/V-L-d.md` |
| L7-05 | On a phone, the profile's "Reaching you" rows have an invisible remove button that deletes the row and saves on the spot | `reports/L7.md` · `verdicts/V-L-d.md` |
| L7-07 | Tapping an unread notification closes the menu and then does nothing until a mark-as-read write has come back; a tap elsewhere in that pause is overridden when the late… | `reports/L7.md` · `verdicts/V-L-d.md` |
| L8-09 | Ten platform facts written into the repository are wrong against the vendors' current pages, and three of them steer decisions | `reports/L8.md` · `verdicts/V-L-c.md` |
| L8-10 | Every page sends a Permissions-Policy feature no current browser knows, so Chromium logs an error line on every page load | `reports/L8.md` · `verdicts/V-L-c.md` |
| L9-12 | Sixteen comments and documents that no finding carried say something the code does not do (Table A's **new** rows), one of them the reason the Keeper hat is spelled the… | `reports/L9.md` · `verdicts/V-L-d.md` |
| T4a-10 | Comments and documents describe a database that no longer exists: production has run three of the "unrun" drop files, so there are nine hand-made indexes, not eleven,… | `reports/T4a.md` · `verdicts/V-T4.md` |
| T4b-11 | OPERATIONS.md still describes the phone scrubber as "a timer rather than a state"; it has been a fixed chip since 2026-09-12 | `reports/T4b.md` · `verdicts/V-T4.md` |
| T8b-04 | "5m ago" is computed at render inside client components the server also renders, so any feed with a fresh post or comment hydrates against a different clock and React… | `reports/T8b.md` · `verdicts/V-T8.md` |
| T8b-05 | The (i) tooltip opens on hover and toggles on click, so a finger's tap opens it and closes it in the same gesture on Android; the note needs two taps, and on a desktop… | `reports/T8b.md` · `verdicts/V-T8.md` |
| T8b-20 | A second finger, or a parent re-render, during a bottom sheet's swipe leaves the sheet stuck partway down the screen with its transition switched off | `reports/T8b.md` · `verdicts/V-T8.md` |
| T9-11 | mascot.md and several headers describe behaviour the code no longer has | `reports/T9.md` · `verdicts/V-T9.md` |

#### Phase O — Budgets: what one account or one script may spend of what everyone shares (1 Low)

| id | finding | read first |
|---|---|---|
| C3-02 | The Start meter does not do what its comment says: one member can run an Edition from Start to "ready to read" in about a minute, five times an hour, ringing the whole… | `reports/C3.md` · `verdicts/V-C.md` |


### Closed during the audit (51)

| id | ruling | why | was |
|---|---|---|---|
| L11-01 | FIXED-SINCE | a281e855 — R2 rejected both CLI tag strategies; the sync now raises the multipart threshold to 5 GB and uses `--copy-props default`, so every copy… | High: The photo archive's only backup has failed every night since 2026-08-29: the 111 largest… |
| L2-01 | FIXED-SINCE | 8d35ff4e ("fix(lab): every server-rendered room checks the admin role itself", 2026-09-29) | High: The /lab admin gate lives only in a layout, and a hand-crafted RSC request renders a lab… |
| L3-01 | FIXED-SINCE | d7a8041d ("feat(email): waiting for a confirmation email no longer locks anybody out", 2026-09-29) | Medium: On a day the mail budget is spent, every member queued two or more days out is told… |
| L3-08 | FIXED-SINCE | a281e855 ("fix(backup): copy media as plain CopyObjects R2 accepts", 2026-10-03) — not 7f28818c | High: (outside the date lens, found on the seeded question's path) The photo archive's only… |
| L6-01 | FIXED-SINCE | 5164de0f ("feat(feed): tagging in the composer works like Messages") | Medium: Editing a post, letter draft or answer that contains an @-mention silently turns every… |
| L8-05 | FIXED-SINCE | b6cbdfc0 ("bound the page-meta patterns so a hostile page parses in milliseconds"). | None: T2b-01 in platform terms: one hostile link burned Active CPU for the route's whole… |
| O-03 | FIXED-SINCE | e286daf0 ("fix(auth): a database that does not answer no longer signs the member out", 2026-09-29): the session callback catches the row read and… | High: A five-second wait for a pooled connection during the session read signs the member out:… |
| O-07 | FIXED-SINCE | 91c07fbc ("fix(database): encrypt every connection and verify it is Supabase", 2026-09-29): `src/lib/db-tls.ts` pins Supabase's 2021 root CA and… | High: The app's database connection is not encrypted: `pg` is given no `ssl` and the… |
| T2a-01 | FIXED-SINCE | e49e6265** — `syncBatchGroup` (`batch-catchups.ts:230-253`) moves a member out of every batch group their row does not name (membership, pref row… | High: Correcting a batch year leaves the member inside the wrong batch's Catch-up for ever,… |
| T2b-01 | FIXED-SINCE | b6cbdfc0 (the mechanism and the High were right at `495ecdd2`; the orchestrator's own timing stands as the record) | High: One pasted link to a hostile page makes the server spin for minutes in the background,… |
| T3-01 | FIXED-SINCE | 592e3526 (2026-09-29, "fix(catchups): the Picture row opens the picker; Start it again asks to"). The finding was CONFIRMED at 495ecdd2… | High: The Settings "Picture" row opens nothing: the picture picker is never mounted, so no… |
| T3-02 | FIXED-SINCE | 1439c83a (2026-09-27, "fix(catchups): a library photo or songs question is asked as one again"). CONFIRMED at 495ecdd2 (orchestrator hand-verified… | High: A question picked from the library loses its kind: the ask box never sends `category`,… |
| T3-03 | FIXED-SINCE | 592e3526 (the on-hold card's "Start it again" opened the settings confirm `{ shape: "confirm", key: "resume" }` instead of `router.refresh()`). The… | High: "Start it again" on the on-hold card does nothing but reload the page: the Catch-up… |
| T4a-05 | FIXED-SINCE | 9c992844 ("fix(collection): retry a missed direct upload, keep what arrives, and say so", 2026-09-27) | Medium: One transient PUT failure permanently downgrades a photograph to the 1,600px q80… |
| T6-02 | FIXED-SINCE | e49e6265 — "a changed batch year moves the member out of the old batch": `syncBatchGroup` (`src/lib/batch-catchups.ts:230-254`) puts a member in… | High: Correcting your own batch year on the profile adds you to the new batch's group and… |
| T7b-12 | FIXED-SINCE | 19be10b0 ("fix(platform): links stop prefetching pages nobody opens", 2026-09-29) | Low: Both thread pages mark a conversation "seen" inside a GET render; only the sibling… |
| L1-07 | MOOT-SINCE | eb855c71 ("feat(catchups): Editions start by hand: no rhythm, no hold, Start for anyone", 2026-10-17) | Low: `openNextEdition`'s compare-and-swap is not one when `nextOpensAt` is NULL, so two… |
| L3-04 | MOOT-SINCE | 6fb896bd for the nudge; REFUTED for the export. The finding falls as a whole. | Low: Two refusals promise a calendar day that no calendar enforces: the Keeper's nudge says… |
| L8-07 | MOOT-SINCE | . | None: The nightly backup and the retention sweep ran on a GitHub free-minute budget shared… |
| T2a-05 | MOOT-SINCE | eb855c71** — there is no rhythm: `nextOpensAt`, `addCadenceGap`, `openNextEditionIfDue`, `updateCatchupCadence`, `resumeCatchup` are deleted from… | Medium: The next Edition's opening has no tick grace and no civil hour, so the cron misses it… |
| T2a-06 | MOOT-SINCE | eb855c71** — Hold and resume are deleted (tombstone `actions.ts:771-777`; `refuseIfFrozen` became `refuseIfEnded` `:345-347`; `advanceEdition`… | Medium: "Hold the next Edition" freezes the CURRENT one: nobody can answer, it never publishes,… |
| T2a-12 | MOOT-SINCE | eb855c71** — the dormant-revive branch (`wasDormant`) is deleted (tombstone `actions.ts:918-922`): a twice-empty Edition fizzles to idle… | Low: A question submitted in the five-minute grace window of a dormant Edition does not… |
| T3-07 | MOOT-SINCE | eb855c71 (2026-10-17, "Editions start by hand: no rhythm, no hold"). The finding was right at 495ecdd2 (the state line for `published` printed "The… | Low: The home prints its state line from the Catch-up row it read BEFORE it advanced the… |
| T3-20 | MOOT-SINCE | 5d5c6898 (2026-10-11, "feat(catchups): delete the vote question and the magazine"). The finder's reproduction through `layoutMagazine` stood at… | Medium: The magazine layout never finishes, and runs the process out of memory, on an Edition… |
| T8b-16 | MOOT-SINCE | "Plain-text chapters" deleted `Doorway` and the six same-page doorways; the only in-chapter link left is `GuideLink href="/messages"`… | Low: "Go to the Feed" (and the other five chapter doorways) does nothing when the guide was… |
| L1-05 | REFUTED |  | Low: Two quick taps on two poll options can leave the vote shown different from the vote stored |
| L1-06 | REFUTED |  | Low: An admin's double-send posts the reply twice and rings the member's bell twice |
| L2-02 | REFUTED |  | Low: After several admin actions the rail's own counts stay wrong for the rest of a… |
| L5-12 | REFUTED | (mechanism real, consequence unreachable at the 2,000 target; fold the residual into T7b-10). | Low: Under Fluid compute the owner's analytics room shares the members' pool of five: at the… |
| T1-04 | REFUTED | (the mechanism exists; the claimed consequence has no reachable trigger) | Medium: editPost reads the row version back in a second statement, so with two devices saving at… |
| T1-05 | REFUTED | (the server half is real; the client never shows the 404 it sends) | Low: Publishing a draft from the desk, or deleting a letter from its page, shows the 404… |
| T1-12 | REFUTED | (the premise state does not exist) | Low: A heart tapped on a page restored from the back-cache ends on the right state but the… |
| T4a-08 | REFUTED |  | Low: An admin's "Remove" on a photograph the uploader deleted a second earlier throws P2025… |
| T4a-09 | REFUTED |  | Low: On the demo, deleting your own photograph dies in the third write layer with "Check your… |
| T4b-08 | REFUTED |  | Medium: Every filter, order, search pause and year press renders the whole page a second time on… |
| T7a-22 | REFUTED |  | Low: After a review session the rail's Review and Overview counts are stale until a hard… |
| T9-10 | REFUTED | (unreachable in the shipped app; latent) | Low: After a tab switch the landing's small perching birds vanish until the visitor scrolls |
| C2-02 | DUPLICATE | of T6-03 | Low: The data export promises that "neither end holds it all", but its stream pushes every… |
| T3-16 | DUPLICATE of T7b-03 | orchestrator: T7b-03 canonical | Low: The 2026-09-09 notification-link migration was never applied to the live database: 22… |
| T4b-02 | DUPLICATE | of T8b-01 (canonical: the Dialog primitive; this is its Collection instance and its worst one) | High: Decline "Discard N photographs?" and the next Back leaves the page, discarding the wall… |
| T5-15 | DUPLICATE | of T7b-04 (canonical: T7b-04, Low) | Low: A local dev-login stamps the signed-in member's `lastSeenAt` even though… |
| T5-17 | DUPLICATE | of O-03 (T5-17 is O-03's auth-side trace and fix; fold it in, keep its fix direction as O-03's) | High: (answer to orchestrator O-03) A five-second pool timeout during the session read is… |
| T6-01 | DUPLICATE | of T7a-06 (T7a-06 canonical; mechanism CONFIRMED, severity Medium stands) | Medium: An admin's "Unverify" is undone by the member's next name, batch-year or leaving-year… |
| T8a-03 | DUPLICATE | of T8a-02 (the premise as written is REFUTED by Razorpay's docs; what survives is T8a-02's path) | High: `payment.dispute.closed` is treated as "the money stayed"; if Razorpay also emits it for… |
| T8b-03 | DUPLICATE | of T5-06 (canonical: T5-06 — it carries the member-facing consequence, the lost-draft half and the `callAction` mapping; T8b-03 is the same root… | Medium: An action POST whose cookie has lapsed is bounced to /login, replayed there by the… |
| V-R4b-01 | DUPLICATE of C7a-02 | V-R4b: fold into C7a-02 (photo-aim save without callAction/finally) | Low: The crop dialog's "Use this" sticks on "Saving..." for the rest of the composer's life… |
| V-T2-01 | DUPLICATE of L10-01 | orchestrator: L10-01's door 3 (V-T2 says so itself); L10-01 is canonical, High | High: Since every batch member runs the cycle (daec81ec), an account the trust model holds at… |
| T3-13 | KNOWN | (docs/TRAPS.md:428-454, "A Tailwind v4 `scale-*` / `rotate-*` / `translate-*` sets the CSS `scale` … property, NOT `transform`"). That entry names… | Low: Five press, hover and slide responses in Catch-ups never animate: an explicit… |
| T8b-13 | KNOWN | (bugs.md open item "guide contents page unreachable"); the two stale comments ride with that item's fix | Low: Two guide comments describe a sidebar "Guide" row that does not exist, which is the… |
| T9-02 | KNOWN | (docs/planning/bugs.md #20) — the finding is the mechanism #20 asked for, not a new defect. Re-rule | Medium: bugs.md #20 found: the /login peek-a-boo is killed by React Strict Mode's dev-only… |
| C1-06 | OWNER-DECLINED | owner 2026-10-23: "its not that deep. can leave it public." | High: The repository went public on 2026-10-02 carrying the "private record" that names the… |
