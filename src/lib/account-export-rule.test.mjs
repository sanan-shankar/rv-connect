import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "./test-kit.mjs";
import {
  EXPORT_PROBLEM,
  EXPORT_PROFILE,
  EXPORT_SECTIONS,
  LEFT_OUT,
  exportDocument,
  firstWords,
  postLabel,
} from "./account-export-rule.ts";

/* ------------------------------------------------------------------ *
 *  "Download your data" is everything the site keeps about the member.
 *
 *  The file was ten hand-written sections, each added when somebody
 *  remembered, and it missed their hearts on photographs and Catch-up
 *  answers, their bookmarks and poll votes, the profession tags the
 *  directory files them under and every record of their visits, while
 *  its own header said this is the request the law says must be complete
 *  (bug audit 3, T6-03; the owner's Q24: everything, telemetry included).
 *
 *  This walks the User model the way cascade-rule.test.mjs walks its
 *  cascades: every column and every relation must be carried by the file
 *  or named in LEFT_OUT with its reason, so a table added tomorrow fails
 *  here until somebody decides, in writing, whether it is the member's.
 * ------------------------------------------------------------------ */

const schema = read("prisma/schema.prisma");
const ROUTE = decomment(read("src/app/api/account/export/route.ts"));

const MODELS = new Set([...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]));

