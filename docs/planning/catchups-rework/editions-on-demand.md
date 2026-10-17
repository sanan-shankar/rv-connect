# Editions on demand: no rhythm, no flood

Opened 2026-10-17. A change to the shipped Catch-ups, not a phase of the rework campaign; it
lives beside that campaign because it overturns parts of what the campaign shipped (the rhythm,
hold and resume, the batch's three-question start, the daily reminder default).

## What started it

On 2026-10-15 a 2024 alumnus made a second Catch-up with exactly the 42 people of the Batch of
2024 one, named "🪇". The batch one had run one round (one person answered) and its rhythm put
the next in December. "Start the next Edition now" existed, open to every batch member since
2026-09-27, but it lived in the settings panel and nobody found it. Folded back in by
`prisma/migrations-manual/2026-10-17-fold-2024-duplicate-into-batch.sql` (commits 4bb43f76,
4ac75cd1).

## His words, verbatim (2026-10-17)

> Here's the thing with catch-ups. Um, I feel like this problem shouldn't have occurred, right? We
> should have features that would prevent this from happening. Obviously, they should be using the
> batch catch-up. They shouldn't have to create a new one. But it was too slow. It wasn't too quiet.
> It was just people hadn't joined and weren't participating at that time. Um, but they should have
> been able to start one when they wished. They shouldn't have to wait for three weeks or two months
> or whatever. um, so what to do with them? We should definitely delete or just make it the batch
> catch-up that has everything and remove this shaking one. Um, and just oh, port all the questions,
> all, all the settings, everything like that, move it onto the batch catch-up. Um, I think right now
> the batch catch-up, it's basically everyone running it, right? Everyone has, everyone can change the
> settings. Um, that's good, let it be like that. But yeah, you should be able to start one whenever
> you want. Um, it shouldn't be so rigid. And another thing is most people aren't using catch-ups,
> right? Like 70 batches are not using catch-ups. Um, there's just two of us that are using it. And
> for those guys who haven't even touched it, haven't bothered themselves with it, anything like that,
> I don't want their notification thing being flooded by catch-up notifications. Only if it's started
> by someone or something like that, then it should go. But if a batch is totally not concerned with
> it. They should not be bothered by it. Um, I don't want to flood of notifications and it'll just
> annoy them and then they'll start ignoring them because of fatigue, whatever, whatever. So yeah,
> yeah, um, honestly, I'm wondering if catch-ups just shouldn't have a regular thing to it, like
> monthly, whatever, whatever, frequency. You should just be able to start it whenever you want. And
> then it ends when it ends. And then it just doesn't go until you start it again. Honestly, I think
> that might be better.

His four answers, the same day:

| Question | His pick |
|---|---|
| Rhythm | **No rhythm.** Rounds happen only when someone starts one; after it is published, nothing until someone starts the next. A quiet batch stays completely silent. |
| Who starts, on a people Catch-up | **Anyone in it.** Same rule as batches; a confirm step guards accidental taps. |
| Notifications to someone not taking part | **Two at most**: "a round started" and "it's published". No reminders unless you have turned them on yourself. |
| "Everyone from my batch" when the batch already has one | **Send them to it.** The button becomes "Your batch already has a Catch-up" and takes them there. |

## The model

A Catch-up is either **idle** or **running an Edition**. Nothing ever starts on its own.

- **Idle** means the newest Edition is published or sealed, or is `collecting` but not on a clock:
  no question deadline (a batch's first Edition, never started), or its question window closed
  empty and the one silent extension is spent (it fizzled). `isEditionRunning` in
  `catchups-core.ts` is the one test.
- **Starting** (`startEdition`): any member of the Catch-up, batch or people, verified, metered.
  If the newest Edition is an idle `collecting` one, it is started IN PLACE (questions it already
  holds carry into the round; Batch of 2018 has two). Otherwise a new Edition opens. Either way
  the questions get three days and everyone in the Catch-up is told, once, by name of who started
  it. Then the usual run: questions, answers, published, idle.
- **The home** carries the start as its one primary action: under the latest cover once an
  Edition is out, or as the region itself when nothing has ever come out. A confirmation says how
  many people will be told.

## Notifications per Edition

| Bell | Who |
|---|---|
| started (`catchup_questions_open`) | everyone in it but the starter |
| answers open (`catchup_answers_open`) | people taking part: asked a question in this Edition, or turned reminders on |
| daily / last-day reminder (`catchup_reminder`) | only members who turned reminders on; the default is now Off |
| published (`catchup_published`) | everyone |
| the silent question extension | nobody (it used to re-announce the start) |
| love, comment, added | unchanged; each is one person, about their own words |

So a member who never takes part gets two bells per Edition, and a batch nobody starts gets none.

## Decided here (his answers settle the rest)

- **Hold and resume are deleted.** With nothing scheduled there is nothing to hold between
  Editions, and inside one "give everyone longer" already does the job. Legacy `paused` rows are
  read as active by the new code, so the cleanup migration can run in either order around the
  deploy. Considered and not taken: keeping hold for a live Edition (nobody has used it mid-round;
  every paused row in the database is a batch nobody started, or an empty Edition).
- **The manual nudge is deleted.** It reached every non-answerer regardless of their setting,
  and on a batch any of forty people could fire it, which is the flood his third answer rules out.
  Considered and not taken: a nudge that only reaches people with reminders on (a button labelled
  "everyone" that reaches two people).
- **The three-question start is deleted.** It existed so a batch could start itself without a
  rhythm; the start button is that now.
- **Columns stay, readers go.** `cadence`, `nextOpensAt` and `pausedAt` leave `schema.prisma` and
  every reader; the columns are dropped by a later file once this has deployed, the way the song
  columns were.
- **Copy says "Edition"**, the app's shipped noun (phase 1's rename), not "round".

## Build, in commits

1. **Start by hand, no rhythm, no hold** -- engine (`catchups.ts`, `catchups-core.ts`), actions,
   batch creation, home, settings, create form's rhythm control, list and admin lines, export,
   demo seed, spec, tests, and `2026-10-17-editions-start-by-hand.sql` (paused -> active, the
   empty dormant Edition marked spent, nothing booked). Applied AFTER the push.
2. **Two bells for the uninvolved** -- `catchups-notify.ts` audiences, reminder default Off (code
   and the column default), nudge removed, spec section 11.
3. **The batch shortcut points at the batch** -- `/catchups/new`.

## Status

| Item | Status | Notes |
|---|---|---|
| Fold the 2024 duplicate | DONE | 4bb43f76, 4ac75cd1; checked as a member, 42/42 in, 9 questions intact |
| 1. Start by hand | DONE | engine, actions, home, settings, create, list, admin, guide, spec; driven end to end as Jerry |
| 2. Two bells | DONE | taking-part audience, reminders off by default (column moved, applied), extension silent, nudge deleted |
| 3. Batch shortcut | DONE | the shortcut becomes "Your batch already has a Catch-up" and links there |
| Pushed and deployed | DONE | 2026-10-17, Vercel and CI green |
| `editions-start-by-hand.sql` on main | DONE | after the deploy: 9 paused -> active (8 batches + "in the loop"), 0 booked, 0 reopenable |
| `reminders-default-off.sql` on main | DONE | before the push; safe either side |
| Both on the demo | DONE | 2026-10-17 at his go-ahead: 0 rows to change, reminder default now off |
| `drop-rhythm-columns.sql` | OPEN | both databases are settled, so it can run; it drops columns, so it waits for his word |
