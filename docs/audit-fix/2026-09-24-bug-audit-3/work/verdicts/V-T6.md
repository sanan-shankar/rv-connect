# V-T6 — adversarial validation of T6 (people: profile, directory, places, onboarding, contacts, export)
Validator: V-T6 · Started: 2026-09-27 · Model: Opus 5.5 (claude-opus-5-5)
Assignment: T6-01..T6-15, plus the orchestrator's live candidates V-O-A, V-O-B, V-O-C (work/live/blns-live.md).
Method: work/brief-validator.md, read-only (SELECT/EXPLAIN only, no browser, no sign-in, no git, no gates).

## Status board (updated as each verdict lands)
- T6-01 — pending
- T6-02 — pending
- T6-03 — pending
- T6-04 — pending
- T6-05 — pending
- T6-06 — pending
- T6-07 — pending
- T6-08 — pending
- T6-09 — pending
- T6-10 — pending
- T6-11 — pending
- T6-12 — pending
- T6-13 — pending
- T6-14 — pending
- T6-15 — pending
- V-O-A — pending
- V-O-B — pending
- V-O-C — pending

## Verdicts

### T6-01 — DUPLICATE of T7a-06
Verdict: DUPLICATE of T7a-06 (T7a-06 canonical; mechanism CONFIRMED, severity Medium stands)
Confidence in verdict: certain
Citations re-derived: `profile-actions.ts:242-248` correct (comment 242-245, the `if` + call at 246-248); `roster.ts:47-49` correct (the refusal pair is 48-49), `:51-56` email arm correct, `:77-86` CAS correct, `:36-46` the read correct, `:97-104` the wrapper correct, `:24-28` the docblock promise correct; `admin/people/actions.ts:630-654` `adminUnverifyUser` correct (writes `verifyState "unverified", verifyMethod null, verifiedAt null`); the four other doors correct by grep of every caller: `email-actions.ts:200`, `:406`, `verification-actions.ts:47`, `admin/people/actions.ts:190`; `admin-profile-tools.tsx:136` copy correct ("Their leaf mark disappears and they return to the review queue").
What I tried to refute it with: (1) a caller that checks an admin decision before the roster runs — none; `tryRosterAutoVerify` reads only `emailVerified` and `verifyState`; (2) whether the admin re-run at `:190` is deliberate — it is, and PINNED by `admin-rule.test.mjs:160-164` ("an admin fixing a name or batch year no longer re-checks the office roster"), which pins the trigger without considering a revoked row, so the gate protects the defect; (3) whether `verifyMethod` survives the unverify to be read — no, it is nulled; (4) whether an admin has another durable state — `flagged` has NO writer anywhere in `src/` (grep: only readers; `report-action.ts:322` records that the last writer was removed), so blocking is the only state that sticks; (5) live history — the two `admin.unverify` rows ever written (2026-09-07 14:43 UTC and 2026-09-20 20:09 UTC) were each followed within two minutes by the admin's own `admin.verify` (tests or reversals), so no member has yet been flipped back by the roster; the population that would flip by the email arm right now is 0.
Why it stands / falls: the mechanism is exactly as written and certain. The sharpest trigger is not the profile edit but "Ask to be verified" (`verification-actions.ts:47`): a member whose leaf an admin removed will press it at the next refused write, and is re-verified instantly with `office_list` — so an unverify is ineffective precisely against a name+batch roster collision, the case an admin would most want to reverse. It falls as a separate finding because T7a-06 (on disk first, owner of `adminUnverifyUser`) is the same defect with the same five callers and the same fix on the row; T6 itself says "T7a owns the admin action; this finding is the profile-side trigger list".
Live check run: `SELECT count(*) FROM "AuditLog" WHERE action='admin.unverify'` = 2; each target's later audit row is an `admin.verify` 4 s and 117 s later; flip-by-email population = 0; `verifyMethod='office_list'` = 70 of 225 verified (T6's "68 of 214" was the 2026-09-24 count).
Corrections to the finding: (a) "The admin's only durable tool is 'flagged', which the UI does not offer from the profile" is wrong — `flagged` has no writer at all (T7a-08); the only durable tool is blocking. (b) Name "Ask to be verified" as the likeliest trigger in the Actual. (c) The fix must also update `admin-rule.test.mjs:160-164` (it pins the admin re-run) and the roster docblock `roster.ts:12-17` (L9 A14: it names onboarding, which no longer writes a year, and omits the profile and admin callers). Fold all three into T7a-06.
Orchestrator action: none needed (a live flip needs a roster row for a throwaway account — a write the owner would have to allow).

