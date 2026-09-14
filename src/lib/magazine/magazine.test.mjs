import { test } from "node:test";
import assert from "node:assert/strict";
import { wholeCorpus } from "../../app/lab/catchups/_fixtures/magazine/corpus.ts";
import { sourcesFromFile } from "./from-export.ts";
import { layoutMagazine, missingFrom, quoteBudget, CONTENTS_FROM, CONTENTS_FROM_PAGES } from "./index.ts";
import { DPI_FLOOR } from "./image.ts";
import { rowsPerPage, A4 } from "./types.ts";
import { quotable, sentencesOf, visibleText, coverLine } from "./measure.ts";
import { classify, NOTE_WORDS, ESSAY_WORDS } from "./grammar.ts";

/* ------------------------------------------------------------------ *
 *  The magazine's grammar, run over the whole corpus.
 *
 *  His instruction, brief para 51: "fill it with literally every type of
 *  content we might come across and make sure it surves the most varying
 *  input. incredibly robust can be produced with only pressure testing."
 *  So this does not assert what any page looks like. It asserts what no
 *  page may ever do, on every fixture in
 *  src/app/lab/catchups/_fixtures/magazine/ and, on a machine that holds
 *  one, on the real export (which is gitignored and never committed).
 *
 *  Every rule here is one of the failure modes in magazine.md, by its
 *  letter: A7 an empty Edition is not something to send, B2 nothing prints
 *  under the dpi floor, G1 padding must not pay, G8 nothing is reordered,
 *  G9 quotes are rationed, G12/G13 two runs agree, G30 nothing a member
 *  put in is dropped, H18 a capsule quotes nobody, and so on.
 * ------------------------------------------------------------------ */

const corpus = wholeCorpus();
const editions = corpus.flatMap((entry) => sourcesFromFile(entry.file).map((s) => ({ ...s, key: entry.key, live: entry.live })));
const perPage = rowsPerPage(A4);

test("the corpus is what the test expects", () => {
  const keys = new Set(corpus.map((c) => c.key));
  for (const k of ["one-writer", "nobody-wrote", "forty-notes", "one-essay", "all-portraits", "wall-300", "no-photos", "songs", "voice-votes", "hostile", "capsule", "photo-heavy", "pressure"]) {
    assert.ok(keys.has(k), `fixture ${k} is missing from the corpus`);
  }
  assert.ok(editions.length >= 15, `only ${editions.length} published Editions in the corpus`);
});

