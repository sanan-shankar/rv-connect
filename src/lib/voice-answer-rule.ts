/* ------------------------------------------------------------------ *
 *  A question you answer out loud: the rules, with nothing to import.
 *
 *  Catch-ups rework, build phase 12 (spec 3.10). An out-loud answer is an
 *  ordinary answer with a recording attached: `CatchupEntry.audioUrl`,
 *  `audioSeconds`, `audioIsAuto`, and the browser's own transcript in
 *  `body`. Everything the SERVER decides about a recording is here, as
 *  plain functions over plain data, so `voice-answer-rule.test.mjs` can run
 *  them with bare `node` (docs/TRAPS.md, "A testable module must have no
 *  relative VALUE imports"). The env-dependent facts -- did this app mint
 *  that URL, what key does it resolve to -- are computed by the caller
 *  (`voice-answer.ts`, through the one real parser in storage.ts) and handed
 *  in, the same split `upload-ownership-rule.ts` uses for photographs.
 * ------------------------------------------------------------------ */

/** His, 2026-09-14, answer 32: "32 is 2 minutes." The spec had said 90. */
export const VOICE_MAX_SECONDS = 120;

/** Under a second is a tap on the button, not an answer. The recorder throws
 *  it away and says so; the server refuses it in case anything else sends one. */
export const VOICE_MIN_SECONDS = 1;

/**
 * The highest bitrate a recording is allowed to have been made at.
 *
 * The recorder asks for 64 kbps, which is two minutes in about a megabyte. But
 * a presigned PUT cannot enforce a size (R2 has no content-length-range, see
 * `headObjectSize`) and the browser's own default is not ours to set: Chrome's
 * MediaRecorder falls back to around 128 kbps of Opus when a request is
 * ignored, and Safari's AAC is in the same range. 320 kbps is the top of
 * ordinary AAC, so no browser recording a voice gets near it, and a file that
 * does exceed it is not a two-minute recording of anything.
 */
export const VOICE_CEILING_BITS_PER_SECOND = 320_000;

/** A container's own bytes that do not scale with the length: headers, the
 *  moov atom Safari writes at the end, cue points. Generous on purpose. */
export const VOICE_CONTAINER_SLACK_BYTES = 64_000;

/**
 * The most bytes a recording of `seconds` may be.
 *
 * THIS IS THE SERVER'S DURATION CHECK, and it is honest about what it is. The
 * server does not decode audio and cannot read a length out of Chrome's
 * recordings at all: MediaRecorder writes WebM as a stream and never goes back
 * to fill in the duration. So the claimed length is bounded two ways that do
 * not need a decoder. It must be 1 to 120, and the file must be no bigger than
 * that many seconds could be at the ceiling bitrate. A file that claims five
 * seconds and is four megabytes is refused. A file that claims two minutes and
 * holds ten seconds passes, and all that costs is a wrong number on the
 * player's rail until the audio element reads the real one.
 */
export function voiceByteCap(seconds: number): number {
  return Math.ceil((seconds * VOICE_CEILING_BITS_PER_SECOND) / 8) + VOICE_CONTAINER_SLACK_BYTES;
}

/** The absolute ceiling, for the presign door, which is told the length too
 *  but checks the whole-cap first so a refusal message can say "too long". */
export const VOICE_MAX_BYTES = voiceByteCap(VOICE_MAX_SECONDS);

/**
 * The four formats a browser's MediaRecorder produces, and the one extension
 * each is stored under. Chrome and Edge give WebM/Opus, Firefox gives Ogg/Opus,
 * Safari gives MP4/AAC. Raw AAC is here because some Safari versions report it.
 * Stored exactly as recorded: there is no server to transcode on (spec 3.10),
 * and every one of these plays in an `<audio>` element on every browser the
 * members use.
 */
export const VOICE_FORMATS = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
} as const;

export type VoiceContentType = keyof typeof VOICE_FORMATS;
export type VoiceExt = (typeof VOICE_FORMATS)[VoiceContentType];

/**
 * The stored format for a MediaRecorder `mimeType`, or null when it is not one
 * we take. The codec parameter is dropped (`audio/webm;codecs=opus` is
 * `audio/webm`): the PUT is signed with the bare type, and the codec is the
 * container's business.
 */
export function voiceFormat(
  mimeType: unknown
): { contentType: VoiceContentType; ext: VoiceExt } | null {
  if (typeof mimeType !== "string") return null;
  const bare = mimeType.split(";", 1)[0].trim().toLowerCase();
  if (!(bare in VOICE_FORMATS)) return null;
  const contentType = bare as VoiceContentType;
  return { contentType, ext: VOICE_FORMATS[contentType] };
}

/** The extension a content type is stored under, reversed. */
export function contentTypeForExt(ext: string): VoiceContentType | null {
  for (const [type, e] of Object.entries(VOICE_FORMATS)) if (e === ext) return type as VoiceContentType;
  return null;
}

/** A whole number of seconds inside the cap. Not `>= 0.5` rounded: the
 *  recorder rounds, and the server takes what it is given or refuses it. */
export function validVoiceSeconds(seconds: unknown): seconds is number {
  return (
    typeof seconds === "number" &&
    Number.isInteger(seconds) &&
    seconds >= VOICE_MIN_SECONDS &&
    seconds <= VOICE_MAX_SECONDS
  );
}

