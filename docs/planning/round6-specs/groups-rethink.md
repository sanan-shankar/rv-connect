# Groups Rethink: what should Groups become?

> Round 6 design spec. Author: product designer. Date: 2026-07-18. Deliverable is this spec plus a set
> of static preview pages under `src/app/preview/groups-rethink/`; no production code was edited.
> Grounded in the live code (`src/app/(main)/groups/*`, `src/components/groups/*`, `prisma/schema.prisma`
> Group / GroupMember / GroupInvite, `docs/spec/catchups.md`, `docs/ROADMAP.md` Phase 7) and in a
> screenshot of the current `/groups` page taken this session.
>
> Read alongside `docs/spec/DESIGN-SYSTEM.md` (tokens, pills, canopy, warm surfaces) and
> `docs/spec/catchups.md` (a Catch-up always belongs to a Group; visibility inherited from the group).
> The owner will pick a direction; nothing here ships to the main app yet.
>
> **Previews (start the dev server, then visit):**
> `/preview/groups-rethink` (overview + comparison matrix), and one route per concept:
> `/preview/groups-rethink/circles`, `/batches-interest`, `/dissolve`, `/gatherings`.

---

## 1. The problem, in the owner's own terms

The current `/groups` is a generic "browse and create groups" surface: batch groups (auto-named "Batch of
2004"), the reverted Catch-ups demo groups, public and private, with a "New group" button and a Keeper per
group. It sits at **position 3 in the sidebar**, between Directory and Collection. That placement and that
shape are both wrong for this community. The owner's thinking, held faithfully:

- **Friend-groups will not happen.** "Nobody is going to make a group of their friends on a website, that
  is just going outside." Any concept that leans on members spinning up social groups is dead on arrival.
- **Batches already live on WhatsApp.** Every batch has a WhatsApp group, so day-to-day batch chatter will
  not migrate here. The batch's real value on this site is as **the vehicle for a Catch-up** (the recurring
  group letter). That, in the owner's words, is "the main point of groups."
- **Location is real but collides with tiny places.** "People in Chennai" is a plausible community. But if
  someone lists Madanapalle village, is the site supposed to auto-generate a group for three people? That
  "feels wrong." Location must be handled without spawning ghost groups.
- **Groups must not be a top-tier nav item.** "It is definitely not that important." It cannot stay at
  position 3.
- **Burdens of RV must keep working.** It is a real, existing community space, and there may be "a few more
  like it." Whatever we build must have an obvious home for it.

Four concepts follow. Each is opinionated and genuinely distinct on one axis: **how much of "a group"
survives, and where it lives.** Each answers the same five questions (nav placement, Burdens of RV,
location, existing Group data, what dies).

### Shared building blocks all four assume

- **Batch derivation is free.** `User.batchYear` already exists (nullable; teachers have none). Any concept
  that wants a per-batch container derives it from `batchYear` with zero creation flow.
- **A Catch-up needs an owner object.** Per `docs/spec/catchups.md`, `Catchup.groupId` is unique and
  visibility is inherited from the group. Three concepts keep a lightweight `Group` row as that owner (so
  the Catch-ups build does not have to be rewritten); one concept (C) re-points the Catch-up at a batch or
  a saved audience instead, which is the larger data change.
- **The Directory already owns location.** Phase 6 ships a `City` model, `cityId` on users, and a clustered
  world map. Location communities lean on that, not on a group.

---

## 2. Concept A: Circles for Catch-ups

**Preview:** `/preview/groups-rethink/circles`

### Pitch

Groups stop being a place you visit. A **Circle** is the thin membership container a Catch-up runs on, and
nothing else: **no feed, no browser, no create button.** The only surface is Catch-ups, and Circles are
simply how it is sliced. You land on "Your Catch-ups" (one card per Circle you are in), each card showing
the Circle name, a bird-avatar cluster, the live Catch-up status, and the one right CTA (Add a question /
Answer now / Read the Round). Batch Circles are auto-provisioned from `batchYear`; interest Circles (Burdens
of RV) are admin-created and simply appear. The word "Groups" leaves the product entirely.