for (const { name, source, key, live } of editions) {
  const label = live ? `live ${name}` : `${key}: ${name}`;
  const magazine = layoutMagazine(source);

  test(`${label}: lays out, and its own checks pass`, () => {
    assert.ok(magazine.pages.length >= 2, "a cover and a back page at least");
    const checks = magazine.notes.filter((n) => n.startsWith("CHECK"));
    assert.deepEqual(checks, [], checks.join("\n"));
  });

  test(`${label}: nothing a member put in is left out (G30)`, () => {
    /* Photographs too small to print at any size are the one allowed
       loss, and the engine says so in a note. */
    const missing = missingFrom(magazine).filter((m) => !m.startsWith("photo"));
    assert.deepEqual(missing, [], missing.join("\n"));
  });

  test(`${label}: no page overflows and no page but the last is thin (A1, D9)`, () => {
    magazine.pages.forEach((p, i) => {
      assert.ok(p.used <= perPage, `page ${p.number} uses ${p.used} of ${perPage} rows`);
      const last = i === magazine.pages.length - 1;
      const cover = p.blocks[0]?.kind === "cover" || p.blocks[0]?.kind === "contents";
      /* Forty percent: a page that is one band of six photographs before a
         story that needs a fresh page is allowed to be quiet. */
      if (!last && !cover) assert.ok(p.used >= perPage * 0.4, `page ${p.number} is ${Math.round((p.used / perPage) * 100)}% used: [${p.signature}]`);
    });
  });

  test(`${label}: questions and answers keep their order (G8)`, () => {
    const openers = magazine.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "opener").map((b) => b.question.id));
    const expected = source.questions.filter((q) => q.answers.some((a) => visibleText(a.body) || a.photos.length || a.links.length || a.audio || a.pick !== null)).map((q) => q.id);
    assert.deepEqual(openers, expected);
    for (const p of magazine.pages) for (const b of p.blocks) {
      if (b.kind !== "columns") continue;
      const ids = b.columns.flat().map((t) => t.answer.id);
      const q = source.questions.find((q) => q.answers.some((a) => a.id === ids[0]));
      if (!q) continue;
      const order = q.answers.map((a) => a.id);
      const idx = ids.map((id) => order.indexOf(id));
      assert.deepEqual(idx, [...idx].sort((a, b) => a - b), `answers reordered on page ${p.number}`);
    }
  });

  test(`${label}: two runs agree (G12, G13)`, () => {
    const again = layoutMagazine(source);
    assert.deepEqual(again.pages.map((p) => p.signature), magazine.pages.map((p) => p.signature));
    assert.equal(again.score, magazine.score);
  });

  test(`${label}: quotes are rationed and never from a capsule (G9, H18)`, () => {
    const quotes = magazine.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "quote"));
    const decks = magazine.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "opener" && b.deck));
    const stories = source.questions.filter((q) => q.answers.length).length;
    assert.ok(quotes.length + decks.length <= quoteBudget(stories), `${quotes.length + decks.length} quotes for ${stories} stories`);
    if (source.sealedAt) assert.equal(quotes.length + decks.length, 0, "a capsule quotes nobody");
    const seen = new Set();
    for (const q of quotes) {
      assert.ok(!seen.has(q.answerId), "one answer quoted twice");
      seen.add(q.answerId);
    }
  });

  test(`${label}: every photograph clears the floor at its printed size (B2, B16, G2)`, () => {
    for (const p of magazine.pages) for (const b of p.blocks) {
      const placements = b.kind === "photo-text" ? [b.photo] : b.kind === "photo-band" ? b.photos : b.kind === "opener" && b.lead ? [b.lead] : b.kind === "cover" && b.lead ? [b.lead] : [];
      for (const pl of placements) assert.ok(pl.dpi >= DPI_FLOOR - 0.5, `page ${p.number}: ${Math.round(pl.dpi)} dpi`);
    }
  });

  test(`${label}: a contents page only when there is enough to list (A6)`, () => {
    const contents = magazine.pages.filter((p) => p.blocks[0]?.kind === "contents");
    const stories = source.questions.filter((q) => q.answers.length).length;
    assert.ok(contents.length <= 1);
    if (contents.length) assert.ok(stories >= CONTENTS_FROM && magazine.pages.length - 2 >= CONTENTS_FROM_PAGES, `a contents page for ${stories} stories on ${magazine.pages.length} pages`);
    else assert.ok(stories < CONTENTS_FROM || magazine.pages.length - 2 < CONTENTS_FROM_PAGES, `no contents page for ${stories} stories on ${magazine.pages.length} pages`);
    if (contents.length) {
      const c = contents[0].blocks[0];
      for (const e of c.entries) {
        assert.ok(e.page >= 2, `contents points "${e.question.text.slice(0, 20)}" at page ${e.page}`);
        const page = magazine.pages[e.page - 1];
        assert.ok(page.blocks.some((b) => b.kind === "opener" && b.question.id === e.question.id), `page ${e.page} does not open "${e.question.text.slice(0, 20)}"`);
      }
    }
  });

  test(`${label}: the folio's running question is never a page's tail (round 3, 12)`, () => {
    for (const p of magazine.pages) {
      if (!p.running) continue;
      const openers = p.blocks.filter((b) => b.kind === "opener");
      const first = p.blocks[0];
      /* The running question is the one the page STARTS in, unless the
         page starts with a headline. */
      if (openers.length && first.kind === "opener") assert.equal(p.running, visibleText(first.question.text));
    }
  });
}

/* ── Fixture-specific expectations ─────────────────────────────────── */

const byKey = (k) => editions.filter((e) => e.key === k);

test("nobody-wrote: a cover, a back page, and a note not to send it (A7)", () => {
  const [e] = byKey("nobody-wrote");
  const m = layoutMagazine(e.source);
  assert.equal(m.pages.length, 2);
  assert.ok(m.notes.some((n) => n.includes("Nobody wrote in")));
  const back = m.pages[1].blocks[0];
  assert.equal(back.kind, "contributors");
  assert.equal(back.alsoAsked.length, 2);
});

test("one-writer: four pages at most, not eight headlines on eight pages (A9, D10, G1)", () => {
  const [e] = byKey("one-writer");
  const m = layoutMagazine(e.source);
  assert.ok(m.pages.length <= 4, `${m.pages.length} pages`);
});

