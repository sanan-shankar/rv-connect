<!-- Draft of the report's live-evidence sections; merged into bug-report-3.md at close-out. -->

## How to read the findings

- **IDs.** Every finding has a stable id, `B-001` onwards, in severity order and, within a severity,
  in the order of the fix plan. The `sources` tag names the finder and validator records it was
  compiled from (`T4b-02`, `V-T8`, …); those records are in `work/reports/` and `work/verdicts/`
  and carry the full argument, every citation and the reproduction. Where two finders reported one
  defect, the finding says which was canonical and the other id is listed as folded.
- **Severity** follows the brief's scale: **Critical** — data loss or corruption, the site down or
  read-only for everyone, reached by ordinary use or one hostile machine; **High** — wrong behaviour a
  member will hit; **Medium** — an edge case or a degradation; **Low** — cosmetic with teeth. Severity
  is about the member and the owner, not the code.
- **Status.** **Confirmed** means the defect was reproduced or observed — in the browser as the
  throwaway account (*live*), in the production rows (*data*), by running the real code offline
  (*executed*), or by a deterministic path that an adversarial validator and the orchestrator each
  re-derived from source with nothing environmental in the way (*source*). **Suspected** means the
  mechanism is argued from code but depends on timing, a vendor's behaviour or load that could not be
  safely proven here; each says the one check that would settle it.
- **Line numbers** were re-derived by the validators at `70570bcd`. Audit 2's verifiers found that
  half of all findings carry a wrong detail; this audit's validators corrected every one they found,
  but a fix session still opens the file and re-reads the range before editing.

## The live evidence, in one place

**The throwaway account.** "Audit TestBird" (sanan.shankar+audit3@gmail.com, batch 1980 — a batch
with no other member), created through the real signup at 01:21 UTC (02:21 BST). It stayed **unconfirmed** for
the whole audit: confirming needs the mailbox or an SQL write, and the verification mail it
triggered was — this is finding O-05 — **sent by production, to the owner's own inbox**, although it
was queued by a laptop whose "never mail real people" guard is on. It was deleted through the admin
panel's "Delete for good" at the close, and every table was checked empty of it (see Cleanup).

**What was driven live** (`work/live/blns-live.md` has the full table): every input an unconfirmed
member can reach — the signup and onboarding steps, the profile's name, occupation, organisation and
About fields, the contact editor, the directory, feed, Collection and place searches, the like
button, hostile URLs on every list route. Naughty strings went through each. Four new findings came
out of it (O-05, O-06, V-O-B, V-O-C) and five territory findings were confirmed at runtime (T6-04,
T6-05, T6-06, T6-12, T6-15); one was refuted (T4b-08) and one downgraded (T4b-13).

**What was not driven live, and how it was covered instead.** Every write that needs a confirmed
member — posts, comments, letters, Catch-up answers and questions, captions, contributions, reports,
messages to the admins — because the account could not be confirmed, and writing as the owner's test
account would put text in front of real members. Those inputs were covered twice over: argued from
code by their territory finders, and executed offline — the naughty-strings list run through every
pure function that processes them (the rich-text renderer and serializer, every Zod schema, the LIKE
escaper, the name and phone normalisers, the link-preview parser, the magazine layout) by the L6
lens. One admin-side run was refused by the session's safety classifier (typing into the edit dialog
of a real member's photograph, without saving) and was not retried; its finding (T4b-13) was settled
from Base UI's source instead.

**The crawl baseline, explained.** The Phase-0 crawl timed out on /birds, /guide, two profiles, /,
/login, /signup and /lab. None of it is a route defect: signed out, every one of those routes answers
in 0.02–2.3 s; signed in, four parallel page loads from London hit cold Turbopack compiles of 20–82 s
AND the defect this report files as O-03 — the dev log shows `JWTSessionError … Connection terminated
due to connection timeout` as four overlapping authenticated renders queued on the pool of five across
a 200 ms-per-statement London→Mumbai link. From Vercel's Mumbai region the same pool holds each
connection for ~1–3 ms (L5), so production meets O-03 only when the database itself is slow — which
is exactly when it matters most. The visual suite's three reds were the directory's live data (two
shots, documented as masked in OPERATIONS §1) and a difference on /letters that is Next's own "1 Issue" error badge: the page hit a hydration error
while it was being photographed — O-01's timezone-less draft date (L9-09; the dev log shows the error at the
same moment). No spec listens for page errors, so the suite photographed the bug without naming it. `npm run check` was green (130/130) at the start.
