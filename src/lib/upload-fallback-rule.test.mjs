import assert from "node:assert/strict";
import test from "node:test";
import { balancedBody } from "./test-fn-body.mjs";
import { read, decomment } from "./test-kit.mjs";
import { fallbackSizeNotice, fallbackSizeBatchNotice } from "./upload-shared.ts";

/* ------------------------------------------------------------------ *
 *  The Collection's proxied fallback, fixed 2026-09-27.
 *
 *  Three things went wrong together, found from a read-only pass over the
 *  real database (9 of 1,972 Collection photographs took this path in 2026,
 *  in bursts from single sessions), and this file is what stops any one of
 *  them drifting back:
 *
 *   1. `contributePhoto` hard-resized to 1600px at quality 80 -- a SECOND
 *      shrink on top of the browser's own 2048px cap (`shrinkForUpload`),
 *      for a photograph whose only fault was a presigned PUT that failed.
 *      Fixed by reusing the direct path's own safety cap (`storedResizeBox`)
 *      and quality constant instead of a fixed box.
 *   2. `directUploadPut` gave up on the first failure. A network error, a
 *      timeout or a 5xx now gets one retry with a fresh presign before the
 *      fallback is used at all.
 *   3. Nobody was told when a photograph DID take the fallback and came out
 *      smaller than sent. `contributePhoto` now says so on its return, and
 *      the contribute room toasts it.
 * ------------------------------------------------------------------ */

const actions = decomment(read("src/app/(main)/collection/actions.ts"));
const client = decomment(read("src/lib/upload-client.ts"));
const room = decomment(read("src/components/collection/contribute-room.tsx"));

/* ---- 1. no second shrink -------------------------------------------- */

const contributePhoto = balancedBody(actions, "export async function contributePhoto(");
const contributePhotoDirect = balancedBody(actions, "export async function contributePhotoDirect(");

test("the extraction really is contributePhoto's whole body", () => {
  // If this fails the assertions below are testing a fragment, and their
  // passing means nothing.
  assert.ok(contributePhoto, "contributePhoto not found; the extraction broke");
  assert.match(contributePhoto, /^\{[\s\S]*return \{ success: true, autoApprove, notice, smaller: true \};\s*\}$/);
});

