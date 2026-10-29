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

**How a unit lands (2026-10-29, the campaign's own rule).** One worker per unit, units one after
another. Each fix is its own commit: the code, the test that pins it, its ledger line(s) below, and,
on the unit's last commit, the phase's "Rows left" on the board plus one line in `progress.md` and its
entry in `docs/history/progress-2026-10.md` (one per unit, not one per row, as refactor audit 2 did).
`fix-prompt.md`, `progress.md` and the month file are shared by every commit and by the peer session:
before committing, `git diff` them, and if a hunk is not yours, stage only your own hunk
(`git apply --cached` of a trimmed patch) and use a bare `git commit`, never a pathspec, for that one.
A peer session is fixing Collection things in parallel (`55246d6a` closed most of T4b-05): check
`git log` on every cited file before editing it.

## Campaign board

Where the campaign is, in the order the phases run. **This is the resume anchor**: the next session reads
this table and starts at the first phase that is not `DONE`. Update it before you end, in the same commit
as the work. Status is one of `DONE`, `PARTIAL`, `OPEN`, `OWNER-GATED`, `DECLINED`
(`scripts/qa/campaign.test.mjs` fails on anything else). "Blocked on" names only the rows a question holds;
the rest of the phase runs.

| Phase | Status | Rows left | Blocked on |
|---|---|---|---|
| A — Trust: who counts as verified, and who may press what in a Catch-up | OPEN | 16 (1 H, 3 M, 12 L) | — |
| B — Privacy: what leaves the site, and what outlives a member | OPEN | 24 (1 H, 7 M, 16 L) | — |
| O — Budgets: what one account or one script may spend of what everyone shares | OPEN | 12 (2 H, 9 M, 1 L) | — |
| E — The Collection | OPEN | 27 (3 H, 6 M, 18 L) | — |
| F — Letters, the feed and the composer | OPEN | 26 (2 H, 6 M, 18 L) | — |
| D — Alarms: the owner hears about every failure | OPEN | 23 (0 H, 10 M, 13 L) | — |
| C — When something fails, the member sees the truth and can recover | OPEN | 20 (0 H, 10 M, 10 L) | — |
| G — Sign-up, sign-in and the confirmation mail | OPEN | 23 (0 H, 10 M, 13 L) | — |
| H — Catch-ups: answering, reading, and the words on the clock | OPEN | 34 (0 H, 12 M, 22 L) | — |
| J — Support and payments | OPEN | 11 (0 H, 6 M, 5 L) | — |
| I — Admin, moderation and the analytics room | OPEN | 43 (0 H, 3 M, 40 L) | — |
| K — Text that breaks things: names, numbers, search, links | OPEN | 21 (0 H, 2 M, 19 L) | — |
| L — Platform, database, demo and scripts | OPEN | 46 (2 H, 1 M, 43 L) | — |
| M — The hoopoe | OPEN | 11 (0 H, 2 M, 9 L) | — |
| N — Feel and truth: presses, taps, comments and docs that lie | OPEN | 14 (0 H, 0 M, 14 L) | — |

## Owner questions

Asked 2026-10-29, at the start of the fix campaign, and rewritten the same evening in the shape the
owner asked for: what happens now, what the problem is, then the change. Q1 to Q19 are the audit's own
(report §3.1); the numbering is kept so the board's "Blocked on" column still reads. Q20 to Q27 are
decisions that were sitting inside the findings themselves (fifteen raw ones, merged into eight);
Q28 and Q29 are about how the campaign runs. Every question ends with the default the campaign takes
if the owner replies "go with your defaults".

**1. Reports a member filed, after that member leaves**
- **What happens now:** if a member reports someone and later deletes their account (or you delete it, or merge it into another), every report they filed is deleted with them. A merge also deletes the reports filed *against* the duplicate account.
- **The problem:** a report can vanish from your queue before you've read it, and a harasser's "reported N times" count shrinks. The privacy page promises the opposite: reports that were part of moderation outlive deletion.
- **What I'd change:** keep the reports, shown as "filed by a member who has since left"; a merge moves them onto the surviving account.
- **What you'd notice:** old reports stay on the admin Reports page.
- **If I guess wrong:** reports you'd rather lose stay in your list until you settle them.
- **Options:** (a) keep them; (b) keep deleting them, and change the privacy page to say so. **Default: (a).** (rows: T7a-01)

**2. Ending a Catch-up mid-round**
- **What happens now:** a Keeper can end a people Catch-up at any moment, including while a round is collecting questions or taking answers. The round is left frozen where it was.
- **The problem:** that week's answers can never be read by anyone. The round is never sent out, its page says "not yet published" for ever, and only each writer can still find their own words in their data download. The End button's warning doesn't mention this. (Batch Catch-ups can't be ended, so only people Catch-ups are affected.)
- **What I'd change:** ending mid-round first sends out whatever has been written as a final Edition, then ends.
- **What you'd notice:** ending a Catch-up mid-round sends one last Edition.
- **If I guess wrong:** a Keeper who meant "cancel" sends out a half-finished Edition.
- **Options:** (a) send out what's there, then end; (b) don't allow ending until the round is over; (c) allow it, but warn plainly that the week's answers will be lost. **Default: (a).** (rows: T2a-07)

