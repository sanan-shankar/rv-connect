# Bug audit 3 — fix campaign prompt

**@ this file and invoke `/campaign`.** That is the whole handover. The skill front-loads every question
the owner must answer, then works the phases one after another, one worker per chunk, verifying each
worker's output itself before the next starts. It reads the campaign board below to know where to pick
up, and writes to it before it ends.

Audit: `docs/audit-fix/2026-09-24-bug-audit-3/`. `bug-report-3.md` is the deliverable: §2 is the phased
plan, §3 the owner section (questions already in the five-line form, and the checks only he can do), §8
the findings (a full entry for every High and Medium, a table for every Low, and the findings closed
during the audit). The evidence behind each row is its block in `work/reports/<agent>.md` and its
verdict in `work/verdicts/<zone>.md`; **the verdict wins where they differ.** `work/ledger-final.json`
is the machine-readable ledger: every finding's final severity, verdict and `phase`.

---

## Read this before you touch anything

**Trust the finding, re-derive the lines.** Every open row survived a validator whose job was to
refute it, and the High and Medium entries carry line numbers checked at `36ed27d3`. The Lows' lines
are the verdicts' (mostly `88642426`). Audit 2's verifiers found half of all findings carried a wrong
detail; this audit's corrected most of those, but the tree keeps moving. **Before you edit a cited file,
`git log --oneline 36ed27d3..HEAD -- <file>`**, and re-derive the range if anything landed.

**Nine rows were never attacked by a validator**: C8-01 to C8-09, the last completeness round's, which
closed the audit on the owner's word. They carry "not adversarially validated" in the report. A worker
re-derives one before fixing it and drops it, with a ledger line, if it does not hold.

**A peer session commits in this tree** (birds, the trivia gate, the trivia admin page). Stage by name,
commit with a pathspec (`git commit -- <paths>`), never stash, reset or touch work you did not make
(CLAUDE.md). If a file you need holds someone else's uncommitted edits, work around them or stop.

**Live data.** One database serves production and the dev server. **Never test a Catch-up control on a
real Catch-up**: Batch of 2024's Edition 2 was answering until 2026-10-25 07:00 IST; check what is live
before you press anything. Sign in as Jerry Maguire only (memory: never a real alumnus). **Never run the
`scripts/qa/phase*-probe.mjs` scripts**: they comment on a real member's newest post and ring their bell
(C1-02). Schema changes go through a dated file in `prisma/migrations-manual/`, never `prisma db push`.

**The repository is public, by the owner's choice** (ruled 2026-10-23; do not re-raise it). Name no
member in a commit message, a doc or a test you write.

**Machine load.** At most five background agents at a time (the owner's number, 2026-10-24; thirteen took
his VS Code to 5 GB).

**Deploys are git-only, and a push is a deploy.** Commit each fix as it passes `npm run check`; ask
before pushing. Every visible change is announced to the owner (memory: announce frontend changes) and
screenshotted at desktop and 390x844.

**Owner-gated rows.** Only the rows a question names wait for its answer; the rest of the phase runs.
Every question carries the answer to take if he does not reply, so a silent owner never blocks the
campaign for more than the batch he is asked in.

## Campaign board

Where the campaign is, in the order the phases run. **This is the resume anchor**: the next session reads
this table and starts at the first phase that is not `DONE`. Update it before you end, in the same commit
as the work. Status is one of `DONE`, `PARTIAL`, `OPEN`, `OWNER-GATED`, `DECLINED`
(`scripts/qa/campaign.test.mjs` fails on anything else). "Blocked on" names only the rows a question holds;
the rest of the phase runs.

| Phase | Status | Rows left | Blocked on |
|---|---|---|---|
| A — Trust: who counts as verified, and who may press what in a Catch-up | OPEN | 17 (2 H, 3 M, 12 L) | Q13 (L10-01 only); Q15 (C3-01 only); Q16 (L12-09 only); Q19 (O-08 only) |
| B — Privacy: what leaves the site, and what outlives a member | OPEN | 27 (1 H, 9 M, 17 L) | Q1 (T7a-01 only); Q10 (T7b-22, T7b-21 only); Q14 (L11-02 only) |
| O — Budgets: what one account or one script may spend of what everyone shares | OPEN | 12 (2 H, 9 M, 1 L) | — |
| E — The Collection | OPEN | 27 (3 H, 6 M, 18 L) | Q7 (T4a-01 only) |
| F — Letters, the feed and the composer | OPEN | 26 (2 H, 6 M, 18 L) | Q17 (T8b-17 only) |
| D — Alarms: the owner hears about every failure | OPEN | 23 (0 H, 10 M, 13 L) | — |
| C — When something fails, the member sees the truth and can recover | OPEN | 20 (0 H, 10 M, 10 L) | — |
| G — Sign-up, sign-in and the confirmation mail | OPEN | 24 (0 H, 11 M, 13 L) | Q3 (T5-01, T6-06 only); Q4 (T5-14 only); Q18 (C5-03 only) |
| H — Catch-ups: answering, reading, and the words on the clock | OPEN | 34 (0 H, 12 M, 22 L) | Q2 (T2a-07 only); Q6 (T2a-13, T2b-05 only); Q9 (T7b-15 only); Q11 (T3-17 only) |
| J — Support and payments | OPEN | 11 (0 H, 6 M, 5 L) | Q8 (T8a-16 only) |
| I — Admin, moderation and the analytics room | OPEN | 46 (0 H, 5 M, 41 L) | Q5 (T7a-08 only); Q12 (L10-05 only) |
| K — Text that breaks things: names, numbers, search, links | OPEN | 21 (0 H, 2 M, 19 L) | — |
| L — Platform, database, demo and scripts | OPEN | 46 (2 H, 1 M, 43 L) | — |
| M — The hoopoe | OPEN | 11 (0 H, 2 M, 9 L) | — |
| N — Feel and truth: presses, taps, comments and docs that lie | OPEN | 14 (0 H, 0 M, 14 L) | — |

