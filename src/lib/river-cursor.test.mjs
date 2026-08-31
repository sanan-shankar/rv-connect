import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { balancedBody, decomment } from "./test-kit.mjs";

import {
  afterCursor,
  beforeCursor,
  decodeCursor,
  encodeCursor,
  orderByFor,
  orderByForTakenAscending,
  seekOlder,
} from "./river-cursor.ts";

/* ------------------------------------------------------------------ *
 *  Keyset paging, which is the one part of the river where being wrong
 *  looks right.
 *
 *  An offset page that is off by one shows a duplicate, which somebody
 *  notices. A cursor that is off by one SKIPS a photograph, and nobody
 *  ever notices, because the only evidence is a thing that is not there.
 *  So the round trip is asserted rather than eyeballed.
 * ------------------------------------------------------------------ */

const ROW = { id: "cuid-42", createdAt: new Date("2026-08-28T10:00:00.000Z"), takenKey: 197803 };

test("a cursor survives the round trip, in every order", () => {
  for (const order of ["newest", "oldest", "taken"]) {
    const back = decodeCursor(order, encodeCursor(order, ROW, 48));
    assert.ok(back, `${order} lost its cursor`);
    assert.equal(back.id, ROW.id);
    if (order === "taken") assert.equal(back.takenKey, ROW.takenKey);
    else assert.equal(back.createdAt.toISOString(), ROW.createdAt.toISOString());
  }
  // "Most loved" is the one that cannot be cursored: its sort key is a count
  // of related rows. It carries an offset instead, and the client cannot tell.
  assert.deepEqual(decodeCursor("loved", encodeCursor("loved", ROW, 48)), { offset: 48 });
});

test("a cursor is input, and unreadable input is no cursor at all", () => {
  const junk = [
    undefined, null, "", "~", "no-separator", "~onlyid", "banana~cuid",
    "197803", "off~-4", "off~banana", "~", "off~",
  ];
  for (const order of ["newest", "oldest", "taken", "loved"]) {
    for (const raw of junk) {
      const back = decodeCursor(order, raw);
      // Either it is rejected outright, or whatever it produced is sane.
      if (back === null) continue;
      if ("offset" in back) assert.ok(back.offset >= 0 && Number.isInteger(back.offset), `${order} ${raw}`);
      else assert.ok(back.id, `${order} ${raw} decoded with no tiebreak`);
    }
  }
  // The specific one that used to throw rather than return a page: a negative
  // page number reaching Prisma's `skip` (audit Low 79).
  assert.equal(decodeCursor("loved", "off~-1"), null);
  // And the other end. An offset is the one thing here a caller can make
  // expensive, so it is bounded rather than merely non-negative: `skip: 1e12`
  // asks the database to count past a trillion rows.
  assert.equal(decodeCursor("loved", "off~1000000000000"), null);
  assert.deepEqual(decodeCursor("loved", "off~9999"), { offset: 9999 });
});

test("an id with the separator in it still decodes whole", () => {
  /* cuid2 will not produce a "~", but the encoding must not depend on that:
     the id is everything after the FIRST separator, not a naive split. */
  const odd = { ...ROW, id: "weird~id~with~tildes" };
  const back = decodeCursor("taken", encodeCursor("taken", odd, 0));
  assert.equal(back.id, "weird~id~with~tildes");
});

test("the cursor's where-clause is strictly past the row it names", () => {
  /* Two branches, and that IS keyset pagination: strictly past the sort key,
     or level with it and strictly past the tiebreak. A single `lt` on the
     sort key alone drops every row that ties the last one on the page. */
  const taken = afterCursor("taken", decodeCursor("taken", encodeCursor("taken", ROW, 0)));
  assert.equal(taken.OR.length, 2);
  assert.deepEqual(taken.OR[0], { takenKey: { lt: ROW.takenKey } });
  assert.deepEqual(taken.OR[1], { takenKey: ROW.takenKey, id: { lt: ROW.id } });

  // Oldest runs the other way, and both branches have to turn round with it.
  const oldest = afterCursor("oldest", decodeCursor("oldest", encodeCursor("oldest", ROW, 0)));
  assert.deepEqual(oldest.OR[0], { createdAt: { gt: ROW.createdAt } });
  assert.deepEqual(oldest.OR[1], { createdAt: ROW.createdAt, id: { gt: ROW.id } });

  const newest = afterCursor("newest", decodeCursor("newest", encodeCursor("newest", ROW, 0)));
  assert.deepEqual(newest.OR[0], { createdAt: { lt: ROW.createdAt } });

  // No cursor is the first page, which filters on nothing.
  assert.deepEqual(afterCursor("newest", null), {});
  // An offset cursor is not a where clause; it is a skip.
  assert.deepEqual(afterCursor("loved", { offset: 48 }), {});
});

