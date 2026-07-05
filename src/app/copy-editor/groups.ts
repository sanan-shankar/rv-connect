/**
 * Copy-review workbench: shared types + group classification.
 *
 * This whole tool (page, api route, and this file) is throwaway: it exists
 * only so the owner can walk .copy-review/inventory.json string by string and
 * gets deleted once the copy pass is done. So the grouping below is a
 * pragmatic heuristic clustering of the `route` field into the same buckets
 * docs/content/COPY-INVENTORY.md uses (landing, about, login, ... toasts),
 * not a byte-exact re-derivation of that document. Good enough to browse by.
 */

export type EntryKind =
  | "heading"
  | "body"
  | "button"
  | "label"
  | "placeholder"
  | "tooltip"
  | "helper"
  | "empty-state"
  | "validation"
  | "error"
  | "toast"
  | "notification"
  | "metadata";

export interface InventoryEntry {
  id: string;
  route: string;
  situation: string;
  text: string;
  file: string;
  line: number;
  kind: EntryKind;
  replacement: string | null;
  notes: string | null;
}

export interface InventoryFile {
  generated: string;
  entries: InventoryEntry[];
}

export interface GroupDef {
  id: string;
  label: string;
}

// Order mirrors docs/content/COPY-INVENTORY.md's section order.
export const GROUP_ORDER: GroupDef[] = [
  { id: "landing", label: "Landing page" },
  { id: "about", label: "About" },
  { id: "login", label: "Login" },
  { id: "signup", label: "Signup" },
  { id: "onboarding", label: "Onboarding" },
  { id: "global-chrome", label: "Global chrome" },
  { id: "feed", label: "Feed" },
  { id: "letters", label: "Letters" },
  { id: "directory", label: "Directory" },
  { id: "groups", label: "Groups" },
  { id: "catchups", label: "Catch-ups" },
  { id: "collection", label: "The Valley Collection" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
  { id: "notifications-chrome", label: "Notifications (bell/panel)" },
  { id: "support", label: "Support" },
  { id: "admin", label: "Admin" },
  { id: "errors", label: "404 / error pages" },
  { id: "validation", label: "Validation messages" },
  { id: "notification-templates", label: "Notification templates" },
  { id: "toasts", label: "Toasts" },
];

const ROUTE_KEYWORDS: Array<[string, string]> = [
  ["about", "about"],
  ["login", "login"],
  ["signup", "signup"],
  ["onboarding", "onboarding"],
  ["catchups", "catchups"],
  ["collection", "collection"],
  ["directory", "directory"],
  ["support", "support"],
  ["admin", "admin"],
  ["groups", "groups"],
  ["profile", "profile"],
  ["settings", "settings"],
  ["feed", "feed"],
  ["letters", "letters"],
];

export function classifyGroup(entry: Pick<InventoryEntry, "kind" | "route">): string {
  const { kind, route } = entry;
  const rl = route.toLowerCase();

  if (kind === "toast") return "toasts";
  if (kind === "validation") return "validation";
  if (kind === "notification") return "notification-templates";
  if (rl.includes("not-found") || rl.includes("error boundary")) return "errors";

  for (const [needle, group] of ROUTE_KEYWORDS) {
    if (rl.includes(needle)) return group;
  }

  if (rl.includes("notification") || rl.includes("bell")) return "notifications-chrome";
  if (rl === "/" || rl.startsWith("/ ") || rl.includes("landing")) return "landing";
  return "global-chrome";
}

export function isEdited(entry: Pick<InventoryEntry, "replacement">): boolean {
  return entry.replacement != null && entry.replacement.trim() !== "";
}
