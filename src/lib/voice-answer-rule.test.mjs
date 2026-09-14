import assert from "node:assert/strict";
import test from "node:test";

import { read, decomment } from "./test-kit.mjs";
import {
  VOICE_MAX_SECONDS,
  VOICE_MAX_BYTES,
  VOICE_CEILING_BITS_PER_SECOND,
  voiceByteCap,
  voiceFormat,
  contentTypeForExt,
  validVoiceSeconds,
  sniffVoiceExt,
  ownsStagedVoiceKey,
  ownAudioPrefix,
  decideVoiceAnswer,
  decideStagedVoice,
  MAX_VOICE_URL,
} from "./voice-answer-rule.ts";

/* ------------------------------------------------------------------ *
 *  A question you answer out loud (Catch-ups rework, phase 12), written
 *  down as what each rule refuses. The owner's cap is two minutes
 *  (answer 32, 2026-09-14), and the spec's 90 is corrected.
 * ------------------------------------------------------------------ */

const ME = "clme";
const YOU = "clyou";

test("the cap is two minutes, his number", () => {
  assert.equal(VOICE_MAX_SECONDS, 120);
});

test("seconds: whole, one to a hundred and twenty", () => {
  for (const ok of [1, 2, 60, 119, 120]) assert.ok(validVoiceSeconds(ok), `${ok} refused`);
  for (const bad of [0, -1, 121, 1.5, NaN, Infinity, "30", null, undefined]) {
    assert.ok(!validVoiceSeconds(bad), `${String(bad)} accepted`);
  }
});

test("the byte cap is the length at the ceiling bitrate, plus a container's slack", () => {
  assert.equal(voiceByteCap(120), VOICE_MAX_BYTES);
  // Two minutes at 320 kbps is 4.8 MB; the cap sits just above it.
  assert.ok(VOICE_MAX_BYTES > (120 * VOICE_CEILING_BITS_PER_SECOND) / 8);
  assert.ok(VOICE_MAX_BYTES < 5_000_000, "the cap has drifted far past two minutes of any real recording");
  // What the recorder actually asks for, 64 kbps, is a fifth of the cap.
  assert.ok((120 * 64_000) / 8 < VOICE_MAX_BYTES / 4);
  // A longer claim allows more bytes, never fewer.
  assert.ok(voiceByteCap(10) < voiceByteCap(11));
});

test("content types: the four a MediaRecorder makes, with or without a codec", () => {
  assert.deepEqual(voiceFormat("audio/webm;codecs=opus"), { contentType: "audio/webm", ext: "webm" });
  assert.deepEqual(voiceFormat("audio/ogg; codecs=opus"), { contentType: "audio/ogg", ext: "ogg" });
  assert.deepEqual(voiceFormat("audio/mp4"), { contentType: "audio/mp4", ext: "m4a" });
  assert.deepEqual(voiceFormat("AUDIO/AAC"), { contentType: "audio/aac", ext: "aac" });
  for (const bad of [
    "video/webm", // Chrome labels a camera recording this way; not ours
    "audio/wav", // uncompressed: two minutes is 20 MB
    "audio/mpeg",
    "image/png",
    "text/html",
    "audio/webm-evil",
    "",
    null,
    42,
  ]) {
    assert.equal(voiceFormat(bad), null, `${String(bad)} accepted`);
  }
  assert.equal(contentTypeForExt("m4a"), "audio/mp4");
  assert.equal(contentTypeForExt("exe"), null);
});

test("sniffing reads the container, not the name", () => {
  const webm = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
  const ogg = new TextEncoder().encode("OggS\0\x02\0\0");
  const mp4 = Uint8Array.from([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const adts = Uint8Array.from([0xff, 0xf1, 0x50, 0x80]);
  assert.equal(sniffVoiceExt(webm), "webm");
  assert.equal(sniffVoiceExt(ogg), "ogg");
  assert.equal(sniffVoiceExt(mp4), "m4a");
  assert.equal(sniffVoiceExt(adts), "aac");
  // An MP3 frame's sync has layer bits set; it is not AAC.
  assert.equal(sniffVoiceExt(Uint8Array.from([0xff, 0xfb, 0x90, 0x64])), null);
  assert.equal(sniffVoiceExt(new TextEncoder().encode("<html><script>")), null);
  assert.equal(sniffVoiceExt(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])), null);
  assert.equal(sniffVoiceExt(new Uint8Array()), null);
});