## Owner questions

Asked 2026-10-29, at the start of the fix campaign. Q1 to Q19 are the audit's own (report §3.1),
restated in plain words; the numbering is kept so the board's "Blocked on" column still reads. Q20 to
Q29 are new: eight decisions that were sitting inside the findings themselves (fifteen raw ones,
merged into eight), and two about how the campaign itself runs. Every question carries the answer the
campaign takes if the owner replies "go with your defaults".

**1. Reports a member filed, after that member leaves**
- **What I'd change:** when a member who reported someone deletes their account, or is merged into another account, keep their reports, shown as "filed by a member who has since left".
- **What you'd notice:** on the admin Reports page, old reports stay put instead of vanishing when the person who filed them leaves.
- **If I guess wrong:** reports you would rather lose stay in your list until you settle them.
- **Options:** (a) keep them, reporter shown as departed; (b) delete them with the member, as today, and change the privacy page to say so.
- **If you don't reply I'll do:** (a). The privacy page already promises it. (rows: T7a-01)

**2. Ending a Catch-up while people are still answering**
- **What I'd change:** when a Keeper ends a Catch-up partway through a round, send out the answers already written as one last Edition before it closes.
- **What you'd notice:** ending a Catch-up mid-round sends a final Edition with whatever is in.
- **If I guess wrong:** a Keeper who meant "cancel" sends out a half-finished Edition.
- **Options:** (a) send out what's there, then end; (b) don't allow ending until the round is over; (c) allow it, but warn plainly that the answers will be lost.
- **If you don't reply I'll do:** (a). Today those answers are stranded where nobody can ever read them. (rows: T2a-07)

**3. Changing your sign-in email and password yourself**
- **What I'd change:** add "Change sign-in email" (a link goes to the new address) and "Change password" (asks for the current one) to a member's own profile page, beside "Delete my account". Whatever you pick, I'll also add a button on a person's admin page so you can correct their sign-in email for them.
- **What you'd notice:** two new rows on your own profile page. A member who mistyped their email at signup can fix it.
- **If I guess wrong:** two controls on the profile you didn't want.
- **Options:** (a) build both; (b) only the email change; (c) neither, you fix emails from the admin page.
- **If you don't reply I'll do:** (a). Today a mistyped email that doesn't bounce can never be corrected. (rows: T5-01, T6-06)

**4. Telling a blocked member they are blocked**
- **What I'd change:** a blocked member who tries to sign in sees "This account is paused. Write to us." with the contact address, instead of "wrong password".
- **What you'd notice:** nothing, unless you block someone.
- **If I guess wrong:** a blocked member learns they were blocked.
- **Options:** (a) say it plainly; (b) keep "wrong password", but stop the reset page promising an email that never comes.
- **If you don't reply I'll do:** (a). (rows: T5-14)

**5. The "Flagged" label in the admin People list**
- **What I'd change:** remove it, and show "reported N times" on a person's admin page instead.
- **What you'd notice:** the Flagged filter and label leave the admin People list. Nothing in the site could ever set them.
- **If I guess wrong:** you lose a label you meant to build later.
- **Options:** (a) remove it; (b) build it: a button that flags a member.
- **If you don't reply I'll do:** (a). (rows: T7a-08)

**6. Blocked members, and members leaving the site, inside Catch-ups**
- **What I'd change:** take them out of Catch-up member lists, counts and reminders, the way the feed already leaves them out.
- **What you'd notice:** their names stop showing among a Catch-up's people; a Catch-up's count drops by one when you block someone.
- **If I guess wrong:** with (a), answers people remember reading disappear from old Editions.
- **Options:** (a) hide them everywhere in Catch-ups, old Editions included; (b) hide them from lists, counts and reminders, and leave Editions already sent exactly as they were read.
- **If you don't reply I'll do:** (b). (rows: T2a-13, T2b-05)

