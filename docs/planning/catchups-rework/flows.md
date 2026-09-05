# Catch-ups: the click map and the intent matrix

**S1, 2026-09-05.** What he asked for in ¶36:

> "Mapping out these flowcharts of every single possible intent that the user could have, multiplied
> by every possible situation that a catch-up should be in. You have to have a flawlessly
> thought-out design for every combination. And the thing is, when you have good design and good
> principles to start from, you don't have to think about each of these 100 times 100, 10,000
> possibilities, because modular design would just take care of that. But we have the most horrible
> design, which means all of these horrid things happen anyway."

This file is the "today" half. It says where every click goes and what every intent costs in each
state, so that S3 can see which cells collapse under a better design and which are genuinely
different. Findings and measurements live in [`recon.md`](recon.md); this is structure only.

Read with `recon.md` section 4 ("Where the verbs live") and section 5 ("One published Round, drawn
ten ways") — those two tables are the reason this one is as ragged as it is.

---

## 1. The surfaces

Seven routes, and one of them is a dialog pretending to be a page.

| Route | What it is | Notes |
|---|---|---|
| `/catchups` | the list | two columns; the right one is `display: none` below 1180px |
| `/catchups/new` | create | name, people, rhythm; always mints a **new** group |
| `/catchups/[id]` | the Catch-up's home | one of six left columns, one fixed right rail |
| `/catchups/[id]/answer` | the composer | one question at a time, with a progress rail |
| `/catchups/round/[editionId]` | the reader | the shareable deep link |
| `/catchups/join/[token]` | the invite | bearer token |
| `/admin/catchups` | admin | every Catch-up on the site |
| — | **Catch-up settings** | a **dialog** on the home, not a route. Pause, End, Rhythm |

## 2. The home is six different pages behind one URL

[`catchup-home-shell.tsx`](../../../src/components/catchups/home/catchup-home-shell.tsx) picks the
left column by a single chain. Exactly one of these renders:

| # | When | Left column |
|---|---|---|
| 1 | `status !== "active"` (paused or ended) | `PausedOrEndedBanner` — **and nothing else** |
| 2 | active, no Round yet | `EmptyNoEditionCard` |
| 3 | Round `collecting` | `ConsoleCollecting` — ask a question, curate, reorder, Open answering |
| 4 | Round `answering` | `ConsoleAnswering` — Answer now, Nudge, Close answering |
| 5 | Round `preparing` | `AlmostReady` + Publish now (Keeper only) |
| 6 | Round `published` | `ConsolePublished` — the "Round N is out." tile **and the whole Round inline** |

The right rail does not branch. At every one of the six it is: People, Reminders, Published issues,
then Extend the deadline (Keeper, active, collecting-or-answering only), then Settings.

**Row 1 is the one that hurts.** Pausing replaces the entire left column with a banner, so a paused
Catch-up **hides its in-flight Round completely**. "in the loop" is paused today and has a Round 2 in
`collecting`; there is nothing anywhere on its home saying so. Its questions cannot be seen, added to
or reordered, and no member can tell that a Round is part-built. That is the mechanical half of
¶15's *"if I click Pause, the whole left side is paused"* — and the half he did not see is that
something real is behind the banner.

## 3. The click map

Every clickable thing, and where it goes. `→` is a navigation, `↯` is a server action in place,
`▣` opens a dialog or menu.

### `/catchups`

| Control | Does | Notes |
|---|---|---|
| the whole card | → the state's primary destination | stretched `absolute inset-0` anchor |
| the CTA inside the card | nothing of its own | a `<span>`, not a control; the card's anchor is underneath |
| `...` | ▣ a menu | **one item** ("Archive") for a Catch-up you started; two if you did not |
| Archive | ↯ | the card moves to an "Archived" block on the same page |
| Delete | ↯ | moves to "Recently deleted" on the same page; 30 days |
| Put back | ↯ | from either block |
| Start a Catch-up | → `/catchups/new` | |
| the list-checks circle | → `/admin/catchups` | admin only, `hidden sm:inline-flex` |
| a Fresh off the press row | → `/catchups/round/[id]` | **desktop only**, the rail is `display:none` under 1180px |

The card's CTA label is one of five, from `buildCta`: **View archive** (ended), **View** (paused, or
Round preparing), **Answer now** (answering), **Read the Round** (published), **Add a question**
(collecting). Four of the five go to `/catchups/[id]`; "Answer now" goes to `/answer` and "Read the
Round" to `/catchups/round/[id]`.