**3. Changing your sign-in email and password**
- **What happens now:** a member can't change their sign-in email from inside the site, and can only change their password through "Forgot password" on the sign-in page. The email row in their contact details looks as if it changes the sign-in email, but it only changes the address other members see, and says "Saved". The one exception: if a confirmation email bounces, the member is offered "Use another email".
- **The problem:** someone who mistypes their email at signup, where the typo doesn't bounce (it reaches a stranger's real inbox, or is silently dropped), can never confirm their account. Resending goes to the same wrong address, your admin "Retry" goes there too, and the site's advice ("check the email address on your profile") points at the row that doesn't change it. Their only ways out are writing to you, or you deleting the account so they can sign up again.
- **What I'd change:** add "Change sign-in email" (a link goes to the new address) and "Change password" (asks for the current one) to a member's own profile page, beside "Delete my account". Whatever you pick, you also get a button on a person's admin page to correct their sign-in email for them, and the misleading advice is fixed.
- **What you'd notice:** two new rows on your profile page.
- **If I guess wrong:** two controls you didn't want.
- **Options:** (a) both; (b) email only; (c) neither: you fix emails from the admin page. **Default: (a).** (rows: T5-01, T6-06)

**4. A blocked member trying to sign in**
- **What happens now:** a blocked member who tries to sign in is told their email or password is wrong. If they press "Forgot password", the site says a reset link is on its way, but none is ever sent.
- **The problem:** they go round in a loop (wrong password, reset, no email, try again) with nothing telling them to contact a person, so it looks like the site is broken.
- **What I'd change:** tell them plainly at sign-in: "This account is paused. Write to us at" the contact address.
- **What you'd notice:** nothing, unless you block someone.
- **If I guess wrong:** a blocked member learns they were blocked.
- **Options:** (a) say it plainly; (b) keep "wrong password", but stop the reset page promising an email that never comes. **Default: (a).** (rows: T5-14)

**5. The "Flagged" label in the admin**
- **What happens now:** the admin People list has a "Flagged" filter, a "Flagged" label, a count in the side rail and a work queue for flagged members. Nothing anywhere in the site can mark a member as flagged.
- **The problem:** the queue is always empty and the filter finds nobody, so it looks like a safety tool that's working when it's actually switched off.
- **What I'd change:** remove it, and show "reported N times" on a person's admin page instead, which is a real number.
- **What you'd notice:** the Flagged filter and label leave admin People.
- **If I guess wrong:** you lose a label you meant to build later.
- **Options:** (a) remove it; (b) build it: a button that flags a member. **Default: (a).** (rows: T7a-08)

**6. Blocked and leaving members inside Catch-ups**
- **What happens now:** when you block a member, or a member asks to delete their account, the feed and the directory hide them at once, but Catch-ups don't. They stay listed among a Catch-up's people, count toward the batch's numbers, keep getting daily reminders, and their answers, hearts and votes stay visible in Editions, while their comments on the same page are hidden.
- **The problem:** Catch-ups disagree with the rest of the site about who's still here, and the same Edition half-hides a blocked person.
- **What I'd change:** take blocked and leaving members out of Catch-up member lists, counts and reminders.
- **What you'd notice:** their names stop appearing among a Catch-up's people; a Catch-up's count drops by one when you block someone.
- **If I guess wrong:** with (a), answers people remember reading disappear from old Editions.
- **Options:** (a) hide them everywhere in Catch-ups, old Editions included; (b) hide them from lists, counts and reminders, and leave Editions already sent exactly as people read them. **Default: (b).** (rows: T2a-13, T2b-05)

**7. The "Also add to the Collection" tick on a post**
- **What happens now:** when you post a photo with the tick on, the Collection gets a copy of the post's photo, which the site has already shrunk to 1,920 pixels across. (Separately, the tick does nothing at all for you right now, because it counts your 1,740 class photos against a member's limit; that is being fixed regardless.)
- **The problem:** everywhere else the Collection keeps the full-size original, so photos that come in through the tick are permanently smaller than the rest, and the original can't be recovered later.
- **What I'd change:** make the tick keep the full-size original too.
- **What you'd notice:** posting with the tick takes a moment longer on big photos.
- **If I guess wrong:** a bigger change to posting than you wanted, and more storage.
- **Options:** (a) keep the full-size original; (b) keep the smaller copy, and say so in small print under the tick. **Default: (a).** The audit's own default was (b); I changed it because the Collection keeps originals everywhere else. (rows: V-T4a-A, which rides on T4a-01)

**8. A supporter with a profile photo picks a bird**
- **What happens now:** after contributing, a supporter picks a bird to wear ("This becomes your avatar everywhere on the site"). If they have a profile photo, the photo always shows instead of the bird. The pick is used up anyway, and picking again takes another contribution.
- **The problem:** someone who paid and picked a bird never sees it anywhere, and nothing tells them it only appears once they remove their photo. Nobody has hit this yet.
- **What I'd change:** tell them on the bird picker, before they choose, that their photo shows in place of the bird until they remove it.
- **What you'd notice:** one sentence on the bird picker, only for members with a photo.
- **If I guess wrong:** you wanted the paid bird to win over the photo.
- **Options:** (a) photo wins, said up front; (b) a paid bird replaces the photo everywhere. **Default: (a).** (rows: T8a-16)

