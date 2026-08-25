# Verifier notes: v-groups-residue

Verified 2026-08-25 at HEAD c74d99f ("feat(admin): a non-admin who asks for /admin is told
'nice try'"). All six findings re-checked file-by-file at today's tree. `git status --short`
on every file named below (feed/actions.ts, post-feed.tsx, feed-column.tsx,
letter-engagement.tsx, letters/[id]/page.tsx, tour-steps.ts, notification-bell.tsx,
schema.prisma) returned nothing: no uncommitted edits, nobody else mid-flight in these files.

## feed-posts-01 — strip dead Groups plumbing from feed paths — CONFIRMED

Every anchor re-verified at HEAD:

- **No /groups route.** `ls src/app/(main)/` shows no `groups` dir; the only `groups*` dir in
  src/app is `src/app/lab/groups-rethink` (lab, out of scope by brief).
- **createPost refuses groupId**, actions.ts:230-232:
  ```
  if (parsed.data.groupId) {
    return { error: "Group posts are not available." };
  }
  const groupId = null;
  ```
  preceded by the long refusal comment (215-229) including "Verified live before writing
  this: zero rows in Post carry a groupId". The finding correctly marks this block KEEP.
- **Five revalidatePath group ternaries**, exactly at the claimed lines:
  361 (`groupId ? \`/groups/${groupId}\` : "/feed"`), 396, 505, 540, 730 (all
  `post.groupId ? ...`). Grep count: exactly 5 of 24 revalidatePath calls.
- **deletePost group-admin lookup**: lines 493-500, `prisma.groupMember.findUnique` at 495.
- **loadPosts**: `groupId?: string` option at 1109 (comment "set => load this group's feed");
  membership gate `groupMember.findUnique` at 1125-1131 returning `empty` for non-members;
  `const where = groupId ? {...baseWhere, groupId} : {...baseWhere, groupId: null, ...}`
  branch at ~1183.
- **loadSavedPosts** (declared :1324) runs `prisma.groupMember.findMany({ where: { userId }})`
  at 1330-1334 **unconditionally on every call**, then `OR: [{ groupId: null }, { groupId:
  { in: groupIds } }]` at 1350. Since createPost forces groupId null and no writer exists,
  this is one wasted query per Saved load, as claimed.
- **Callers**: FeedColumn rendered once, feed/page.tsx:83, passing only showControls /
  initialSearch / currentUser / userPlaces / lastSeenAt (no groupId, no scope). PostFeed
  rendered once, feed-column.tsx:55.

**Risk side, per charter**: `decidePostVisibility`'s group branch IS pinned by
`src/lib/post-visibility-rule.test.mjs` — tests at :46 ("a non-member cannot reach a private
group's post by id"), :55, :62 ("group membership alone decides a group post"), :124. The
:47 comment calls it "The Catch-up case: private groups are the hidden container under every
Catch-up". The fixer must NOT touch decidePostVisibility or post-visibility-rule.ts; those
branches are live defense-in-depth, not Groups residue. Also checked
`feed-write-rule.test.mjs`: zero "group" fragments, so it does not pin any of the lines this
finding removes.

## feed-posts-13 — PostFeed/FeedColumn props no caller can reach — CONFIRMED

- post-feed.tsx:26 carries the stale comment: `/** Which slice of posts to render. \`author\`
  is reserved for a later batch (needs loadPosts support). */` and :27
  `export type FeedScope = "all" | "author" | "group" | "letters"`.
- The comment's claim is false at HEAD: actions.ts:1110 declares
  `authorId?: string; // set => only this author's posts (profile Posts tab)` and :1177
  applies it (`...(opts?.authorId ? { authorId: opts.authorId } : {})`).
- `scope === "letters" ? "letter" : undefined` branch at post-feed.tsx:113; nothing ever
  passes scope (single PostFeed call site, feed-column.tsx:55-61, forwards FeedColumn props
  that the single FeedColumn call site never sets).
- feed-column.tsx prop surface confirmed: `groupId`(:14/:26), `scope`(:15/:27),
  `composerScope`(:16/:28), `placeholder`(:18/:30), `emptyTitle`(:21/:34), `emptyHint`
  (:22/:35). The only FeedColumn use in all of src (lab included) is feed/page.tsx:83, which
  passes none of them. new-post-cta.tsx:9 mentions FeedColumn in a comment only.

## member-surfaces-13 — retire letters' /groups branches — CONFIRMED-WITH-CORRECTION

- letters/[id]/page.tsx: back link `href={letter.groupId ? \`/groups/${letter.groupId}\` :
  "/letters"}` at :120, label `{letter.groupId ? "Back to group" : "All letters"}` at :124.
  Claimed range 120-124 exact.
- letter-engagement.tsx: **correction, one-line drift** — the `groupId` param is at :18 and
  its type at :26 (finding said 17, 25). The two /groups fallbacks are exact: moderation
  redirect `router.push(groupId ? \`/groups/${groupId}\` : "/letters")` at :93, `shareHref =
  groupId ? \`/groups/${groupId}\` : \`/letters/${postId}\`` at :97.
- Supporting context all real at HEAD: proxy.ts:192-194 redirects `/groups` and `/groups/*`
  to `/catchups` (comment block 187-191, "Groups was retired as a user-facing feature
  (owner, 2026-07-25)"); catchups/[catchupId]/page.tsx:554 "Was `/groups/${result.groupId}`
  -- groups have no user-facing page"; post-card.tsx:238 "could only ever have produced a
  404 link"; notification-links.ts:34-35 "createPost now refuses a groupId ... Linking to
  /groups/<id> would be a link to a 404".
- LetterEngagement has exactly one caller: letters/[id]/page.tsx:212. Note the redirect at
  :93 currently goes through proxy's /groups -> /catchups redirect at worst, so removing the
  branch changes nothing user-visible even for hypothetical old rows. The finding's own
  "one DB check" (are there letters with groupId?) remains a live-data question this audit
  cannot answer, but the code-side invariant (createPost refuses groupId; zero writers)
  makes the branch dead going forward regardless.

## data-layer-02 — delete GroupInvite model — CONFIRMED-WITH-CORRECTION

- Model at schema.prisma:277-291 (15 lines incl. `@@unique([groupId, inviteeId])` :289 and
  `@@index([inviteeId, status])` :290); User back-relations at :150-151; Group relation
  `invites GroupInvite[]` at :271. All as claimed.
- Zero readers/writers confirmed: case-insensitive grep for `groupInvite` across src/,
  scripts/, prisma/ (generated client excluded) hits only: demo.ts:80 (a comment narrating
  the demo reset), demo-seed/seed.ts:119 (`tx.groupInvite.deleteMany({})` — wiping a table
  nothing fills), and **cascade-rule.test.mjs:112**.
- **The correction, and it is load-bearing**: `src/lib/cascade-rule.test.mjs:112` lists
  `GroupInvite: "invites they sent or hold; a dead invite helps nobody"` in `OWN_CONTENT`,
  and the test "the own-content list names only models that are still reachable" (:158-165)
  asserts every OWN_CONTENT key is still cascade-reachable from User. Delete the model and
  that test FAILS (`OWN_CONTENT lists GroupInvite, which a User delete no longer reaches`).
  The finding's gate names verify-guard.mts and group-succession.test.mjs but NOT this file.
  The fix must remove the `GroupInvite:` line from cascade-rule.test.mjs in the same commit —
  which is the maintenance the test's own comment prescribes ("a stale entry would silently
  re-open the hole"), so it is a sanctioned edit to a pinned file, but the fixer must know
  to make it, and the report must say so.
- The owner-call split (schema+code autonomous, live table drop owner-approved) is already
  in the finding and stands.

## shell-primitives-08-groupinvite (the Notes sub-claim of shell-primitives-08) — CONFIRMED

- `group_invite: { icon: Users, label: "Group" }` at notification-bell.tsx:73 is the ONLY
  occurrence of `group_invite` in all of src/, scripts/, prisma/. No notification writer
  anywhere creates that type (grepped all notification.create call-site files).
- The fallback `return NOTIFICATION_ICON_META[type] ?? { icon: Bell, label: "Notification" }`
  at :98 covers any ancient DB rows, exactly as the note says.
- The `Users` lucide import (:13) is used only at :73, so it goes with the entry. 2 lines +
  1 import name, as claimed. (I did not re-verify the parent -08 dedupe claim; only the
  groupinvite note was in my charter.)
- Whether old `group_invite` rows exist in the live Notification table is a DB question this
  audit cannot answer, but the Bell fallback makes it moot — degradation is a generic glyph.

## landing-mascot-avatars-04 — tour's catchups-explainer anchor unregistered — CONFIRMED

- tour-steps.ts:100 `spotlight: "catchups-explainer"` is the only occurrence of that string
  in all of src.
- The ONLY registration path is `reportSpotlight` (tour-anchors.ts:28), whose only caller is
  `useTourAnchor` itself (tour-anchors.ts:83). `useTourAnchor` is called at exactly three
  sites: collection-client.tsx:119 ("collection-contribute"), create-post-form.tsx:191
  ("feed-composer"), directory-client.tsx:106 ("directory-search") — i.e. the other three
  stops' keys, all live. No `data-tour="catchups-explainer"` exists anywhere; nothing in
  src/app/(main)/catchups or src/components/catchups mentions explainer/data-tour/TourAnchor
  at all.
- tour-provider.tsx:170 `await awaitSpotlight(stop.spotlight, 2500)` and the no-anchor
  fallback `await api.hoopoe.express("curious")` at :176, exactly as claimed. awaitSpotlight
  resolves null on timeout (tour-anchors.ts comment, "never hangs the tour"), so stop 4 is a
  guaranteed 2.5s dead wait with no spotlight. The fix is to re-register the anchor on the
  Catch-ups explainer element, not to delete the stop.

## Summary for the report writer

Five of six confirmed clean at HEAD; two carry corrections a fixer needs: (1) data-layer-02
must also delete cascade-rule.test.mjs:112's GroupInvite entry or `npm run check` goes red;
(2) member-surfaces-13's letter-engagement line anchors are 18/26, not 17/25. The
decidePostVisibility group branch is pinned by post-visibility-rule.test.mjs (:46, :55, :62,
:124) as live Catch-up defense — every Groups-residue fix must leave post-visibility-rule.ts
and its test untouched. None of the six was invalidated by post-find-phase commits.