test("every order ends in a unique tiebreak", () => {
  /* Without it the ordering is partial, so "which row came 48th" has no
     defined answer and Postgres may answer differently per page -- which is
     how a keyset page repeats one row and skips another (audit B-122). */
  for (const order of ["newest", "oldest", "taken", "loved"]) {
    const by = orderByFor(order);
    const last = by[by.length - 1];
    assert.ok("id" in last, `${order} does not end on id`);
  }
});

test("the cursor's two directions agree with the order they page", () => {
  /* The trap this catches: flipping `orderByFor` to ascending and forgetting
     `afterCursor`, which then pages BACKWARDS through a forwards list and
     returns the first page for ever. */
  for (const order of ["newest", "oldest", "taken"]) {
    const by = orderByFor(order);
    const direction = Object.values(by[0])[0];
    const where = afterCursor(order, decodeCursor(order, encodeCursor(order, ROW, 0)));
    const comparison = Object.keys(Object.values(where.OR[0])[0])[0];
    assert.equal(
      comparison,
      direction === "asc" ? "gt" : "lt",
      `${order} sorts ${direction} but pages with ${comparison}`
    );
  }
});

/* ------------------------------------------------------------------ *
 *  Walking the river the other way: the year rail's seek.
 *
 *  Everywhere else "more" means "older" -- one direction, appended at the
 *  bottom. The rail's seek lands mid-river and has to walk BOTH ways from
 *  there, which is new, so it gets the same scrutiny as the cursor itself:
 *  the boundary between two decades must drop nothing and repeat nothing,
 *  and undated (`takenKey` 0) must never surface from the upward walk.
 * ------------------------------------------------------------------ */

test("beforeCursor is afterCursor's mirror: strictly past the row, upward", () => {
  const where = beforeCursor(decodeCursor("taken", encodeCursor("taken", ROW, 0)));
  assert.equal(where.OR.length, 2);
  assert.deepEqual(where.OR[0], { takenKey: { gt: ROW.takenKey } });
  assert.deepEqual(where.OR[1], { takenKey: ROW.takenKey, id: { gt: ROW.id } });
});

test("beforeCursor is nothing for no cursor, and nothing for an offset cursor", () => {
  assert.deepEqual(beforeCursor(null), {});
  assert.deepEqual(beforeCursor({ offset: 48 }), {});
});

test("the ascending order is orderByFor('taken'), field for field reversed", () => {
  const desc = orderByFor("taken");
  const asc = orderByForTakenAscending();
  assert.deepEqual(asc, [{ takenKey: "asc" }, { id: "asc" }]);
  assert.deepEqual(desc, [{ takenKey: "desc" }, { id: "desc" }]);
  assert.deepEqual(asc.map(Object.keys), desc.map(Object.keys));
});

test("seekOlder is strictly below the boundary, with no boundary at the newest decade", () => {
  assert.deepEqual(seekOlder(198000), { takenKey: { lt: 198000 } });
  // The newest real decade has nothing above it: no boundary, no filter.
  assert.deepEqual(seekOlder(null), {});
  // A row exactly ON the boundary (a decade-only 1980s photograph) belongs
  // to the NEXT decade up, not the one just seeked to.
  const boundary = 198000; // the 1980s' own start -- 1970s' seek boundary
  const { lt } = seekOlder(boundary).takenKey;
  assert.equal(boundary < lt, false);
  assert.equal(boundary - 1 < lt, true);
});