**9. How a Catch-up's closing time is written**
- **What happens now:** a Catch-up says "Answers close Sunday 25 October", but answering actually shuts at 7 am that Sunday, India time, which is Saturday evening in America. The last reminder, sent the day before, always says "Answers close tomorrow", and it stays in the notification list after the round has closed.
- **The problem:** the day named is a day on which nobody can answer. A member who plans to answer "on Sunday" finds it already shut.
- **What I'd change:** name the last full day ("Last day to answer: Saturday", with "closes 7 am Sunday, India time" in small print), make the reminder say the same, and clear old reminders once a round closes.
- **What you'd notice:** new deadline wording on every Catch-up and in its reminders.
- **If I guess wrong:** the wording reads oddly to you.
- **Options:** (a) the last full day, with the hour in small print; (b) just the hour ("closes 7 am Sunday, India time"); (c) keep "Sunday" and move the real close to the end of Sunday. **Default: (a).** (rows: T7b-15)

**10. What PostHog records from clicks**
- **What happens now:** PostHog, the analytics tool, records the text of whatever a member clicks: names on directory cards, post and letter titles. When someone taps a classmate's email or phone link, it records the address or number itself, under the tapper's identity. Signing out doesn't end PostHog's memory of who was using that browser.
- **The problem:** classmates agreed to show their contact details to members, not to an outside company, and the privacy page says no names, emails or phone numbers are sent. On a shared computer, the next person's browsing is filed under the previous member.
- **What I'd change:** stop PostHog reading anything that shows a person, and end its identity at sign-out.
- **What you'd notice:** click reports in PostHog lose those labels.
- **If I guess wrong:** you lose click detail you use.
- **Options:** (a) hide anything showing a person; (b) hide all text; (c) leave it. **Default: (a).** (rows: T7b-22, T7b-21)

**11. Inviting someone to a Catch-up by link**
- **What happens now:** every new people Catch-up still gets an invite link, and the join-by-link page still works, but since the September rebuild there is no button anywhere for a Keeper to copy the link.
- **The problem:** a Keeper can only add people who already have accounts; a friend who hasn't signed up yet can't be brought in.
- **What I'd change:** bring back "Copy invite link" for Keepers of people Catch-ups.
- **What you'd notice:** a "Copy invite link" row in a Catch-up's People section, for Keepers only.
- **If I guess wrong:** you removed it on purpose.
- **Options:** (a) bring it back; (b) it was on purpose, so switch joining by link off altogether. **Default: (a).** (rows: T3-17)

**12. Your test account Jerry is an admin on the live site**
- **What happens now:** Jerry Maguire, the test account, is an admin on the real site. Members' messages to the admins ring Jerry's bell, Jerry is listed among the admins, and every automated screenshot and visual check has only ever seen the site the way an admin sees it.
- **The problem:** real members' messages land in a test account, and the checks never see what an ordinary member sees.
- **What I'd change:** keep Jerry's admin role (some checks need it), but leave Jerry out of admin notifications and admin lists.
- **What you'd notice:** Jerry leaves the admin list, and members' messages stop ringing Jerry.
- **If I guess wrong:** you wanted Jerry to be a plain member.
- **Options:** (a) keep admin, hide Jerry from admin notifications and lists; (b) make Jerry a plain member. **Default: (a).** (rows: L10-05)

**13. New signups and their batch's Catch-up**
- **What happens now:** signing up with a batch year puts the new account straight into that batch's Catch-up, before they've confirmed their email. From there they can read the class's member list and every Edition, and once a classmate starts a round, use its controls: send the Edition out early to everyone, give everyone more time (with no limit), open answering, or remove questions. None of those controls checks whether the person confirmed their email. At the audit's count, 54 unconfirmed accounts sat in 20 batch Catch-ups.
- **The problem:** someone who signed up with a made-up email and a claimed batch year can read a real class's Catch-up and disrupt it.
- **What I'd change:** nobody can use a Catch-up's controls until they've confirmed their email; that ships whichever option you pick. The question is when a new signup joins their batch's Catch-up at all.
- **What you'd notice:** nothing, for confirmed members. An unconfirmed one pressing a control is asked to confirm first.
- **If I guess wrong:** with (a), unconfirmed signups can still read their batch's Catch-up. With (b) or (c), a real new member waits to see their class's Catch-up until their confirmation email arrives, which on a busy signup day can be the next morning.
- **Options:** (a) join at signup as today, controls wait for a confirmed email; (b) join once they confirm their email; (c) join once they're verified (office list or you). **Default: (a).** (rows: L10-01)

