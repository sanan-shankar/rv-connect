# C7b — fresh eyes on the files written since the audit began
Agent: C7b · Started: 2026-10-24 · Model: Opus 5.5 (1M)
Charter: read, as a finder, every `src/` file in `work/compile/cold-files.md` section B (changed since
`495ecdd2`, named by no report or verdict; lab, birds and loading screens excluded) at HEAD, with
`git log -p 495ecdd2..HEAD` for what changed, hunting member-visible defects: wrong behaviour, data
loss, races, stale state, effects that leak or fire twice, inputs that break it, missing
hover/focus/disabled states that allow a double submit, comments that state a rule the code breaks.
The trivia ADMIN room's components are mine (escaping, filters, long answers); the trivia and
email-change server code is C4/C5's and is not re-read except where a component's behaviour runs
through it. Section A is C7a's: the seven files that sit in both lists (alumni-map, directory-grid,
archived-row, letters-module, onboarding-flow, guide chapter catchups, trivia-gate) are read here for
their post-baseline DELTA; trivia-gate.tsx is read whole because the brief names the gate client as
this round's (it is also on C7a's board, so the orchestrator should dedupe C7b-01..03 against C7a).
HEAD read: 36ed27d3 (start and end; no commit landed during the read).

## Files (one line each: read / finding ids / clean)
- `src/app/(main)/admin/trivia/(index)/page.tsx` — read; clean (admin re-check, range whitelist, `capped` passed on)
- `src/app/(main)/admin/trivia/[questionId]/page.tsx` — read; C7b-06
- `src/app/(main)/catchups/new/page.tsx` — read; clean
- `src/app/(policies)/guidelines/page.tsx` — read; clean (the "reporter hears back" promise holds: `noteOnReportThread`)
- `src/components/admin/admin-chrome.tsx` — read; clean
- `src/components/admin/admin-nav.ts` — read; clean (stale "nine rows" comments, see Verified clean)
- `src/components/admin/admin-person-row.tsx` — delta read (import only); clean
- `src/components/admin/analytics/tabs.tsx` — read; clean
- `src/components/admin/trivia/candidates.tsx` — read; C7b-04, C7b-05
- `src/components/admin/trivia/door.tsx` — read; clean
- `src/components/admin/trivia/generations.tsx` — read; clean
- `src/components/admin/trivia/grow.tsx` — read; clean
- `src/components/admin/trivia/parts.tsx` — read; C7b-04 (the `Typed` comment)
- `src/components/admin/trivia/question-page.tsx` — read; C7b-04, C7b-06
- `src/components/admin/trivia/question-table.tsx` — read; clean
- `src/components/admin/trivia/rhythm.tsx` — read; C7b-07
- `src/components/admin/trivia/room.tsx` — read; C7b-04 (the main room's uncapped Sheet)
- `src/components/admin/trivia/trails.tsx` — read; C7b-01 (empty step drawn as "skipped"), C7b-04
- `src/components/auth/auth-panel.tsx` — read; clean
- `src/components/auth/trivia-dont-know.ts` — read; clean
- `src/components/auth/trivia-gate.tsx` — read whole; C7b-01, C7b-02, C7b-03
- `src/components/catchups/answer/types.ts` — read; clean
- `src/components/catchups/create/create-catchup-form.tsx` — read; clean (success path re-enables the button during navigation, but the server's 10 s twin guard holds)
- `src/components/catchups/edition/not-yet-published.tsx` — read; C7b-08
- `src/components/catchups/edition/voice-tape.tsx` — read; clean beyond L7's notes
- `src/components/catchups/index/archived-row.tsx` — delta read (import only); clean
- `src/components/catchups/index/picture-door.tsx` — read; clean
- `src/components/catchups/not-available.tsx` — read; C7b-08
- `src/components/catchups/settings/types.ts` — read; clean
- `src/components/catchups/voice-clip.ts` — read; clean beyond L7's notes
- `src/components/collection/collection-skeleton.tsx` — delta read; clean
- `src/components/collection/river-controls.tsx` — read; clean
- `src/components/common/control-geometry.ts` — delta read; clean
- `src/components/common/identity-row.tsx` — read; clean
- `src/components/common/link-card.tsx` — read; clean
- `src/components/common/motion.tsx` — delta read (comment only); clean
- `src/components/common/person-name.tsx` — read; clean
- `src/components/common/step-dots.tsx` — read; clean
- `src/components/directory/alumni-map.tsx` — delta skimmed (C7a read it whole: clean); clean
- `src/components/directory/directory-grid.tsx` — delta read; clean
- `src/components/directory/profile-card.tsx` — delta read; clean
- `src/components/feed/feed-rail.tsx` — read; clean
- `src/components/feed/rail/letters-module.tsx` — delta read (import only); clean
- `src/components/feed/rail/rail-skeleton.tsx` — delta read; clean
- `src/components/guide/chapters/catchups.tsx` — copy checked against constants; clean
- `src/components/guide/chapters/collection.tsx` — copy checked; clean
- `src/components/guide/chapters/directory.tsx` — copy checked; clean
- `src/components/guide/chapters/feed.tsx` — copy checked; clean
- `src/components/guide/chapters/index.tsx` — read; clean
- `src/components/guide/chapters/letters.tsx` — copy checked; clean
- `src/components/guide/door-coach.tsx` — read; clean
- `src/components/guide/guide-body.tsx` — read; clean
- `src/components/guide/guide-cover.tsx` — read; clean
- `src/components/guide/guide-photos.ts` — read; clean
- `src/components/guide/guide-tour-start.tsx` — read; clean
- `src/components/guide/tap.tsx` — read; clean
- `src/components/landing/landing-nav.tsx` — read; clean (dormant: only `showcase.tsx`, itself unmounted, and a lab room render it — L7)
- `src/components/layout/rail-grid.ts` — read; clean
- `src/components/onboarding/onboarding-flow.tsx` — read whole (C7a's too); clean
- `src/components/onboarding/step-kit.tsx` — read; clean
- `src/components/onboarding/steps/done-step.tsx` — read; clean
- `src/components/onboarding/steps/houses-step.tsx` — read; clean
- `src/components/onboarding/steps/photo-step.tsx` — read; clean
- `src/components/onboarding/steps/welcome-step.tsx` — read; clean
- `src/components/onboarding/types.ts` — read; clean
- `src/components/profile/house-chain-editor.tsx` — delta read; clean
- `src/components/profile/stray-hair-ids.ts` — read; clean
- `src/components/support/support-shell.tsx` — delta read; clean
- `src/lib/caption-tidy.ts` — delta read (comment only); clean
- `src/lib/city-coords.ts` — delta read; clean (the moved folds are byte-identical in `normalize.ts:173-187`)
- `src/lib/guide-areas.ts` — read; clean
- `src/lib/guide-open.ts` — read; clean
- `src/lib/guide-tour.ts` — read; clean
- `src/lib/house-spans.ts` — delta read; clean
- `src/lib/map-cluster.ts` — delta read (comment only); clean
- `src/lib/profession-tags.ts` — delta read; clean (19 tags, `VOCAB_MAX` 20, `TAG_VISIBLE_MAX` 18; the tie-break caveat is written down as the owner's open call)
- `src/lib/trivia-sample.ts` — skimmed; clean (imported only by `src/app/lab/trivia-gate/page.lab.tsx`)

## Findings

### C7b-01 — Pressing Check with nothing typed spends one of the address's eight tries, shakes the bird's head and says "Not quite", and the trivia room then counts that visitor as someone who "had a go" and missed
- Severity: Low (a member who presses Enter to drop the phone keyboard, or taps Check before typing, is told they were wrong about nothing; on a shared connection, the Centenary's venue Wi-Fi above all, every empty press is one of eight tries per ten minutes the whole room shares)
- Confidence: certain on the path (every line quoted); what would change my mind: a `required`/empty guard somewhere between the form and `judge`, which there is not.
- Where:
  - `src/components/auth/trivia-gate.tsx:111-127` — `handleSubmit`: `if (!question || checking || passed) return;` then `saysDontKnow(answer)` (false for "" — `trivia-dont-know.ts:58`, `words.length === 0` returns false), then `await checkTrivia(question.id, answer)` with `answer === ""`
  - `src/components/auth/trivia-gate.tsx:236-269` — the `<input>` has no `required`, and the Check button is `disabled={!question || checking || passed}`: nothing looks at the box
  - `src/components/auth/trivia-actions.ts:97-100` — `rateLimit("trivia", ip)` (`rate-limit.ts:84`, 8 per 10 minutes per IP) is spent BEFORE the answer is read; `:110-123` `judge(q, "")` → `normalize("") === ""` matches nothing (`trivia-bank.ts:259-280`) → a `wrong` row is recorded and "Not quite. Have another go." returned; `trivia-gate.tsx:146-147` sets that error and plays `hoopoe.react("wrong")`
  - `src/lib/trivia-log.ts:120` — `answer: e.answer ? e.answer.trim().slice(0, ANSWER_MAX) || null : null`: the row is kept, with a null answer
  - `src/lib/trivia-report.ts:63, 65, 393` — `wrong` is a TYPED kind and a MISS, so the browser counts in `tried` ("Had a go", `door.tsx:18`), its showing is marked `missed` (a later swap ends it as "missed", not "moved on", `:136-142`), and if they never get in they appear under "Couldn't get in"
  - `src/components/admin/trivia/trails.tsx:73-77` — `s.answer && s.kind !== "skipped" ? <Typed> : <span>skipped</span>`: the empty `wrong` step is drawn as a red ✗ followed by the word "skipped"
- Taxonomy: 6h (the empty value on every input), 6i (pending courtesy, not a guard), comment-adjacent (the "I don't know" module's own premise, `trivia-dont-know.ts:11-14`: "a server round trip would spend one of the eight attempts ... on a person who was only asking to move on" — an empty press is the same person and gets the round trip)
- Expected: an empty box asks for an answer, and costs nothing (the reasoning `trivia-dont-know.ts` gives for keeping "I don't know" off the server applies with more force to nothing at all).
- Actual: an empty press is judged, metered, logged and answered as a wrong guess. It also composes with the "I don't know" path: "idk" + Enter swaps and clears the box (`:117-120`, `swapQuestion` sets `answer` to ""), so a second Enter before the new question arrives sends `checkTrivia(<the old question>, "")` — queued behind the swap (Next dispatches a client's actions one at a time, `node_modules/next/dist/docs/01-app/02-guides/server-actions.md:28`), it lands after the new question is on screen and prints "Not quite" under a question the visitor has not yet read.
- Why: the gate's only pre-submit checks are about the question and the in-flight flag; the empty case was never one of them.
- Proof: argue-only on production (any press writes a row and spends a meter). Locally: open `/signup` on a dev server with `PRESENCE_IN_DEV=1`, press Check on an empty box → "Not quite. Have another go."; `SELECT kind, answer FROM "TriviaEvent" ORDER BY "createdAt" DESC LIMIT 1` → `wrong | NULL`.
- Fix direction: refuse an answer that normalises to nothing in the browser (disable Check while `normalize(answer)` is empty, or show "Type an answer, or tap the arrow for another question" without a round trip), and have `checkTrivia` return early, before the meter and the log, when `normalize(typed)` is empty. Draw an answer-less `wrong` step (if any survive) as a dash rather than "skipped".
- Gate: a unit test that `checkTrivia(id, "   ")` neither calls `rateLimit` nor `recordTrivia` (source pin in `trivia-log-rule.test.mjs`), and a component-level rule that the Check button is disabled for an empty box.
- Known-related: T5-07 (the per-IP meters sized for one person per address — this is a way to spend them for nothing); C4-01 (the same table; not about volume). Not C5-03 (the answers being public).

### C7b-02 — The swap arrow has no in-flight guard: a double tap sends two swaps that both exclude the first question, and the room books a phantom showing and an extra "moved on" — the numbers the owner uses to decide which questions to retire
- Severity: Low (no member is blocked; the owner's per-question verdicts, "Often skipped" at 30% moved-on, drift by one showing per double tap)
- Confidence: certain on the mechanism; likely on frequency (a small 24px icon that visibly rolls half a turn per press invites a second press)
- Where:
  - `src/components/auth/trivia-gate.tsx:95-109` — `swapQuestion`: the guard is `if (!question || checking || passed) return;` and there is no `swapping` state; `getTriviaQuestion(question.id, said)` reads `question` from the render's closure
  - `src/components/auth/trivia-gate.tsx:206-212` — the button is `disabled={checking || passed}` only
  - `src/components/auth/trivia-actions.ts:55-77` — every call with a known `excludeId` writes `skipped` (or `dontknow`) for it plus `shown` for the new question, unconditionally
  - `src/lib/trivia-report.ts:125-128` — a row whose question is not the open showing's closes the open one ("left" when nothing was missed, `:101-106`) and opens its own
- Taxonomy: 6i (double-submit), 6c(3) shape (two calls from one stale closure)
- Expected: one press, one swap; one showing per question put in front of someone (`trivia-report.ts:11-18`: "THE UNIT IS A SHOWING").
- Actual: tap-tap on Q1. React 19 commits the first click before the second (TRAPS), but nothing it commits disables the arrow, so both clicks call `getTriviaQuestion("Q1")`. Next runs them one after the other: call 1 logs `skipped Q1, shown Q2` and shows Q2; call 2 logs `skipped Q1, shown Q3` (Q3 may be Q2 again — only Q1 was excluded) and shows Q3. The report reads: Q1 moved-on, Q2 shown and then "left" without anyone typing (the second `skipped Q1` closes it), Q1 moved-on again (a showing that never happened), Q3 open. So Q1's moved-on count is doubled and Q2 carries a "left" nobody chose. For the visitor, a person who meant to skip two questions can land back on the one they just skipped (Q2 is not excluded by the second call).
- Why: the guard copies `handleSubmit`'s (question, checking, passed) and forgets that a swap is itself in flight.
- Proof: argue-only on production; locally with `PRESENCE_IN_DEV=1`, double-click the arrow and read the last four `TriviaEvent` rows for the browser: two `skipped` on the same question.
- Fix direction: a `swapping` flag (state, or a ref set synchronously like `create-catchup-form.tsx:66`) that `swapQuestion` sets and clears in `finally`, and `disabled={checking || passed || swapping}` on the arrow (and on Check, so a press cannot judge the question that is leaving).
- Gate: a source pin that `swapQuestion` returns early on an in-flight swap and the arrow's `disabled` names it.
- Known-related: L7's row for this file (effects only, `L7.md:83`) — not this; C4-01 (the swap path is unmetered — this is the client half that doubles it for free).

### C7b-03 — If the first question fails to load, the entry gate sits on "..." for good: Check is disabled, the swap arrow is not drawn, and the toast says "try again" with nothing to press; the comment above it says this exact dead end was fixed
- Severity: Low (needs the first action call to fail — a dropped connection on a phone, or a deploy landing between the page and its action; the way out is a reload nobody is told about, on the one screen every newcomer must pass)
- Confidence: certain on the mechanism
- Where: `src/components/auth/trivia-gate.tsx:75-87` — `callAction(() => getTriviaQuestion()).then((q) => { if ("error" in q) { toast.error(q.error); return; } setQuestion(q); })`, run once on mount, no retry; the comment: "a rejected fetch ... used to be an unhandled rejection with `question` left null forever, so the gate sat on '...' with a permanently-disabled submit and no way out (audit B-042)"; `:194` (`question ? ... : "..."`), `:203` (the arrow renders only when `question` is set), `:266` (`disabled={!question || ...}`); `src/lib/call-action.ts:23` — the toast is `ACTION_FAILED`, "That did not go through. Check your connection and try again."
- Taxonomy: 6k (network down at the first call), comment-that-lies, 6a (error surfaced, execution continues into a dead state)
- Expected: the B-042 fix's promise — no permanently-disabled gate with no way out.
- Actual: the unhandled rejection is gone and a toast appears; everything else the comment describes is still true: "..." stays, Check stays disabled, and there is no control that retries. The only exits are the browser's reload and the "Sign in" link.
- Proof: argue-only (needs a failed action). Locally: block the action POST in devtools before loading `/signup` → toast, "...", disabled Check, no arrow.
- Fix direction: on the initial failure, render a retry in place of the question ("Couldn't load the question. Try again" as a button that re-runs the same call), or render the arrow whenever `question` is null and not loading so it doubles as the retry; correct the comment.
- Gate: a source pin that the mount fetch's error branch leaves a control that re-calls `getTriviaQuestion`.
- Known-related: B-042 (audit 1; this is its incomplete half on the gate); T5-05 (the signup dead end after 30 minutes — a different dead end on the same screen).

### C7b-04 — What a newcomer typed can break its row in the trivia room: a long answer with no spaces runs out of its card and under the Accept button (the `break-words` on it is inert on a flex item), and an RTL override reverses the label after it
- Severity: Low (admin-only; but the room's whole purpose is reading strangers' text, the Accept button is the one write, and a 200-character run is exactly what C4-01's flood or a pasted URL produces)
- Confidence: certain on the CSS (spec-level, below) and on the markup; no browser was used, so the pixel consequence is argued, not shot — the orchestrator can confirm in one MCP render of `/lab/trivia-gate` with a long invented answer
- Where:
  - `src/components/admin/trivia/parts.tsx:142-155` — `Typed`, a plain `<span>`, and its comment: "Long ones are clipped by the row, never by this." No row clips.
  - `src/components/admin/trivia/candidates.tsx:52-59` — `<li className="flex items-start gap-3 ...">` → `<div className="min-w-0 flex-1">` → `<p className="flex flex-wrap ...">` → `<Typed className="font-semibold">{c.typed}</Typed>`: the Typed span is a FLEX ITEM, whose automatic minimum width is its min-content width, the whole unbroken run; `:97` the "also typed" variants (each up to 200 characters) inside `metaLine`, same shape; `:103-120` the Accept `<Button>` is the next flex sibling
  - `src/components/admin/trivia/room.tsx:100-102` — the main room's candidates sit in `<Sheet>` with no overflow rule, so the run spills out of the card; `question-page.tsx:180-181` and `room.tsx:33, 137-139` put the other lists in `overflow-y-auto` sheets, which makes `overflow-x` auto too, so there the card grows a sideways scrollbar instead
  - `src/components/admin/trivia/trails.tsx:103` — `<Typed className="break-words">` inside `<p className="flex flex-wrap ...">` (`:102`): Tailwind 4.2's `break-words` is `overflow-wrap: break-word` (`node_modules/tailwindcss/dist/lib.js`, `e.utilities.static("break-words",()=>[l("overflow-wrap","break-word")])`), and CSS Text 3 says the soft wraps `break-word` introduces "are not considered when calculating min-content intrinsic sizes" — so on a flex item it never wraps; `wrap-anywhere` (`overflow-wrap: anywhere`) or `min-w-0` on the item is what does. `trails.tsx:69-79` (the stuck trails' steps) has no break rule at all.
  - RTL: `Typed` sets no `dir`/`unicode-bidi`, so a U+202E (RIGHT-TO-LEFT OVERRIDE) or U+202B in an answer is not isolated by its span and runs on through the closing quote and the sibling `<span>for {c.label}</span>` / `{e.label}` to the end of the paragraph (`candidates.tsx:54-58`, `trails.tsx:102-105`).
  - Where it can come from: `TriviaEvent.answer` keeps up to 200 characters of anything (`trivia-log.ts:53, 120`), from `checkTrivia` and from the swap's `said` (`trivia-actions.ts:65-71`); `html { overflow-x: clip }` (`globals.css:318-325`) is the only thing that stops the page itself scrolling sideways.
- Taxonomy: 6h (100k-char / unbroken strings, RTL overrides), comment-that-lies
- Expected: the `Typed` comment — long answers are contained by their row; the room reads strangers' words "as they typed it" without the words rearranging the room.
- Actual: on a 390px phone any unbroken run past ~35 characters (a URL, a keyboard mash, a bot's `xxxx…`) is wider than the row. In "Answers worth a look" it runs under the Accept button (painted after it, so the button stays on top but the text behind it is unreadable) and on past the card's edge to the viewport; in the capped lists the whole card scrolls sideways to show one answer. An answer containing U+202E reverses its own closing quote and the question label printed after it, so "for Thursday dinner" reads "rennid yadsruhT rof".
- Why: `break-words` was the right instinct on a block; the answers sit in flex rows, where it is a no-op. Nothing isolates bidi.
- Proof: one MCP pass, no sign-in needed beyond the lab's admin gate (or argue-only): render `/lab/trivia-gate` after editing nothing — the lab's sample answers are short, so for proof inject a long `typed` via devtools on the rendered DOM, or read `getComputedStyle(span).minWidth === "auto"` and the span's `scrollWidth` > the row's `clientWidth`. The CSS half is settled by the spec text quoted above.
- Fix direction: give `Typed` its own containment — `min-w-0 [overflow-wrap:anywhere]` (or Tailwind's `wrap-anywhere`) on the span, and `<bdi>` (or `unicode-bidi: isolate` / `dir="auto"`) as its element, so every list that uses it is fixed at once; correct the comment. The house already does this right in `link-card.tsx:98` (`break-words [overflow-wrap:anywhere]` with a `min-w-0` parent).
- Gate: a source pin that `Typed` carries `overflow-wrap:anywhere` (or `wrap-anywhere`) and isolates bidi; the naughty-strings pass below.
- Known-related: T7b's messages finding (the same class — wrap at spaces only — in `conversation.tsx:96-98`, `T7b.md:432-441`); not the same files.

### C7b-05 — Accepting an answer longer than 120 characters stores a cut-off copy that matches nothing: the toast says it "now gets in", the row keeps its Accept button, and the gate still turns it away
- Severity: Low (needs a long sentence to reach "Answers worth a look" — the "contains an accepted answer" rule puts exactly those there, `trivia-report.ts:335` — and the owner to press Accept; the cost is a false confirmation, a dead TriviaAnswer row shown as "accepted by you", and an audit line for a change that did nothing)
- Confidence: certain on the arithmetic
- Where:
  - `src/components/admin/trivia/candidates.tsx:109-115` — `acceptTriviaAnswer(c.questionId, c.typed)` with the toast `Accepted. “${c.typed}” now gets in.`; `c.typed` is the most-typed raw variant, up to `ANSWER_MAX` = 200 characters (`trivia-log.ts:53`, `trivia-report.ts:474, 483, 502`)
  - `src/app/(main)/admin/trivia/actions.ts:22-23, 36-37` — `MAX_TYPED = 120`; `words = typed.trim().slice(0, MAX_TYPED)`; `answer = normalize(words)` — the prefix, not the answer
  - `src/lib/trivia-bank.ts:265` — `if (guess && added.includes(guess))`: the gate matches added answers EXACTLY on `normalize(<the whole answer>)`, so the stored prefix never matches the 121+ character answer it was meant for
  - `src/lib/trivia-report.ts:497` — `acceptedSince = judge(g.q, variants[0], added(g.q.id)).ok` stays false, so the candidate stays listed with its button (`candidates.tsx:50, 103`); a second press hits the unique index → `isUniqueViolation` → `{ success: true }` (`actions.ts:57-62`) → the same "now gets in" toast again
- Taxonomy: 6h (exactly-at-limit / limit+1: two caps, 200 and 120, that do not agree), 6a (a success reported for a write that has no effect)
- Expected: the action's own header — "An accepted answer is a TriviaAnswer row, matched EXACTLY after normalize()" — and the toast's claim.
- Actual: for any candidate whose raw text is over 120 characters, Accept writes a row for its first 120, says the full answer now gets in, and changes nothing at the gate; the question page then lists the cut-off text under "What gets in" as "accepted by you" with 0 hits.
- Proof: pure, no database: `normalize("x".repeat(130)) !== normalize("x".repeat(130).slice(0,120))`, and `judge(q, long, [normalize(long.slice(0,120))]).ok === false` for any non-mention question (import `trivia-bank.ts` under plain Node, as its tests do).
- Fix direction: make the two caps one number (accept up to `ANSWER_MAX`, or refuse with a sentence when `typed.trim().length > MAX_TYPED` rather than truncating), and hide Accept in the room for a candidate the action would refuse. Consider whether a sentence-long answer should be acceptable at all (no second person types the same sentence): the room could offer it as evidence and leave Accept to short answers.
- Gate: a unit test that `acceptTriviaAnswer` never stores an `answer` different from `normalize(typed.trim())` (refuse instead).
- Known-related: C4's verified-clean line for `13f797bd` ("normalises, refuses <2 characters") — true, and the upper bound is where it slips.

### C7b-06 — A question's own page never says when the 30,000-row ceiling cut its range, and draws every answer and every turned-away group in that range with no cap
- Severity: Low (admin-only; real at the Centenary's volume or under C4-01's flood, when "Everything" on a question page silently means "the last ~50 hours")
- Confidence: certain
- Where: `src/app/(main)/admin/trivia/[questionId]/page.tsx:40` — `const { report, rows, added } = await loadGate(active);` drops `capped` (`src/lib/admin-trivia.ts:30-31, 94`), and `QuestionPage` has no prop for it; the main room does show it (`room.tsx:88`, `AdminCapped`); `src/components/admin/trivia/question-page.tsx:177-194` — `Candidates items={turnedAway}` (every distinct turned-away answer for the question, each a client-component prop carrying every variant and its members, `candidates.tsx:1, 33-48`) and `TypedLog events={answers}` (every typed row for the question, `trivia-report.ts:703`) with no slice, where the room slices to 6 / 30 / 40 (`room.tsx:26-28`)
- Taxonomy: 6j (unbounded list in a request), AdminCapped's own rule (`admin-chrome.tsx:79-86`: "A list that stops before the end says so"), C4's lead (T7b/UI: "check the room actually tells the owner when the ceiling clipped the range")
- Expected: the AdminCapped rule on every admin list that stops early; a bounded page.
- Actual: the main room says "Counting the newest 30,000 records in this range"; the question page, built from the same capped rows, does not. And its two lists render every row in the range: under C4-01's 14,400-rows-a-day flood that is thousands of list items (each Candidate shipped to the browser as serialised props with all its variants), on an admin phone.
- Proof: read the two lines; at today's 3 rows the page is fine.
- Fix direction: pass `capped` to `QuestionPage` and draw the same `AdminCapped` line; slice `answers` and `turnedAway` (newest N / most-people N) with an "N more" line, as the room does.
- Gate: a source pin that the question page reads `capped`.
- Known-related: C4-01 (the flood), C4's lead (answered: the main room does say so; the question page does not).

### C7b-07 — The "Day by day" strip's total counts a returning visitor once per day, so its "came" disagrees with The door above it; and on a computer, clicking the day you are pointing at clears the reading
- Severity: Low (admin cosmetic-with-teeth: two "came" figures on one page for one range that differ exactly in the case the 30-day cookie was built to count as one person)
- Confidence: certain
- Where: `src/components/admin/trivia/rhythm.tsx:39-44` — `total` sums `d.arrived` over the days and prints it as "Last N days · X came"; `src/lib/trivia-report.ts:571-575` — `daily[i].arrived++` once per (browser, valley day), so X is browser-days, while `door.arrived` is `byBrowser.size` (`:620`), distinct browsers; the cookie's stated purpose, `trivia-log.ts:55-63`: "a person who fails tonight and gets in tomorrow is one person in the room". `rhythm.tsx:74-77` — `onPointerEnter` (mouse) sets `active = i`, then `onClick` toggles `active === i ? null : i`, so a mouse click on the hovered column sets it back to null and the readout returns to the range total while the pointer is still on that day.
- Taxonomy: 6a (the same quantity computed two ways), comment vs code (`rhythm.tsx:16-19` says "A finger taps a day; a mouse just passes over it")
- Expected: one "came" per range; the strip's readout shows the day under the pointer.
- Actual: someone who tries Monday and again Tuesday is 1 at the door and 2 in the strip's sentence; through and joined agree (each counted once per browser). A desktop click on a day hides that day's numbers.
- Fix direction: print the range total from `report.door` (or label the strip's figure "visits"); make click a no-op for a mouse pointer (`pointerType` is on the click's PointerEvent in every current browser), keeping the tap toggle for touch.
- Gate: a `trivia-report` unit test that the strip's range total and `door.arrived` agree for a browser seen on two days, or that the strip's sentence does not use the summed figure.
- Known-related: none.

### C7b-08 — Fifteen links, among them "Start a Catch-up", wrap a `<Button>` inside the `<a>`: two tab stops and a button nested in a link for one action, where the house pattern (`render={<Link />}`) is already used ten times
- Severity: Low (keyboard and screen-reader members: Tab lands on an unlabelled-looking link first, then on the button inside it; a screen reader announces "link" then "button" for one control; HTML forbids interactive content inside `<a>`)
- Confidence: certain on the markup; the behaviour follows from it (the Base UI Button renders a native `<button>` unless told `nativeButton={false}`)
- Where (every instance outside `src/app/lab`, by a multi-line grep for `<Link …>` directly followed by `<Button`): `src/components/catchups/not-available.tsx:32-34`, `src/components/catchups/edition/not-yet-published.tsx:53-55`, `src/app/(main)/catchups/(index)/page.tsx:303, 318` (the admin list icon and "Start a Catch-up"), `src/app/(auth)/error.tsx:37`, `src/app/(main)/error.tsx:47`, `src/app/not-found.tsx:45`, `src/app/catchups/join/[token]/page.tsx:91, 154, 159`, `src/app/catchups/join/page.tsx:41`, `src/components/admin/messages/thread-view.tsx:69`, `src/components/admin/people/person-detail.tsx:157`, `src/components/catchups/answer/completion-card.tsx:55`, `src/components/profile/letterhead-profile.tsx:1403`. The right shape, already shipped: `src/app/(main)/guide/[area]/page.tsx:61` and `src/components/support/support-shell.tsx:98` (`<Button nativeButton={false} render={<Link href=… />}>`; 10 call sites).
- Taxonomy: 6b (component layer; "every clickable element has hover, focus-visible and active" — here the focused element is the outer link, which carries no focus-visible style of its own in most of these: e.g. `not-available.tsx:32` `className="mt-[var(--space-m)] inline-flex"`)
- Expected: one control, one tab stop, one role, the canopy focus ring on the thing that is focused.
- Actual: Tab focuses the `<a>` (browser default outline, or none), then the `<button>` inside (the canopy ring); Enter on the button works only because the click bubbles to Next's Link handler.
- Proof: done, read-only, signed out: `curl -s http://localhost:3000/catchups/join` (a public page, `src/app/catchups/join/page.tsx:41`) returns `<a class="mt-6 inline-flex" href="/"><button type="button" tabindex="0" data-slot="button" …>` — a focusable button inside a link with no focus style of its own.
- Fix direction: convert each to `<Button nativeButton={false} render={<Link href=… />}>…</Button>` (the guide page's form); a lint or source rule that a `<Button` never sits as the first child of a `<Link`.
- Gate: extend `link-import-rule.test.mjs` (it already reads every Link import) with "no `<Link …>\s*<Button`".
- Known-related: none found in candidates, reports or verdicts (grep for nested button/anchor came back empty).

## Verified clean
- Newcomers' text in the trivia room is only ever React text: `Typed` children, `metaLine` strings, chip labels and `toast` strings; the only attributes built from rows are counts (`parts.tsx:72, 84`, `generations.tsx:26`); no `dangerouslySetInnerHTML`, no `href` from row data (`grep` over `src/components/admin/trivia/`). C4's line stands; C7b-04 is layout, not escaping.
- Range filter: `isRange` whitelists `"7" | "30" | "all"` before `loadGate` (`(index)/page.tsx:30`, `[questionId]/page.tsx:36`, `trivia-ranges.ts:17-19`); an unknown question id 404s both in metadata and the page (`[questionId]/page.tsx:18, 35, 42`); every range link and the back link carry the range (`:43, 48, 53`, `(index)/page.tsx:32, 41, 45`).
- Accept/Stop accepting: Accept is disabled for every row while any one is in flight (`candidates.tsx:43, 108`), hidden for `acceptedSince || refused` (`:50, 103`), and the server treats P2002 as success; the `busy` key is per row; `useAdminAct` releases in `finally` (`use-admin-act.ts:76-80`); StopAccepting is per instance and the server's delete is `deleteMany` after a `findUnique` (idempotent).
- `PillNav` (`analytics/tabs.tsx:48-94`) is a server component; the `href` function passed from the trivia pages never crosses into a client component (`Link` receives a string).
- The trivia room's one motion (`grow.tsx`) is transform-only and runs once on mount; `HereNow`'s ping is transform+opacity.
- `Generations` table: cohort labels and the `·` empty cell are bounded strings; `table-fixed` with `truncate` row heads; the share is computed only from `answered >= 3`.
- `door.tsx` percentages divide only by a positive previous step (`:90`); `joined <= through` holds for every range because the link claims only rows from the 3 days before a signup that itself needs a pass under 30 minutes old (`trivia-log.ts:160-187`, `trivia-actions.ts:150-158`), so a member's `right` row is never older than their oldest linked row.
- `trivia-dont-know.ts`: `squash` is applied to both the vocabulary and the input, so doubled letters in CORE words ("forgotten", "cannot", "sorry", "pass") still match; any non-vocabulary word sends the text to the server; nothing there is secret.
- Gate client, other paths: `handleSubmit` checks through `try/catch` (no unhandled rejection), clears `checking` on every branch, and the pass celebration's `setTimeout(onPass, 1150)` is harmless after unmount; the ResizeObserver is disconnected; Next dispatches a client's actions one at a time, so swap responses cannot arrive out of order (`server-actions.md:28`) — C7b-02 is the stale-closure half only.
- Create-a-Catch-up: the ref guard stops a same-frame double press; after success the `finally` re-enables the button while `router.push` is pending, but `createCatchupWithPeople`'s twin check (`catchups/actions.ts:497-516`, `DOUBLE_SUBMIT_MS = 10_000`) hands back the first Catch-up, so a second press during navigation creates nothing. The new page's batch lookup relies on "a member is only ever in their own batch's group", which `syncBatchGroup` enforces on both edit paths and the nightly heal (`batch-catchups.ts:230-253`, pinned by `batch-catchups.test.mjs:307-325`).
- Voice tape/clip: `validVoiceSeconds` requires an integer >= `VOICE_MIN_SECONDS` = 1 (`voice-answer-rule.ts:21, 103-110`), so `nudge`'s `/ seconds` never divides by zero; the arrow keys are handled on the button only and nothing global listens on the reader (L7 confirmed). L7's two notes (`void a.play()` with no catch; `preload="metadata"` per tape) are not re-reported.
- Link wrapper (`common/link.tsx`): passes every prop through with `prefetch=false` by default; the one-line import swaps in picture-door, not-available, not-yet-published, archived-row, admin-chrome, admin-person-row, identity-row, person-name, letters-module, profile-card, landing-nav, guidelines and support-shell change nothing else.
- Collection order labels: the four labels moved together in `RIVER_ORDERS`; `orderLabel`'s fallback reads the list's own first label; the skeleton's invisible placeholder text matches the new longest default ("Recently added"); the guide chapter's sentence matches the new names; no stale "Chronological"/"Newest" survives in member copy.
- Directory `hideCity`: the server folds the filter's cities through `cityFilterTargets` + `normalizeCity` (`directory/page.tsx:418-427`) and the card folds the row's city with the same `normalizeCity`; the memo comparator compares `hideCity` first, so a row re-renders when the filter changes; a miss only ever shows the city (the safe direction).
- `city-coords.ts` → `normalize.ts`: the two moved folds are byte-identical (`normalize.ts:173-187`), and the re-export keeps every import working.
- Feed rail: Pulse removed from both the rail and its skeleton; the skeleton's seven name bars match `DirectoryModule`'s `take: 7`. (The rail is sticky and deliberately not a scroll container, so on a window shorter than ~900px with a letter that week its last rows sit below the fold until the feed ends; 10987ae6 records the owner choosing seven against a 900px window, so not reported.)
- Guide: `/guide/welcome` 404s (no CHAPTER), as `guide-areas.ts:64-67` says; prototype keys (`__proto__`, `constructor`) cannot reach `CHAPTERS[...]` because `findGuideArea` returns undefined first; every claim in the five chapters checked against code — three photographs (`MAX_IMAGES = 3`), three days of questions and a week to answer (`catchups-core.ts:110-111`), reminders off by default (`schema.prisma:1305`), contact details only to verified members, the city puts you on the map; `DoorCoach`'s listeners and timer are all released and its `onDone` is a stable callback (`guide-layer.tsx:72`); `GuideTourStart`'s module latch is released on unmount so Strict Mode cannot strand it.
- Onboarding: the houses step is dropped by the same `careerRange` the chain editor uses, so the two cannot disagree; a `?step=houses` deep link with no houses step lands on Register; Back/Next read the current render's step, and an exiting step's buttons (AnimatePresence `mode="wait"`) can only re-request the step already showing; Done's "Batchmates can find you in the Directory now" holds (the directory lists every unblocked, non-deleting account, `directory/where.ts:71`).
- Admin nav: `/admin/trivia` and `/admin/trivia/<id>` light only "Trivia gate" (`isAdminSectionActive`, prefix + "/"); the "nine rows" comments in `admin-nav.ts:24-27` and `sidebar.tsx:275, 358, 658` are stale (twelve sections now), but the rail's admin list is a scroller (`sidebar.tsx:661`), so nothing is cut off.
- Guidelines page: "the reporter hears back" holds (`admin/reports/actions.ts` notes the reporter's thread on settle).

## Leads for other territories
- C7a — `src/components/auth/trivia-gate.tsx` is on both boards; C7b-01..03 are the findings here, so dedupe there.
- L7 / T8b — `formatTimeAgo` inside a client component: `candidates.tsx:98` is `"use client"`, so its "Nm ago" is computed at SSR and again at hydration and mismatches when a minute boundary falls between the two (`trails.tsx:64, 116` are server components and fine). App-wide pattern, not chased; only worth a look if hydration warnings appear in the console.
- T8b — the stale "nine rows" comments (`admin-nav.ts:24-27`, `sidebar.tsx:275, 358, 658`): comment drift only.
- Owner — the sticky feed rail is taller than a 768px laptop window in a week with a letter (seven directory rows were chosen against 900px, 10987ae6); its last rows are unreachable until the feed ends.

## Inputs for the live naughty-strings pass
- Trivia gate answer box and the "I don't know" swap (`trivia-gate.tsx:236`, `checkTrivia`/`getTriviaQuestion(…, said)`) → `TriviaEvent.answer` (≤200) → `/admin/trivia` "Answers worth a look", "What people typed", "Couldn't get in", and each question page's "Turned away" / "Every answer". Payloads that matter: (1) 200 × `W` or a 120-character URL with no spaces (C7b-04: runs out of the card / under Accept; on 390px anything past ~35 characters); (2) a string containing U+202E or U+202B followed by ordinary words (C7b-04: the row's label reverses); (3) 121-200 characters that contain an accepted answer, so it surfaces as a "contains" candidate, then press Accept on the throwaway local database (C7b-05); (4) the empty string and whitespace-only (C7b-01: judged as wrong); (5) zero-width-only (`​`, `‌`): `normalize` strips it to "" — same as (4); (6) combining-mark stacks (Zalgo) — row height in the capped lists; (7) HTML/`<script>` — React text, should be inert.
- `acceptTriviaAnswer(questionId, typed)` called directly with a 121+ character `typed` (C7b-05).

## Coverage
- Read completely: every file in section B marked "read" above, plus, on the path of a finding or a check: `src/lib/trivia-report.ts` (all 706 lines — C4 had read only two functions), `src/lib/admin-trivia.ts`, `src/lib/trivia-ranges.ts`, `src/app/(main)/admin/trivia/actions.ts`, `src/components/admin/use-admin-act.ts`, `src/lib/call-action.ts`, `src/components/common/link.tsx`, `src/components/ui/button.tsx` (variants), `src/app/(main)/guide/[area]/page.tsx`.
- Read in part: `src/components/auth/trivia-actions.ts:1-160`; `src/lib/trivia-log.ts:88-165`; `src/lib/trivia-bank.ts:190-286`; `src/app/(main)/catchups/actions.ts:450-570`; `src/lib/batch-catchups.ts:230-260`; `src/lib/voice-answer-rule.ts` (caps and `validVoiceSeconds`); `src/components/catchups/edition/reader.tsx:165-185`; `src/app/(main)/directory/page.tsx:405-430`; `src/app/(main)/directory/where.ts:60-80`; `src/lib/normalize.ts:170-190`; `src/components/layout/sidebar.tsx:650-745`; `src/components/guide/guide-layer.tsx` (DoorCoach wiring); `src/app/globals.css:310-335`; `docs/audit-fix/.../reports/C4.md`, `C5.md`, `L7.md` (trivia-gate, voice rows), `T7b.md:432-441`, `C7a.md` (board only).
- Skimmed: `src/lib/trivia-sample.ts` (lab-only data generator); `src/components/directory/alumni-map.tsx` delta (C7a read the file whole); `src/lib/profession-tags.ts` (vocabulary text).
- Not read: section A files outside the seven shared ones (C7a's); `people-picker.tsx`, `voice-recorder.tsx`, `register-step.tsx` (not in section B, and C4/L7 cover the recorder and the onboarding writes); the trivia room's loading skeletons (excluded).
- Database: none needed — every finding is a client or a pure-function path, and the three live `TriviaEvent` rows prove nothing either way.
- Taxonomy rows applied with zero new findings and genuinely verified clean: 6b effects and cleanup on every new client file (door coach, tour start, voice clip, rhythm, gate, onboarding flow); 6c(1) double-submit on Create a Catch-up and Accept; 6h dates on the room's strip (valley days read back in UTC, `rhythm.tsx:30-34`) and on `NotYetPublished`'s opening date; escaping of untrusted text in the room.
- Taxonomy rows not applicable here: 6d, 6e, 6f, 6g (no server write path is new in these files beyond C4's).
- Could not verify: the pixel consequence of C7b-04 (no browser by rule — settled by the CSS spec and Tailwind's own definition, one MCP render would show it).

Verdict: NOT DRY, but thin. No new Medium or higher. Eight Lows: three on the entry gate's client (C7b-01 an empty press is judged, metered and logged as a miss; C7b-02 the swap arrow double-fires and skews the room's verdicts; C7b-03 a failed first load is a dead end its comment says was fixed), four in the new trivia room (C7b-04 strangers' long or RTL text breaks its row; C7b-05 Accept over 120 characters stores a prefix that matches nothing yet reports success; C7b-06 the question page hides the row ceiling and draws unbounded lists; C7b-07 the strip's "came" disagrees with the door), and one app-wide (C7b-08 fifteen buttons nested in links, "Start a Catch-up" among them).

STATUS: COMPLETE at HEAD 36ed27d3
