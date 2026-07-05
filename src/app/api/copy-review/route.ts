import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { InventoryFile } from "@/app/copy-editor/groups";

const INVENTORY_PATH = path.join(process.cwd(), ".copy-review", "inventory.json");

const BodySchema = z.object({
  id: z.string().min(1).max(300),
  replacement: z.string().max(4000).nullable(),
  notes: z.string().max(1000).nullable(),
});

class EntryNotFoundError extends Error {}

/**
 * Read, patch, and atomically write the inventory file. Only the target
 * entry's `replacement`/`notes` are touched; every other field, and the key
 * order of both the entry and the file, is left exactly as parsed so the
 * on-disk diff stays readable. Writes go to a temp file + rename so a reader
 * (or the dev server itself) never sees a half-written file.
 */
async function updateEntry(id: string, replacement: string | null, notes: string | null) {
  const raw = await fs.readFile(INVENTORY_PATH, "utf8");
  const data = JSON.parse(raw) as InventoryFile;

  const entry = data.entries.find((e) => e.id === id);
  if (!entry) throw new EntryNotFoundError(id);

  entry.replacement = replacement;
  entry.notes = notes;

  const output = JSON.stringify(data, null, 2) + "\n";
  const tmpPath = `${INVENTORY_PATH}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  await fs.writeFile(tmpPath, output, "utf8");
  await fs.rename(tmpPath, INVENTORY_PATH);

  return entry;
}

// Serializes writes across concurrent requests within this server process so
// two near-simultaneous saves can't read-modify-write over each other and
// lose an edit. Each call chains onto the previous one, regardless of
// whether it succeeded or failed, so one bad request never wedges the queue.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, replacement, notes } = parsed.data;

  try {
    const entry = await enqueue(() => updateEntry(id, replacement, notes));
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    if (err instanceof EntryNotFoundError) {
      return NextResponse.json({ error: `Unknown entry id: ${id}` }, { status: 404 });
    }
    console.error("copy-review: failed to save", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
