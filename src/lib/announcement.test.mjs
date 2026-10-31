import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "./test-kit.mjs";
import { ANNOUNCEMENT_AT, VISIT_MS, announcementDue, headcountPhrase, heldForTheGuide } from "./announcement.ts";

/* ------------------------------------------------------------------ *
 *  The announcement window over the Feed (docs/spec/announcement.md):
 *  who it is for, when in a member's life it opens, how it counts the
 *  members, and which birds its wall shows.
 * ------------------------------------------------------------------ */

test("the headcount is said the way the owner says it, and stays true as it moves", () => {
  assert.equal(headcountPhrase(587), "Nearly 600");
  assert.equal(headcountPhrase(575), "Nearly 600");
  assert.equal(headcountPhrase(600), "600");
  assert.equal(headcountPhrase(612), "More than 600");
  assert.equal(headcountPhrase(655), "More than 650");
  assert.equal(headcountPhrase(550), "550");
  assert.equal(headcountPhrase(42), "42");
});

test("a member is due until the account records this announcement, new joiners included", () => {
  assert.equal(announcementDue({ announcementSeenAt: null }), true);
  assert.equal(announcementDue({ announcementSeenAt: new Date(ANNOUNCEMENT_AT.getTime() - 1) }), true);
  assert.equal(announcementDue({ announcementSeenAt: new Date(ANNOUNCEMENT_AT.getTime() + 1) }), false);
});

test("a tour that ended in this sitting holds the window to the next one", () => {
  const now = Date.parse("2026-11-01T10:00:00Z");
  assert.equal(heldForTheGuide(null, now), false, "a fresh tab or app start: no reading, so it shows");
  assert.equal(heldForTheGuide(now - 60_000, now), true, "the tour ended a minute ago in this tab");
  assert.equal(heldForTheGuide(now - VISIT_MS - 1, now), false, "a tab left open since yesterday is a new sitting");
});

test("the tour writes when it ended on this tab's own clock, and the window reads only that", () => {
  const tour = decomment(read("src/lib/guide-tour.ts"));
  const noteBody = tour.slice(tour.indexOf("export function noteTourEnded"), tour.indexOf("export function tourEndedAt"));
  assert.match(noteBody, /sessionStorage\.setItem\(TOUR_ENDED_AT, String\(Date\.now\(\)\)\)/);
  const open = decomment(read("src/lib/announcement-open.ts"));
  assert.match(open, /heldForTheGuide\(tourEndedAt\(\), Date\.now\(\)\)/, "compared on one clock, never the server's");
  const start = decomment(read("src/components/announcement/announcement-start.tsx"));
  assert.match(start, /if \(!replay && \(announcementEnded\(userId\) \|\| guideJustEnded\(\)\)\) return;/);
  assert.doesNotMatch(start, /guideSeenAt/, "no comparison against the server's clock");
});

test("the stamp is tried again while the window is open, and never sent from a planted note", () => {
  const layer = decomment(read("src/components/announcement/announcement-layer.tsx"));
  assert.match(layer, /for \(const pause of \[0, 2000, 8000\]\)/, "a stamp that does not land is tried again");
  const start = decomment(read("src/components/announcement/announcement-start.tsx"));
  /* e2e/auth.setup.ts plants the browser note on the owner's account; a stamp
     sent on seeing that note would spend his real showing. */
  assert.doesNotMatch(start, /markAnnouncementSeen/, "the start never stamps the account");
});

test("the demo never writes the stamp", () => {
  const action = decomment(read("src/app/(main)/announcement/actions.ts"));
  assert.match(action, /if \(IS_DEMO\) return true;/, "the action refuses on the demo before anything else");
});

