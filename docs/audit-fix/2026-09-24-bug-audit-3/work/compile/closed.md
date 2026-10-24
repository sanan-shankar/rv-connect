### Closed during the audit (51)

| id | ruling | why | was |
|---|---|---|---|
| L11-01 | FIXED-SINCE | a281e855 — R2 rejected both CLI tag strategies; the sync now raises the multipart threshold to 5 GB and uses `--copy-props default`, so every copy… | High: The photo archive's only backup has failed every night since 2026-08-29: the 111 largest… |
| L2-01 | FIXED-SINCE | 8d35ff4e ("fix(lab): every server-rendered room checks the admin role itself", 2026-09-29) | High: The /lab admin gate lives only in a layout, and a hand-crafted RSC request renders a lab… |
| L3-01 | FIXED-SINCE | d7a8041d ("feat(email): waiting for a confirmation email no longer locks anybody out", 2026-09-29) | Medium: On a day the mail budget is spent, every member queued two or more days out is told… |
| L3-08 | FIXED-SINCE | a281e855 ("fix(backup): copy media as plain CopyObjects R2 accepts", 2026-10-03) — not 7f28818c | High: (outside the date lens, found on the seeded question's path) The photo archive's only… |
| L6-01 | FIXED-SINCE | 5164de0f ("feat(feed): tagging in the composer works like Messages") | Medium: Editing a post, letter draft or answer that contains an @-mention silently turns every… |
| L8-05 | FIXED-SINCE | b6cbdfc0 ("bound the page-meta patterns so a hostile page parses in milliseconds"). | None: T2b-01 in platform terms: one hostile link burned Active CPU for the route's whole… |
| O-03 | FIXED-SINCE | e286daf0 ("fix(auth): a database that does not answer no longer signs the member out", 2026-09-29): the session callback catches the row read and… | High: A five-second wait for a pooled connection during the session read signs the member out:… |
| O-07 | FIXED-SINCE | 91c07fbc ("fix(database): encrypt every connection and verify it is Supabase", 2026-09-29): `src/lib/db-tls.ts` pins Supabase's 2021 root CA and… | High: The app's database connection is not encrypted: `pg` is given no `ssl` and the… |
| T2a-01 | FIXED-SINCE | e49e6265** — `syncBatchGroup` (`batch-catchups.ts:230-253`) moves a member out of every batch group their row does not name (membership, pref row… | High: Correcting a batch year leaves the member inside the wrong batch's Catch-up for ever,… |
| T2b-01 | FIXED-SINCE | b6cbdfc0 (the mechanism and the High were right at `495ecdd2`; the orchestrator's own timing stands as the record) | High: One pasted link to a hostile page makes the server spin for minutes in the background,… |
| T3-01 | FIXED-SINCE | 592e3526 (2026-09-29, "fix(catchups): the Picture row opens the picker; Start it again asks to"). The finding was CONFIRMED at 495ecdd2… | High: The Settings "Picture" row opens nothing: the picture picker is never mounted, so no… |
| T3-02 | FIXED-SINCE | 1439c83a (2026-09-27, "fix(catchups): a library photo or songs question is asked as one again"). CONFIRMED at 495ecdd2 (orchestrator hand-verified… | High: A question picked from the library loses its kind: the ask box never sends `category`,… |
| T3-03 | FIXED-SINCE | 592e3526 (the on-hold card's "Start it again" opened the settings confirm `{ shape: "confirm", key: "resume" }` instead of `router.refresh()`). The… | High: "Start it again" on the on-hold card does nothing but reload the page: the Catch-up… |
| T4a-05 | FIXED-SINCE | 9c992844 ("fix(collection): retry a missed direct upload, keep what arrives, and say so", 2026-09-27) | Medium: One transient PUT failure permanently downgrades a photograph to the 1,600px q80… |
| T6-02 | FIXED-SINCE | e49e6265 — "a changed batch year moves the member out of the old batch": `syncBatchGroup` (`src/lib/batch-catchups.ts:230-254`) puts a member in… | High: Correcting your own batch year on the profile adds you to the new batch's group and… |
| T7b-12 | FIXED-SINCE | 19be10b0 ("fix(platform): links stop prefetching pages nobody opens", 2026-09-29) | Low: Both thread pages mark a conversation "seen" inside a GET render; only the sibling… |
| L1-07 | MOOT-SINCE | eb855c71 ("feat(catchups): Editions start by hand: no rhythm, no hold, Start for anyone", 2026-10-17) | Low: `openNextEdition`'s compare-and-swap is not one when `nextOpensAt` is NULL, so two… |
| L3-04 | MOOT-SINCE | 6fb896bd for the nudge; REFUTED for the export. The finding falls as a whole. | Low: Two refusals promise a calendar day that no calendar enforces: the Keeper's nudge says… |
| L8-07 | MOOT-SINCE | . | None: The nightly backup and the retention sweep ran on a GitHub free-minute budget shared… |
| T2a-05 | MOOT-SINCE | eb855c71** — there is no rhythm: `nextOpensAt`, `addCadenceGap`, `openNextEditionIfDue`, `updateCatchupCadence`, `resumeCatchup` are deleted from… | Medium: The next Edition's opening has no tick grace and no civil hour, so the cron misses it… |
| T2a-06 | MOOT-SINCE | eb855c71** — Hold and resume are deleted (tombstone `actions.ts:771-777`; `refuseIfFrozen` became `refuseIfEnded` `:345-347`; `advanceEdition`… | Medium: "Hold the next Edition" freezes the CURRENT one: nobody can answer, it never publishes,… |
| T2a-12 | MOOT-SINCE | eb855c71** — the dormant-revive branch (`wasDormant`) is deleted (tombstone `actions.ts:918-922`): a twice-empty Edition fizzles to idle… | Low: A question submitted in the five-minute grace window of a dormant Edition does not… |
| T3-07 | MOOT-SINCE | eb855c71 (2026-10-17, "Editions start by hand: no rhythm, no hold"). The finding was right at 495ecdd2 (the state line for `published` printed "The… | Low: The home prints its state line from the Catch-up row it read BEFORE it advanced the… |
| T3-20 | MOOT-SINCE | 5d5c6898 (2026-10-11, "feat(catchups): delete the vote question and the magazine"). The finder's reproduction through `layoutMagazine` stood at… | Medium: The magazine layout never finishes, and runs the process out of memory, on an Edition… |
| T8b-16 | MOOT-SINCE | "Plain-text chapters" deleted `Doorway` and the six same-page doorways; the only in-chapter link left is `GuideLink href="/messages"`… | Low: "Go to the Feed" (and the other five chapter doorways) does nothing when the guide was… |
| L1-05 | REFUTED |  | Low: Two quick taps on two poll options can leave the vote shown different from the vote stored |
| L1-06 | REFUTED |  | Low: An admin's double-send posts the reply twice and rings the member's bell twice |
| L2-02 | REFUTED |  | Low: After several admin actions the rail's own counts stay wrong for the rest of a… |
| L5-12 | REFUTED | (mechanism real, consequence unreachable at the 2,000 target; fold the residual into T7b-10). | Low: Under Fluid compute the owner's analytics room shares the members' pool of five: at the… |
| T1-04 | REFUTED | (the mechanism exists; the claimed consequence has no reachable trigger) | Medium: editPost reads the row version back in a second statement, so with two devices saving at… |
| T1-05 | REFUTED | (the server half is real; the client never shows the 404 it sends) | Low: Publishing a draft from the desk, or deleting a letter from its page, shows the 404… |
| T1-12 | REFUTED | (the premise state does not exist) | Low: A heart tapped on a page restored from the back-cache ends on the right state but the… |
| T4a-08 | REFUTED |  | Low: An admin's "Remove" on a photograph the uploader deleted a second earlier throws P2025… |
| T4a-09 | REFUTED |  | Low: On the demo, deleting your own photograph dies in the third write layer with "Check your… |
| T4b-08 | REFUTED |  | Medium: Every filter, order, search pause and year press renders the whole page a second time on… |
| T7a-22 | REFUTED |  | Low: After a review session the rail's Review and Overview counts are stale until a hard… |
| T9-10 | REFUTED | (unreachable in the shipped app; latent) | Low: After a tab switch the landing's small perching birds vanish until the visitor scrolls |
| C2-02 | DUPLICATE | of T6-03 | Low: The data export promises that "neither end holds it all", but its stream pushes every… |
| T3-16 | DUPLICATE of T7b-03 | orchestrator: T7b-03 canonical | Low: The 2026-09-09 notification-link migration was never applied to the live database: 22… |
| T4b-02 | DUPLICATE | of T8b-01 (canonical: the Dialog primitive; this is its Collection instance and its worst one) | High: Decline "Discard N photographs?" and the next Back leaves the page, discarding the wall… |
| T5-15 | DUPLICATE | of T7b-04 (canonical: T7b-04, Low) | Low: A local dev-login stamps the signed-in member's `lastSeenAt` even though… |
| T5-17 | DUPLICATE | of O-03 (T5-17 is O-03's auth-side trace and fix; fold it in, keep its fix direction as O-03's) | High: (answer to orchestrator O-03) A five-second pool timeout during the session read is… |
| T6-01 | DUPLICATE | of T7a-06 (T7a-06 canonical; mechanism CONFIRMED, severity Medium stands) | Medium: An admin's "Unverify" is undone by the member's next name, batch-year or leaving-year… |
| T8a-03 | DUPLICATE | of T8a-02 (the premise as written is REFUTED by Razorpay's docs; what survives is T8a-02's path) | High: `payment.dispute.closed` is treated as "the money stayed"; if Razorpay also emits it for… |
| T8b-03 | DUPLICATE | of T5-06 (canonical: T5-06 — it carries the member-facing consequence, the lost-draft half and the `callAction` mapping; T8b-03 is the same root… | Medium: An action POST whose cookie has lapsed is bounced to /login, replayed there by the… |
| V-R4b-01 | DUPLICATE of C7a-02 | V-R4b: fold into C7a-02 (photo-aim save without callAction/finally) | Low: The crop dialog's "Use this" sticks on "Saving..." for the rest of the composer's life… |
| V-T2-01 | DUPLICATE of L10-01 | orchestrator: L10-01's door 3 (V-T2 says so itself); L10-01 is canonical, High | High: Since every batch member runs the cycle (daec81ec), an account the trust model holds at… |
| T3-13 | KNOWN | (docs/TRAPS.md:428-454, "A Tailwind v4 `scale-*` / `rotate-*` / `translate-*` sets the CSS `scale` … property, NOT `transform`"). That entry names… | Low: Five press, hover and slide responses in Catch-ups never animate: an explicit… |
| T8b-13 | KNOWN | (bugs.md open item "guide contents page unreachable"); the two stale comments ride with that item's fix | Low: Two guide comments describe a sidebar "Guide" row that does not exist, which is the… |
| T9-02 | KNOWN | (docs/planning/bugs.md #20) — the finding is the mechanism #20 asked for, not a new defect. Re-rule | Medium: bugs.md #20 found: the /login peek-a-boo is killed by React Strict Mode's dev-only… |
| C1-06 | OWNER-DECLINED | owner 2026-10-23: "its not that deep. can leave it public." | High: The repository went public on 2026-10-02 carrying the "private record" that names the… |
