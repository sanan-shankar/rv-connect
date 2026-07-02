# Catch-ups (group Roundups)

The recurring group newsletter. Built 2026-07. Adapted from Letterloop, tuned for a small,
invite-only alumni community where everyone already has an account, a profile, and a bird avatar,
and where WhatsApp is the out-of-band nudge. No em dashes in shipped copy.

## Plain explanation (the one-liner for first-timers)
A Catch-up is a gentle group newsletter on a rhythm. Each round, everyone answers the same few
questions, and once the window closes their replies are gathered into one warm issue the whole
group reads together. You hear from everyone at once, a few times a year, and it stays.

## Locked product decisions
- A Catch-up ALWAYS lives inside an existing Group. No group yet -> guide the person to create one
  first, then start the Catch-up. One Catch-up per group (`Catchup.groupId @unique`).
- The Keeper (group admin) sets it up and drives it; a daily cron tick also auto-advances rounds.
- Members ADD QUESTIONS during a question window, then everyone ANSWERS during an answer window.
- Answers are ALWAYS attributed (bird avatar + name). No anonymous answers.
- A QUESTION may show "asked by <name>" or be unattributed (`CatchupQuestion.showAsker`).
- Answer types: text, photo(s), song of the moment (Spotify), this-or-that poll. No rating.
- Cadence: fortnightly | monthly | quarterly | yearly | one-off. Monthly default.
- Reminders: in-app notification bell + a one-tap "copy a WhatsApp nudge" for the Keeper. No email
  for MVP (Resend stays unused; can layer later).
- The reveal (a "Roundup") is grouped BY QUESTION, styled like the Letter reading view but communal:
  each answer is a warm card with the person's bird avatar, photos, an embedded song, love + comments.
- Names: feature = "Catch-ups"; a published edition = a "Roundup"; nothing anonymous.

## Song of the moment (keyless)
`GET https://open.spotify.com/oembed?url=<track/album/playlist url>` returns `title`,
`thumbnail_url` (300x300 album art), and an embeddable `html` iframe, with no API key. Resolve at
answer-submit time in the server action; store `songUrl`, `songTitle`, `songArt`. Render album art
with a plain <img> (app already uses <img>; no next.config change). Reject non-open.spotify.com urls.

## Data model (6 models; see prisma/schema.prisma)
- **Catchup** one per group: title, intro?, cadence, status (active|paused|ended), nextOpensAt?.
- **CatchupIssue** a round/edition: number, theme?, status (collecting|answering|compiling|published),
  questionsCloseAt?, answersCloseAt?, publishedAt?, remindersSent.
- **CatchupQuestion**: authorId, text, type (text|photo|song|poll), options? (JSON for poll),
  showAsker, position.
- **CatchupAnswer**: authorId, body?, images? (JSON), songUrl/songTitle/songArt?, choice? (poll).
  `@@unique([questionId, authorId])`.
- **CatchupAnswerLove**: userId, answerId. `@@unique`.
- **CatchupPref**: catchupId, userId, optedOut. `@@unique`.
Notification.type is a free string, so new types need NO migration.

## Lifecycle state machine (CatchupIssue.status)
1. **collecting** (question window): members + Keeper add questions (cap ~3 each, ~10 total),
   seedable from the prompt library. Keeper can "open answering now".
   - on enter: notify members "{Group} is starting a Catch-up. Add a question you want everyone to
     answer." link /catchups/[catchupId]
2. **answering**: questions frozen; everyone answers. Keeper can "close & publish now".
   - on enter: notify "Answers are open for {Group}'s Catch-up. Share yours." link .../answer
   - reminders: tick sends up to 2 nudges (approx 2 days and 1 day before answersCloseAt) to
     members who have not answered. Keeper can also copy a WhatsApp nudge or nudge in-app.
3. **compiling**: closed; short hold (~1 day) so it feels prepared. "Putting your catch-up together."
4. **published**: the Roundup is live at /catchups/issue/[issueId].
   - on enter: notify all "Your {Group} Catch-up is ready to read." + set catchup.nextOpensAt for the
     next round (recurring cadences only).

Transitions are driven BOTH by the Keeper (manual actions) and by `/api/catchups/tick` (daily Vercel
Cron, guarded by CRON_SECRET): auto-open next round at nextOpensAt; collecting->answering at
questionsCloseAt; answering->compiling at answersCloseAt; compiling->published after a 1-day hold.
Default windows: 3 days questions, 7 days answering, 1 day compile hold.

## Routes / surfaces
- `/catchups` hub: your Catch-ups (one card per group you are in that has one) + latest published
  Roundups to read. Empty state guides "start one from a group" / "create a group first".
- `/catchups/[catchupId]`: the Catch-up home. Current round status + primary CTA (add questions /
  answer now / read the Roundup), Keeper controls + settings, and the archive of past Roundups.
- `/catchups/[catchupId]/answer`: the answering UI (one question per card; text/photo/song/poll).
- `/catchups/issue/[issueId]`: the published Roundup reveal.
- Group integration: a Catch-up card on `/groups/[id]` (start it if Keeper, else jump to the round).
- Nav: `/catchups` already in the sidebar (MessagesSquare icon).

## Notifications (free-string types, bell routes by link)
catchup_questions_open | catchup_answers_open | catchup_reminder | catchup_published.
Respect CatchupPref.optedOut.

## Prompt library
~30-40 warm, valley-flavoured prompts in named packs (Where are you now, Campus memory lane,
Wins and goalposts, This or that, A photo, A song). Keeper adds with one tap; auto-suggests a few on
first round. See src/lib/catchups.ts.

## Deliberately NOT built (per research + scope)
Email delivery, standalone invite/onboarding (reuse Group membership), billing/tiers, member cap,
anonymity of answers, timezone machinery (single community tz), analytics dashboard, PDF export
(fast-follow), Mementos shareable cards (fast-follow), rating question type.
