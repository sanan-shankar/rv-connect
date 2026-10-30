import { test } from "node:test";
import assert from "node:assert/strict";
import { decomment, read } from "../../../lib/test-kit.mjs";
import { startTakes, takeStep } from "./voice-takes.ts";

/* ------------------------------------------------------------------ *
 *  Answering out loud: which late arrivals still count (bug audit 3, L7-09).
 *
 *  A recording removed while it was saving came back onto the answer when
 *  its upload landed; "Record again" while saving could end on the first
 *  take with the second's bytes purged; a second tap during the permission
 *  prompt made two recorders and left a microphone open; a prompt answered
 *  after the question was left started a recording nobody could see.
 * ------------------------------------------------------------------ */

/** Run events from `state`, collecting every effect in order. */
function run(state, ...events) {
  const effects = [];
  for (const e of events) {
    const next = takeStep(state, e);
    state = next.state;
    effects.push(...next.effects);
  }
  return { state, effects };
}

/** A first take, recorded and stopped long enough to keep: its upload is in flight. */
function saving(onAnswer = false) {
  const s = run(startTakes(onAnswer), { type: "start" }, { type: "granted", take: 1, mounted: true }, { type: "stopped", take: 1, long: true });
  assert.deepEqual(s.effects, ["ask", "record", "upload"]);
  return s.state;
}

test("an upload from a recording removed while it was saving is never handed to the answer", () => {
  const { effects } = run(saving(), { type: "remove" }, { type: "uploaded", take: 1 });
  assert.deepEqual(effects, ["clear"], "the removed recording goes back on the answer when its upload lands (L7-09)");
});

test("an upload from a take recorded over is never handed over, and the new take's is", () => {
  const s = run(
    saving(),
    { type: "start" }, // Record again, while the first is still saving
    { type: "uploaded", take: 1 }, // the first lands mid-way through the second
    { type: "granted", take: 2, mounted: true },
    { type: "stopped", take: 2, long: true },
    { type: "uploaded", take: 2 }
  );
  assert.deepEqual(s.effects, ["ask", "record", "upload", "store"], "the first take is stored over the second");
  assert.equal(s.state.onAnswer, true);
});

test("a second press while the browser is still asking changes nothing", () => {
  const asking = run(startTakes(false), { type: "start" }).state;
  const again = takeStep(asking, { type: "start" });
  assert.deepEqual(again.effects, [], "two taps make two recorders writing into one file (L7-09)");
  assert.equal(again.state, asking);
  // And while recording.
  const recording = run(asking, { type: "granted", take: 1, mounted: true }).state;
  assert.deepEqual(takeStep(recording, { type: "start" }).effects, []);
});

test("a microphone granted after the question was left, or for an old take, is handed straight back", () => {
  const asking = run(startTakes(false), { type: "start" }).state;
  assert.deepEqual(takeStep(asking, { type: "granted", take: 1, mounted: false }).effects, ["release"], "a recording nobody can see");
  assert.equal(takeStep(asking, { type: "granted", take: 1, mounted: false }).state.phase, "idle");
  assert.deepEqual(takeStep(asking, { type: "granted", take: 0, mounted: true }).effects, ["release"]);
  const refused = takeStep(asking, { type: "refused", take: 1 });
  assert.deepEqual(refused.effects, []);
  assert.equal(refused.state.phase, "idle", "a refused microphone leaves the button pressable");
});

test("leaving the question does not cost a take the member finished", () => {
  /* The card unmounts while the upload is in flight (a press on another
     question's mark): the take is still the current one, so it is stored. */
  assert.deepEqual(takeStep(saving(), { type: "uploaded", take: 1 }).effects, ["store"]);
});

test("a take too short to keep lets go of the recording the box stopped showing", () => {
  const short = (onAnswer) =>
    run(startTakes(onAnswer), { type: "start" }, { type: "granted", take: 1, mounted: true }, { type: "stopped", take: 1, long: false });
  assert.deepEqual(short(true).effects, ["ask", "record", "clear"], "Record again, too short: the answer keeps a recording the box no longer shows");
  assert.deepEqual(short(false).effects, ["ask", "record"], "a first take that was too short has nothing to clear");
  assert.equal(short(true).state.onAnswer, false);
});

test("the recorder runs every late arrival through the take rules", () => {
  const src = decomment(read("src/components/catchups/answer/voice-recorder.tsx"));
  assert.match(src, /if \(!advance\(takes, \{ type: "start" \}\)\.includes\("ask"\)\) return;/, "start checks before the permission prompt again, not after");
  assert.match(src, /advance\(takes, \{ type: "granted", take, mounted: mounted\.current \}\)\.includes\("record"\)/);
  assert.match(src, /stream\.getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\);\s*return;/, "a stale grant keeps its microphone open");
  assert.match(src, /advance\(takes, \{ type: "stopped", take, long: elapsed >= 1 \}\)/);
  assert.match(
    src,
    /if \(!advance\(takes, \{ type: "uploaded", take \}\)\.includes\("store"\)\) return;\s*hooks\.current\.onStored\(stored\);/,
    "an upload is handed to the answer without asking whether its take still counts"
  );
  assert.match(src, /if \(advance\(takes, \{ type: "remove" \}\)\.includes\("clear"\)\) hooks\.current\.onStored\(null\);/);
  assert.match(src, /disabled=\{state\.kind === "asking"\}/, "the microphone is pressable while the browser asks");
  assert.match(src, /await Promise\.allSettled\(\[\.\.\.uploads\.current\]\)/, "settle waits for the newest upload only");
  const retry = src.slice(src.indexOf("const retry = useCallback("), src.indexOf("const settle = useCallback("));
  assert.ok(retry.length > 20 && !retry.includes("setState("), "retry sends from inside a state updater, twice under Strict Mode");
  assert.doesNotMatch(src, /l\.recording\) return;\s*if \(!navigator\.mediaDevices/, "the old check-before-await guard is back");
});

test("an unwanted take stops before its bytes go, and before they leave staging", () => {
  const src = decomment(read("src/lib/voice-upload-client.ts"));
  const put = src.indexOf("const put = await fetch(signedUrl");
  const finalize = src.indexOf('fetch("/api/upload/audio/finalize"');
  const checks = [...src.matchAll(/if \(!wanted\(\)\) throw new Error\(UNWANTED\);/g)].map((m) => m.index);
  assert.equal(checks.length, 2);
  assert.ok(checks[0] < put && checks[1] > put && checks[1] < finalize, "the wanted checks moved off the PUT and the finalize");
});