**14. Backups keep for ever what a member erased**
- **What happens now:** there are two backups. The photo backup copies every new photo each night and never deletes anything. The database backup keeps daily copies for 30 days, plus the copy from the 1st of every month for ever. The privacy page tells members that when they're erased their data and photos are permanently deleted, and that "backups age out on their own cycle within a few weeks".
- **The problem:** an erased member stays complete in every monthly database copy for ever, and their photos, avatar and voice answers stay in the photo backup for ever, as does every photo an admin removed. The photo backup also holds 330 full-size phone originals, GPS location included, from uploads members started but never finished. What the privacy page says isn't true.
- **What I'd change:** the photo backup deletes what the live site deleted, 30 days later; it stops copying unfinished uploads, and the 330 already there are deleted; monthly database copies are kept 3 months instead of for ever; the privacy page says backups keep erased data for up to 3 months.
- **What you'd notice:** one changed sentence on the privacy page.
- **If I guess wrong:** a photo deleted by mistake can't be recovered after 30 days, and a database problem older than 3 months can't be rolled back.
- **Options:** (a) as above; (b) keep backups for ever and say so on the privacy page; (c) leave it as it is. **Default: (a).** (rows: L11-02)

**15. "Close and send it out" before anyone has answered**
- **What happens now:** if a Keeper presses it before anyone has answered, the Edition isn't sent. Instead the deadline quietly moves to three days from now (often earlier than the real deadline), everyone gets another "answers are open" notification, and the Keeper sees no message at all. A second press sends an empty Edition to every member, and it stays in everyone's archive.
- **The problem:** the button does something different from what its own warning says ("Answering stops now and the Edition comes out"), nobody is told, and a puzzled second press publishes an empty Edition. On a batch Catch-up any member can press it.
- **What I'd change:** on a round with no answers, say "Nobody has answered yet" and offer "Give everyone 3 more days".
- **What you'd notice:** a different message on that one press.
- **If I guess wrong:** a Keeper who really wanted an empty Edition out can't send one.
- **Options:** (a) refuse and offer more time; (b) send the empty Edition at once, as the warning promises; (c) keep today's behaviour, but say what happened. **Default: (a).** (rows: C3-01)

**16. Someone a Keeper removed, using an old invite link**
- **What happens now:** when a Keeper removes someone from a Catch-up, the invite link stays the same, and that link is tucked inside every member's copy of the Catch-up's page. A removed member who kept it (from a chat, or from having had the page open) can open it, press Join, and be straight back in with every Edition readable. The Keeper isn't told.
- **The problem:** a removal doesn't stick, though the help text says removing someone ends their access.
- **What I'd change:** removing someone changes the link, so old copies stop working, and only Keepers' pages carry it.
- **What you'd notice:** nothing, unless someone tries it.
- **If I guess wrong:** a removal meant as temporary needs a Keeper to undo it, and anyone still holding the old link needs the new one.
- **Options:** (a) removal sticks; (b) links always work, as today. **Default: (a).** (rows: L12-09)

**17. Editing a letter that is already published**
- **What happens now:** "Edit" on a published letter opens a small pop-up box with no height limit. A typical letter (most are over 4,000 characters) makes it about three times the height of a laptop screen: the title and the Save button are off the screen, and the box can't be scrolled.
- **The problem:** a member fixing a typo in their published letter can't reach Save; the only way out is to close the box and lose the edit. This box is the only way to edit a published letter.
- **What I'd change:** every pop-up box on the site will fit the screen and scroll; that ships regardless. The question is whether editing a published letter should open the full letter desk instead, the page drafts are written on.
- **What you'd notice:** with (a), editing a letter looks like writing one; with (b), the box scrolls and Save is always reachable.
- **If I guess wrong:** you preferred the other one.
- **Options:** (a) open the full letter desk; (b) keep the box, made to fit and scroll. **Default: (b) now**, since it's the smaller change; (a) later if you want it. (rows: T8b-17)

**18. The entry question's answers are public**
- **What happens now:** the signup entry questions, and every answer they accept, are written in the site's code, which anyone can read on GitHub now that the repository is public. One question (the Thursday dinner) accepts any reply containing "egg", so "veggies" gets in, and anyone can swap questions without limit until that one comes up.
- **The problem:** the gate is meant to keep strangers away from the feed, the letters and the map, and the privacy page promises members' details are shown "to no one else". Right now it stops nobody who looks.
- **What I'd change:** move the questions and answers out of the code into the database, where your admin trivia room can edit them (I'll add the editing if it can't yet), and make the dinner question need a real dish. The current answers stay in GitHub's history for ever, so the gate only truly holds again once you write fresh questions.
- **What you'd notice:** nothing at first; later, your new questions at signup.
- **If I guess wrong:** you spend time on a gate you think of as a courtesy.
- **Options:** (a) move them out, tighten "egg", and you write fresh questions when you can; (b) treat the gate as a speed bump: leave it, and change the privacy page to say what really keeps strangers out (confirming an email, and the office list); (c) make the repository private again (the old answers are still out there). **Default: (a).** (rows: C5-03)