This is the purest expression of the owner's "the main point of groups is Catch-ups" belief: it removes
everything that is not a Catch-up.

### Trade-offs

- **For:** Ruthlessly simple. Kills the empty-friend-group problem by deleting the button. Nothing to browse,
  nothing to moderate, no wall to keep alive. Makes Catch-ups feel like the whole point, which it arguably is.
- **Against:** The biggest bet is that **nobody misses the group wall.** Burdens of RV today is partly a
  place to post, not only to answer a rhythm; reducing it to a Catch-up-only Circle may under-serve it. There
  is also no lightweight home for a one-off group announcement between Rounds.
- **Neutral:** Location is entirely out of scope here, which is clean but means this concept says nothing
  about the Chennai use case (it defers wholly to the Directory).

### Migration impact

- **Nav:** "Groups" removed from the sidebar. **Catch-ups (already present) becomes the home.** Net nav count
  drops by one. Zero new top-level items.
- **Burdens of RV:** becomes an interest Circle, admin-created, one monthly Catch-up. Identical machinery to
  a batch Circle, just not auto-provisioned. A few peers live beside it.
- **Location:** not modelled. Cities live on the Directory map; a 3-person village is 3 pins, never a Circle.
- **Existing Group data:** groups that have (or could plausibly host) a Catch-up become Circles. **Group posts
  are the casualty:** they are exported to the owner and the wall is retired. Empty friend-groups are archived
  silently. `Group` row survives as the Catch-up owner (keeps the Catch-ups build intact); `visibility` and
  `GroupMember` are reused; `Group.name`/`description`/`coverImage` mostly go dark.
- **What dies:** the group feed, the group browser, the create-group flow, `GroupInvite` as a user-facing
  thing, and the word "Groups."

---

## 3. Concept B: Batches + Special Interest

**Preview:** `/preview/groups-rethink/batches-interest`

### Pitch

Keep real spaces, but **take away the ability to make them.** There are exactly two kinds, neither
user-created:

1. **Your Batch**: derived from `batchYear`, one per person, with no join step and no leaving. It is simply
   your year. Its headline job is the Catch-up; a quiet **noticeboard** feed sits underneath, explicitly
   framed as secondary to the batch WhatsApp.
2. **Interest spaces**: a short, curated shelf the admins run (Burdens of RV, Valley Birders, Staff). Each
   has a feed and a Catch-up, exactly as a group works today. Members join the ones that are theirs.

There is no "New space" button anywhere. In its place is **"Request a space"** (an email to admins). The
friction is the point: a real threshold of intent keeps the shelf short and every space alive.

### Trade-offs

- **For:** Keeps the proven capability (a real space with a feed, which is what Burdens is) without the
  empty-group problem, because creation is gated behind admins. Batches get a dignified home that leads with
  the Catch-up but still allows the occasional reunion notice. Most faithful to "there are a few more like
  Burdens."
- **Against:** Retains a group feed, which the owner is lukewarm on ("chatter stays on WhatsApp"). The batch
  noticeboard risks being a ghost town if nobody posts; it must be visibly secondary so its emptiness does
  not read as failure. "Request a space" needs an admin willing to triage.
- **Neutral:** Two space types is one more concept for a member to hold than A or C, but each is legible.

### Migration impact

- **Nav:** a single **"Spaces"** item, dropped to **position 6** (below Catch-ups), not 3. Your batch is
  pinned to the top of that page; interest spaces sit under it.
- **Burdens of RV:** the flagship interest space, migrated **as-is** (feed + Catch-up intact). The curated
  shelf is designed around keeping it and a few peers healthy.
- **Location:** answered by the **Directory city filter**, never a space. An admin may hand-promote a
  genuinely active city to an interest space, but nothing auto-generates one, so Madanapalle stays pins.
- **Existing Group data:** batch-named groups fold into **Batch spaces** (their posts become the
  noticeboard). Burdens-type groups become **interest spaces**. Member-made friend-groups are archived and
  their creators emailed an export. `Group` gains a `kind` discriminator (`batch` | `interest`); the
  create-group action is removed and replaced by an admin-only create.
