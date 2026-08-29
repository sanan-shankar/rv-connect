"use client";

import { useState } from "react";
import { Shield, Ban, Trash2, StickyNote, BadgeCheck, BadgeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  adminBlockUser,
  adminDeleteUser,
  adminUpdateNote,
  adminVerifyUser,
  adminUnverifyUser,
} from "./admin-actions";

export function AdminProfileTools({
  userId,
  name,
  isBlocked,
  adminNote,
  verifyState,
}: {
  userId: string;
  /** Named in every confirmation: the one thing a confirmation for an
   *  irreversible act has to say is WHICH member (confirm-dialog.tsx). */
  name: string;
  isBlocked: boolean;
  adminNote: string | null;
  verifyState: string;
}) {
  const [note, setNote] = useState(adminNote || "");
  const [blocked, setBlocked] = useState(isBlocked);
  const [verified, setVerified] = useState(verifyState === "verified");
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dialog, setDialog] = useState<"block" | "delete" | "verify" | null>(null);

  async function handleBlock() {
    const action = blocked ? "unblock" : "block";
    try {
      const result = await adminBlockUser(userId, !blocked);
      if (result.error) {
        toast.error(result.error);
      } else {
        setBlocked(!blocked);
        toast.success(`User ${action}ed`);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  async function handleDelete() {
    try {
      const result = await adminDeleteUser(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User deleted");
        /* A hard navigation, not router.push: the profile this component is
           mounted on has just been deleted, so every cached RSC payload for it
           is a page about a user who no longer exists. */
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/directory";
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  async function handleVerifyToggle() {
    const action = verified ? "unverify" : "verify";
    setVerifying(true);
    try {
      const result = verified
        ? await adminUnverifyUser(userId)
        : await adminVerifyUser(userId, "admin_manual");
      if (result.error) {
        toast.error(result.error);
      } else {
        setVerified(!verified);
        toast.success(action === "verify" ? "Member verified" : "Verification removed");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSaveNote() {
    setSaving(true);
    try {
      const result = await adminUpdateNote(userId, note);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Note saved");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
      <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
        <Shield className="h-5 w-5 text-cinnamon" />
        Admin tools
      </h3>

      <div className="mt-4 space-y-4">
        {/* Admin note */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            Admin note
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Private note about this user..."
            rows={2}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveNote}
            disabled={saving}
            className="rounded-full"
          >
            {saving ? "Saving..." : "Save note"}
          </Button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog("verify")}
            disabled={verifying}
            className={
              verified
                ? "rounded-full text-cinnamon hover:text-cinnamon"
                : "rounded-full text-leaf hover:text-leaf"
            }
          >
            {verified ? <BadgeX className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
            {verified ? "Unverify member" : "Verify member"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog("block")}
            className={
              blocked
                ? "rounded-full text-leaf hover:text-leaf"
                : "rounded-full text-cinnamon hover:text-cinnamon"
            }
          >
            <Ban className="h-4 w-4" />
            {blocked ? "Unblock user" : "Block user"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog("delete")}
            className="rounded-full text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete user
          </Button>
        </div>
      </div>

      {/* The same words the admin panel's person-detail uses for the same
          acts (Material's rule: one verb per act, everywhere). Verify is the
          one non-destructive act here, and the one with nothing to add under
          its title, so it has no description. */}
      <ConfirmDialog
        open={dialog === "verify"}
        onClose={() => setDialog(null)}
        title={verified ? `Unverify ${name}` : `Verify ${name}`}
        description={
          verified
            ? "Their leaf mark disappears and they return to the review queue."
            : undefined
        }
        actionLabel={verified ? "Remove verification" : "Verify"}
        destructive={verified}
        onConfirm={handleVerifyToggle}
      />
      <ConfirmDialog
        open={dialog === "block"}
        onClose={() => setDialog(null)}
        title={blocked ? `Unblock ${name}` : `Block ${name}`}
        description={
          blocked
            ? undefined
            : "They stay in the database and keep everything they wrote, but they cannot sign in. You can undo this from the same button."
        }
        actionLabel={blocked ? "Unblock" : "Block them"}
        destructive={!blocked}
        onConfirm={handleBlock}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title={`Delete ${name}`}
        description="Their account, posts, comments, photos and messages go for good. Contributions survive without a name attached. There is no undo."
        actionLabel="Delete for good"
        confirmWord={name}
        onConfirm={handleDelete}
      />
    </section>
  );
}
