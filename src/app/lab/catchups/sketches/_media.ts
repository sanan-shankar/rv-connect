/* ------------------------------------------------------------------ *
 *  Links people actually pasted, turned into something worth looking at.
 *
 *  Why this exists, in his words:
 *
 *    brief para 16: "in this catch-up, I asked a question saying, what
 *    songs have you had on repeat lately? And people have posted YouTube
 *    links and named songs and everything. And why can't we have a
 *    beautiful UI that shows YouTube previews or Spotify previews, done
 *    in a cute clickable way where people can just see, and it looks
 *    good."
 *
 *    brief para 49: "If you link a song, it doesn't automatically pull up
 *    a thumbnail. It doesn't work for YouTube or Spotify."
 *
 *    brief para 50: "the thumbnail thing should work. Whenever they paste
 *    a link to a song, right? So Letterloop did it the first way, but we
 *    are trying to improve on Letterloop. Letterloop's things are too
 *    fixed."
 *
 *  And the measurement that made it urgent. On the live Edition being drawn
 *  here, the songs question has THIRTEEN answers and the `songUrl` column
 *  is null on every one of them, because today's resolver only runs when
 *  the composer's dedicated song field is used. Four answers carry pasted
 *  links in their body text instead, printed as raw URLs. One of them
 *  reads, in full: "Honestly I just want to see if the album covers
 *  render". They do not. That is a member testing the feature in para 16
 *  and finding it absent.
 *
 *  So the sketches resolve links out of the body themselves. This is a
 *  lab-side stand-in for work the rooms will do properly (para 50's
 *  "whenever they paste a link"), and it exists so the layout question is
 *  answerable now: does a 16:9 still wreck the rhythm of a text answer,
 *  and does a wall of album art look like a music app or like this one.
 *
 *  Scope and safety. Two hosts, both fixed, both reached only through a
 *  keyless oembed endpoint, with ids taken from a strict pattern and
 *  never from user text: the same SSRF boundary `resolveSpotify` already
 *  documents in catchups-core.ts. Nothing is written back. Failure is
 *  soft: an unresolved link keeps its title as the URL, which is exactly
 *  what ships today, so a sketch never renders an error.
 * ------------------------------------------------------------------ */

export type SketchMedia = {
  platform: "spotify" | "youtube";
  url: string;
  title: string;
  by: string | null;
  art: string | null;
};

/* Deliberately narrow. A base62 Spotify id, or an 11-character YouTube id,
   and nothing that is not one of those two shapes reaches a fetch. */
const SPOTIFY_RE = /https?:\/\/open\.spotify\.com(?:\/intl-[a-z]{2})?\/(track|album|playlist)\/([A-Za-z0-9]{10,40})/g;
const YOUTUBE_RE = /https?:\/\/(?:www\.youtube\.com\/watch\?v=|youtu\.be\/|www\.youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/g;

type Found = { platform: "spotify" | "youtube"; id: string; kind: string; url: string; raw: string };

/** Every recognised link in a body, in the order they appear. */
export function findLinks(body: string | null): Found[] {
  if (!body) return [];
  const out: Found[] = [];
  for (const m of body.matchAll(SPOTIFY_RE)) {
    out.push({
      platform: "spotify",
      kind: m[1],
      id: m[2],
      url: `https://open.spotify.com/${m[1]}/${m[2]}`,
      raw: m[0],
    });
  }
  for (const m of body.matchAll(YOUTUBE_RE)) {
    out.push({
      platform: "youtube",
      kind: "video",
      id: m[1],
      url: `https://www.youtube.com/watch?v=${m[1]}`,
      raw: m[0],
    });
  }
  return out;
}

/** The body with the links THAT BECAME CARDS taken out, so a card is not
 *  printed twice: once as a picture and once as forty characters of query
 *  string. Trailing tracking parameters go with it.
 *
 *  Only those. It used to strip `https?:\/\/\S+`, every url in the body,
 *  which quietly destroyed any link this file does not resolve. The
 *  pressure corpus found it on the first run: an answer whose entire body
 *  is a Bandcamp link came out as an empty string, produced no card
 *  because the host has no resolver, and was then dropped from the page
 *  altogether by `said()` -- a member's whole answer gone, with nothing on
 *  screen to say so. An unrecognised link now stays as text, which is what
 *  ships today and is at worst ugly rather than absent.
 *
 *  `\S*` after the matched prefix because `SPOTIFY_RE` stops at the id and
 *  a real paste carries `?si=...&utm_source=...` behind it. */
export function stripLinks(body: string | null): string {
  if (!body) return "";
  let out = body;
  for (const f of findLinks(body)) {
    out = out.replace(
      new RegExp(f.raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\S*", "g"),
      "",
    );
  }
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* One process-lifetime cache. The lab page is force-dynamic and a cull
   means reloading it many times in a row; without this every reload
   re-fetches the same seven links. */
const cache = new Map<string, SketchMedia>();

async function oembed(endpoint: string): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

async function resolveOne(f: Found): Promise<SketchMedia> {
  const hit = cache.get(f.url);
  if (hit) return hit;

  let out: SketchMedia;
  if (f.platform === "spotify") {
    const data = await oembed(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(f.url)}`
    );
    out = {
      platform: "spotify",
      url: f.url,
      title: str(data?.title) ?? "Song on Spotify",
      /* Spotify's keyless oembed carries no artist (prior-art.md section 7,
         "the missing artist field"), and the platform's name is not a
         substitute for one: "we don't really need to say YouTube, because
         people can see that from the URL" (R6). A song card with no second
         row is a title over its cover, which is what a song looks like. */
      by: null,
      /* i.scdn.co is already on the img-src allowlist (next.config.ts,
         "Spotify album art on Catch-up answers"), so this renders today. */
      art: str(data?.thumbnail_url),
    };
  } else {
    const data = await oembed(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(f.url)}&format=json`
    );
    out = {
      platform: "youtube",
      url: f.url,
      title: str(data?.title) ?? "Video on YouTube",
      by: str(data?.author_name) ?? "YouTube",
      /* Deterministic from the id, so it needs no key and no second call.
         hqdefault rather than maxresdefault: maxres only exists for videos
         uploaded above 720p and 404s silently for the rest. */
      art: `https://i.ytimg.com/vi/${f.id}/hqdefault.jpg`,
    };
  }
  cache.set(f.url, out);
  return out;
}

/** Resolve every link in a body, in parallel, best effort. */
export async function resolveMedia(body: string | null): Promise<SketchMedia[]> {
  const found = findLinks(body);
  if (found.length === 0) return [];
  const seen = new Set<string>();
  const unique = found.filter((f) => (seen.has(f.url) ? false : (seen.add(f.url), true)));
  return Promise.all(unique.map(resolveOne));
}