test("contributePhoto no longer hard-resizes to 1600px", () => {
  assert.doesNotMatch(
    contributePhoto,
    /\.resize\(\s*1600/,
    "the fallback is shrinking the browser's own pixels a second time again"
  );
  assert.match(
    contributePhoto,
    /storedResizeBox\(/,
    "the fallback dropped the safety cap the direct path applies"
  );
  assert.match(
    contributePhoto,
    /quality:\s*COLLECTION_WEBP_QUALITY/,
    "the fallback no longer matches the Collection's own re-encode quality"
  );
});

test("the fallback's cap and quality are the same call the direct path makes, not a coincidence", () => {
  assert.ok(contributePhotoDirect, "contributePhotoDirect not found; the extraction broke");
  for (const body of [contributePhoto, contributePhotoDirect]) {
    assert.match(body, /storedResizeBox\(await sharpImage\(\w+\)\.rotate\(\)\.metadata\(\)\)/);
    assert.match(body, /\.resize\(box\.width, box\.height,/);
  }
});

/* ---- 2. the retry ---------------------------------------------------- */

test("directUploadPut bounds itself to a small, fixed number of attempts", () => {
  const max = /const MAX_ATTEMPTS = (\d+);/.exec(client);
  assert.ok(max, "MAX_ATTEMPTS is no longer a plain constant");
  assert.ok(Number(max[1]) >= 2, "MAX_ATTEMPTS dropped back to a single attempt");
  assert.match(
    client,
    /for \(let attempt = 1; attempt <= MAX_ATTEMPTS[^;]*; attempt\+\+\)/,
    "directUploadPut no longer loops over its attempts, so there is nothing left to retry"
  );
  // The public contract is unchanged: the retry is an internal, transparent
  // detail, not a new shape callers have to learn.
  assert.match(client, /Promise<\{ key: string; publicUrl: string \} \| null>/);
});

test("a transient failure retries; a definitive one does not", () => {
  const attempt = balancedBody(client, "async function attemptDirectUpload(");
  assert.ok(attempt, "attemptDirectUpload not found; the extraction broke");

  // The two definitive cases -- a deliberate `{direct:false}` (storage not
  // configured) and a PUT's own refusal -- retry only on a 5xx; anything
  // else (a 4xx, a clean `direct:false`) answers "unavailable" and is never
  // retried, because a second try will not change either one.
  const gated = [...attempt.matchAll(/>= 500 \? "retry" : "unavailable"/g)];
  assert.equal(gated.length, 2, "the presign and the PUT no longer gate their retry on a 5xx status");

  // The two transient cases worth retrying unconditionally: a thrown fetch
  // on either the presign call or the PUT itself (a network error, a
  // timeout, or a CORS block indistinguishable from either in a browser).
  const bareRetries = [...attempt.matchAll(/^\s*return "retry";\s*$/gm)];
  assert.equal(bareRetries.length, 2, "a thrown presign or PUT fetch no longer retries unconditionally");

  // A 400 with a real verdict about the FILE is still thrown, never retried
  // -- unaffected by any of the above.
  assert.match(attempt, /if \(status === 400 && presign\.error\) throw new Error\(presign\.error\);/);
});

test("the retry's PUT gets its own fresh deadline, not a spent one", () => {
  // A premade AbortSignal the caller minted once would already be fired by
  // the first attempt's own timeout, and a fired signal aborts the retry
  // before it starts. A number lets each attempt mint its own.
  assert.doesNotMatch(
    client,
    /opts\?\.signal/,
    "directUploadPut is back to taking a premade AbortSignal, which a retry cannot renew"
  );
  assert.match(client, /deadlineMs !== undefined \? AbortSignal\.timeout\(deadlineMs\) : undefined/);
});

test("the contribute room hands over a deadline, not a signal that a retry would find already spent", () => {
  assert.doesNotMatch(
    room,
    /AbortSignal\.timeout\(putDeadline/,
    "contribute-room.tsx is back to minting its own AbortSignal for the whole climb"
  );
  assert.match(room, /deadlineMs: putDeadline\(next\.file\.size\)/);
});

/* ---- 3. the member is told -------------------------------------------- */

test("the fallback notice reads as one plain sentence: no exclamation, no em dash", () => {
  const one = fallbackSizeNotice();
  const many = fallbackSizeBatchNotice(3);
  for (const s of [one, many]) {
    assert.ok(!s.includes("!"), `"${s}" uses an exclamation mark`);
    assert.ok(!s.includes("—"), `"${s}" uses an em dash`);
  }
  assert.match(one, /^One photograph was saved smaller than you sent it/);
  assert.match(many, /^3 photographs were saved smaller than you sent them/);
  // Singular and plural say the same two facts: what happened, and the way
  // out. Diverging wording between them is how one of the two goes stale.
  for (const s of [one, many]) {
    assert.match(s, /the full-size upload did not go through/);
    assert.match(s, /add (it|them) again later/);
  }
});

test("contributePhoto tells its caller it took the fallback", () => {
  assert.match(
    contributePhoto,
    /return \{ success: true, autoApprove, notice, smaller: true \};/,
    "contributePhoto no longer says smaller:true, so nothing downstream can toast it"
  );
});

test("the contribute room counts the fallback rather than deduping it like the GIF notice", () => {
  // A Set (like `notices` for the GIF case) collapses this generic message
  // -- it names no file -- into one entry regardless of how many
  // photographs actually took the fallback. A plain counter does not.
  assert.match(
    room,
    /if \(res\.smaller\) smaller\.current \+= 1;/,
    "the room stopped counting which photographs took the fallback"
  );
  assert.match(
    room,
    /smaller\.current === 1 \? fallbackSizeNotice\(\) : fallbackSizeBatchNotice\(smaller\.current\)/,
    "the room's toast no longer distinguishes one photograph from several"
  );
  assert.match(room, /import \{[^}]*fallbackSizeBatchNotice[^}]*fallbackSizeNotice[^}]*\} from "@\/lib\/upload-shared";/s);
});
