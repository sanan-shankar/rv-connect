import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { directUploadAvailable, presignImagePut, ownerPrefix } from "@/lib/storage";
import { vetUploadRequest } from "@/lib/api-gate";
import { IS_DEMO } from "@/lib/demo";
import {
  VOICE_MAX_BYTES,
  VOICE_MAX_SECONDS,
  validVoiceSeconds,
  voiceByteCap,
  voiceFormat,
} from "@/lib/voice-answer-rule";

/**
 * Step one of a recording's upload (Catch-ups rework phase 12, spec 3.10): a
 * presigned PUT straight into the bucket, staged under the caller's own
 * `staging/<id>/` prefix. `/api/upload/audio/finalize` checks the bytes and
 * moves them to `audio/<id>/`, which is the only place an answer may point.
 *
 * The same shape as the photograph path in `../presign`, and for the same
 * reason: the bytes never pass through a function. What differs is what is
 * checked. There is no image to decode, so the declared type must be one of the
 * four a MediaRecorder makes, and the declared size must fit the declared
 * length (`voiceByteCap`). Both are claims; finalize checks the file itself.
 *
 * NOTHING CALLS THIS YET. The recorder is drawn in `/lab/catchups/voice` and
 * waits for the owner's pick (his answer 31: draw it, build what does not
 * depend on the look, stop). It is gated exactly as if something did.
 */

export async function POST(request: Request) {
  /* The demo, at this route's own door as well as the proxy's (layer 1 closes
     every /api/upload path). A stranger's voice in the bucket is the photograph
     problem with a microphone attached. */
  if (IS_DEMO) {
    return NextResponse.json({ error: "The demo doesn't take recordings." }, { status: 403 });
  }

  const vet = await vetUploadRequest(request);
  if (!vet.ok) return vet.response;

  let body: { contentType?: string; bytes?: number; seconds?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const format = voiceFormat(body.contentType);
  if (!format) {
    return NextResponse.json(
      { error: "This browser recorded in a format we can't keep. Try typing instead." },
      { status: 400 }
    );
  }
  if (!validVoiceSeconds(body.seconds)) {
    return NextResponse.json(
      { error: `A recording can be from 1 second to ${VOICE_MAX_SECONDS / 60} minutes.` },
      { status: 400 }
    );
  }
  const bytes = body.bytes;
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0 || bytes > VOICE_MAX_BYTES) {
    return NextResponse.json({ error: "That recording is too big to keep." }, { status: 400 });
  }
  if (bytes > voiceByteCap(body.seconds)) {
    return NextResponse.json({ error: "That recording is bigger than its length allows." }, { status: 400 });
  }

  // No local fallback: two minutes at the recorder's bitrate is about a
  // megabyte, but nothing proxies audio bytes through the server, and a dev
  // machine without R2 has nothing to record into.
  if (!directUploadAvailable()) {
    return NextResponse.json({ error: "Recordings need storage that isn't set up here." }, { status: 503 });
  }

  const { key, signedUrl } = await presignImagePut(
    ownerPrefix("staging", vet.userId),
    `${createId()}-a.${format.ext}`,
    format.contentType
  );
  // The PUT must carry the bare type it was signed with, not the browser's
  // `audio/webm;codecs=opus`.
  return NextResponse.json({ key, signedUrl, contentType: format.contentType });
}