**19. Verifying a new member from the office list by name**
- **What happens now:** when a member's details match the school's office list, the site verifies them automatically, which lets them post and see everyone's contact details. It matches either on email, or on first name, last name and batch year. Nothing checks whether another account was already matched to the same person, nothing records which office-list entry was matched, and you aren't told.
- **The problem:** a stranger can confirm any throwaway email, copy a real classmate's name and batch year off the directory into their own profile, and be verified as that classmate at once. Two accounts can both be "the" same alumnus. About 66 of today's members were verified by name and year alone.
- **What I'd change:** verify automatically only when the signup email is on the office list. A name-and-year match goes to your verify queue with the office-list entry beside it, and is refused outright if another account already claimed that person.
- **What you'd notice:** a few more people in your verify queue: those who signed up with a different email from the one the school has. Members already verified stay verified; I'll list the ones verified by name alone so you can glance over them.
- **If I guess wrong:** you verify more people by hand.
- **Options:** (a) email match automatic, name match comes to you; (b) both stay automatic, but a second account claiming the same person is refused; (c) leave it. **Default: (a).** (rows: O-08)

**20. What a moderator's removal does to photos, and to Catch-up answers**
- **What happens now:** when you hide a reported post, its words disappear but its photos stay in storage at their public web addresses, viewable by anyone who has the link; three hidden posts' photos are online today, one hidden since July. And no admin can take down a Catch-up answer at all: only its author can, short of you erasing their whole account.
- **The problem:** the case that matters most, a photo posted without someone's consent, is exactly the one moderation doesn't handle, and an abusive answer in a published Edition can't be removed.
- **What I'd change:** hiding a post also deletes its photos from storage. And add "Remove answer" for admins in the Catch-ups reading room, which hides the answer and deletes its photos and recording.
- **What you'd notice:** a "Remove answer" button in the admin Catch-ups reading room.
- **If I guess wrong:** a post hidden by mistake can't get its photos back (there's no un-hide button today anyway).
- **Options:** (a) both; (b) only "Remove answer", and hiding a post keeps its photos as today; (c) neither. **Default: (a).** The three posts you've already hidden keep their photos unless you add "and delete the three". (rows: C8-02, C8-03)

**21. When someone leaves, what goes with them**
- **What happens now:** (1) If a member leaves a Catch-up, is removed from one, or moves batch while a round is still open, their unsent answers and questions stay in that round and go out to the whole group when it's published, after they've gone, and they can no longer withdraw them. (2) When an account is erased, every question they ever asked in a Catch-up stays word for word, shown as from "an asker who left", including questions nobody ever answered. (3) Notifications in other people's lists that point at an erased member's posts, letters, messages or profile stay for a month, keep a line of their words, and open "not found" pages.
- **The problem:** a Keeper may remove someone precisely because of what they were writing, and it gets published anyway; and an erasure the privacy page calls complete leaves the member's words behind.
- **What I'd change:** one rule: what nobody has read yet goes with the person, and what was already sent out stays. Their unsent answers and questions are deleted; an erased member's unanswered questions go (answered ones stay, without their name, and the privacy page says so); notifications pointing at an erased member are cleared.
- **What you'd notice:** nothing day to day.
- **If I guess wrong:** a removed member's last answers are missing from that round's Edition.
- **Options:** (a) this rule; (b) keep today's behaviour, and only fix the privacy page's wording. **Default: (a).** (rows: C8-04, C8-08, T7a-04, C8-09)

**22. A member waiting out the 60 days before deletion**
- **What happens now:** when a member asks to delete their account, there's a 60-day wait before it's erased, and signing back in cancels it. Their profile disappears at once, but their posts, letters, comments and Catch-up answers stay up under their name; tapping the name opens "not found", and searching for their name still finds their posts.
- **The problem:** the site keeps naming someone whose profile doesn't exist, which is exactly what you ruled out for blocked members (their writing leaves the feed with them).
- **What I'd change:** hide a leaving member's writing for those 60 days too, the way a blocked member's is hidden; it all comes back if they cancel.
- **What you'd notice:** nothing, unless someone asks to leave.
- **If I guess wrong:** a leaving member's posts vanish two months before you expected.
- **Options:** (a) hide their writing with them; (b) keep their writing up, but show their name without a link. **Default: (a).** (rows: L10-02)

**23. Class photos after a member corrects their batch year**
- **What happens now:** a Class Collection photo is filed under the class its uploader belonged to when they added it. If they later correct their batch year, the photos stay filed under the old class.
- **The problem:** the photos keep showing to a class that isn't theirs, with their name on them, and disappear from the member's own Class Collection. The only fix the help describes (delete and re-upload) needs the photo's link, which they can no longer find. Nobody is affected today.
- **What I'd change:** when a member corrects their batch year, the Class Collection photos they added move with them.
- **What you'd notice:** nothing, unless someone corrects their year after adding class photos.
- **If I guess wrong:** if those photos really were of the class they first claimed, that class loses them.
- **Options:** (a) move them; (b) leave them, but let the member still find their own photos there to delete them. **Default: (a).** (rows: C8-05)

**24. What "Download your data" includes**
- **What happens now:** "Download your data" gives a member their profile and most of what they wrote and uploaded. It leaves out their hearts on photos and Catch-up answers, bookmarks, poll votes, the profession tag the directory files them under, their notifications, and everything the site records about their visits, searches and pages opened. Their comments also can't be matched to the posts they were left on.
- **The problem:** the privacy page promises "a copy of your data, as one file", and this isn't complete.
- **What I'd change:** add everything it leaves out, and make comments point at their posts.
- **What you'd notice:** a longer file.
- **If I guess wrong:** members see how much the site records about their visits.
- **Options:** (a) everything; (b) everything they made or chose, but leave out the visit, search and page records, and say so on the privacy page. **Default: (a).** (rows: T6-03)

