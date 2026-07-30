import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { REGISTRY } from "./_registry";
import { readOverrides } from "./_archive-state";
import { LabClient } from "./_lab-client";

export const metadata: Metadata = {
  title: "Lab",
};

/* Read the overrides on every request so an archive toggle shows up
   immediately rather than at the next build. */
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ *
 *  /lab - the one index for every dev/lab room in the app.
 *
 *  Fixes the owner's complaint (2026-07-30): rooms under
 *  /lab were invisible from /lab and
 *  vice versa, and routes like /lab/logo or /copy-editor had no index
 *  anywhere. `scripts/qa/lab-audit.mjs` proves nothing on disk is missing
 *  from `REGISTRY`.
 *
 *  The status shown is the registry's committed default with the
 *  LabRoomState rows layered on top, so the owner's own archiving wins,
 *  on the domain as well as locally. See ./_archive-state.ts for why
 *  that is a table and not a file.
 *
 *  This redesigns no room. It is only an index over files that already
 *  exist, each keeping its own URL.
 * ------------------------------------------------------------------ */
export default async function LabPage() {
  const [overrides, session] = await Promise.all([readOverrides(), auth()]);

  const entries = REGISTRY.map((entry) => {
    const override = overrides[entry.href];
    return override === undefined
      ? entry
      : { ...entry, status: override ? ("archived" as const) : ("active" as const) };
  });

  /* Mirrors the setArchived gate: admins can archive anywhere; local dev
     stays frictionless with no sign-in. Everyone else gets a read-only view. */
  const editable =
    process.env.NODE_ENV === "development" || session?.user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <LabClient entries={entries} editable={editable} />
    </div>
  );
}