**7. A photo ticked into the Collection from a post**
- **What I'd change:** everywhere else the Collection keeps the full-size original, but a photo added with the "Also add to the Collection" tick only gets the post's smaller copy (1,920 pixels across). I'd make the tick keep the full-size original too.
- **What you'd notice:** nothing, except that posting with the tick takes a moment longer on big photos.
- **If I guess wrong:** a bigger change to posting than you wanted for a small tick, and more storage.
- **Options:** (a) keep the full-size original, like every other way into the Collection; (b) keep the smaller copy, and say so in small print under the tick.
- **If you don't reply I'll do:** (a), since the Collection keeps originals everywhere else. The audit's own default was (b); I changed it. (rows: V-T4a-A, which rides on T4a-01)

**8. A supporter with a profile photo picks a bird**
- **What I'd change:** tell them on the bird picker, before they choose, that their photo shows in place of a bird and their bird appears the moment they remove the photo.
- **What you'd notice:** one sentence on the bird picker, only for members with a photo.
- **If I guess wrong:** you wanted the paid bird to win over the photo.
- **Options:** (a) photo wins, and we say so first; (b) a paid pick replaces the photo everywhere.
- **If you don't reply I'll do:** (a). (rows: T8a-16)

**9. How a Catch-up's closing time is written**
- **What I'd change:** today "Answers close Sunday" means answering is already shut by 7 am Sunday India time (Saturday evening in America). I'd name the last full day, "Last day to answer: Saturday", with "closes 7 am Sunday, India time" in small print, and make the last reminder match.
- **What you'd notice:** the deadline line reads differently on every Catch-up and in its reminders.
- **If I guess wrong:** the new wording reads oddly to you.
- **Options:** (a) the last full day, with the hour in small print; (b) just the hour ("closes 7 am Sunday, India time"); (c) move the close to the end of the named day instead.
- **If you don't reply I'll do:** (a). (rows: T7b-15)

**10. What the analytics tool reads when someone clicks**
- **What I'd change:** PostHog records the text and link of whatever a member clicks, including other members' names, email addresses and phone numbers. Stop it reading anything that shows a person.
- **What you'd notice:** click reports in PostHog lose those labels; everything else stays.
- **If I guess wrong:** you lose click detail you use.
- **Options:** (a) hide anything showing a person; (b) hide all text; (c) leave it.
- **If you don't reply I'll do:** (a). (rows: T7b-22, T7b-21)

**11. Inviting someone to a Catch-up by link**
- **What I'd change:** bring back "Copy invite link" for Keepers of a people Catch-up. It lost its only button in the September rebuild; links sent before then still work.
- **What you'd notice:** a "Copy invite link" row in a Catch-up's People section, for Keepers only.
- **If I guess wrong:** you removed it on purpose.
- **Options:** (a) bring it back; (b) it was on purpose, so switch joining by link off altogether.
- **If you don't reply I'll do:** (a). (rows: T3-17)

**12. Your test account Jerry is an admin on the live site**
- **What I'd change:** keep Jerry's admin role so the automated checks still work, but leave Jerry out of admin notifications and admin lists.
- **What you'd notice:** Jerry no longer shows among the admins, and members' messages stop ringing Jerry's bell.
- **If I guess wrong:** you wanted Jerry to be a plain member.
- **Options:** (a) keep admin, hide Jerry from admin notifications and lists; (b) make Jerry a plain member.
- **If you don't reply I'll do:** (a). (rows: L10-05)

**13. When a new signup joins their batch's Catch-up**
- **What I'd change:** keep adding a new member to their batch's Catch-up when they sign up, but nobody can use its controls (send it out early, give everyone longer, remove a question, open answering) until they have confirmed their email.
- **What you'd notice:** nothing, for confirmed members. An unconfirmed one pressing a control is asked to confirm first.
- **If I guess wrong:** you wanted unconfirmed sign-ups kept out of batch Catch-ups entirely; under (a) they can still read theirs.
- **Options:** (a) controls wait for a confirmed email; (b) also wait to add them to the batch's Catch-up until they confirm; (c) wait to add them until they are verified (office list or you).
- **If you don't reply I'll do:** (a). The controls fix ships whichever you pick. (rows: L10-01)

**14. Backups keep forever what a member erased**
- **What I'd change:** the photo backup never deletes anything, and the database keeps the copy from the 1st of every month forever, so an erased member lives on in both. I'd have the photo backup delete what the live site deleted, 30 days later; keep the monthly database copies for 3 months, not forever; stop backing up photos members started uploading but never added, and delete the 330 of those already in the backup (full-size phone photos, GPS location included); and say on the privacy page that backups hold erased data for up to 3 months.
- **What you'd notice:** one sentence on the privacy page.
- **If I guess wrong:** a photo deleted by mistake can't be recovered after 30 days, and a database problem older than 3 months can't be rolled back.
- **Options:** (a) as above; (b) keep backups forever and say so on the privacy page; (c) leave it as it is, unstated.
- **If you don't reply I'll do:** (a). (rows: L11-02)