### `/catchups/[id]`, the home

| Control | Does | Only when |
|---|---|---|
| Ask the group | ↯ adds a question | collecting |
| Ask as {name} / Ask anonymously | local toggle | collecting |
| From the library | ▣ the question library | collecting |
| ↑ ↓ ✕ on a question | ↯ reorder, remove | collecting, Keeper |
| Open answering | ↯ | collecting, Keeper, ≥1 question |
| Answer now | → `/catchups/[id]/answer` | answering |
| Nudge the group | ↯ notifies | answering, Keeper |
| Close answering now | ↯ | answering, Keeper |
| Publish now | ↯ | preparing, Keeper |
| Open it on its own page | → `/catchups/round/[id]` | published. **The only live pixel in that tile** |
| a member's row | → `/profile/[id]` | always |
| See and add people | ▣ the people dialog | always |
| Daily / Last day / Off | ↯ | always |
| + 1 day / 2 / 4 / 1 week | ↯ | Keeper, active, collecting or answering |
| a Published issues row | → `/catchups/round/[id]` | when ≥1 published Round |
| Settings | ▣ the settings dialog | Keeper |
| Resume this Catch-up | ↯ | paused, Keeper. **Also inside Settings** |

### The people dialog

| Control | Does |
|---|---|
| a name | → `/profile/[id]` |
| `...` on a name | ▣ Make a Keeper / Remove from catch-up |
| Add someone by name | search, then ↯ |
| Copy | copies the invite link |

### The settings dialog

Biweekly / Monthly / Quarterly ↯ · Pause or Resume ↯ · End this Catch-up ↯. That is the whole
dialog: three pills stacked, two hairlines.

### `/catchups/[id]/answer`

| Control | Does |
|---|---|
| ← {name} catch-up | → `/catchups/[id]` |
| a question in the progress rail | scrolls to it |
| Add a photo | file picker, up to 3 |
| Skip for now | advances without answering |
| Share | ↯ saves, advances |
| Back to the Catch-up | → `/catchups/[id]`, on the completion card |

### `/catchups/round/[editionId]`, the reader

| Control | Does | Notes |
|---|---|---|
| a chip / a rail item | `#hash` jump | the chip row is **not sticky** and never scrolls to the active chip |
| a contributor bird | → `/profile/[id]` | in the masthead |
| an author's name or bird | → `/profile/[id]` | on every answer |
| a photo | ▣ the full-screen viewer | |
| the heart | ↯ | |
| Publish now | ↯ | Keeper, if this Round is still `preparing` |
| Back to the Catch-up | → `/catchups/[id]` | **at the very bottom, 100% down the page** |

---

## 4. The matrix: what each intent costs, in each Round state

Rows are the intents from ¶36. Columns are the four Round states, on an **active** Catch-up, as the
**Keeper**. Cells say what happens today.

`—` means the intent has no answer in that state. **Bold** marks a cell that is either "nothing",
"two different things", or "the same thing shown a different way" — the three he asked to have
marked.

| Intent | collecting | answering | preparing | published |
|---|---|---|---|---|
| See what is new for me | index card status line | index card + "N of M shared" | index card says "View" | index card says "Read the Round" |
| Answer | — (not open yet) | Answer now → `/answer` | — (closed) | — |
| Add a question | the composer, home | **— the composer is gone** | — | — |
| Read the latest Round | — | — | — | **three ways on one page: the tile, the inline copy, the rail row** |
| Read an old Round | Published issues rail | Published issues rail | Published issues rail | Published issues rail |
| See who is in this | People panel, 7 of N | People panel, with answered ticks | People panel, 7 of N | People panel, 7 of N |
| Comment | **— does not exist** | **— does not exist** | **— does not exist** | **— does not exist** |
| Heart an answer | — | — | — | on each answer, in both the inline copy and the reader |
| Change my reminders | rail card | rail card | rail card | rail card |
| Start a Round | **— no control; the clock does it** | — | — | **— no control; the clock does it** |
| Make a Catch-up | header button → `/new` | same | same | same |
| Invite someone | People dialog → copy link | same | same | same |
| Archive this | **— only on the index** | **— only on the index** | **— only on the index** | **— only on the index** |
| Find an archived one | **a block on the index, in your face** | same | same | same |
| Change the cadence | Settings dialog | Settings dialog | Settings dialog | Settings dialog |
| Publish now / extend | Extend card (4 buttons) | Extend card (4 buttons) | **Publish now, in two places** | — |
| Pause | Settings dialog | Settings dialog | Settings dialog | Settings dialog |
| End | Settings dialog | Settings dialog | Settings dialog | Settings dialog |
| Get back to the home | — (you are on it) | back link on `/answer` | — | **scroll 44,000px, or the browser's Back** |
| Get back to the app | sidebar | sidebar | sidebar | sidebar |

