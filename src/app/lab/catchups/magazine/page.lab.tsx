/* ------------------------------------------------------------------ *
 *  /lab/catchups/magazine - laid out by rules, not by hand.
 *
 *  The Catch-ups rework's track M (docs/planning/catchups-rework/
 *  magazine.md). The engine in src/lib/magazine turns a published
 *  Edition into A4 pages; this room draws them at true size, with each
 *  page's score beside it and each photograph's dpi on it, and
 *  `?print=1` is the same pages with no chrome, which
 *  scripts/dev/print-magazine.mjs prints to PDF.
 *
 *  TWO SOURCES, ONE ENGINE. `?data=live` (the default) and `live-2024`
 *  read the two real Editions from the database, read-only, through the
 *  sketches' loader; any other key is a fixture from
 *  `_fixtures/magazine/` or the pressure corpus. Both arrive as the same
 *  `MagazineSource`, so nothing in the room can be true of one and false
 *  of the other. His instruction, brief para 51: "you should def create a
 *  fake catch up or two and fill it with literally every type of content
 *  we might come across and make sure it surves the most varying input."
 *
 *  Admin only, through the lab layout. Writes nothing.
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { sourcesFromFile } from "@/lib/magazine/from-export";
import type { MagazineSource } from "@/lib/magazine/types";
import { inventedCorpus } from "../_fixtures/magazine/corpus";
import { LIVE_KEYS, loadLiveSource, type LiveKey } from "./_live";
import { MagazineRoom } from "./_room";

export const dynamic = "force-dynamic";

/** Every key the picker offers: the two live Editions, then each fixture
 *  (its most-answered published Edition), then the pressure corpus's
 *  three Editions by name. */
function fixtureSources(): Array<{ key: string; title: string; source: MagazineSource }> {
  const out: Array<{ key: string; title: string; source: MagazineSource }> = [];
  for (const entry of inventedCorpus()) {
    const editions = sourcesFromFile(entry.file);
    if (entry.key === "pressure") {
      editions.forEach((e, i) => out.push({ key: `pressure-${i + 1}`, title: e.name, source: e.source }));
      continue;
    }
    const best = [...editions].sort((a, b) => b.source.questions.reduce((n, q) => n + q.answers.length, 0) - a.source.questions.reduce((n, q) => n + q.answers.length, 0))[0];
    if (best) out.push({ key: entry.key, title: best.name, source: best.source });
  }
  return out;
}

export default async function MagazinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const key = typeof params.data === "string" ? params.data : "live";
  const print = params.print === "1";
  const session = await auth();
  const fixtures = fixtureSources();
  const keys = [...LIVE_KEYS, ...fixtures.map((f) => f.key)];

  let picked: { title: string; source: MagazineSource } | null = null;
  if ((LIVE_KEYS as readonly string[]).includes(key)) {
    picked = session?.user?.id ? await loadLiveSource(session.user.id, key as LiveKey) : null;
  } else {
    picked = fixtures.find((f) => f.key === key) ?? null;
  }

  if (!picked) {
    return (
      <div className="px-6 py-10 text-sm text-muted-foreground">
        Nothing to lay out for <code>{key}</code>. Keys: {keys.join(", ")}.
      </div>
    );
  }
  return <MagazineRoom source={picked.source} title={picked.title} dataKey={key} keys={keys} print={print} />;
}