**15. "Close and send it out" before anyone has answered**
- **What I'd change:** if a Keeper presses it when nobody has answered yet, say "Nobody has answered yet" and offer "Give everyone 3 more days". Today it quietly moves the deadline earlier, and a second press sends an empty Edition to everyone.
- **What you'd notice:** a different message on that one press; nothing else.
- **If I guess wrong:** a Keeper who really wanted to send out an empty Edition can't.
- **Options:** (a) refuse and offer more time; (b) send the empty Edition at once; (c) keep today's behaviour, but say what it did.
- **If you don't reply I'll do:** (a). (rows: C3-01)

**16. Someone a Keeper removed, using an old invite link**
- **What I'd change:** someone a Keeper removed from a Catch-up can't rejoin with an old invite link; only a Keeper can add them back. And the link stops being tucked inside every member's copy of the page; only Keepers get it.
- **What you'd notice:** nothing, unless someone tries it.
- **If I guess wrong:** a removal meant as temporary needs a Keeper to undo it.
- **Options:** (a) a removal sticks; (b) links always work, as today.
- **If you don't reply I'll do:** (a). (rows: L12-09)

**17. Editing a letter that is already published**
- **What I'd change:** "Edit" on a published letter opens a small box that, for most letters, is taller than the screen, so Save can't be reached. Every pop-up box in the site will fit the screen and scroll; that ships regardless. The question is whether editing a published letter should open the full letter desk instead, the page drafts are written on.
- **What you'd notice:** with (a), editing a letter looks like writing one; with (b), the box scrolls and Save is always reachable.
- **If I guess wrong:** you preferred the quick box for small corrections, or the reverse.
- **Options:** (a) open the full desk; (b) keep the box, made to fit and scroll.
- **If you don't reply I'll do:** (b) now, since it's the smaller change; (a) later if you want it. (rows: T8b-17)

**18. The entry question's answers are public**
- **What I'd change:** move the entry questions and their answers out of the code, which anyone can read on GitHub, into the database, where your admin trivia room can edit them (I'll add the editing if it can't yet), and make the dinner question need a real dish rather than any word containing "egg". The current questions stay in GitHub's history for good, so the gate only truly holds once you write fresh ones there.
- **What you'd notice:** nothing at signup at first; later, your new questions.
- **If I guess wrong:** you spend time on a gate you think of as a courtesy.
- **Options:** (a) move them out, tighten "egg", and you write fresh questions when you can; (b) treat the gate as a speed bump: keep it as it is, and change the privacy page's "to no one else" to say what really keeps strangers out (confirming an email, and the office list); (c) make the repository private again (the old answers are still out there).
- **If you don't reply I'll do:** (a). (rows: C5-03)

**19. Verifying a new member from the office list by name**
- **What I'd change:** verify someone automatically only when their signup email is on the school's office list. A match on name and batch year alone goes to your verify queue with the office-list entry beside it, and is refused outright if another account has already claimed that person.
- **What you'd notice:** a few more people in your verify queue: those who signed up with a different email from the one the school has. Members already verified stay verified; I'll list the ones verified by name alone so you can glance over them.
- **If I guess wrong:** you verify more people by hand.
- **Options:** (a) email match automatic, name match comes to you; (b) both stay automatic, but a second account claiming the same person is refused; (c) leave it as it is.
- **If you don't reply I'll do:** (a). Today anyone with any working mailbox who copies a real classmate's name and year off the directory is verified as them; about 66 of today's members were verified by name and year alone. (rows: O-08)

**20. What a moderator's removal does to photos, and to Catch-up answers**
- **What I'd change:** when you hide a post, also delete its photos from storage, so a photo posted without someone's consent really goes; today the words go and the photo stays at its address. And add "Remove answer" for admins on Catch-up answers, doing the same to an answer, its photos and its recording; today only the author can take one down.
- **What you'd notice:** a "Remove answer" button in the admin Catch-ups reading room.
- **If I guess wrong:** a post hidden by mistake can't get its photos back (there is no un-hide button today anyway).
- **Options:** (a) both; (b) only "Remove answer"; hiding a post keeps its photos, as today; (c) neither.
- **If you don't reply I'll do:** (a). The three posts already hidden keep their photos unless you add "and delete the three". (rows: C8-02, C8-03)

