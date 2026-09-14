import { publicBaseFor } from "@/lib/upload-shared";
import { keyForUrl } from "@/lib/storage";
import { decideVoiceAnswer, type VoiceVerdict } from "@/lib/voice-answer-rule";

/**
 * The write-time half of a recording's ownership check: the URL facts, worked
 * out with the one real parser in storage.ts and handed to the pure verdict in
 * voice-answer-rule.ts. The photograph twin is `ownedUploadUrls`.
 *
 * Server only: storage.ts carries the S3 client.
 */

/** True only for an `/audio/` URL this app minted, locally or on one of the
 *  bucket's public bases. The audio twin of `isUploadedImageUrl`. */
export function isStoredVoiceUrl(url: string): boolean {
  if (url.startsWith("/audio/")) return true;
  const base = publicBaseFor(url);
  return !!base && url.startsWith(`${base}/audio/`);
}

export function ownedVoiceRecording(
  recording: { url: unknown; seconds: unknown },
  userId: string
): VoiceVerdict {
  const url = typeof recording.url === "string" ? recording.url : "";
  return decideVoiceAnswer(
    {
      minted: url !== "" && isStoredVoiceUrl(url),
      key: url ? keyForUrl(url) : null,
      length: url.length,
      seconds: recording.seconds,
    },
    userId
  );
}
