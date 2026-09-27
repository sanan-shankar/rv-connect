


## 2026-09-27 (catchups, batches) — a batch Catch-up runs every three months

In the guide memo the owner described a batch Catch-up as quarterly, then: "if it's monthly now,
make it quarterly." They were monthly, and not by anyone's decision: `ensureBatchCatchup` wrote no
cadence, so each row took the column default, and a batch has no Keeper, so nothing in the app could
change it. `BATCH_CADENCE` in `catchups-core.ts` is now "quarterly" and `ensureBatchCatchup` writes
it on every batch Catch-up it makes; `batch-catchups.test.mjs` pins both the value and the write.

The nine that exist moved with
`prisma/migrations-manual/2026-09-27-batch-catchups-quarterly.sql`, applied to the main database
(the demo's are seeded). Eight are still in Edition 1 waiting for three questions, with nothing
booked, so only the word changed and the gap applies when each publishes. 2024 had published on 6
September with its next Edition booked for 6 October; it is now 6 December at the same minute,
re-anchored the way a Keeper's rhythm change re-anchors. Dry-run first (it matched the nine and
computed that one date), applied (9 rows), re-run (0 rows). Safe before the deploy: the running
build already knows "quarterly". `catchups.md` §2.1 also had the live batch list at two; it is nine.
`check` green.