test("only the Feed opens it, never on the demo, and only an admin can replay it", () => {
  const feed = decomment(read("src/app/(main)/feed/page.tsx"));
  assert.match(feed, /announcement === "replay" && session\.user\.role === "admin"/, "replay is admin-only");
  assert.match(feed, /const announce =\s*!IS_DEMO &&/, "the demo never shows it");
  const layout = decomment(read("src/app/(main)/layout.tsx"));
  assert.match(layout, /\{!IS_DEMO && <AnnouncementLayer /, "the demo never mounts its layer");
});

/* The wall: names, not indices, read from the source the way the Support
   plate's test reads its twelve. */
const SPECIES = [...decomment(read("src/components/common/bird-avatar-v2.tsx")).match(
  /export const SPECIES_FULL_NAMES[^=]*=\s*\[([\s\S]*?)\];/,
)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const GALLERY = [...decomment(read("src/components/common/bird-gallery-order.ts")).match(
  /export const GALLERY_ORDER[^=]*=\s*\[([\s\S]*?)\];/,
)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const WALL = [...decomment(read("src/components/announcement/wall-birds.ts")).matchAll(/birds: \[([^\]]*)\]/g)].map(
  (row) => [...row[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]),
);

test("the wall shows only birds a member can pick, each once, and never the Roller", () => {
  assert.ok(WALL.length >= 4, "the wall's rows were not found");
  const all = WALL.flat();
  assert.equal(new Set(all).size, all.length, "a bird appears twice on the wall");
  for (const name of all) {
    assert.ok(SPECIES.includes(name), `${name} is not a species`);
    assert.ok(GALLERY.includes(name), `${name} is not on the birds page, so nobody can pick it`);
  }
  assert.ok(!all.includes("Indian Roller"));
});

test("every row is long enough that a bird comes round out of sight", () => {
  /* A lap of six birds at a slot of 1.1 row heights is 6.6 row heights; less
     the 1.15 a bird travels past the edge, 5.45 stay hidden off the far side,
     wider than the laptop's picture (about 4.3 row heights) and the phone's
     band (about 4.2). */
  for (const [i, row] of WALL.entries()) assert.ok(row.length >= 6, `row ${i + 1} has ${row.length} birds`);
});

test("the phone's four rows hold every bird the window's words name", () => {
  const window = decomment(read("src/components/announcement/announcement-window.tsx"));
  const phone = WALL.slice(0, 4).flat();
  const named = {
    "Red-vented Bulbul": "Red-vented Bulbul",
    "Eagle-Owl": "Indian Eagle-Owl",
    Swamphen: "Grey-headed Swamphen",
    Iora: "Common Iora",
    "Murukku bird": "White-browed Bulbul",
    "Paradise Flycatcher": "Asian Paradise Flycatcher",
    "Peregrine Falcon": "Peregrine Falcon",
  };
  for (const [words, species] of Object.entries(named)) {
    if (!window.replace(/\s+/g, " ").includes(words)) continue;
    assert.ok(phone.includes(species), `the window names the ${words} but the phone's band never shows it`);
  }
});

test("the account is stamped once per announcement, the moment the window opens", () => {
  const action = decomment(read("src/app/(main)/announcement/actions.ts"));
  assert.match(action, /await auth\(\)/, "the stamp is for the signed-in member only");
  assert.match(
    action,
    /OR: \[\{ announcementSeenAt: null \}, \{ announcementSeenAt: \{ lt: ANNOUNCEMENT_AT \} \}\]/,
    "only a missing or older stamp is replaced, so a second call is a no-op"
  );
  const layer = decomment(read("src/components/announcement/announcement-layer.tsx"));
  assert.match(layer, /if \(!state \|\| state\.replay \|\| announcementEnded\(userId\)\) return;/, "a replay records nothing");
  assert.match(layer, /markAnnouncementSeen\(\)/);
  const feed = decomment(read("src/app/(main)/feed/page.tsx"));
  assert.match(feed, /marker\.guideSeenAt !== null && announcementDue\(marker\)/, "only after the guide, and only while due");
});

test("the visual suite never photographs the window, and never spends the owner's", () => {
  const setup = read("e2e/auth.setup.ts");
  const open = read("src/lib/announcement-open.ts");
  const id = read("src/lib/announcement.ts").match(/ANNOUNCEMENT_ID = "([^"]+)"/)[1];
  assert.match(open, /ANNOUNCEMENT_ENDED = `announcement-\$\{ANNOUNCEMENT_ID\}`/);
  assert.ok(
    setup.includes(`rv:moment:announcement-${id}:\${id}`),
    "e2e/auth.setup.ts does not write the window's note for this announcement"
  );
});