/* ------------------------------------------------------------------ *
 *  ...and the same thing asserted against ROWS rather than against the
 *  shape of an object literal.
 *
 *  Everything above pins what the clauses look like, which is worth
 *  having and is not the same as pinning what they RETURN. A seek walks
 *  a river in two directions across a boundary, and the failure it can
 *  produce -- one photograph falling down the seam between the last page
 *  going down and the first page coming up -- is invisible in the shape
 *  of a where clause and obvious the moment you page a whole archive
 *  through it. So: a tiny evaluator for the fragment of Prisma's
 *  grammar these clauses use, and an archive walked end to end.
 * ------------------------------------------------------------------ */

/** `{}` matches everything; `OR` matches if any branch does; a branch is an
 *  AND over its fields, each a literal or one of lt/gt/gte. */
function matches(where, row) {
  if (!where || Object.keys(where).length === 0) return true;
  if (where.OR) return where.OR.some((branch) => matches(branch, row));
  return Object.entries(where).every(([field, test]) => {
    const value = row[field];
    if (test && typeof test === "object") {
      if ("lt" in test && !(value < test.lt)) return false;
      if ("gt" in test && !(value > test.gt)) return false;
      if ("gte" in test && !(value >= test.gte)) return false;
      return true;
    }
    return value === test;
  });
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/** How Postgres returns the river: newest first, id breaking the tie. */
const descending = (a, b) => b.takenKey - a.takenKey || byId(b, a);
const ascending = (a, b) => a.takenKey - b.takenKey || byId(a, b);

/** An archive with every shape that has ever broken a cursor: two rows on
 *  the same key, a decade holding exactly one, and undated rows, which sort
 *  last on a key of 0 and are a real answer rather than a missing one. */
const ARCHIVE = [
  { id: "a1", takenKey: 202400 }, { id: "a2", takenKey: 202400 }, // tied
  { id: "b1", takenKey: 201503 },
  { id: "c1", takenKey: 198100 }, { id: "c2", takenKey: 198507 },
  { id: "d1", takenKey: 197803 }, { id: "d2", takenKey: 197000 },
  { id: "e1", takenKey: 195000 },                                  // alone
  { id: "z1", takenKey: 0 }, { id: "z2", takenKey: 0 },             // undated
].sort(descending);

/** One page of the river, the way `loadPhotos` builds it. */
const pageDown = (where, take) => ARCHIVE.filter((r) => matches(where, r)).sort(descending).slice(0, take);
/** ...and one page of the climb back up, fetched ascending and turned round
 *  before it is shown, which is what the caller does. */
const pageUp = (where, take) =>
  ARCHIVE.filter((r) => matches(where, r)).sort(ascending).slice(0, take).reverse();

test("paging down from a seek reaches every older photograph, once, in order", () => {
  const boundary = 198000; // seek to the 1970s
  const expected = ARCHIVE.filter((r) => r.takenKey < boundary).sort(descending);

  const seen = [];
  let where = { ...seekOlder(boundary) };
  for (let guard = 0; guard < 50; guard++) {
    const rows = pageDown(where, 2);
    if (!rows.length) break;
    seen.push(...rows);
    const last = rows[rows.length - 1];
    where = { ...seekOlder(boundary), ...afterCursor("taken", { takenKey: last.takenKey, id: last.id }) };
  }
  assert.deepEqual(seen.map((r) => r.id), expected.map((r) => r.id));
  // Undated sits at the bottom of the seek, not outside it.
  assert.deepEqual(seen.slice(-2).map((r) => r.id), ["z2", "z1"]);
});

test("climbing back up from a seek reaches every newer photograph, once, in order", () => {
  const boundary = 198000;
  const landed = pageDown(seekOlder(boundary), 2)[0]; // the row the seek lands on
  const expected = ARCHIVE.filter((r) => descending(r, landed) < 0).sort(descending);

  const seen = [];
  let cursor = { takenKey: landed.takenKey, id: landed.id };
  for (let guard = 0; guard < 50; guard++) {
    const rows = pageUp(beforeCursor(cursor), 2);
    if (!rows.length) break;
    seen.unshift(...rows); // pages arrive above what is already on screen
    const top = rows[0];
    cursor = { takenKey: top.takenKey, id: top.id };
  }
  assert.deepEqual(seen.map((r) => r.id), expected.map((r) => r.id));
});

test("the seam holds: down plus up is the whole archive, nothing twice", () => {
  /* The one that matters. A seek splits the river in two at a row, and the
     two halves are fetched by different clauses in different directions --
     which is exactly where a photograph goes missing without anything
     looking wrong. */
  const boundary = 198000;
  const landed = pageDown(seekOlder(boundary), 2)[0];

  const below = ARCHIVE.filter((r) => matches(seekOlder(boundary), r));
  const above = ARCHIVE.filter((r) =>
    matches(beforeCursor({ takenKey: landed.takenKey, id: landed.id }), r)
  );
  // `landed` and everything under it are in one half; everything over it in
  // the other; and the two halves do not overlap by a single row.
  const ids = [...above, ...below].map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "a photograph is in both halves");
  assert.deepEqual([...ids].sort(), ARCHIVE.map((r) => r.id).sort());
});

