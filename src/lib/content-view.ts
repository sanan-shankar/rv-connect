import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 *  Who looked at what.
 *
 *  A counter per (viewer, kind, target), so "how often has Sanan looked
 *  at Ananya's profile" is one column rather than a count over a scan,
 *  and the table stays bounded by distinct PAIRS rather than by traffic.
 * ------------------------------------------------------------------ */

export type ViewKind = "profile" | "letter" | "photo" | "edition";

/**
 * Record a view. Fire-and-forget; never throws.
 *
 * Self-views are dropped. Everyone visits their own profile constantly and
 * counting it would put every member at the top of their own "most viewed"
 * list, which is noise dressed as a finding.
 */
export async function recordView(
  viewerId: string | null | undefined,
  kind: ViewKind,
  targetId: string,
): Promise<void> {
  if (!viewerId || !targetId) return;
  if (kind === "profile" && viewerId === targetId) return;

  try {
    await prisma.contentView.upsert({
      where: { viewerId_kind_targetId: { viewerId, kind, targetId } },
      create: { viewerId, kind, targetId },
      update: { count: { increment: 1 }, lastAt: new Date() },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[content-view] failed:", err);
    }
  }
}