**21. When someone leaves, what goes with them**
- **What I'd change:** one rule for anyone who leaves a Catch-up, is removed from one, moves batch, or is erased: what nobody has read yet goes with them, and what was already sent out stays. So their answers and questions in a round not yet sent out are deleted rather than published after they've gone; an erased member's questions that nobody answered go too (answered ones stay, without their name, and the privacy page says so); and everyone's notifications pointing at an erased member's posts, messages or profile are cleared, instead of leading to "not found" for a month.
- **What you'd notice:** nothing day to day.
- **If I guess wrong:** a removed member's last answers are missing from that round's Edition.
- **Options:** (a) this rule; (b) keep today's behaviour, and only fix the privacy page's wording.
- **If you don't reply I'll do:** (a). (rows: C8-04, C8-08, T7a-04, C8-09)

**22. A member waiting out the 60 days before their account is deleted**
- **What I'd change:** their profile disappears the moment they ask, but their posts, letters and comments stay up under a name that leads to "not found". Hide their writing for those 60 days too, the way a blocked member's is hidden; it all comes back if they sign in and cancel.
- **What you'd notice:** nothing, unless someone asks to leave.
- **If I guess wrong:** a leaving member's posts vanish two months earlier than you expected.
- **Options:** (a) hide their writing with them; (b) keep their writing up, but show their name without a link.
- **If you don't reply I'll do:** (a). It matches what you decided for blocked members. (rows: L10-02)

**23. Class photos after a member corrects their batch year**
- **What I'd change:** when a member fixes their batch year, the Class Collection photos they added move with them to their real class.
- **What you'd notice:** nothing, unless someone corrects their year after adding class photos.
- **If I guess wrong:** if those photos really were of the class they first claimed, that class loses them.
- **Options:** (a) move them; (b) leave them, but let the member still find their own photos there to delete them.
- **If you don't reply I'll do:** (a). (rows: C8-05)

**24. What "Download your data" includes**
- **What I'd change:** add everything the site keeps about a member that the file leaves out today: hearts on photos and Catch-up answers, bookmarks, poll votes, profession tags, notifications, and the record of their visits, searches and pages opened.
- **What you'd notice:** the downloaded file is longer.
- **If I guess wrong:** members see how much the site records about their visits.
- **Options:** (a) everything; (b) everything they made or chose, but leave out the visit, search and page records, and say so on the privacy page.
- **If you don't reply I'll do:** (a). The privacy page promises "a copy of your data". (rows: T6-03)

**25. Links to the privacy policy on the front page**
- **What I'd change:** the public front page links to no policy at all. Add Privacy, Terms and Guidelines somewhere quiet.
- **What you'd notice:** a small line of links on the front page.
- **If I guess wrong:** text on your front page you didn't want.
- **Options:** (a) a quiet line under the two buttons; (b) a thin strip at the very bottom; (c) leave the front page alone; the signup page already links all three.
- **If you don't reply I'll do:** build (a) and (b) where you can see them, show you both at the end, and leave the live front page untouched until you pick. (rows: T8b-09)

**26. Deleted photos stay viewable through the site's image address for up to a year**
- **What I'd change:** when a photo is deleted (a post removed, an account erased, an avatar replaced), also tell Vercel to throw away its resized copies. That needs a Vercel access key saved in the site's settings, which only you can create; I'll write the steps.
- **What you'd notice:** nothing. Until the key is added, the site behaves as it does today.
- **If I guess wrong:** nothing breaks.
- **Options:** (a) you add a key and the site uses it; (b) instead have Vercel keep its copies for a few hours rather than a year, which spends more of the free plan's 5,000 monthly image allowance, already the tightest; (c) leave it.
- **If you don't reply I'll do:** (a): the code now, the steps for the key in my closing report. (rows: C8-01)

**27. How often an open tab tells the server "still here"**
- **What I'd change:** every open tab pings the server once a minute so your analytics knows who is on the site, and those pings are a steady share of the free plan's 4 hours of server time a month. Make it every 2 minutes.
- **What you'd notice:** "On the site now" in your analytics takes up to 2 minutes longer to notice that someone has left.
- **If I guess wrong:** your live view feels slower.
- **Options:** (a) every 2 minutes; (b) every 3 minutes; (c) keep every minute.
- **If you don't reply I'll do:** (a). (rows: L5-01)

**28. Small changes to the live database**
- **What I'd change:** several fixes need small database changes: a few new fields, speed-ups for some slow lookups, one rule so a report can outlive its reporter, re-pointing 22 old notifications at the page that replaced theirs, and deleting one blank answer left over from August that nobody can see. Each is written down in a dated file first, as usual, and applied to the live site and the demo.
- **What you'd notice:** nothing.
- **If I guess wrong:** a change could slow or break a page until put right. Each is tested first, and none removes a table or column.
- **Options:** (a) apply them as the fixes need them, adding only; (b) collect them all and wait for your go at the end (the fixes that need them wait too).
- **If you don't reply I'll do:** (a). Anything that would remove a table or column, or delete what a member wrote, waits for you regardless. (rows: T7a-01, T7b-03, T2b-12, O-08, C6-02, C8-03, and the index rows in phases B and L)

