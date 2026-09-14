import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { copyObject, headObjectSize, ownerPrefix, readObjectHead } from "@/lib/storage";
import { purgeImageKey } from "@/lib/image-purge";
import { vetUploadRequest } from "@/lib/api-gate";
import { IS_DEMO } from "@/lib/demo";
import {
  contentTypeForExt,
  decideStagedVoice,
  ownsStagedVoiceKey,
  sniffVoiceExt,
} from "@/lib/voice-answer-rule";

/** A HEAD, a 16-byte ranged GET and a server-side copy: no bytes are pulled
 *  through the function, so this is round trips, not work. Declared anyway,
 *  because a route that runs on the platform default is cut off silently. */
export const maxDuration = 30;

/**
 * Step two of a recording's upload (Catch-ups rework phase 12). The browser has
 * PUT the recording into `staging/<its id>/`; this checks it and moves it to
 * `audio/<its id>/`, returning the URL an answer may then carry.
 *
 * What is checked, in order, and each refusal deletes the staged file:
 *   1. the key is the CALLER's own staged recording (audit C2: never fetch,
 *      move or re-serve bytes named by a key somebody else could write);
 *   2. its real size, from a HEAD, fits the claimed length at the ceiling
 *      bitrate (a presigned PUT cannot enforce a size, see `headObjectSize`);
 *   3. its first bytes are the container its name says.
 *
 * Nothing is decoded and nothing is transcoded (spec 3.10): the member's
 * browser made the file and every browser here can play it.
 *
 * NOTHING CALLS THIS YET; see `../route.ts`.
 */
export async function POST(request: Request) {
  if (IS_DEMO) {
    return NextResponse.json({ error: "The demo doesn't take recordings." }, { status: 403 });
  }

  const vet = await vetUploadRequest(request);
  if (!vet.ok) return vet.response;

  let body: { key?: unknown; seconds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { key, seconds } = body;
  // Not ours to touch: refused and left alone. Aiming a delete at a key the
  // caller chose is the C2 hole, so an unowned key is never purged here.
  if (!ownsStagedVoiceKey(key, vet.userId)) {
    return NextResponse.json({ error: "Bad staging key" }, { status: 400 });
  }
  const stagedKey = key as string;
  const ext = stagedKey.slice(stagedKey.lastIndexOf(".") + 1);

  try {
    const verdict = decideStagedVoice({
      bytes: await headObjectSize(stagedKey),
      seconds,
      ext,
      sniffed: sniffVoiceExt((await readObjectHead(stagedKey, 16)) ?? new Uint8Array()),
    });
    if (!verdict.ok) {
      return NextResponse.json({ error: verdict.error }, { status: 400 });
    }

    const contentType = contentTypeForExt(ext);
    if (!contentType) {
      return NextResponse.json({ error: "That file doesn't look like a recording." }, { status: 400 });
    }
    const url = await copyObject(
      stagedKey,
      ownerPrefix("audio", vet.userId),
      `${createId()}.${ext}`,
      contentType
    );
    return NextResponse.json({ url, seconds });
  } catch (error) {
    console.error("Recording finalize error:", error);
    return NextResponse.json({ error: "The recording didn't save. Try again." }, { status: 422 });
  } finally {
    // The staged file's job is done whichever way this went, and the key is
    // proven the caller's own above. Queued for the nightly retry if storage
    // refuses (audit C-069).
    await purgeImageKey(stagedKey, "staged");
  }
}
