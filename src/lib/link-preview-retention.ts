import { domainToUnicode } from "node:url";
import { prisma } from "@/lib/prisma";
import { delImageByKey, directUploadAvailable, linkPreviewKeyForUrl } from "@/lib/storage";
import { classifyLink, findLinks } from "@/lib/link-preview-core";

/* ------------------------------------------------------------------ *
 *  Link previews nobody shows any more, and their thumbnails (bug audit
 *  3, T2b-02).
 *
 *  A `LinkPreview` row and its re-hosted image belong to no member: one
 *  row serves every post and answer that pastes the same page. So nothing
 *  that deletes a member's writing can take one with it, and until this
 *  step nothing ever deleted one at all. A preview goes when two things are
 *  both true: no post, letter or Catch-up answer holds its link any more,
 *  and it was fetched more than `keepDays` ago (retention.ts holds the
 *  number, with every other window the sweep keeps).
 *
 *  "Holds its link" is decided exactly, the way the readers decide it:
 *  every candidate body is run through findLinks and compared on the
 *  normalised url, because the stored url is not the pasted text (tracking
 *  parameters are stripped, a YouTube link is rebuilt from its id). The
 *  database only narrows which bodies to read, by a needle every pasted
 *  form of that link contains; a needle too wide reads more bodies, never
 *  fewer, so it can only ever keep a row, not lose one.
 *
 *  The thumbnail goes first, by its key through `linkPreviewKeyForUrl`,
 *  which names only `link-previews/` and nothing else in the bucket; the row
 *  goes only once its bytes are gone, so a refusal at the bucket leaves the
 *  row to try again tomorrow and never an object nothing can find. A
 *  process without R2 credentials does nothing at all: on a laptop the
 *  delete would land on the local disk and call production's bytes gone.
 * ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

/** Far more than a night ever meets (8 previews exist in all, 2026-11-03);
 *  the rest wait for tomorrow. */
const PER_NIGHT = 500;

/** What every pasted form of this link contains: a video's or a track's id,
 *  or the page's host without `www.`. */
function needles(url: string): string[] {
  const c = classifyLink(url);
  if (c?.kind === "youtube" && c.videoId) return [c.videoId];
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return [url];
  }
  if (c?.kind === "spotify") return [u.pathname.split("/").filter(Boolean).pop() ?? u.hostname];
  // Punycode as stored, and the same host as a member would have typed it.
  const host = u.hostname.replace(/^www\./, "");
  return [...new Set([host, domainToUnicode(host) || host])];
}

/** Whether any post, letter, draft or Catch-up answer still holds `url`. */
async function stillHeld(url: string): Promise<boolean> {
  const any = needles(url).map((n) => ({ contains: n, mode: "insensitive" as const }));
  const [posts, entries] = await Promise.all([
    prisma.post.findMany({ where: { OR: any.map((c) => ({ content: c })) }, select: { content: true } }),
    prisma.catchupEntry.findMany({ where: { OR: any.map((c) => ({ body: c })) }, select: { body: true } }),
  ]);
  const bodies = [...posts.map((p) => p.content), ...entries.map((e) => e.body)];
  return bodies.some((body) => findLinks(body).some((f) => f.url === url));
}

export type PreviewSweep = { removed: number; kept: number; stillPending: number };

/**
 * Remove the previews no body holds that were fetched over `keepDays` ago, and
 * their thumbnails. `dryRun` reads and decides exactly as a real run would and
 * deletes nothing: `removed` is then what a real run would take.
 */
export async function sweepStaleLinkPreviews({
  keepDays,
  now = new Date(),
  dryRun = false,
}: {
  keepDays: number;
  now?: Date;
  dryRun?: boolean;
}): Promise<PreviewSweep> {
  const result: PreviewSweep = { removed: 0, kept: 0, stillPending: 0 };
  if (!dryRun && !directUploadAvailable()) return result;

  const cutoff = new Date(now.getTime() - keepDays * DAY_MS);
  const stale = await prisma.linkPreview.findMany({
    where: { fetchedAt: { lt: cutoff } },
    select: { url: true, thumbUrl: true },
    orderBy: { fetchedAt: "asc" },
    take: PER_NIGHT,
  });
  for (const row of stale) {
    if (await stillHeld(row.url)) {
      result.kept += 1;
      continue;
    }
    if (dryRun) {
      result.removed += 1;
      continue;
    }
    const key = linkPreviewKeyForUrl(row.thumbUrl);
    if (key && !(await delImageByKey(key))) {
      result.stillPending += 1;
      continue;
    }
    // Only a row still as it was read: one re-fetched since is a live card.
    const gone = await prisma.linkPreview.deleteMany({ where: { url: row.url, fetchedAt: { lt: cutoff } } });
    result.removed += gone.count;
  }
  return result;
}
