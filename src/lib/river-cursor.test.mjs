import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  afterCursor,
  decodeCursor,
  encodeCursor,
  orderByFor,
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
