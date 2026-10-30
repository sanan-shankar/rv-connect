"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { REGISTRY } from "./_registry";
import { isMissingLabTable } from "./_archive-state";

/* ------------------------------------------------------------------ *
 *  Archiving a room, from the room list itself.
 *
 *  `_registry.ts` holds the DEFAULT status for every room. This writes
 *  an override on top of it into the LabRoomState table (see
 *  ./_archive-state.ts for the read side and for why the old
 *  archive-overrides.json file could never work on Vercel), so curating
 *  the lab is durable: it survives a restart, a different browser,
 *  another machine, and, the owner's actual ask, the deployed domain.
 * ------------------------------------------------------------------ */

export async function setArchived(
  href: string,
  archived: boolean
): Promise<{ ok: boolean; error?: string }> {
  /* Gated on the role through the one shared guard, exactly like the
     moderation actions, and in every environment. Local dev used to skip it
     ("the only person at a dev server is the owner"), but `next dev` answers
     every machine on the network it is on, next.config.ts admits private-LAN
     origins on purpose (to test on a phone), and this writes to the one
     database production also reads: on a cafe's wifi, anyone holding the
     action id could archive production's rooms with no sign-in at all (bug
     audit 3, L12-06). The owner signs in locally anyway (/api/dev-login). */
  const denied = await requireAdminAction();
  if (denied) return { ok: false, ...denied };

  /* Only a registered top-level room may hold state: children archive with
     their parent, and an unconstrained href would let this table collect
     junk rows forever. */
  const entry = REGISTRY.find((e) => e.href === href);
  if (!entry) return { ok: false, error: "Unknown room." };
  const nextArchived = archived === true;

  try {
    if (entry.status === (nextArchived ? "archived" : "active")) {
      // An override that merely restates the registry's own default is noise,
      // so it is removed instead of stored. Setting a room back to how it
      // ships leaves the table exactly as it was.
      await prisma.labRoomState.deleteMany({ where: { href } });
    } else {
      await prisma.labRoomState.upsert({
        where: { href },
        create: { href, archived: nextArchived },
        update: { archived: nextArchived },
      });
    }
  } catch (err) {
    if (isMissingLabTable(err)) {
      return {
        ok: false,
        error:
          "The archive table is not set up yet. Run prisma/migrations-manual/2026-07-30-lab-archive.sql once.",
      };
    }
    console.error("[lab] setArchived failed", err);
    return { ok: false, error: "Could not save." };
  }

  revalidatePath("/lab");
  return { ok: true };
}