test("forty-notes: forty three-word answers take under two pages of notes (D11)", () => {
  const [e] = byKey("forty-notes");
  const m = layoutMagazine(e.source);
  assert.ok(m.pages.length <= 4, `${m.pages.length} pages`);
  assert.ok(Object.values(m.choices).some((t) => t.startsWith("notes")), "the notes template was not chosen");
});

test("one-essay: the 9,000 characters split across pages with the byline on the first (A2, D2)", () => {
  const [e] = byKey("one-essay");
  const m = layoutMagazine(e.source);
  const essays = m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "essay"));
  const long = essays.filter((b) => b.text.answer.body.length >= 8000);
  assert.ok(long.length >= 2, "the essay did not split");
  assert.ok(!long[0].text.continued, "the first slice is marked as a continuation");
  assert.ok(long.slice(1).every((b) => b.text.continued), "a continuation without its mark");
  for (const b of essays) assert.ok(b.rows >= 4, "a slice under four lines");
});

test("all-portraits: not every page the same shape (B17, D14)", () => {
  const [e] = byKey("all-portraits");
  const m = layoutMagazine(e.source);
  const sigs = m.pages.map((p) => p.signature);
  let run = 1;
  for (let i = 1; i < sigs.length; i += 1) {
    run = sigs[i] === sigs[i - 1] ? run + 1 : 1;
    assert.ok(run <= 3, `signature ${sigs[i]} runs ${run} pages`);
  }
});

test("wall-300: every printable photograph is on the wall, none stretched past twice the median (A14, G32)", () => {
  const [e] = byKey("wall-300");
  const m = layoutMagazine(e.source);
  const walls = m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "wall"));
  const shots = walls.flatMap((w) => w.rowsOfPhotos.flatMap((r) => r.shots));
  const printable = e.source.questions[0].answers.flatMap((a) => a.photos).filter((p) => p.width && p.width >= 300);
  assert.ok(shots.length >= printable.length - 5, `${shots.length} shots for ${printable.length} printable photographs`);
  const areas = walls.flatMap((w) => w.rowsOfPhotos.flatMap((r) => r.shots.map((s) => s.widthMm * r.heightMm))).sort((a, b) => a - b);
  const median = areas[Math.floor(areas.length / 2)];
  /* A panorama takes a full row of its own at 38mm tall, which is about
     five times the median area and is what a magazine does with one. */
  assert.ok(areas[areas.length - 1] <= median * 6, `largest wall photo is ${(areas[areas.length - 1] / median).toFixed(1)}x the median`);
  assert.ok(m.pages.length <= 24, `${m.pages.length} pages for a wall of 300`);
});

test("songs: every pasted link is a card, and a song given as a name is a card with no art (A25, F36)", () => {
  const [e] = byKey("songs");
  const m = layoutMagazine(e.source);
  const cards = m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "cards")).flatMap((b) => b.cards);
  const links = e.source.questions[0].answers.flatMap((a) => a.links);
  assert.ok(cards.filter((c) => c.link).length >= links.length, `${cards.length} cards for ${links.length} links`);
  assert.ok(cards.some((c) => c.link === null), "the named song has no card");
});

test("voice-votes: a recording with no transcript still appears; a vote never shows a number (A26, F24, F28)", () => {
  const [e] = byKey("voice-votes");
  const m = layoutMagazine(e.source);
  const transcripts = m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "columns")).flatMap((b) => b.columns.flat()).filter((t) => t.kind === "transcript");
  assert.ok(transcripts.length >= 4, `${transcripts.length} recorded answers drawn`);
  const votes = m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "vote"));
  assert.equal(votes.length, 4);
  for (const v of votes) {
    assert.equal(v.result.length, v.question.choices.length, "a choice nobody picked was dropped");
    assert.ok(v.rows <= perPage, "a vote taller than a page");
  }
});