### The same matrix, by Catch-up status

| Intent | active | paused | ended |
|---|---|---|---|
| See the current Round | the console for its state | **nothing — the banner replaces it, even with a Round mid-flight** | **nothing** |
| Add a question | yes, if collecting | **no, and no sign one is open** | no |
| Answer | yes, if answering | **no** | no |
| Read a published Round | yes | yes, via the rail | yes, via the rail |
| See who is in this | yes | yes | yes |
| Change reminders | yes | yes | yes |
| Extend a deadline | yes | **no** | no |
| Resume | — | **two places: the banner and Settings** | — |
| Archive / delete | index only | index only | index only |
| Index card CTA | varies by Round | **"View"** | **"View archive"** |

### Keeper versus member

| Only a Keeper can | Where |
|---|---|
| curate, reorder or remove a question | collecting console |
| Open answering | collecting console |
| Nudge the group | answering console |
| Close answering now | answering console |
| Publish now | preparing console **and** the reader |
| extend a deadline | rail card |
| change the rhythm, pause, end | Settings dialog (the trigger is Keeper-only) |
| add or remove people, hand over the Keeper hat | people dialog |

Everything else is identical for both. A plain member's home is: the console minus its controls, the
people panel, reminders, published issues. **A member has no control anywhere that changes the
Catch-up**, which is correct, and means the home's whole right rail is the same four cards for
everyone while the left column carries all the difference.

---

## 5. The counts he asked for

| Question | Answer |
|---|---|
| How many distinct ways is a published Round drawn? | **10** surfaces, **3** genuinely different preview-card designs. He said fifteen. See `recon.md` section 5 |
| Clicks from the reader back to the Catch-up's home | **1**, if you can find it |
| Scroll distance to reach that click | **44,381px** of a 44,461px page — 100% of the way down. 49,000px on a phone |
| Screenfuls of scroll to read one Round | **45.3** on a laptop, **55.2** on a phone |
| Surfaces a lifecycle verb can live on | **5** (index card menu, settings dialog, home left column, home rail, reader) |
| Verbs that exist in two places | **2** (Resume, Publish now) |
| Ways the Catch-up's name is printed | **7** (see `recon.md` section 10) |
| Pill-shaped controls on one mobile screen | **21**, on a Catch-up with two members and one question |
| Members visible in the people panel, of 23 | **7** |
| Server payload re-rendered on **one heart tap** | **603 KB, 1.5 to 2.6s** — the feed's like re-renders nothing |

---

## 6. What collapses, and what does not

His own claim in ¶36 is that good design makes most of this disappear. Reading the tables above, that
is right, and it is possible to say which cells are genuinely different and which are only
accidentally different.

**Genuinely different, and a design has to answer each:**

- the four Round states. Ask, answer, wait, read are four different jobs and want four different
  screens. Today's six-way branch is not the problem;
- Keeper versus member;
- a Round that exists versus a Catch-up with none.

**Accidentally different, and one decision removes each:**

- **where a verb lives.** Five surfaces for sixteen verbs, two of them duplicated. One place per
  verb, chosen by whether it is about the Catch-up or about this Round;
- **how a published Round is drawn.** Three preview designs and two full renderings, differing in
  truncation length, typeface, date format and hover. One representation, as he asked in ¶13;
- **paused and ended.** Both currently blank the left column. Ended is genuinely terminal; paused is
  a Round waiting, and hiding it is a choice nobody made on purpose;
- **archive and delete living only on the index.** A Catch-up you are inside cannot be filed away
  from inside it;
- **the two rails.** The index's right column vanishes below 1180px; the home's stacks underneath.
  Same feature, two responsive strategies, and the vanishing one takes "Fresh off the press" with it;
- **the name.** Seven printings, three of them with "catch-up" appended and one possessive.

That is the shape of the collapse: **four states x two roles**, with one place for every verb and one
drawing of every Round. Eight cells, not ten thousand.
