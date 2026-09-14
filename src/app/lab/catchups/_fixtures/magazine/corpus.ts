/* ------------------------------------------------------------------ *
 *  The magazine's test corpus, in one list.
 *
 *  Twelve invented Editions beside this file, each written in the
 *  export's shape (`src/lib/catchups-export.ts`) to pin one family of
 *  failures the hunt found (docs/planning/catchups-rework/magazine.md,
 *  "The hundred things"); plus the pressure corpus the reader already
 *  survives; plus, on a machine that holds one, the real export in
 *  `scripts/dev/.exports/catchups/<latest>/`, which is gitignored because
 *  it holds members' words (campaign decision D33 as S1 narrowed it). The
 *  real Editions therefore never enter git and are still part of every
 *  local run of the test and of the room.
 *
 *  Read with `fs` rather than imported, so the same loader serves a node
 *  test and a server component without an import attribute Turbopack and
 *  node disagree about.
 * ------------------------------------------------------------------ */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
/* Relative, with extensions: a node test imports this file and cannot
   resolve the `@/` alias (docs/TRAPS.md, "Testing"). */
import { isCatchupExportFile, type CatchupExportFile } from "../../../../../lib/catchups-export.ts";
import { PRESSURE_FIXTURE } from "../pressure.ts";

export type CorpusEntry = {
  /** The file's stem: `one-writer`, `wall-300`, `pressure`, `live`. */
  key: string;
  file: CatchupExportFile;
  /** True when the file came out of the database and holds real members'
   *  words: a room prints it, and nothing copies it anywhere. */
  live: boolean;
};

const HERE = path.join(process.cwd(), "src", "app", "lab", "catchups", "_fixtures", "magazine");
const EXPORTS = path.join(process.cwd(), "scripts", "dev", ".exports", "catchups");

/** Every invented fixture, by file name, then the pressure corpus. */
export function inventedCorpus(): CorpusEntry[] {
  const out: CorpusEntry[] = [];
  for (const f of readdirSync(HERE).filter((f) => f.endsWith(".json")).sort()) {
    const parsed: unknown = JSON.parse(readFileSync(path.join(HERE, f), "utf8"));
    if (!isCatchupExportFile(parsed)) throw new Error(`${f} is not a Catch-up export file`);
    out.push({ key: f.replace(/\.json$/, ""), file: parsed, live: false });
  }
  out.push({ key: "pressure", file: PRESSURE_FIXTURE, live: false });
  return out;
}

/** The newest export on this machine, or null. Never committed. */
export function liveCorpus(): CorpusEntry | null {
  if (!existsSync(EXPORTS)) return null;
  const dates = readdirSync(EXPORTS).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  for (const d of dates.reverse()) {
    const p = path.join(EXPORTS, d, "catchups.json");
    if (!existsSync(p)) continue;
    const parsed: unknown = JSON.parse(readFileSync(p, "utf8"));
    if (isCatchupExportFile(parsed)) return { key: `live-${d}`, file: parsed, live: true };
  }
  return null;
}

export function wholeCorpus(): CorpusEntry[] {
  const live = liveCorpus();
  return live ? [...inventedCorpus(), live] : inventedCorpus();
}