- **What dies:** user-created groups, the create-group flow, private friend-groups, and the browse-all grid.

---

## 4. Concept C: Groups dissolve away

**Preview:** `/preview/groups-rethink/dissolve`

### Pitch

The most radical answer: **there is no Groups surface, and nothing named replaces it.** Every job a group
did is absorbed by a place that already exists, on the premise that a group is really just an audience plus a
rhythm.

1. **Cohort cohesion → a Feed filter.** "See what my batch is up to" becomes a scope pill on the Feed you
   already read (`Feed scope={batch}`), not a separate wall to remember.
2. **Location → threshold Place pages in the Directory.** A city earns a scoped page only once **N members
   (default 8) opt in**; below that, it is only pins on the map. This is the direct answer to the 3-person
   village: a page is never auto-created, so it can never become a group.
3. **Catch-ups → attached to a batch or a curated circle.** A Catch-up no longer needs a Group. It hangs off
   a batch year directly, or off a small admin-curated "circle" that is really just a **saved audience** with
   a name (this is how Burdens survives).

### Trade-offs

- **For:** The nav gets shorter, which is itself the statement that groups were never load-bearing. Nothing
  to build or maintain as a distinct surface; everything reuses Feed, Directory, and Catch-ups. Threshold
  Places are the most elegant answer to the tiny-place objection.
- **Against:** The **largest engineering change**, and it collides with `docs/spec/catchups.md`, which
  assumes `Catchup.groupId` and group-inherited visibility. Re-pointing Catch-ups at a batch or a saved
  audience means new ownership + permission logic in the Catch-ups build. It is also the biggest product bet:
  that a whole capability can vanish with nothing named in its place and be unmissed.
- **Neutral:** "Curated circle" is a group in all but name; the honesty of the concept depends on it never
  growing a wall.

### Migration impact

- **Nav:** **nowhere.** "Groups" is deleted from the sidebar and nothing takes the slot.
- **Burdens of RV:** a **curated circle** (admin-named saved audience + a Catch-up). It surfaces under
  Catch-ups and as a Feed rail card, but is never called a group and has no separate wall.
- **Location:** **threshold Place pages** in the Directory (≥ 8 opting in) with a scoped feed and optional
  city Catch-up; below the line, map pins only. No auto-generation, ever.
- **Existing Group data:** batch groups are **dropped**, superseded by the batch Feed filter. Burdens-type
  groups migrate to curated circles. Friend-group posts are exported to owners, then the `Group` /
  `GroupMember` / `GroupInvite` models are retired. Catch-up ownership migrates from `groupId` to a new
  polymorphic owner (batch year or circle id).
- **What dies:** the entire Group surface **and model**: feeds, browser, creation, invites, the nav item.

---

## 5. Concept D: Gatherings (synthesis): RECOMMENDED

**Preview:** `/preview/groups-rethink/gatherings`

### Pitch

The synthesis. **Three honest sources of a space, each cut to a specific objection**, tied together by one
demoted nav entry and no creation button:

1. **Batch rooms**: auto-provisioned from `batchYear`, Catch-up-led. Pinned to the top of the Gatherings
   page. A quiet noticeboard sits underneath the Catch-up, clearly secondary. Answers "batches are the
   Catch-up vehicle" without pretending to beat WhatsApp.
2. **Gatherings**: a short, admin-curated shelf of standing communities (Burdens of RV, Valley Birders,
   Staff past & present). Feed plus Catch-up. Creation is a **proposal to admins**, not a button.
3. **Places**: **not** a Gathering. Threshold city pages that live in the **Directory** (≥ 8 opting in),
   with a scoped feed and optional city Catch-up. Below the threshold: map pins only.

### Trade-offs

- **For:** Concedes every one of the owner's points while keeping the one case he trusts. Friend-groups are
  impossible (no create button). Batches carry Catch-ups without competing with WhatsApp. Burdens keeps
  working on a shelf built to hold exactly that kind of thing. Tiny places can never spawn a ghost, because
  Places are a Directory feature gated on a threshold, not a group. Costs the nav one demoted item.
