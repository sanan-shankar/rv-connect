import assert from "node:assert/strict";
import test from "node:test";

import { UPLOAD_BODY_LIMIT } from "./image-downscale.ts";
import { read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Nothing ships raw camera bytes to our own server.
 *
 *  Vercel rejects an oversized request body at the PLATFORM, with a 413 the
 *  function never sees, and with every request passing the proxy the line
 *  is Routing Middleware's 4MB, not the function's 4.5MB (bug audit 3,
 *  L8-03). `serverActions: { bodySizeLimit: "25mb" }`
 *  in next.config.ts lifts only Next's own guard and cannot raise that. A
 *  normal phone photo is 5 to 12MB, so three paths failed silently on real
 *  files (bug audit B-030): the onboarding avatar step, which validated only
 *  `file.size > 15MB` and then posted the original into a Server Action; the
 *  Catch-up answer attachments, three files at 5MB each in one request; and
 *  the admin-thread composer, which checked nothing at all. Each showed a
 *  stuck spinner and no message.
 *
 *  Every one of them goes through shrinkForUpload now. This is the tripwire
 *  for the fourth path somebody adds next year.
 * ------------------------------------------------------------------ */

/** Every client file that hands bytes to our own server rather than to R2. */
const SENDERS = [
  "src/components/onboarding/steps/photo-step.tsx",
  "src/components/catchups/answer/photo-attachments.tsx",
  "src/components/messages/message-composer.tsx",
  "src/components/collection/contribute-room.tsx",
  /* The composer sends through its uploads hook (feed-posts-02), which is
     where the fallback's downscale lives now. */
  "src/components/posts/use-composer-uploads.ts",
  /* The profile letterhead was missing from this list and from the guard:
     the same HEIC off the same phone shrank during onboarding and died at
     the platform cap from the profile. Both go through useAvatarUpload now. */
  "src/components/profile/letterhead-profile.tsx",
  /* The Catch-up's picture (spec 3.4). One file, no batch, nothing to report
     while it climbs, so it delegates to `uploadOneImage` -- which shrinks on
     the proxied fallback exactly as the composer's own copy does, pinned
     below. */
  "src/components/catchups/home/picture-picker-dialog.tsx",
];

/** The shared avatar hook counts as shrinking, because it does -- pinned below. */
const SHRINKS = /shrinkForUpload|downscaleImage|useAvatarUpload|uploadOneImage/;

test("the limit is under what the platform will actually carry", () => {
  /* Not the function's 4.5MB: every request passes src/proxy.ts first, and
     Routing Middleware carries at most "4 MB" of body, read here the strict
     way, as decimal (bug audit 3, L8-03). The files must fit with room for
     the multipart framing and the fields beside them. */
  const ROUTING_MIDDLEWARE_CAP = 4_000_000;
  const FRAMING = 64 * 1024;
  assert.ok(
    UPLOAD_BODY_LIMIT + FRAMING <= ROUTING_MIDDLEWARE_CAP,
    "files at the limit, framed, are over the proxy's 4MB body cap, which refuses them before any code runs"
  );
  assert.ok(UPLOAD_BODY_LIMIT > 2 * 1024 * 1024, "the limit is so low it refuses ordinary photos");
});

for (const file of SENDERS) {
  test(`${file} shrinks before it sends`, () => {
    const src = decomment(read(file));
    assert.ok(
      SHRINKS.test(src),
      `${file} posts a picked file straight to our own server; anything over ` +
        `~4MB dies at Vercel's edge with no message the member can act on (B-030)`
    );
  });
}

test("the shared avatar hook is not an empty promise", () => {
  /* Two of the SENDERS above satisfy that assertion by delegating, so this is
     what stops the delegation from being the whole answer: gut the hook and
     the list above would still pass. */
  assert.match(
    decomment(read("src/components/settings/avatar-upload.ts")),
    /shrinkForUpload\(/,
    "useAvatarUpload no longer shrinks, so the two callers trusting it send raw bytes"
  );
});

test("the shared single-image helper is not an empty promise either", () => {
  /* Same reasoning as the avatar hook above: the picture dialog satisfies the
     assertion by delegating, so gutting `uploadOneImage` would leave that pin
     green while a picked file went to our own server whole. */
  assert.match(
    decomment(read("src/lib/upload-client.ts")),
    /export async function uploadOneImage[\s\S]*?downscaleImage\(/,
    "uploadOneImage no longer shrinks on its fallback, so its callers send raw bytes"
  );
});

test("next.config.ts is not relied on to raise the platform cap", () => {
  const src = read("next.config.ts");
  const i = src.indexOf("bodySizeLimit");
  if (i === -1) return; // fine: nothing claims it
  const near = src.slice(Math.max(0, i - 900), i + 200);
  assert.ok(
    /platform|Vercel/i.test(near),
    "bodySizeLimit is set with no note that it lifts only Next's own guard; " +
      "the next person to read it will believe it raised the real cap"
  );
});