**29. Putting the fixes live**
- **What I'd change:** nothing reaches rishivalley.space until it is pushed, and a push is a deploy. Phases A and B close two live holes: a stranger can be verified as a real classmate, and login cookies reach Sentry.
- **What you'd notice:** with (a) or (b), fixes appear on the site during the campaign instead of all at once when you push.
- **If I guess wrong:** a fix that passed every check misbehaves live while you are away. Each push also trips up anyone with the site open at that moment until they reload (a fix in this campaign softens that).
- **Options:** (a) push after each phase passes every check; (b) push phases A and B as soon as they pass, hold the rest for you; (c) hold everything for you to push.
- **If you don't reply I'll do:** (c).

### Things only the owner can do (no answer needed; they block nothing)

- **A. Sentry → Settings → Security & Privacy:** check that "Data Scrubber" and "Use Default Scrubbers" are on, and search stored issues for `authjs`. If a login cookie was stored, changing the site's sign-in secret signs everyone out; that is your call. (T8b-14)
- **B. Vercel → Usage, once a week:** Active CPU and Image Transformations, the free plan's tight lines. Vercel emails at 75%. (L5-01, L5-11, C5-01)
- **C. Vercel's free plan is for non-commercial use,** and the site takes contributions on /support. Your call whether that matters.
- **D. Vercel → Firewall:** add the one rate-limit rule the free plan allows, on production and on the demo. The closing report will spell out the exact rule. (L8-04, L5-02, C5-01)
- **E. Supabase → Organization → Usage → Egress:** this month's reading. Optional: a Supabase access key in GitHub's secrets would let the nightly job read it itself. (L5-07)
- **F. Sentry → Spike Protection:** on. (T5-10, T8b-18)
- **G. Cloudflare → R2:** a lifecycle rule that deletes `staging/` after a day; and check the site's R2 keys reach only the live bucket, not the backup. (T4a-03)
- **H. Resend → Webhooks:** also send `email.failed` and `email.suppressed`. (L11-05)
- **I. The demo:** confirm `.env.demo` holds no R2 keys; consider pausing the demo's Vercel project, which has not built since 7 August but still runs two jobs a day on the same allowances. (T4a-06, L8-04)
- **J. Move `sanan's stuff/` out of the project folder:** it holds a plain-text recovery-codes file every session working here can read.
- **K. Supabase → Database → Pooler:** the pool size, which the audit could not read. (L5)
- **L. Optional:** a contact address that is not your own sign-in email, for the policy pages. (C5-02)

## Owner answers

(none yet)

## The order to work in

### Phase A — Trust: who counts as verified, and who may press what in a Catch-up

Live today: start here. O-08 first (`src/lib/roster.ts`, its own unit): until Q19 is answered take its default, which is the safe one: auto-verify on an email match only, a name match goes to the admin queue, and an already-claimed roster person is refused. Then the Catch-up rows, all in `src/app/(main)/catchups/actions.ts` and `src/lib/catchups-core.ts`, so one worker, in sequence. L10-01's verb gates ship without waiting for Q13 (Q13 decides only when an account joins). Pin: a test that every `allowBatch: true` caller also calls `requireVerifiedMember`. `write-path-reviewer` on the diff.