/** One model's fields, as name -> type (list and optional marks dropped). */
function fields(name) {
  const start = schema.indexOf(`model ${name} {`);
  assert.ok(start > -1, `model ${name} is gone`);
  const body = schema.slice(start, schema.indexOf("\n}", start)).split("\n").slice(1);
  const out = new Map();
  for (const raw of body) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
    const m = line.match(/^(\w+)\s+(\w+)(\[\]|\?)?(\s|$)/);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

const USER = fields("User");
const columns = [...USER].filter(([, type]) => !MODELS.has(type)).map(([n]) => n);
const relations = [...USER].filter(([, type]) => MODELS.has(type)).map(([n]) => n);
const exportedRelations = new Map(EXPORT_SECTIONS.map(([relation, section]) => [relation, section]));
const leftOutBare = Object.keys(LEFT_OUT).filter((k) => !k.includes("."));
const leftOutDotted = Object.keys(LEFT_OUT).filter((k) => k.includes("."));

test("the schema parser sees the User model it is meant to", () => {
  assert.ok(columns.length > 40, `parsed only ${columns.length} User columns; the parser has drifted`);
  assert.ok(relations.length > 25, `parsed only ${relations.length} User relations; the parser has drifted`);
  for (const c of ["password", "professionTags", "guideSeenAt"]) assert.ok(columns.includes(c), `${c} not parsed as a column`);
  for (const r of ["bookmarks", "photoLoves", "visits", "catchupReads"]) assert.ok(relations.includes(r), `${r} not parsed as a relation`);
});

test("every column of the member's row is in the file or left out with a reason", () => {
  const unclassified = columns.filter((c) => !(c in EXPORT_PROFILE) && !(c in LEFT_OUT));
  assert.deepEqual(
    unclassified,
    [],
    `User.${unclassified.join(", User.")} is neither in EXPORT_PROFILE nor in LEFT_OUT (account-export-rule.ts). ` +
      `If it says anything about the member, export it; if it must stay on the site, say why in LEFT_OUT.`
  );
});

test("every table of the member's is a section of the file or left out with a reason", () => {
  const unclassified = relations.filter((r) => !exportedRelations.has(r) && !(r in LEFT_OUT));
  assert.deepEqual(
    unclassified,
    [],
    `User.${unclassified.join(", User.")} has no section in EXPORT_SECTIONS and no entry in LEFT_OUT ` +
      `(account-export-rule.ts). Give it a section and a reader in the export route, or say why it is not the member's.`
  );
});

test("nothing is both in the file and left out, and nothing listed has left the schema", () => {
  const both = [...Object.keys(EXPORT_PROFILE), ...exportedRelations.keys()].filter((k) => k in LEFT_OUT);
  assert.deepEqual(both, [], `${both.join(", ")} is exported and left out at once`);
  const stale = [
    ...Object.keys(EXPORT_PROFILE).filter((c) => !columns.includes(c)),
    ...[...exportedRelations.keys()].filter((r) => !relations.includes(r)),
    ...leftOutBare.filter((k) => !USER.has(k)),
  ];
  assert.deepEqual(stale, [], `the export lists ${stale.join(", ")}, which the User model no longer has`);
  for (const key of leftOutDotted) {
    const [relation, column] = key.split(".");
    assert.ok(exportedRelations.has(relation), `LEFT_OUT's ${key} names a relation the file does not carry`);
    assert.ok(fields(USER.get(relation)).has(column), `LEFT_OUT's ${key}: ${USER.get(relation)} has no column ${column}`);
  }
  for (const [key, why] of Object.entries(LEFT_OUT)) assert.ok(why.length > 20, `LEFT_OUT's ${key} has no real reason`);
});

test("the owner's secrets stay out, and the route never reads one", () => {
  // Q24: the password hash, the session epoch and the emailed sign-in links
  // are not the member's data; a file of them would be a key to the account.
  for (const key of ["password", "credentialVersion", "authTokens"]) assert.ok(key in LEFT_OUT, `${key} is not in LEFT_OUT`);
  for (const read of [
    /\bpassword:\s*true/,
    /\bcredentialVersion:\s*true/,
    /\badminNote:\s*true/,
    /\binviteToken:\s*true/,
    /\bpayload:\s*true/,
    /\bheldAt:\s*true/,
    /tokenHash/,
    /prisma\.authToken\./,
    /reportedUserId:\s*userId/,
  ]) {
    assert.doesNotMatch(ROUTE, read, `the export route reads something LEFT_OUT keeps on the site: ${read}`);
  }
});

test("every section has a reader in the route, under its own name", () => {
  const names = EXPORT_SECTIONS.map(([, section]) => section);
  assert.equal(new Set(names).size, names.length, "two sections share a name");
  for (const name of names) {
    assert.match(ROUTE, new RegExp(`"${name}": \\{`), `section "${name}" has no reader in the export route`);
  }
  // The type does the same job at build time; this is the cheap half of it.
  assert.match(ROUTE, /satisfies Record<ExportSectionName, SectionReader>/);
});

test("the route writes the left-out list into the file and streams by pull", () => {
  assert.match(ROUTE, /leftOut: LEFT_OUT/, "the file no longer says what it leaves out");
  assert.match(ROUTE, /async pull\(controller\)/, "the stream no longer waits for the response to take each piece");
  assert.doesNotMatch(ROUTE, /async start\(controller\)/, "the stream pushes every row again, whatever the network takes");
  assert.match(ROUTE, /cancel\(\)\s*\{[\s\S]*?chunks\.return\(/, "a cancelled download keeps reading the database");
  /* A page in flight when the member cancels still arrives; enqueueing it on
     the cancelled stream throws ERR_INVALID_STATE, and the catch reported that
     to Sentry as a failure (write-path review of unit B4, reproduced in Node).
     Both exits look at the flag first, and cancel() sets it. */
  const pull = ROUTE.slice(ROUTE.indexOf("async pull(controller)"), ROUTE.indexOf("async cancel()"));
  assert.match(pull, /await chunks\.next\(\);\s*if \(cancelled\) return;/, "a piece that lands after a cancel is handed to the closed stream");
  assert.match(pull, /catch \(err\) \{\s*if \(cancelled\) return;/, "a cancelled download is reported as a failure");
  assert.match(ROUTE, /cancel\(\)\s*\{[\s\S]*?cancelled = true;[\s\S]*?chunks\.return\(/, "cancel() no longer tells pull the download was stopped");
});

/* ------------------------------------------------------------------ *
 *  The writer, on fake tables
 * ------------------------------------------------------------------ */

/** Drain a generator into one string. */
async function text(gen) {
  let out = "";
  for await (const piece of gen) out += piece;
  return out;
}

/** A table of `n` rows with ids r001..., paged by `id > after`, with a log. */
function table(n, log, name) {
  const rows = Array.from({ length: n }, (_, i) => ({ id: `r${String(i + 1).padStart(3, "0")}`, n: i + 1 }));
  return async (after) => {
    log.push([name, after]);
    return rows.filter((r) => after === null || r.id > after).slice(0, 2);
  };
}

test("a whole file parses, keeps every id, and walks each table by the last key", async () => {
  const log = [];
  const out = await text(
    exportDocument({
      head: { exportedAt: "x", profile: { id: "u1", name: "A" } },
      sections: [
        { name: "posts", page: table(5, log, "posts") },
        { name: "empty", page: table(0, log, "empty") },
        { name: "even", page: table(4, log, "even") },
      ],
      pageSize: 2,
      onError: () => assert.fail("no error happened"),
    })
  );
  const file = JSON.parse(out);
  assert.equal(file.complete, true);
  assert.deepEqual(file.profile, { id: "u1", name: "A" });
  assert.deepEqual(file.posts.map((r) => r.id), ["r001", "r002", "r003", "r004", "r005"]);
  assert.deepEqual(file.empty, []);
  assert.equal(file.even.length, 4);
  // Five rows in pages of two is three reads; four rows is three as well,
  // the last one empty, because a full page cannot know it was the last.
  assert.deepEqual(log, [
    ["posts", null], ["posts", "r002"], ["posts", "r004"],
    ["empty", null],
    ["even", null], ["even", "r002"], ["even", "r004"],
  ]);
});

test("a table with no id of its own pages by the key its section names", async () => {
  const seen = [];
  const rows = [{ editionId: "e1" }, { editionId: "e2" }, { editionId: "e3" }];
  const out = await text(
    exportDocument({
      head: {},
      sections: [
        {
          name: "editionsRead",
          page: async (after) => {
            seen.push(after);
            return rows.filter((r) => after === null || r.editionId > after).slice(0, 2);
          },
          key: (row) => row.editionId,
        },
      ],
      pageSize: 2,
      onError: () => assert.fail("no error happened"),
    })
  );
  assert.deepEqual(seen, [null, "e2"]);
  assert.equal(JSON.parse(out).editionsRead.length, 3);
});

test("a failure part of the way through ends the file in words, and is reported", async () => {
  const errors = [];
  const boom = new Error("connection reset");
  const out = await text(
    exportDocument({
      head: { profile: { id: "u1" } },
      sections: [
        { name: "posts", page: async (after) => (after === null ? [{ id: "a" }, { id: "b" }] : Promise.reject(boom)) },
        { name: "later", page: async () => [{ id: "never" }] },
      ],
      pageSize: 2,
      onError: (err) => errors.push(err),
    })
  );
  const file = JSON.parse(out); // the point: it still parses
  assert.equal(file.complete, false);
  assert.equal(file.problem, EXPORT_PROBLEM);
  assert.deepEqual(file.posts.map((r) => r.id), ["a", "b"], "the rows written before the failure are kept");
  assert.equal("later" in file, false, "a section after the failure was written anyway");
  assert.deepEqual(errors, [boom]);
});

test("a failure on a section's first page still leaves a file that parses", async () => {
  const out = await text(
    exportDocument({
      head: {},
      sections: [{ name: "posts", page: async () => Promise.reject(new Error("down")) }],
      onError: () => {},
    })
  );
  const file = JSON.parse(out);
  assert.deepEqual(file.posts, []);
  assert.equal(file.complete, false);
});

test("the writer reads ahead of nobody, and a cancelled download stops reading", async () => {
  /* Backpressure lives in the route's `pull`, which asks for one piece at a
     time; it only works if the generator does no work before it is asked. */
  const log = [];
  const gen = exportDocument({
    head: {},
    sections: [
      { name: "first", page: table(3, log, "first") },
      { name: "second", page: table(3, log, "second") },
    ],
    pageSize: 2,
    onError: () => assert.fail("no error happened"),
  });
  await gen.next(); // "{"
  await gen.next(); // the first section's opening
  assert.deepEqual(log, [], "a page was read before anything asked for it");
  await gen.next(); // the first page's rows
  assert.deepEqual(log, [["first", null]]);
  await gen.return(undefined);
  assert.deepEqual(log, [["first", null]], "the database was read after the download was cancelled");
  assert.equal((await gen.next()).done, true);
});

/* ------------------------------------------------------------------ *
 *  Labels
 * ------------------------------------------------------------------ */

test("a row pointing at somebody else's writing says what it was, in a few words", () => {
  assert.equal(postLabel({ kind: "letter", title: "  Monsoon  ", content: "Body" }), "Letter: Monsoon");
  assert.equal(postLabel({ kind: "letter", title: null, content: "No title here" }), "Letter: No title here");
  assert.equal(postLabel({ kind: "post", title: null, content: "Hello\n\n@[Asha](u_1) see this" }), "Post: Hello Asha see this");
  assert.equal(postLabel(null), null);
  const long = firstWords("word ".repeat(40));
  assert.ok(long.length <= 80 && long.endsWith("…"), long);
  assert.equal(firstWords(null), "");
});
