"use server";

import { readFile, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { REGISTRY } from "./_registry";

/* ------------------------------------------------------------------ *
 *  Archiving a room, from the room list itself.
 *
 *  `_registry.ts` holds the DEFAULT status for every room. This writes
 *  an override on top of it into `archive-overrides.json`, a file that
 *  lives in the repo, so curating the lab is durable: it survives a
 *  restart, a different browser, and another machine once committed.
 *  That is the whole point (owner: "I can periodically archive certain
 *  rooms"), and it is why this is a file rather than localStorage.
 *
 *  Dev only. The lab is a development surface, and a deployed Vercel
 *  filesystem is read-only anyway, so in production this is a no-op
 *  that reports why instead of throwing.
 * ------------------------------------------------------------------ */

const OVERRIDES_PATH = path.join(process.cwd(), "src/app/lab/archive-overrides.json");

export type ArchiveOverrides = Record<string, boolean>;

export async function readOverrides(): Promise<ArchiveOverrides> {
  try {
    const raw = await readFile(OVERRIDES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ArchiveOverrides) : {};
  } catch {
    // Missing or malformed: fall back to the registry defaults rather than
    // taking the whole page down over a scratch file.
    return {};
  }
}

export async function setArchived(
  href: string,
  archived: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (process.env.NODE_ENV !== "development") {
    return { ok: false, error: "Archiving is only editable when running locally." };
  }
  if (typeof href !== "string" || !href.startsWith("/")) {
    return { ok: false, error: "Unknown room." };
  }

  const overrides = await readOverrides();
  // An override that merely restates the registry's own default is noise, so
  // it is dropped instead of stored. Setting a room back to how it ships
  // leaves the file exactly as it was.
  const fallsBackToDefault =
    REGISTRY.find((e) => e.href === href)?.status === (archived ? "archived" : "active");
  if (fallsBackToDefault) delete overrides[href];
  else overrides[href] = archived;

  try {
    await writeFile(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }

  revalidatePath("/lab");
  return { ok: true };
}
