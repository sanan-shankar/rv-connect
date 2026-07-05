"use server";

/* ------------------------------------------------------------------ *
 *  Read-only Spotify preview for the answering screen.
 *
 *  `submitEntry` (WP2, catchups/actions.ts) is the only place that PERSISTS
 *  a resolved song, and its response deliberately does not echo the
 *  resolved title/art back to the caller (it returns `{ success, entryId,
 *  songWarning }`). This thin wrapper calls the exact same `resolveSpotify`
 *  (WP1, the SSRF-bounded keyless oembed resolver: host allowlist, path
 *  allowlist, 3s timeout, fail soft) purely so the answer card can render
 *  the album art the moment it saves, without re-implementing any part of
 *  the fetch or its validation. Persistence still goes through submitEntry;
 *  this never writes to the database.
 * ------------------------------------------------------------------ */

import { resolveSpotify, type SpotifyResult } from "@/lib/catchups";

export async function previewSpotify(url: string): Promise<SpotifyResult> {
  return resolveSpotify(url);
}
