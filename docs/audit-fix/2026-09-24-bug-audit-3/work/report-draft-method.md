<!-- Draft of the report's fixed sections; merged into bug-report-3.md at close-out. -->

## How this audit was run

**Scope.** The whole application as it stood at `70570bcd` (2026-09-23): ~142,000 lines of
application TypeScript outside the `/lab` rooms, 22 server-action files, 18 API routes, 41 tables,
the four GitHub workflows, the Vercel crons and the production-writing scripts. `/lab` pages were
out of scope except `src/app/lab/actions.ts` and the admin gate on the lab layout.

**Why this decomposition.** Territories were cut by write-path density (Glasswing's
likelihood-first ranking: the Catch-ups actions file, the analytics loader and the feed actions led
the list), and every question that falls between territories — races, caching, dates, silent
failures, the 2,000-member arithmetic, input edges, React effects, platform limits, test honesty,
identity states, jobs, write-path invariants — got a lens of its own, so no file belonged to nobody
and no question belonged to no file.

**The fleet.** 13 territory finders and 12 cross-cutting lenses, each briefed with the owner's words
verbatim (`work/brief-common.md`), its own charter (`work/charters.md`), the dedup baseline, and the
routed leads other agents sent it (`work/leads-routed.md`, maintained by the orchestrator). The first
half of the fleet ran on Fable 5.1; an Anthropic session limit at 03:05 BST killed seven agents
mid-run, and the rest of the fleet (the seven resumed from their partial reports, the lenses not yet
launched, and every validator) ran on Opus 5.5 after the owner switched the session model.

**Validation.** Anthropic's review-pipeline shape: one adversarial validator per zone whose only job
was to refute ("if you are not certain the issue is real, do not confirm it"), re-derive every
citation, catch duplicates and known items, and rule severity (`work/brief-validator.md`,
`work/verdicts/`). The orchestrator hand-verified every High at source and proved the ones that could
be proved safely live.

**Live work.** A throwaway account, "Audit TestBird" <sanan.shankar+audit3@gmail.com>, created
through the real signup, drove the browser (chrome-devtools) through every input an unconfirmed
member can reach, with naughty strings (`work/live/blns-live.md`). Admin-side checks that needed no
save ran as the owner's designated test account, Jerry Maguire, from a Node script. No SQL writes
were made; every database read was a SELECT or EXPLAIN. The throwaway account and everything it
created were deleted before the close (see "Cleanup").

**What was not done live, and why.** Every write that needs a confirmed member (posts, comments,
letters, Catch-up answers and questions, captions, contributions, messages to admins, reports). The
throwaway account could not be confirmed without reading a mailbox or writing SQL, and writing as
Jerry would put text in front of real members. Those paths are argued from code, with the proof each
finding would need written into it. One live run that typed into the edit dialog of a real member's
photograph (without saving) was refused by the session's safety classifier and was not retried.
