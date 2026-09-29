# Email confirmation: the queue, the wait, and bounces

How a new member's confirmation email gets to them, what the app lets them do
while it is on its way, and what happens when their mailbox will not take it.
Written 2026-09-29, the day the owner posted the link to the eight-hundred-person
alumni group chat.

The queue itself (priorities, retries, leases, the budget) is documented where
it lives, in `src/lib/email-queue.ts` and `src/lib/mail-policy.ts`. Delivery
reports are `docs/OPERATIONS.md` section 6. This file is the member-facing rules.

## The numbers

- Resend's free plan: 100 emails a day, 3,000 a month. The owner chose to stay
  on it for launch (2026-09-29) rather than pay for Pro.
- The app sends at most **95** a day (`DAILY_CAP`), five short of Resend's own
  count so a miscounted retry tips into a slower day, not into rejections.
- **10** of those are held back for password resets and security notices
  (`RESET_RESERVE`). Resets have never passed three a day; the reserve was 20
  until launch day, which spent ten confirmations a day protecting nothing.
- So **85 confirmations a day**. The day turns over at midnight UTC, which is
  **5:30 am IST**, because that is when Resend's own counter resets.
- Nothing sends on a timer. Mail goes out the moment it is queued if the day
  has room, and otherwise the first page view after 5:30 am starts sending the
  backlog, 8 per page view, oldest first.

## Rule 1: waiting counts as confirmed

The owner's words: *"until we have sent the verification email, they should
continue to have full access ... So if we've sent the email and they've not
verified, then shut it down. But if it's not been sent, let them use it and then
we send it and then shut it down."*

So the confirmed-email gate asks one question, `emailGateOpen`:

> Is the address confirmed, **or** is a confirmation still waiting in our queue
> with none ever sent to the address on the account?

`confirmationStillWaiting` in `mail-policy.ts` is the rule, pure and tested.
Details that matter:

- **Only rows addressed to the current address count.** Somebody whose first
  address bounced and who switched to another (Rule 4) has never been sent
  anything they could open.
- **A failed row is not waiting.** A bounce was sent. A row that gave up without
  sending is waiting on a fix, not on the limit.
- **Every gate reads it**: every gated server action (through
  `requireVerifiedEmail`, and so `requireVerifiedMember` and the API routes),
  directory names, the rail's directory card, other members' profiles, and
  asking to be verified. A waiting member whose profile the owner has verified
  can post.
- **The school-roster auto-match does NOT.** It matches on name and batch year,
  which are public, so a waiting account that could match would let anyone sign
  up with an address they do not own and be verified as a real alumnus. It runs
  on the literal fact, the moment they tap their link; until then "ask to be
  verified" reaches the owner as it always has.
- **What still reads the literal fact** (`emailConfirmed`): the banner, which
  stays up during the wait; the resend button's "already confirmed" check; the
  `/verify-email` page.
- On an ordinary day the mail leaves within seconds, so the wait lasts seconds.
  On a launch day it lasts until the member's turn. Their next page after the
  send shows the ordinary "Confirm your email" banner and the gate is shut until
  they tap the link.
- If the lookup errors, the gate stays shut (the member sees the ordinary locked
  state, never an error page) and the error is reported.

## Rule 2: say when, in their words

The banner is the one place a waiting member hears about it.

| State | Banner |
|---|---|
| waiting, gate open | **We'll send your confirmation email tomorrow at 5:30 am IST.** Everything is open to you until then. |
| waiting, gate shut (a resend queued after an earlier one was sent) | **We have hit today's email limit.** Your link goes out tomorrow at 5:30 am IST. Nothing you need to do. |
| in flight | A link has been sent to your email. Tap on it to verify your account. |
| sent | **Confirm your email.** We sent a link to d\*\*\*@gmail.com. [Send it again] |
| bounced | Rule 4 |

The time is counted from the member's real place in the queue
(`verifySendingAt`), and it says the day: "at 5:30 am IST" (later today),
"tomorrow at 5:30 am IST", or "on Thursday at 5:30 am IST". Until 2026-09-29 it
could only say "tomorrow", which on a 300-signup day told over a hundred people
the wrong day.

No reason is given on the open state, on purpose: the member is not blocked,
the time is the promise, and a reason ("lots of people joined") is only true
for one of the two ways a row ends up waiting.

## Rule 3: a resend reports what actually happened

The dialog, the banner and the `/verify-email` page all press the same
`resendVerification`, and each says one of three things: sent (to where),
on its way, or waiting until a named time. The page used to say "Sent to …"
for all three.

## Rule 4: a mailbox that will not take it

Resend accepts a message and the receiving server can still refuse it hours
later (Gmail's "mailbox full" took 14 hours to come back for two members in
September). The webhook marks the row failed with `bouncedAt`. Before this, the
banner offered "Send me the link" again, Resend accepted it again, it bounced
again, and the owner's to-do list filled with the same two names.