- **High and Medium** (full entries in the report §8): L10-01 (High), O-08 (High), C3-01, L12-09, T3-06
- **Low** (the report's Low table): L1-02, L1-03, L12-03, T2a-08, T2a-09, T2a-10, T2b-06, T2b-09, T2b-11, T3-15, T7a-07, V-T2-02

### Phase B — Privacy: what leaves the site, and what outlives a member

T8b-14 first (one `beforeSend`; the entry names the trap: do not set `dataCollection` alone). The privacy page rows (T8b-06, L11-02, C4-04) are one edit, after Q14. T7a-01 waits on Q1, T7b-22/T7b-21 on Q10. `write-path-reviewer` on anything touching the purge.

- **High and Medium** (full entries in the report §8): T8b-14 (High), C8-01, C8-02, L11-02, T6-03, T7a-01, T7a-02, T7a-04, T7b-22, T8b-06
- **Low** (the report's Low table): C4-04, C8-08, L1-04, L10-02, L12-02, L5-09, L5-10, T7a-09, T7a-10, T7a-21, T7b-21, T8a-07, T8a-18, T8b-09, T8b-18, V-L-d-01, V-T7a-02

### Phase O — Budgets: what one account or one script may spend of what everyone shares

One design first (O-09's fix direction: a per-account daily budget helper beside `rateLimit`, per-recipient caps in `enqueueMail`, a read meter plus caching for the shared cross-user reads, retention sized to each cap), reviewed before any instance is closed; then apply it instance by instance. C5-01 (one config line: it closes the cheapest way to spend Hobby's 5,000 monthly image transformations) and check D (the firewall rule) ship at once, ahead of the design. Three instances live in G because they share files with rows there (C4-01 with the trivia gate; C5-02 and C6-01 with the mail queue): the design step here must land before G applies it. Otherwise independent. Run it before signups are opened wider.

- **High and Medium** (full entries in the report §8): C5-01 (High), L8-04 (High), C6-02, C6-03, C6-04, C6-05, L5-02, L5-11, O-09, T2a-03, T2b-02
- **Low** (the report's Low table): C3-02

### Phase E — The Collection

The three Highs first. T4a-01 + V-T1-02 + T1-18 + V-T4a-A are one unit in `src/lib/collection-intake.ts` (Q7 decides only the copy on the tick). T4a-03's in-app cleanup ships regardless of the R2 rule (check G).

- **High and Medium** (full entries in the report §8): T4a-01 (High), T4b-01 (High), T4b-03 (High), T4a-02, T4a-03, T4b-04, T4b-05, T4b-06, T4b-07
- **Low** (the report's Low table): C1-04, C7a-01, C8-05, T1-18, T4a-04, T4a-06, T4a-07, T4a-11, T4a-12, T4a-13, T4a-14, T4b-09, T4b-10, T4b-12, T4b-13, T7a-20, V-T1-02, V-T4-01

### Phase F — Letters, the feed and the composer

T8b-01 + T8b-17 + T4b-02 are the Dialog primitive (`src/components/ui/dialog.tsx`): every dialog in the app moves, so screenshot several, desktop and 390x844, and run `npm run visual`. Q17 is optional; the scrollable dialog ships without it. The letter-desk rows (T1-02, T1-03, T1-23, V-T1-01) share `use-letter-persistence.ts`.

- **High and Medium** (full entries in the report §8): T8b-01 (High), T8b-17 (High), L12-01, L6-05, T1-01, T1-02, T1-03, T1-23
- **Low** (the report's Low table): C7a-02, C8-07, O-01, T1-06, T1-07, T1-08, T1-10, T1-11, T1-13, T1-14, T1-15, T1-16, T1-19, T1-24, T1-25, T3-10, V-T1-01, V-T3-01

### Phase D — Alarms: the owner hears about every failure

L4-08 is the class: decide the one "report, don't just log" helper first, then apply it row by row. O-05 (dev-queued mail sent by production) needs a guard at enqueue outside production; the entry names the smaller fix. L11-05 is half owner action (check H).

- **High and Medium** (full entries in the report §8): L11-05, L4-02, L4-03, L4-06, L4-08, O-05, T2a-04, T5-02, T5-03, T5-10
- **Low** (the report's Low table): C2-01, L11-03, L11-04, L4-05, L4-07, L5-06, L8-02, T2a-14, T2b-07, T5-13, T5-16, V-L-b-01, VT7b-01

### Phase C — When something fails, the member sees the truth and can recover

Run after D or with the same worker (both touch `src/lib/report-error.ts` and the error boundaries). T8b-15 + O-03's residual (L2-03, T1-09, T8a-12) are one change; L7-03 + T9-04 + T8b-07 are one change. L8-06 is half owner switch (check C), half code.

- **High and Medium** (full entries in the report §8): L2-03, L2-06, L7-01, L7-03, L8-06, T5-06, T8a-12, T8b-02, T8b-15, T9-04
- **Low** (the report's Low table): L7-06, O-04, T1-09, T6-08, T8b-07, T8b-08, T8b-11, T8b-12, T8b-19, V-T1-03

### Phase G — Sign-up, sign-in and the confirmation mail

C4-01 and C5-03 (the trivia gate) touch code a peer session may still be building: check `git log` on `src/lib/trivia-log.ts`, `trivia-bank.ts` and `trivia-actions.ts` first; C5-03 waits on Q18. C4-01, C5-02 and C6-01 are O-09 instances: apply the budget helper from phase O, so its design step comes first. C4-02 + C4-03 + T5-13 + C5-02 + C6-01 + C5-04 + C5-05 are the confirmation-mail queue: one worker, and read `work/reports/C5.md`'s state-machine table before changing it. T5-01 waits on Q3; T5-14 on Q4.

- **High and Medium** (full entries in the report §8): C4-01, C4-02, C5-02, C5-03, C6-01, L7-02, T5-01, T5-04, T5-05, T5-07, T5-09
- **Low** (the report's Low table): C4-03, C5-04, C5-05, C7b-01, C7b-02, C7b-03, L10-03, L6-07, T5-08, T5-11, T5-12, T5-14, T6-06

### Phase H — Catch-ups: answering, reading, and the words on the clock

After A (same actions file). L7-09 (voice recorder) needs a microphone to verify; test on a throwaway Catch-up you create, never a live one. T2a-07 waits on Q2, T7b-15 on Q9, T3-17 on Q11, T2a-13/T2b-05 on Q6.

- **High and Medium** (full entries in the report §8): L3-02, L4-01, L7-09, T2a-02, T2a-07, T3-04, T3-05, T3-11, T3-17, T3-18, T3-19, T7b-15
- **Low** (the report's Low table): C7a-04, C8-04, L2-04, L3-03, T2a-11, T2a-13, T2b-03, T2b-04, T2b-05, T2b-08, T2b-10, T2b-12, T2b-13, T3-08, T3-09, T3-12, T3-14, T3-21, T3-22, T3-23, T3-24, T7b-03

### Phase J — Support and payments

Payments: test against Razorpay test mode only. L1-01 and T8a-02 are webhook ordering bugs; the entries say which needs a row lock. T8a-16 waits on Q8.

- **High and Medium** (full entries in the report §8): L1-01, L4-04, T8a-02, T8a-11, T8a-15, T8a-16
- **Low** (the report's Low table): T8a-04, T8a-05, T8a-06, T8a-13, V-T8-01

### Phase I — Admin, moderation and the analytics room

Mostly admin-only surfaces: visible to the owner, not members. T7a-06 + T6-01 (duplicate) together. T7a-08 waits on Q5, L10-05 on Q12.

- **High and Medium** (full entries in the report §8): C8-03, T7a-03, T7a-06, T7b-02, T7b-13
- **Low** (the report's Low table): C1-07, C7b-04, C7b-05, C7b-06, C7b-07, C8-06, C8-09, L10-05, L10-06, L12-04, L12-05, T6-05, T7a-05, T7a-08, T7a-11, T7a-12, T7a-13, T7a-14, T7a-15, T7a-16, T7a-17, T7a-19, T7a-23, T7b-01, T7b-04, T7b-05, T7b-06, T7b-07, T7b-08, T7b-09, T7b-11, T7b-14, T7b-16, T7b-17, T7b-18, T7b-19, T7b-20, T8a-01, T8a-14, V-L-a-01, V-T7a-01

### Phase K — Text that breaks things: names, numbers, search, links

One sanitising pass: V-O-B (bidi) + L6-02 are one strip applied at every sink; O-06 strips U+0000 in `escapeLike` (all seven search callers use it); V-O-C + T6-09 are the phone trunk zero.

- **High and Medium** (full entries in the report §8): C7a-03, T6-04
- **Low** (the report's Low table): L10-04, L12-07, L6-02, L6-03, L6-04, L6-06, L6-08, L6-09, L7-08, O-06, T6-07, T6-09, T6-10, T6-11, T6-12, T6-13, T6-14, T6-15, T8b-21

### Phase L — Platform, database, demo and scripts

L5-01 first: it is the first ceiling now that production is on Hobby (owner, 2026-10-23): cut CPU where it is cheap (the beacon's interval, the proxy's matcher) and keep the weekly look of check B. L5-07 is OWNER-DEFERRED (platform-health handover item 14, 2026-10-08: revisit before about 1,000 members); do only its egress-reading-in-the-snapshot half. Index rows go through one dated migration file in `prisma/migrations-manual/`. The scripts rows (C1-*) must not be fixed by running them.

- **High and Medium** (full entries in the report §8): L5-01 (High), L5-07 (High), L5-04
- **Low** (the report's Low table): C1-01, C1-02, C1-03, C1-05, C1-08, L11-06, L11-07, L12-06, L12-08, L3-05, L3-06, L3-07, L5-03, L5-05, L5-08, L8-01, L8-03, L8-08, L9-01, L9-02, L9-03, L9-04, L9-05, L9-06, L9-07, L9-08, L9-09, L9-10, L9-11, T1-17, T1-20, T1-21, T1-22, T7a-18, T7b-10, T8a-08, T8a-09, T8a-10, T8a-17, T8b-10, V-L-c-01, V-T7a-03, VOL1-01

### Phase M — The hoopoe

The hoopoe. Verify on the deployed build or a production build: on localhost React Strict Mode kills the one-shot intro (T9-02, KNOWN, bugs.md #20), so dev screenshots of the auth birds lie.

- **High and Medium** (full entries in the report §8): T9-01, T9-03
- **Low** (the report's Low table): T9-05, T9-06, T9-07, T9-08, T9-09, T9-12, T9-13, T9-14, VT9-01

### Phase N — Feel and truth: presses, taps, comments and docs that lie

Last, one pass. Comment and doc lies are fixed by making the comment true, not by deleting it. L7-04 (press sinks) touches about 50 sites: screenshot a sample.

- **High and Medium** (full entries in the report §8): —
- **Low** (the report's Low table): C2-03, C7b-08, L7-04, L7-05, L7-07, L8-09, L8-10, L9-12, T4a-10, T4b-11, T8b-04, T8b-05, T8b-20, T9-11

## Ledger

One line per row as it lands: `<id> — DONE <sha> | DECLINED (why) | PARKED (why)`. A row's verdict-corrected
evidence stays in `work/`; this ledger is the record of what the campaign did.