test("a staged key is the caller's own, in the staged shape", () => {
  const mine = `staging/${ME}/2026/09/abc123-a.webm`;
  assert.ok(ownsStagedVoiceKey(mine, ME));
  assert.ok(!ownsStagedVoiceKey(mine, YOU), "someone else's staged recording was accepted");
  // A photograph's staged key, and the Collection's original, are not recordings.
  assert.ok(!ownsStagedVoiceKey(`staging/${ME}/2026/09/abc123.webp`, ME));
  assert.ok(!ownsStagedVoiceKey(`staging/${ME}/2026/09/abc123-o.jpg`, ME));
  // Prefix games.
  assert.ok(!ownsStagedVoiceKey(`staging/${ME}x/2026/09/abc123-a.webm`, ME));
  assert.ok(!ownsStagedVoiceKey(`staging/${ME}/../${YOU}/2026/09/abc-a.webm`, ME));
  assert.ok(!ownsStagedVoiceKey(`audio/${ME}/2026/09/abc123.webm`, ME));
  assert.ok(!ownsStagedVoiceKey(`staging/${ME}/2026/09/abc123-a.wav`, ME));
  assert.ok(!ownsStagedVoiceKey(null, ME));
});

const stored = (owner, name = "abc123", ext = "webm") => {
  const key = `${ownAudioPrefix(owner)}2026/09/${name}.${ext}`;
  return { minted: true, key, length: key.length + 40, seconds: 42 };
};

test("an answer may carry my own recording", () => {
  assert.deepEqual(decideVoiceAnswer(stored(ME), ME), { ok: true });
  assert.deepEqual(decideVoiceAnswer(stored(ME, "x9", "m4a"), ME), { ok: true });
});

test("an answer may not carry somebody else's recording", () => {
  // The attack: attach B's recording, clear the answer, and the purge of a
  // replaced recording deletes B's bytes.
  const verdict = decideVoiceAnswer(stored(YOU), ME);
  assert.equal(verdict.ok, false);
  assert.match(verdict.error, /isn't one you made/);
});

test("an answer may not carry a URL that is not a stored recording", () => {
  const photo = { minted: true, key: `uploads/${ME}/2026/09/p.webp`, length: 80, seconds: 42 };
  assert.equal(decideVoiceAnswer(photo, ME).ok, false, "a photograph passed as a recording");
  const staged = { minted: true, key: `staging/${ME}/2026/09/p-a.webm`, length: 80, seconds: 42 };
  assert.equal(decideVoiceAnswer(staged, ME).ok, false, "an unchecked staged file was attachable");
  assert.equal(decideVoiceAnswer({ ...stored(ME), minted: false }, ME).ok, false);
  assert.equal(decideVoiceAnswer({ ...stored(ME), key: null }, ME).ok, false);
  assert.equal(decideVoiceAnswer({ ...stored(ME), length: MAX_VOICE_URL + 1 }, ME).ok, false);
  const noLength = stored(ME);
  delete noLength.length;
  assert.equal(decideVoiceAnswer(noLength, ME).ok, false, "a missing length waved the URL through");
});

test("an answer's recording must have a length inside the cap", () => {
  for (const seconds of [0, 121, 3.2, "60", undefined]) {
    assert.equal(decideVoiceAnswer({ ...stored(ME), seconds }, ME).ok, false, `${String(seconds)} accepted`);
  }
});

test("a staged file is refused when its size cannot be its length", () => {
  const ok = { bytes: 400_000, seconds: 50, ext: "webm", sniffed: "webm" };
  assert.deepEqual(decideStagedVoice(ok), { ok: true });
  // Claims five seconds, is four megabytes: really a long file.
  assert.equal(decideStagedVoice({ ...ok, seconds: 5, bytes: 4_000_000 }).ok, false);
  // Over the whole cap at any length.
  assert.equal(decideStagedVoice({ ...ok, seconds: 120, bytes: VOICE_MAX_BYTES + 1 }).ok, false);
  // Nothing arrived, or it could not be measured.
  assert.equal(decideStagedVoice({ ...ok, bytes: 0 }).ok, false);
  assert.equal(decideStagedVoice({ ...ok, bytes: null }).ok, false);
  // A zero-second recording.
  assert.equal(decideStagedVoice({ ...ok, seconds: 0 }).ok, false);
});

test("a staged file is refused when its bytes are not what its name says", () => {
  const ok = { bytes: 400_000, seconds: 50, ext: "webm", sniffed: "webm" };
  assert.equal(decideStagedVoice({ ...ok, sniffed: null }).ok, false, "an unrecognisable file passed");
  assert.equal(decideStagedVoice({ ...ok, sniffed: "m4a" }).ok, false, "an mp4 passed as webm");
});

/* ---- the plumbing around the rule, pinned by shape ------------------ */

test("the purge collects an answer's recording before the rows cascade", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  const collect = src.slice(src.indexOf("async function collectImageUrls"));
  const body = collect.slice(0, collect.indexOf("\n}\n"));
  assert.match(body, /catchupEntry\.findMany\([^)]*audioUrl:\s*true/s, "collectImageUrls no longer reads CatchupEntry.audioUrl");
  assert.match(body, /\.audioUrl\)?\s*urls\.push|urls\.push\([^)]*audioUrl/s, "the recording is read but never queued for deletion");
});