Now:

- The banner says so: **We couldn't deliver your confirmation email.** with the
  reason in plain words (a full mailbox, or an address that does not take mail)
  and **Use another email**.
- That opens a dialog: the new address and their password. `useAnotherEmail`
  checks, in order: signed in; address NOT yet confirmed (a confirmed address is
  never changed here); a per-account meter on attempts; the password (failures
  also spend the `reauth` meter); the address is valid, deliverable, different
  and not already a member (the same sentence signup gives). Then it moves the
  account to the new address, cancels any confirmation still queued for the old
  one, and queues one for the new one. They sign in with the new address from
  then on, and the dialog says so.
- The password is the point: without it, anyone holding a signed-in device
  could move the account to their own inbox and reset the password from there.
- A full mailbox can be tried again after clearing space; the dialog offers
  that as its quiet second option.
- The owner's to-do list and its badge no longer show a bounced
  **confirmation** (`MAIL_NEEDING_ADMIN`): the member is told and can fix it
  themselves. `/admin/mail` still lists it, and Retry still works there (right
  when a member says they emptied their inbox). **Clear** refuses while the
  member is still unconfirmed at that address, because the row is what their
  banner reads and the only record that a confirmation was ever sent (Rule 1).
  Bounced resets and notices stay on the list.
- A resend folds into a waiting row only when it is for the **same address**,
  so a row still mid-send to the old address cannot swallow the new link.
- A move **re-addresses** a still-waiting confirmation in place, keeping its
  place in line, and a member gets **three moves a month** (`emailMoves`).
  Deleting and re-queueing made the row the youngest in the oldest-first drain,
  so an account moving to invented addresses on a backlog day would never reach
  the front and would stay "waiting" for ever (write-path review, 2026-09-29).

## Considered and not taken

- **Resend Pro** ($20 a month, no daily limit). The owner chose free; the wait
  rule means nobody is blocked by the limit anyway.
- **"Make a new account"** for a bounced address, or deleting the account after
  a week. Loses everything they filled in and leaves a duplicate in the
  directory.
- **The owner changes the address** from the admin panel. Works, but makes every
  bounce his job on the two busiest days.
- **A scheduled drain at 5:30 am.** On a launch day page views and signups start
  sending within seconds of the refill. Vercel's two crons on this plan run once
  a day with an hour's slack, and the repo is private, so a frequent GitHub
  schedule would spend Actions minutes on an empty queue most of the year.
- **"Never sent" across every address the account has had.** Would keep a
  member who fixed a bounced address locked out until their new link went out.
- **The roster auto-match for a waiting member**, as "full access" first
  read. Found by the write-path review before it shipped: it turns the wait
  into a way to claim somebody else's name without proving any inbox.
- **A `User` column recording "confirmation sent".** A schema change on launch
  day, for a fact the 180-day mail log already holds.

## Build checklist

Phase 1 (before the post):
- [x] `confirmationStillWaiting` in mail-policy.ts, unit tests
- [x] `emailGateOpenFor` (DB), session `emailGateOpen`, demo session, types
- [x] every gate reader moved to `emailGateOpen`; roster precondition too
- [x] `RESET_RESERVE` 20 -> 10
- [x] `sendTimeLabel` says the day; shared module; server-rendered first paint
- [x] banner open-wait copy; resend copy shared by dialog and `/verify-email`
- [x] `EMAIL_UNVERIFIED` and the `/verify-email` waiting copy stop claiming a
      link went out "when you joined"

Phase 2 (straight after):
- [x] bounced banner state
- [x] `changeUnconfirmedEmail` action + dialog, write-path review
- [x] admin to-do list drops bounced confirmations; Clear guarded

## Left to do (2026-09-29, for whichever session picks this up)

Phases 1 and 2 are committed (`a367324b`, and the Phase 2 commit after it).
Nothing below is started; each is small.

1. ~~**The banner floats over the Catch-ups index header.**~~ Done: the chip
   floats only on the Feed now (`railStartsAtTop` in `layout/rail-grid.ts`).
   On a Catch-up's home it had also been landing on the cover photograph.
2. **Pushed.** Phases 1 and 2 went out with another session's push on
   2026-09-29 and deployed (Vercel: success). The Catch-ups fix above is the
   commit after them; push it only with the owner's go-ahead, listing whatever
   else `git log --oneline origin/main..HEAD` shows.
3. **Checked after the deploy**: the live pages answer 200, the queue is
   empty with nothing failed, and the to-do list's mail count went from 2
   (Devshrut, Bhavya) to 0.
4. **Visual suite**: the last run passed 24 of 25; `birds` desktop timed out on
   its lazy images, a page this work does not touch. Re-run it on a quiet
   machine (never alongside `npm run check`).
5. **Not done, noted**: the older resend button in the banner still hard-codes
   `focus-visible:outline-cinnamon` rather than `outline-ring` (design audit,
   pre-existing).
