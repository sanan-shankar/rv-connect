import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";

import { CopyEditorClient } from "./copy-editor-client";
import { GROUP_ORDER, classifyGroup, type InventoryFile } from "./groups";

// Dev-only tool. Never statically render or cache: always read the freshest
// copy of the inventory file off disk.
export const dynamic = "force-dynamic";

async function loadInventory(): Promise<InventoryFile> {
  const filePath = path.join(process.cwd(), ".copy-review", "inventory.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as InventoryFile;
}

export default async function CopyEditorPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const inventory = await loadInventory();

  // Precompute group membership server-side so the client just renders.
  const groupIdByEntryId = new Map<string, string>();
  for (const entry of inventory.entries) {
    groupIdByEntryId.set(entry.id, classifyGroup(entry));
  }
  const groups = GROUP_ORDER.map((g) => ({
    ...g,
    entryIds: inventory.entries
      .filter((e) => groupIdByEntryId.get(e.id) === g.id)
      .map((e) => e.id),
  })).filter((g) => g.entryIds.length > 0);

  return (
    <CopyEditorClient entries={inventory.entries} groups={groups} generated={inventory.generated} />
  );
}