test("a stored recording's key is inside the delete fence", () => {
  /* Without "audio" in KNOWN_ROOTS, keyForUrl answers null for a recording,
     delImage reads null as "not ours, nothing to do" and returns true, and
     the purge reports the bytes gone while they stay publicly fetchable. */
  const src = decomment(read("src/lib/storage.ts"));
  const roots = src.slice(src.indexOf("const KNOWN_ROOTS"), src.indexOf("as const", src.indexOf("const KNOWN_ROOTS")));
  assert.match(roots, /"audio"/, "audio is not a known root, so a recording can never be deleted");
  assert.doesNotMatch(roots, /link-previews/, "an unscoped root was added to the delete fence");
});

test("submitEntry checks a recording's ownership before it writes one", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = src.slice(src.indexOf("export async function submitEntry"));
  const gate = fn.search(/ownedVoiceRecording\s*\(/);
  const write = fn.search(/prisma\.\$transaction/);
  assert.ok(gate !== -1, "submitEntry accepts a recording without checking whose it is");
  assert.ok(gate < write, "the recording is checked after the write");
  assert.match(fn.slice(0, write), /IS_DEMO/, "the demo is not refused a recording at the action's own door");
});

test("both audio routes go through the upload door and refuse the demo", () => {
  for (const file of ["src/app/api/upload/audio/route.ts", "src/app/api/upload/audio/finalize/route.ts"]) {
    const src = decomment(read(file));
    assert.match(src, /vetUploadRequest\(/, `${file} skips the upload door`);
    assert.match(src, /IS_DEMO/, `${file} does not refuse the demo itself`);
  }
  const finalize = decomment(read("src/app/api/upload/audio/finalize/route.ts"));
  assert.match(finalize, /ownsStagedVoiceKey\(/, "finalize trusts a caller-named key");
  assert.match(finalize, /decideStagedVoice\(/, "finalize moves a file it has not checked");
  assert.match(finalize, /export const maxDuration = \d+;/);
});

test("the site may ask for its own microphone, and nobody else's frame may", () => {
  /* Read raw: `decomment` loses this file past its first `https://` inside a
     template literal, and the header list sits below several of them. */
  const src = read("next.config.ts");
  assert.match(src, /microphone=\(self\)/, "the Permissions-Policy blocks the microphone outright, so no recorder can start");
  assert.doesNotMatch(src, /microphone=\*/, "the microphone is open to any embedded frame");
  const media = src.slice(src.indexOf('"media-src"'));
  assert.ok(src.includes('"media-src"'), "no media-src, so a stored recording falls back to default-src and never plays");
  assert.match(media.slice(0, 300), /imageHosts/, "media-src does not name the host recordings are served from");
});