/**
 * The container a file really is, read from its first bytes, or null.
 *
 * The declared type is the browser's word; this is the file's. Checked at
 * finalize, after the bytes are in the bucket and before they are moved where
 * a member's answer can point at them. It decodes nothing.
 *
 *   webm  EBML magic, 1A 45 DF A3
 *   ogg   "OggS"
 *   m4a   an ISO box whose type is "ftyp", at byte 4
 *   aac   an ADTS sync word: 12 bits set, then layer 00
 */
export function sniffVoiceExt(bytes: Uint8Array): VoiceExt | null {
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "webm";
  }
  if (bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return "ogg";
  }
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return "m4a";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) {
    return "aac";
  }
  return null;
}

/**
 * The shape of a recording while it waits to be checked:
 * `staging/<userId>/<yyyy>/<mm>/<cuid>-a.<ext>`.
 *
 * It stages under `staging/` for the reason the photographs moved there
 * (audit C-063, docs/TRAPS.md "An R2 lifecycle rule matches a PREFIX"): a
 * recording somebody abandons half way is bytes no row names, and the one
 * cleanup that can reach those is a lifecycle rule on a folder that holds
 * nothing permanent. The `-a` is what keeps the two staging shapes apart:
 * the post finalize takes no hyphen and none of these extensions, and this one
 * takes nothing else.
 */
export const STAGED_VOICE_KEY = /^staging\/[a-z0-9]+\/\d{4}\/\d{2}\/[a-z0-9]+-a\.(webm|ogg|m4a|aac)$/;

/** Where a checked recording lives: `audio/<userId>/<yyyy>/<mm>/<cuid>.<ext>`. */
export const STORED_VOICE_KEY = /^audio\/[a-z0-9]+\/\d{4}\/\d{2}\/[a-z0-9]+\.(webm|ogg|m4a|aac)$/;

/** A member's own recordings live under here, and nowhere else. */
export function ownAudioPrefix(userId: string): string {
  return `audio/${userId}/`;
}

/** A staged recording's key belongs to this caller and has the staged shape. */
export function ownsStagedVoiceKey(key: unknown, userId: string): boolean {
  return (
    typeof key === "string" &&
    STAGED_VOICE_KEY.test(key) &&
    key.startsWith(`staging/${userId}/`)
  );
}

/** The longest a recording's URL may be. The same 512 as a photograph's, for
 *  the same reason (audit C-169): a prefix test is satisfied by megabytes. */
export const MAX_VOICE_URL = 512;

export type VoiceCandidate = {
  /** Whether this app minted the URL (an `/audio/` path on one of our bases). */
  minted: boolean;
  /** The object key it resolves to, or null if it is not ours. */
  key: string | null;
  /** The URL's length in characters. */
  length: number;
  /** The recording's claimed length. */
  seconds: unknown;
};

export type VoiceVerdict = { ok: true } | { ok: false; error: string };

/**
 * May this caller attach this recording to an answer?
 *
 * The C2 rule, for sound. The key was written by the server with the
 * uploader's id in it and no request can change that, so an answer may only
 * point at a recording under the caller's OWN `audio/<id>/` prefix. Without
 * it, member A could attach member B's recording to an answer and then clear
 * the answer, and the purge of a replaced recording would delete B's bytes.
 */
export function decideVoiceAnswer(c: VoiceCandidate, userId: string): VoiceVerdict {
  // Written `!(<= cap)` so a candidate built without a length is refused
  // rather than waved through by `undefined > 512` being false.
  if (!(c.length <= MAX_VOICE_URL)) {
    return { ok: false, error: "That recording's link is too long to be one of ours." };
  }
  if (!c.minted) return { ok: false, error: "That recording wasn't made here." };
  if (!c.key || !STORED_VOICE_KEY.test(c.key) || !c.key.startsWith(ownAudioPrefix(userId))) {
    return { ok: false, error: "That recording isn't one you made." };
  }
  if (!validVoiceSeconds(c.seconds)) {
    return { ok: false, error: `A recording can be up to ${VOICE_MAX_SECONDS / 60} minutes.` };
  }
  return { ok: true };
}

/**
 * Is a staged file acceptable, given what the browser said about it?
 *
 * `bytes` is the HEAD's size (null when it could not be read, which is a
 * refusal: we do not move a file we could not measure). `sniffed` is what the
 * first bytes say it is. `ext` is what the key says it is.
 */
export function decideStagedVoice(input: {
  bytes: number | null;
  seconds: unknown;
  ext: string;
  sniffed: VoiceExt | null;
}): VoiceVerdict {
  if (!validVoiceSeconds(input.seconds)) {
    return { ok: false, error: `A recording can be up to ${VOICE_MAX_SECONDS / 60} minutes.` };
  }
  if (input.bytes === null || input.bytes <= 0) {
    return { ok: false, error: "The recording didn't arrive. Try again." };
  }
  if (input.bytes > voiceByteCap(input.seconds)) {
    return { ok: false, error: "That recording is bigger than its length allows." };
  }
  if (!input.sniffed || input.sniffed !== input.ext) {
    return { ok: false, error: "That file doesn't look like a recording." };
  }
  return { ok: true };
}
