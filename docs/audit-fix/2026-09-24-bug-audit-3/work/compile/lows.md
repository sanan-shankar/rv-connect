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

