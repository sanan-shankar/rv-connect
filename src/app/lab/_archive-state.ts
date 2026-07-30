/* ------------------------------------------------------------------ *
 *  Lab archive state: the DB-backed read side.
 *
 *  Until 2026-07-30 archive overrides lived in archive-overrides.json,
 *  written with fs.writeFile at request time. That could never work on
 *  the owner's domain: a deployed Vercel filesystem is read-only (and
 *  ephemeral), so production archiving was a hard no-op. The state now
 *  lives in the LabRoomState table, one row per room whose archived
 *  flag differs from its registry default; no row means the default in
 *  _registry.ts applies. Local dev and production share the same
 *  Supabase Postgres setup, so this one code path covers both.
 *
 *  This is a plain server module, NOT "use server": readOverrides must
 *  not become a publicly POST-able action endpoint just to be shared
 *  between page.tsx and actions.ts.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";

export type ArchiveOverrides = Record<string, boolean>;

/**
 * True when an error means "the LabRoomState table does not exist yet".
 * The table is created by prisma/migrations-manual/2026-07-30-lab-archive.sql,
 * run by hand later (prisma db push is blocked by the legacy Catchup* tables,
 * bugs.md #11), so pre-migration reads MUST degrade to the registry defaults
 * rather than crash /lab. Same shape as isMissingCatchupTable in
 * src/lib/catchups.ts.
 */
export function isMissingLabTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  if (code === "P2021") return true; // Prisma: the table does not exist
  if (code === "42P01") return true; // Postgres undefined_table (raw, via the pg adapter)
  const msg = typeof e.message === "string" ? e.message : "";
  // Defensive fallback, scoped to our table so an unrelated error is never masked.
  if (/LabRoomState/.test(msg) && /does not exist/i.test(msg)) return true;
  return false;
}

/**
 * Every stored override, as href -> archived. Never throws: /lab is the one
 * index of every dev room and must always render, so a missing table
 * (pre-migration) or any other DB failure degrades to "no overrides" and the
 * registry defaults carry the page.
 */
export async function readOverrides(): Promise<ArchiveOverrides> {
  try {
    const rows = await prisma.labRoomState.findMany({
      select: { href: true, archived: true },
    });
    return Object.fromEntries(rows.map((r) => [r.href, r.archived]));
  } catch (err) {
    // Missing table is the expected pre-migration state, not worth logging;
    // anything else is logged but still degrades, never crashes the index.
    if (!isMissingLabTable(err)) console.error("[lab] readOverrides failed", err);
    return {};
  }
}
