# What else an Edition could hold

**S-features, 2026-09-09.** The second brainstorm, which he asked for twice and watched become
three ledger rows both times. His words, on why this file exists:

> "in my initial request for the catch ups rework I also requested a brainstorm on and research
> into more features we can incorporate for instance a photo wall round and that can be shown
> nicely on the reader in a unique way and maybe some other stuff ... have a think and see what
> people would want and what letterloop and any other similar guys do now."

**What this is not.** Not a redraw of anything at `/lab/catchups/sketches`; the shape is settled.
Not the build. This asks one question: what should a Catch-up be able to *hold* that it cannot
hold today.

**Read §4 first if you are reading one section.** That is the shortlist, and it is the part that
needs him.

---

## 1. The thing that makes all of this cheap

A question's kind is derived from its category, and the categories are an array in
`src/lib/catchups-types.ts`:

```
PROMPT_CATEGORIES = right-now, small-things, the-valley, photo-wall, songs,
                    valley-days, most-likely-to, on-the-horizon
promptKind(category) -> "text" | "photo" | "songs"
```

So **a new kind of thing an Edition can hold is one id in an array, one branch in
`promptKind`, one answering control and one reading surface.** No column, no migration. That was
a deliberate decision when the feature was built and it is the reason this list can be long.

Two of the three surfaces already exist for anything visual: R2 takes the bytes, the shared
viewer opens them, and the `Image` table already stores every photograph's real dimensions.

---

## 2. The three this session owns, and what is actually left of each

### 2.1 The photo wall — the data is done, the reading is not

`photo-wall` has been a `PromptCategory` since the feature was built and has **never been
drawn**. The answering side is nearly free: `promptKind` already returns `"photo"` and the
composer already uploads a batch.

**The interesting half is his**, and it is the reason this lands before build phase 8:

> "we definitely have to add a photo wall for questions where people can just add photos, but it
> needs to be modular and work with everything else."

**What a wall must not be is a grid.** A twenty-four photograph grid is a contact sheet, and a
contact sheet is the one thing a magazine designer would never print. The pressure corpus already
carries a two-hundred photograph wall, so whatever is drawn can be pushed at once.

Three shapes worth drawing before choosing, none of them decided here:

- **A run.** One horizontal band the width of the column, photographs at their own aspect ratios,
  scrolling sideways. Reads as a strip of film. Cheapest, and closest to what the answer carousel
  already does.
- **A drift.** Photographs at varying sizes down the column, each with its contributor's bird
  beside it, sized by nothing but its own shape. Reads as a wall. Hardest to keep from looking
  ragged.
- **A stack.** One photograph at a time, full column, with the contributor's name under it, and
  you move through them. Reads as a slideshow. Only shape that works at two hundred.

**Recommendation: draw all three, pick with him.** It is one lab room and it is the only piece of
this document that can change a page already drawn.

### 2.2 Link previews — decided, and the scope question is real

Specified in `spec.md` §3.8, built in phase 10. What was open is which hosts.

Two findings say what today does: `songArt` is **null on every entry in the database** (F29), so
the resolver has never once run end to end, and on the one songs question with thirteen answers
`songUrl` is null on all of them (F30) because four people pasted links into the body instead of
the dedicated field.

**His rule is the opposite of a field** (¶50): *"the thumbnail thing should work. Whenever they
paste a link to a song."*

**Recommendation on hosts: Spotify, YouTube, and then stop.** Both are keyless oembed, both are
measured in `prior-art.md` §7, and both are what people actually paste. A generic
open-graph scraper for any URL is a fetch from our server to an arbitrary address chosen by a
member, which is a different kind of feature with a different kind of risk, and it earns a
plainer answer: an unrecognised link stays a link.

### 2.3 Letterloop parity — and there is exactly one gap that matters

Read against the live product on 2026-09-09.

| What Letterloop does | Us |
|---|---|
| Members answer questions on a schedule | yes |
| Members submit their own questions | yes |
| A curated question library, **600+** | **8 categories.** Real gap, and the cheapest one on this page |
| Photographs in an answer | yes, and ours open in a viewer |
| A Spotify link resolves to a card | half-built, and has never run (F29). Phase 10 |
| React to a reply | yes, the heart |
| Comment on a reply | build phase 9 |
| Unlimited archive of past issues | yes |
| Pause, extend, change the schedule | yes |
| Up to 50 people | ours is 100 |
| **The issue arrives in your inbox** | **no** |

**The one real gap is email.** Letterloop is an email newsletter that happens to have a website;
we are a website with no email. That is ¶21 — *"if we can do an amazing job for this, then I
would be happy to wire it up, emailing everyone the catch-up as soon as it's ready"* — and he
gated it himself on the magazine being good. It stays gated. It is named here so the parity list
is honest rather than flattering.

**The question library is the cheap one.** Eight categories against six hundred questions is the
difference between "pick a question" and "browse for one you like". It needs no code: it is a
longer array in the prompt library. Worth doing on the day someone writes the questions.

---

## 3. What the rest of this space does now, and the one signal in it

Beyond Letterloop, the nearest products are the memory-capture ones — StoryWorth, Remento,
Storii, Tell Mel, Heritage Whisper, Memorygram. They ask a person one question on a schedule and
keep the answers.

**Every one of them has moved to voice.** Remento records audio or video and transcribes it.
Storii telephones people up to three times a week. Tell Mel holds a phone conversation. Their
shared diagnosis is that **typing is the barrier**, not willingness.