test("undated never surfaces from the upward climb", () => {
  /* Undated sorts last on a key of 0, so it belongs to the bottom of the
     river and must never be reachable by walking UP out of a real decade --
     which would put photographs with no date above ones that have one. */
  for (const from of ARCHIVE.filter((r) => r.takenKey > 0)) {
    const up = ARCHIVE.filter((r) => matches(beforeCursor({ takenKey: from.takenKey, id: from.id }), r));
    assert.equal(up.some((r) => r.takenKey === 0), false, `undated surfaced above ${from.id}`);
  }
});

test("a tie is split, not dropped and not shown twice", () => {
  // a1 and a2 share 202400. Paging one at a time must return both.
  const first = pageDown({}, 1)[0];
  const next = pageDown(afterCursor("taken", { takenKey: first.takenKey, id: first.id }), 1)[0];
  assert.equal(first.takenKey, next.takenKey, "the fixture no longer holds a tie");
  assert.notEqual(first.id, next.id);
  // ...and climbing back up off the second returns the first, exactly once.
  const back = pageUp(beforeCursor({ takenKey: next.takenKey, id: next.id }), 5);
  assert.deepEqual(back.map((r) => r.id), [first.id]);
});

test("a decade is where the river STARTS, never a filter on what it holds", () => {
  /* The bug this design replaced, and the reason it cannot come back by
     accident. `era` used to be a `where` clause, so pressing "2020s"
     narrowed the archive to it -- and the rail, whose marks are counted
     through that same clause, collapsed to a single mark and hid itself,
     taking the only control that could undo it: "doing that has locked me
     into 2020s... the only way to bring up that sidebar type thing is to
     reload" (owner, 2026-08-29).

     A decade now picks the row the first page begins at and nothing else,
     so there is no clause left that could narrow anything -- and the facet
     count, which is the thing that broke, is free to use the very same
     `where` the river does. If `era` ever reappears in here, that whole
     failure is back. */
  const src = decomment(
    readFileSync(new URL("../app/(main)/collection/actions.ts", import.meta.url), "utf8")
  );
  const where = balancedBody(src, "function buildCollectionWhere(");
  assert.ok(where, "buildCollectionWhere has been renamed or removed");
  assert.doesNotMatch(where, /\bera\b/, "a decade is filtering the river again");
});

test("the river never asks Prisma for an offset it does not need", () => {
  /* The whole point. `skip` survives for "most loved" alone; if it reappears
     on a time-ordered query the deep-page scan is back. */
  const src = readFileSync(new URL("../app/(main)/collection/actions.ts", import.meta.url), "utf8");
  const start = src.indexOf("export async function loadPhotos(");
  assert.notEqual(start, -1);
  const body = src.slice(start, src.indexOf("\n}", src.indexOf("return page;", start)));
  assert.match(body, /\.\.\.\(skip \? \{ skip \} : \{\}\)/);
  assert.doesNotMatch(body, /skip: page \* PAGE_SIZE/);
});