**25. Policy links on the front page**
- **What happens now:** the public front page is the photo, the title and the two buttons, with no link to the privacy policy, terms or guidelines. The only place a stranger can find them before joining is the consent line on the signup form.
- **The problem:** someone who wants to read the privacy policy before signing up has to start signing up, or already know the address.
- **What I'd change:** add Privacy, Terms and Guidelines somewhere quiet.
- **What you'd notice:** a small line of links on the front page.
- **If I guess wrong:** text on your front page you didn't want.
- **Options:** (a) a quiet line under the two buttons; (b) a thin strip at the very bottom; (c) leave the front page alone. **Default:** I build (a) and (b) where you can see them, show you both at the end, and leave the live front page untouched until you pick. (rows: T8b-09)

**26. Deleted photos stay viewable for up to a year**
- **What happens now:** when the site shows a photo, Vercel makes resized copies of it and keeps them for up to a year (Vercel's documented behaviour; not yet tested on the live site). When the photo is deleted (a post removed, an avatar replaced, an account erased), the original goes at once, but the resized copies keep working at the site's own image address.
- **The problem:** anyone who had the link can still see a deleted photo for up to a year, including photos removed for privacy or erased with an account.
- **What I'd change:** when a photo is deleted, also tell Vercel to throw away its copies. That needs a Vercel access key saved in the site's settings, which only you can create; I'll write the steps.
- **What you'd notice:** nothing. Until you add the key, nothing changes.
- **If I guess wrong:** nothing breaks.
- **Options:** (a) you add a key and the site uses it; (b) instead, Vercel keeps its copies for a few hours rather than a year, which uses up more of the free plan's 5,000-a-month image allowance, already the tightest; (c) leave it. **Default: (a):** the code now, the key steps in my closing report. (rows: C8-01)

**27. How often an open tab tells the server "still here"**
- **What happens now:** every open tab of the site pings the server once a minute (only while the tab is visible and the member active), so your analytics can show who's on the site now and how long visits last. Each ping uses a little server time.
- **The problem:** on Vercel's free plan the site gets 4 hours of server time a month, and going over can pause the site for up to 30 days. It uses about 2 hours a month at today's quiet activity, so a busy month, or about twice today's members, crosses the line. The pings are one of the steady costs that is cheap to cut.
- **What I'd change:** ping every 2 minutes instead of every minute.
- **What you'd notice:** "On the site now" in your analytics takes up to 2 minutes longer to notice that someone has left.
- **If I guess wrong:** your live view feels slower.
- **Options:** (a) every 2 minutes; (b) every 3 minutes; (c) keep every minute. **Default: (a).** (rows: L5-01)

**28. Small changes to the live database**
- **What happens now:** the live database is shared by the real site and by the work on your laptop, so any change to it is live the moment it's made.
- **The problem:** several fixes can't land without small changes there: a few new fields, speed-ups for some slow lookups, one rule so a report can outlive its reporter, re-pointing 22 old notifications at the page that replaced theirs, and deleting one blank answer from August that nobody can see.
- **What I'd change:** apply them as the fixes need them, each written to a dated file first as usual, applied to the live site and the demo, adding only.
- **What you'd notice:** nothing.
- **If I guess wrong:** a change could slow or break a page until put right. Each is tested first, and none removes a table or column.
- **Options:** (a) apply them as the fixes need them; (b) hold them all for your go at the end, and the fixes that need them wait too. **Default: (a).** Removing a table or column, or deleting anything a member wrote, always waits for you. (rows: T7a-01, T7b-03, T2b-12, O-08, C6-02, C8-03, and the index rows in phases B and L)

**29. Putting the fixes live**
- **What happens now:** nothing fixed reaches rishivalley.space until it is pushed, and a push is a deploy. Unless you say otherwise, every fix is committed on your laptop and nothing is pushed.
- **The problem:** phases A and B close two holes that are open on the live site today (a stranger can get verified as a real classmate, and members' login cookies are sent to Sentry with server errors), and they stay open until you push.
- **What I'd change:** nothing, unless you say so.
- **What you'd notice:** with (a) or (b), fixes go live during the campaign instead of all at once when you push.
- **If I guess wrong:** a fix that passed every check misbehaves live while you're away, and each push briefly breaks saving for anyone with the site open until they reload (a fix in this campaign softens that).
- **Options:** (a) push after each phase passes every check; (b) push phases A and B as soon as they pass, and hold the rest for you; (c) hold everything for you to push. **Default: (c).**

### Things only the owner can do (no answer needed; they block nothing)

- **A. Sentry → Settings → Security & Privacy:** check that "Data Scrubber" and "Use Default Scrubbers" are on, and search stored issues for `authjs`. Why: members' login cookies have been reaching Sentry with server errors (the code fix ships in phase B); if one was stored, changing the site's sign-in secret signs everyone out, which is your call. (T8b-14)
- **B. Vercel → Usage, once a week:** Active CPU and Image Transformations. Why: they are the free plan's tight lines, and the dashboard is now the only meter. Vercel emails at 75%. (L5-01, L5-11, C5-01)
- **C. Vercel's free plan is for non-commercial use,** and the site takes contributions on /support. Your call whether that matters.
- **D. Vercel → Firewall:** add the one rate-limit rule the free plan allows, on production and on the demo. Why: today a script hitting the site ten times a second spends a month of the free plan's requests in about a day. The closing report will spell out the exact rule. (L8-04, L5-02, C5-01)
- **E. Supabase → Organization → Usage → Egress:** this month's reading. Why: Supabase's 5 GB of monthly data is the first limit growth hits, and nothing in the site watches it. Optional: a Supabase access key in GitHub's secrets would let the nightly job read it itself. (L5-07)
- **F. Sentry → Spike Protection:** on. Why: a flood of one error can spend the month's 5,000 Sentry events, after which real errors are dropped. (T5-10, T8b-18)
- **G. Cloudflare → R2:** a lifecycle rule that deletes `staging/` after a day. Why: photos members start uploading and then abandon stay public for ever, GPS included. Also check the site's R2 keys reach only the live bucket, not the backup. (T4a-03)
- **H. Resend → Webhooks:** also send `email.failed` and `email.suppressed`. Why: without them a confirmation email that fails still shows "We sent a link" for ever. (L11-05)
- **I. The demo:** confirm `.env.demo` holds no R2 keys (if it does, a demo tool could delete real photos); consider pausing the demo's Vercel project, which hasn't built since 7 August but still runs two jobs a day on the same free allowances. (T4a-06, L8-04)
- **J. Move `sanan's stuff/` out of the project folder:** it holds a plain-text recovery-codes file that every session working here can read.
- **K. Supabase → Database → Pooler:** the pool size, which the audit couldn't read. (L5)
- **L. Optional:** a contact address that isn't your own sign-in email, for the policy pages. Why: the pages print your login address, which makes it the easiest address to flood with reset emails. (C5-02)

## Owner answers

**2026-10-29, the owner's reply to Q1-Q29.** Questions he did not mention take their default. The
reading below is what every worker follows; argue with the reading, not with a re-derivation.

<details><summary>His reply, verbatim (the record)</summary>

> 2b. 3 yeah add it make sure you every situation someone might use that. And there won't be any problems, you know, verifying the new account. Make sure we read the verification of the new account, we remove the old account. Verifying then the old account doesn't make a difference. All of those edge cases, make sure you consider, because this is a sensitive feature. And you can add those two controls beside the request your data and delete account, so they're not too intrusive. So maybe you first do change email, change password, and then request data, and then delete. Number four, I don't want to provide a contact address, which makes this tough. Maybe we could say, if this is a mistake, please ask a friend to reach out to us through the website. Something like that. I don't know. Yeah, you I can remove flags. 9b. 10 I don't want to lose any info I see in the admin panel. you can do a though. 12 leave as is. For 14, you should leave it as it is, but this, why are we saving unfinished uploads? Is there any utility in doing that? If not, then let's just stop. 17a. For 18, leave it as it is. I'll make it private, but not now. I'll do that later. Don't make any other changes. Yeah, I think your fix for number 19 sounds good, but you're saying you're refusing if someone has already claimed that person, but people can have the same first name and last name. So you shouldn't, like, what do you mean to refuse? You can just leave them for me to be manually verified. But yeah, otherwise the default is fine. Number 20, just leave it as it is. No one's reported. I don't think anyone's going to report. And I can deal with that on a case-by-case basis. 25c. 26c. 27b. 28 You can apply these changes when you need. You have my permission to do all of that, but just be very careful for 29. You have my permission to push. But push as few times as possible, because I don't like to push that often. I will do all of the other tasks you gave below, at the end, I won't do B C I and J. Because those don't need to be done. And L doesn't need to be done. The rest I will do at the end. After you're done.

</details>

| Q | Answer | The reading every worker follows |
|---|---|---|
| 1 | default (a) | Keep a departed member's reports, shown as filed by a member who has since left; a merge moves them to the survivor. (T7a-01) |
| 2 | **(b)** | A Keeper cannot end a Catch-up while a round is collecting or answering; the End row says when it can be ended. No publish-first, no discard. (T2a-07) |
| 3 | **(a), with his conditions** | Build "Change sign-in email" and "Change password" on the member's own profile, placed with the account controls in this order: change email, change password, download your data, delete my account. He called it a sensitive feature and set the bar: the new address takes effect only after a link sent to it is confirmed; once it is confirmed, the old address stops working for sign-in, and anything still in flight to the old address (a confirmation link, a reset link) does nothing; every edge case is considered (a pending change superseded by another, the new address already taken, an unconfirmed account, a link opened signed out or by another signed-in account, an expired link, sessions on other devices). The admin "correct their sign-in email" button and the fixed advice copy ship too. (T5-01, T6-06) |
| 4 | **(a), no contact address** | A blocked member is told plainly the account is paused. He will not publish a contact address, so the sentence asks them, if they think it is a mistake, to have a friend on the site reach the team through the website. Something in that spirit, in the house voice. (T5-14) |
| 5 | (a) | Remove the Flagged state; show "reported N times" instead. (T7a-08) |
| 6 | default (b) | Hide blocked and leaving members from Catch-up lists, counts and reminders; Editions already sent stay as read. (T2a-13, T2b-05) |
| 7 | default (a) | The post's Collection tick keeps the full-size original, like every other way in. (V-T4a-A, with T4a-01) |
| 8 | default (a) | Photo wins; say so on the picker before the pick is spent. (T8a-16) |
| 9 | **(b)** | Name the hour, India time ("closes 7 am Sunday, India time"), on every surface that names the deadline and in its reminders; clear stale reminders at the close. (T7b-15) |
| 10 | **(a), keep the admin panel whole** | Mask anything showing a person from PostHog and end its identity at sign-out, but nothing he sees in the admin panel today may be lost: check every PostHog-sourced number the panel or the nightly snapshot shows still comes through. (T7b-22, T7b-21) |
| 11 | default (a) | Bring back a Keeper-only "Copy invite link" on active people Catch-ups. (T3-17) |
| 12 | **leave as is** | L10-05 DECLINED by the owner. |
| 13 | default (a) | Controls wait for a confirmed email; enrolment at signup stays. (L10-01) |
| 14 | **(c), but stop keeping unfinished uploads** | Backup retention and the privacy page's backup sentence stay as they are. His question, "why are we saving unfinished uploads?", has the answer "no reason": `staging/` holds only uploads in flight or abandoned, so the nightly media sync stops copying it, and the in-app clean-up of abandoned staged uploads (T4a-03) goes ahead. The 330 staged originals already in the backup are left alone unless he says otherwise. (L11-02 shrinks to the sync exclusion.) |
| 15 | default (a) | Zero answers: refuse with "Nobody has answered yet" and offer three more days. (C3-01) |
| 16 | default (a) | Removal rotates the invite link; only Keepers' pages carry it. (L12-09) |
| 17 | **(a)** | "Edit" on a published letter opens the full letter desk; every dialog also fits the screen and scrolls. (T8b-17) |
| 18 | **leave as is** | C5-03 DECLINED: he will make the repository private later, himself. No change to the gate's questions, answers, judge or the privacy wording. Other trivia rows (C4-01, C7b-01 to C7b-03) are separate bugs and proceed without touching the questions or answers. |
| 19 | **(a), but never refuse** | Auto-verify on an email match only; a name and batch-year match goes to his verify queue with the office-list row beside it. Never refuse because another account already matched that person (names repeat): queue it and show the other match as information. Record the matched row and audit every automatic verification. (O-08) |
| 20 | **leave as is** | C8-02 and C8-03 DECLINED: he handles takedowns case by case. |
| 21 | default (a) | What nobody has read leaves with the person; what was sent out stays. (C8-04, C8-08, T7a-04, C8-09) |
| 22 | default (a) | A deletion-pending member's writing is hidden for the 60 days, back if they cancel. (L10-02) |
| 23 | default (a) | A batch-year correction moves the member's own class photos with them. (C8-05) |
| 24 | default (a) | The export carries everything the site keeps about the member. (T6-03) |
| 25 | **(c)** | T8b-09 DECLINED: the front page stays as it is. |
| 26 | **(c)** | C8-01 DECLINED. |
| 27 | **(b)** | The presence beat goes to every 3 minutes; keep everything the analytics room derives from it honest at that cadence. (L5-01) |
| 28 | **(a), be very careful** | Additive schema changes and the two named data fixes (re-point the 22 bells, delete the one blank answer) are authorised, each in a dated idempotent file in `prisma/migrations-manual/`, applied to production and the demo. Nothing that drops a table or column or deletes member content. |
| 29 | **push permitted, as few times as possible** | Push twice: once when phases A and B are done (the two live holes close), once at the very end. A third only if the campaign runs for days and something urgent lands. Never push code before every migration it needs is applied to both databases; `npm run check` (and `npm run visual` for UI) green first. |
| checks | he does A, D, E, F, G, H, K at the end | B, C, I, J and L are not needed. The closing report must spell out D (the firewall rule) and G (the lifecycle rule) exactly. |

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

One line per row as it lands: `<id> — DONE (<commit subject>) | DECLINED (why) | PARKED (why)`; a commit cannot carry its own sha, so the subject names it. A row's verdict-corrected
evidence stays in `work/`; this ledger is the record of what the campaign did.

- L10-05 — DECLINED (owner, Q12, 2026-10-29: leave Jerry as is)
- C5-03 — DECLINED (owner, Q18, 2026-10-29: he will make the repository private later; no change to the gate)
- C8-02 — DECLINED (owner, Q20, 2026-10-29: takedowns case by case)
- C8-03 — DECLINED (owner, Q20, 2026-10-29: takedowns case by case)
- T8b-09 — DECLINED (owner, Q25c, 2026-10-29: the front page stays as it is)
- C8-01 — DECLINED (owner, Q26c, 2026-10-29)
- O-08 — DONE (fix(security): the office list verifies by email alone, and a removal sticks); a name match is queued for the owner, never refused (Q19 as he ruled it)
- T7a-06 — DONE (fix(security): the office list verifies by email alone, and a removal sticks); T6-01, its closed duplicate, rides with it