test("hostile: nothing prints as null, a zero-width body is nothing, and a shouted answer is not a quote (C21, E4, F9)", () => {
  const [e] = byKey("hostile");
  const m = layoutMagazine(e.source);
  const askedBy = m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "opener").map((b) => b.question.askedBy));
  for (const a of askedBy) assert.ok(a !== "null" && a !== "undefined");
  const quotes = m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "quote").map((b) => b.text));
  for (const q of quotes) {
    assert.ok(!/SHOUTING/.test(q), "the caps answer was quoted");
    assert.ok(!/died|shit/.test(q), "grief or profanity was quoted");
    assert.ok(!/^He /.test(q), "a pronoun with no referent was quoted");
    assert.ok(!/Meera/.test(q), "an answer under an anonymous question was quoted");
  }
  const printed = m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "columns")).flatMap((b) => b.columns.flat()).map((t) => t.answer.id);
  const zeroWidth = e.source.questions[0].answers.find((a) => a.body && !visibleText(a.body));
  assert.ok(zeroWidth && !printed.includes(zeroWidth.id), "a zero-width body got a block");
  const homonyms = e.source.questions[0].answers.filter((a) => a.author.name === "Arjun Rao");
  assert.equal(homonyms.length, 2);
  assert.ok(homonyms.every((a) => a.author.line2), "two Arjun Raos without a second line");
});

test("capsule: the cover knows it was sealed, and nothing is quoted (F37, H18)", () => {
  const [e] = byKey("capsule");
  assert.ok(e.source.sealedAt);
  const m = layoutMagazine(e.source);
  assert.equal(m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "quote" || (b.kind === "opener" && b.deck))).length, 0);
});

test("photo-heavy: no single writer opens more than a third of the stories (G27)", () => {
  const [e] = byKey("photo-heavy");
  const m = layoutMagazine(e.source);
  const leads = m.pages.flatMap((p) => p.blocks.filter((b) => b.kind === "opener" && b.lead));
  const by = new Map();
  for (const l of leads) {
    const owner = e.source.questions.flatMap((q) => q.answers).find((a) => a.photos.includes(l.lead.photo))?.author.id;
    by.set(owner, (by.get(owner) ?? 0) + 1);
  }
  for (const [who, n] of by) assert.ok(n <= Math.ceil(e.source.questions.length / 3), `${who} opens ${n} stories`);
});

/* ── The small rules, pinned directly ──────────────────────────────── */

test("sentences do not end at Dr., e.g. or 3.5 (C31)", () => {
  const s = sentencesOf("We lived near St. Mary's with Dr. Rao, e.g. on weekends. It was 3.5 km away. Fine.");
  assert.deepEqual(s, ["We lived near St. Mary's with Dr. Rao, e.g. on weekends.", "It was 3.5 km away.", "Fine."]);
});

test("what may be a pull quote (C30, C31, H12, H14)", () => {
  assert.equal(quotable("lol."), false);
  assert.equal(quotable("https://open.spotify.com/track/abc is the one I keep playing."), false);
  assert.equal(quotable("He never came back after that, and nobody said why."), false);
  assert.equal(quotable("My father died the week I left the Valley, and I am fine."), false);
  assert.equal(quotable("THIS WAS THE BEST SUMMER OF MY LIFE AND I MISS EVERYONE."), false);
  assert.equal(quotable('My dad said "never trust a man with two watches."'), false);
  assert.equal(quotable("We sat on the boulders until it was properly dark and nobody wanted to leave."), true);
  assert.equal(quotable("We sat on the boulders until it was properly dark and nobody wanted to leave.", { transcript: true }), false);
});

test("a cover line cuts on a word and never mid-word (H16)", () => {
  const line = coverLine("What was the one thing you packed for the valley that you never once used in seven years?", 40);
  assert.ok(line.length <= 41 && !/\S…/.test(line.slice(0, -1)) && line.endsWith("…"));
  assert.equal(coverLine("Why?"), "Why?");
});

test("classification thresholds", () => {
  const a = (body, extra = {}) => ({ id: "x", author: { id: "p", name: "P", photoUrl: null, birdOverride: null }, body, photos: [], links: [], audio: null, pick: null, hearts: 0, ...extra });
  assert.equal(classify(a("Same.")), "note");
  assert.equal(classify(a("word ".repeat(NOTE_WORDS + 1))), "paragraph");
  assert.equal(classify(a("word ".repeat(ESSAY_WORDS))), "essay");
  assert.equal(classify(a("   \n ")), "empty");
  assert.equal(classify(a(null, { audio: { seconds: 40, url: "/a" } })), "voice");
  assert.equal(classify(a(null, { pick: "c1" })), "vote");
  assert.equal(classify(a("listen", { links: [{ kind: "spotify", url: "u", title: "t", subtitle: null, thumbUrl: null }] })), "card");
});