The second signal: **their product is the keepsake.** StoryWorth's and Remento's business is the
printed book at the end of the year. That is track M, and it is a straight confirmation that the
magazine is the right ambition rather than a flourish.

---

## 4. The shortlist — what to add, for him to cut

Same five-line shape as the owner questions. **The default on every one is "not unless you say
so"**, because none of these is a bug and none is owed.

**F1. A question you answer out loud.**
- **What it is:** you tap and talk for a minute instead of typing. The Edition plays it, with your
  words written underneath.
- **Why here specifically:** the whole of this category moved to voice because typing is what
  stops people. Your 1978 batch is in their sixties and your 2023 batch is not; one of those two
  groups will answer a question out loud who would never have written a paragraph.
- **What it costs:** R2 already takes the bytes. The transcript is the awkward part — the browser
  can do it for free while you talk, on your own phone, and nothing has to be sent anywhere. Audio
  with no transcript works on its own if that turns out badly.
- **If you don't reply I'll do:** nothing.

**F2. A question the group votes on rather than writes.**
- **What it is:** "Which of these should the reunion be?" Four options, you tap one, and the
  Edition prints the result as something worth looking at.
- **Why here:** it is the lowest-effort answer there is, and an Edition where every question needs
  a paragraph is an Edition most people skip. `most-likely-to` was already a category once.
- **What it costs:** the feed already has polls. It is the same widening the comments phase is
  already doing to another table.
- **If you don't reply I'll do:** nothing.

**F3. Then and now.**
- **What it is:** a question that takes exactly two photographs, one old and one recent, and prints
  them as a pair.
- **Why here:** no other product in this space can do it, because no other product has a Valley
  Collection full of 1970s photographs sitting beside it. This is the one idea on the page that is
  yours and could not be anybody else's.
- **What it costs:** it is the photo wall's machinery with a cap of two and a different reading
  surface.
- **If you don't reply I'll do:** nothing.

**F4. A question answered on a map.**
- **What it is:** "Where are you now?" Everyone drops a place, and the Edition prints one map of
  the whole batch.
- **Why here:** the directory already draws this map, and a batch scattered across four continents
  is a thing people actually want to see.
- **What it costs:** the map exists. The question kind is new.
- **If you don't reply I'll do:** nothing.

**F5. One line only.**
- **What it is:** a question with a hard limit of about 120 characters, drawn without a box.
- **Why here:** eight of the ten designers invented a boxless form for a one-line answer without
  being asked (F24), which usually means the shape is right. It also gives the page a rhythm, which
  is half of what makes a magazine readable.
- **What it costs:** almost nothing. A cap and a reading surface.
- **If you don't reply I'll do:** nothing.

**F6. This time last year.**
- **What it is:** when an Edition goes out, it carries one answer from the same batch a year ago.
- **Why here:** it needs no new input from anybody, it makes the archive worth having, and it is
  the thing that turns a newsletter into a record.
- **What it costs:** one query. It only starts working when a Catch-up is a year old, which yours
  will be in August.
- **If you don't reply I'll do:** nothing.

**F7. A longer question library.**
- **What it is:** more questions to pick from. Letterloop has 600 and we have eight categories.
- **Why here:** it is the only parity gap that costs nothing to close, and "pick a question" is
  the first thing anyone does.
- **What it costs:** no code at all. Somebody has to write the questions, and it should probably
  be you, because they are the voice of the thing.
- **If you don't reply I'll do:** nothing.

### Considered and not proposed

- **Answers hidden until you write your own.** It lifts participation and it is coercive, and this
  is a school you left, not a streak to keep.
- **More reactions than the heart.** The heart is the app's one gesture and five of them is a
  toolbar.
- **Anonymous answers.** A question can already be asked anonymously. An anonymous *answer* in a
  group of seventy people who know each other is a different product.
- **A guest question from another batch.** Clever, and it breaks the one rule a batch Catch-up has,
  which is that the members are the batch.

---

## 5. What this session recommends, if you want one line

**F5, then F2, then F1.** One line only is nearly free and improves every page it appears on. The
poll is cheap because the machinery exists. The voice answer is the one with real upside and real
unknowns, and it wants its own session.

**And the photo wall's reading surface is not on that list because it is not optional** — it is
¶16, it is already a LOCKED decision, and it has to be drawn before build phase 8 because it can
change a page that is already drawn.

---

## 6. Sources

- [letterloop.co](https://www.letterloop.co/) — read 2026-09-09: 600+ questions, up to 50 members,
  email delivery, photographs, own questions.
- [Letterloop on the App Store](https://apps.apple.com/us/app/letterloop/id6468623700) — reactions
  and comments on replies and photos, Spotify links, archives.
- [Remento](https://www.remento.co/journal/exploring-the-best-storyworth-alternatives-for-capturing-and-preserving-family-memories)
  and [StoryWorth on Remento](https://welcome.storyworth.com/blog/remento---how-it-works-pricing-reviews-top-alternatives)
  — weekly prompt, recorded answer, speech-to-story transcription, printed book.
- [StoryWorth alternatives, Heritage Whisper](https://heritagewhisper.com/alternatives/storyworth-alternatives)
  and [Tell Mel](https://tellmel.ai/blog/storyworth-alternatives) — the move to voice and to the
  telephone, and why: typing is the barrier.

**What is NOT measured here.** Nobody opened Letterloop's own published issue or its composer;
the parity table is read off its marketing pages and its store listing, which is the same limit
`prior-art.md` §1 carries and F15 warns about. If the question library or the email issue becomes
a real piece of work, somebody should sign up and look first.