- **Against:** It is the least minimal of the four (three sources, not one or zero), so it asks the member to
  understand slightly more. Keeps a batch noticeboard feed, with the same ghost-town risk as B (mitigated by
  framing it as secondary and Catch-up-led).
- **Why over A and C:** A and C are cleaner bets, but each gambles that a whole capability is unmissed
  (A drops the wall; C drops the surface and the model). D keeps the proven capability (Burdens-as-a-space),
  drops the unproven one (member-made groups), and reuses the Directory for location. It is the lowest-risk
  path that still honours the whole brief.

### Migration impact

- **Nav:** one item, **"Gatherings"**, at **position 6** (below Catch-ups). Batch rooms are pinned to the top
  of that page; Places are reached through the Directory, not the nav.
- **Burdens of RV:** the **template case** for a Gathering, admin-curated, feed + Catch-up, migrated intact.
  The shelf is explicitly designed to keep Burdens and a few peers (Staff, Birders) healthy.
- **Location:** **threshold Places** in the Directory (≥ 8) with a scoped feed and optional city Catch-up;
  below the line, pins only. No auto-generation.
- **Existing Group data:** batch groups → **Batch rooms** (feed becomes the noticeboard, Catch-up preserved);
  Burdens-type groups → **Gatherings**; friend-groups → archived with an export emailed to the creator. The
  `Group` model **stays**, re-typed with `kind` (`batch` | `gathering` | `place`), so the Catch-ups build
  (which keys off `Group`) needs no rewrite. The create-group action becomes admin-only + a member-facing
  "propose" flow.
- **What dies:** user-created groups, the create-group flow, the browse-all grid, and the top-3 nav slot.
  Creation becomes a proposal; browsing becomes a short curated shelf.

---

## 6. Recommendation

**Ship Concept D (Gatherings).**

The reasoning is risk-weighted. All four concepts satisfy the two hard constraints (no user-created groups,
never a top-3 nav item) and all four give Burdens of RV a home. They differ almost entirely in **how much they
gamble.**

- **C** is the most intellectually satisfying and the most dangerous: it removes the Group model outright and
  re-points Catch-ups onto a new polymorphic owner, which fights `docs/spec/catchups.md` and is the largest
  build. If the owner later decides a curated community really does want a wall, C has to rebuild it.
- **A** is the cleanest but bets the whole thing on "nobody misses the wall," and Burdens is precisely the
  place that might.
- **B** and **D** are close cousins. Both keep a small, admin-curated set of real spaces and both handle
  location via the Directory. **D is B plus the two ideas B lacks:** the batch room framed as Catch-up-led
  (not just "a Batch space"), and **threshold Places** as an explicit, named answer to the Madanapalle
  objection rather than a vague "the admin might promote a city." D also keeps the `Group` model with a
  `kind` discriminator, so the in-flight Catch-ups work is undisturbed.

D is the lowest-risk path that still honours the entire brief: it drops the unproven capability (member-made
groups), keeps the proven one (Burdens-as-a-space), leads batches with their real purpose (the Catch-up), and
solves location where location already lives (the Directory), all for the cost of a single demoted nav entry.

**If the owner wants to go further than D,** the fallback is A (drop the noticeboard feeds, Catch-up-only
Circles): it is a one-setting reduction of D (turn the batch and Gathering feeds off) rather than a different
architecture, so D can be built first and narrowed to A later without rework. That reversibility is another
reason to start from D.

### Open questions for the owner

1. **Place threshold value.** Default proposed is 8 opted-in members. Higher (12) keeps Places rarer; lower
   (5) makes more cities qualify. Owner to set.
2. **Batch noticeboard: keep or cut?** D includes a secondary batch feed. If the owner is confident it will
   be dead, cut it now and D becomes A-for-batches with a curated Gatherings shelf on top.
3. **"Propose a Gathering" routing.** Email to admins, or a lightweight in-app request queue reusing the
   generalized `Report`/admin tooling?
4. **Friend-group data.** Confirm export-then-archive (not hard-delete) for the handful of existing
   member-made groups, and who receives the export.
