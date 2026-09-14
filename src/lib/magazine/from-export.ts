/* ------------------------------------------------------------------ *
 *  An exported Catch-up file, as the magazine engine reads it.
 *
 *  `src/lib/catchups-export.ts` is the one shape a Catch-up takes when it
 *  leaves the database, and every corpus fixture is written in it. This
 *  adapter applies the reader's own rules on the way in, so nothing can
 *  be true of a fixture and false of a live Edition:
 *
 *  - only a member-written question names its asker, and only when they
 *    let it (`askerVisible` in catchups-core, restated here without the
 *    viewer: a magazine has no "you");
 *  - a link that became a card is taken out of the body, the way the
 *    live loader does, so it is not printed twice;
 *  - answers keep the order they were written in, ties broken by id, so
 *    two exports of one Edition lay out the same way (G37);
 *  - two writers with one name get a second line each (H4).
 * ------------------------------------------------------------------ */

import type { CatchupExportFile, ExportedAnswer, ExportedCatchup, ExportedEdition, ExportedPerson } from "../catchups-export.ts";
import { findLinks, classifyLink, youtubeStill } from "../link-preview-core.ts";
import type { MagAnswer, MagLink, MagPerson, MagPhoto, MagQuestion, MagazineSource } from "./types.ts";

function personOf(p: ExportedPerson, line2: string | null): MagPerson {
  return { id: p.id, name: p.name, photoUrl: p.photoUrl, birdOverride: p.birdOverride, line2 };
}

function photoOf(img: ExportedAnswer["images"][number]): MagPhoto {
  const width = (img as { width?: number | null }).width ?? null;
  const height = (img as { height?: number | null }).height ?? null;
  return { src: img.url, width, height, focalX: 0.5, focalY: 0.5, blurDataUrl: null };
}

/** The links a fixture's body carries, as the cards the live loader would
 *  have resolved. A fixture cannot resolve a page's title, so a Spotify or
 *  YouTube link gets the song card with a placeholder title, and any other
 *  link stays in the text as the live rule says an unresolved one does. A
 *  fixture may also hand cards in directly on `links`. */
function linksOf(a: ExportedAnswer & { links?: MagLink[] }): { links: MagLink[]; body: string | null } {
  if (a.links) return { links: a.links, body: a.body };
  const out: MagLink[] = [];
  let body = a.body ?? "";
  for (const f of findLinks(a.body)) {
    const c = classifyLink(f.raw);
    if (!c || c.kind === "link") continue;
    out.push({
      kind: c.kind,
      url: c.url,
      title: c.kind === "spotify" ? "A song on Spotify" : "A video on YouTube",
      subtitle: null,
      thumbUrl: c.kind === "youtube" && c.videoId ? youtubeStill(c.videoId) : null,
    });
    body = body.replace(f.raw, "");
  }
  return { links: out, body: body.trim() ? body : a.body?.trim() ? null : a.body };
}

/** Homonyms: a name that two different ids share in one Edition gets a
 *  second line each (H4). Shared by the fixture adapter and the live one. */
export function homonymLine(writers: Array<{ id: string; name: string; batchYear: number | null }>): (id: string) => string | null {
  const byName = new Map<string, Set<string>>();
  const byId = new Map<string, { name: string; batchYear: number | null }>();
  for (const w of writers) {
    const set = byName.get(w.name) ?? new Set<string>();
    set.add(w.id);
    byName.set(w.name, set);
    byId.set(w.id, w);
  }
  return (id) => {
    const w = byId.get(id);
    if (!w || (byName.get(w.name)?.size ?? 0) < 2) return null;
    return w.batchYear ? `Batch of ${w.batchYear}` : "Member";
  };
}

export function sourceFromExport(catchup: ExportedCatchup, edition: ExportedEdition): MagazineSource {
  const line2 = homonymLine(edition.questions.flatMap((q) => q.answers.map((a) => a.author)));
  const line2Of = (p: ExportedPerson): string | null => line2(p.id);

  const questions: MagQuestion[] = [...edition.questions]
    .filter((q) => q.accepted)
    .sort((a, b) => a.position - b.position)
    .map((q) => {
      const answers: MagAnswer[] = [...q.answers]
        .sort((x, y) => x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id))
        .map((a) => {
          const { links, body } = linksOf(a);
          return {
            id: a.id,
            author: personOf(a.author, line2Of(a.author)),
            body,
            /* The same file twice in one answer (a duplicate upload, which
               nothing stops) is printed once (B18). */
            photos: a.images.filter((img, i, all) => all.findIndex((o) => o.url === img.url) === i).map(photoOf),
            links,
            audio: a.audio ? { seconds: a.audio.seconds, url: a.audio.url } : null,
            pick: a.pollOptionId ?? null,
            hearts: a.hearts.length,
          };
        });
      const named = q.source === "member" && q.showAsker && q.author;
      return {
        id: q.id,
        text: q.text,
        kind: q.kind,
        askedBy: named ? q.author!.name : null,
        anonymous: q.source === "member" && !q.showAsker,
        choices: (q.choices ?? []).slice().sort((a, b) => a.position - b.position).map((c) => ({ id: c.id, text: c.text })),
        answers,
      };
    });

  return {
    catchupName: catchup.title ?? catchup.groupName,
    publishedAt: edition.publishedAt ?? edition.createdAt,
    picture: null,
    sealedAt: edition.timeCapsule ? (edition.sealedAt ?? null) : null,
    questions,
  };
}

/** Every published Edition in a file, each as a source. */
export function sourcesFromFile(file: CatchupExportFile): Array<{ name: string; source: MagazineSource }> {
  const out: Array<{ name: string; source: MagazineSource }> = [];
  for (const c of file.catchups) for (const e of c.editions) {
    if (e.status !== "published") continue;
    out.push({ name: `${c.title ?? c.groupName} #${e.number}`, source: sourceFromExport(c, e) });
  }
  return out;
}
