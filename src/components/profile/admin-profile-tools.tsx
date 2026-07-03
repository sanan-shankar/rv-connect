"use client";

import { useState } from "react";
import { Shield, Ban, Trash2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  adminBlockUser,
  adminDeleteUser,
  adminUpdateNote,
} from "./admin-actions";

export function AdminProfileTools({
  userId,
  isBlocked,
  adminNote,
}: {
  userId: string;
  isBlocked: boolean;
  adminNote: string | null;
}) {
  const [note, setNote] = useState(adminNote || "");
  const [blocked, setBlocked] = useState(isBlocked);
  const [saving, setSaving] = useState(false);

  async function handleBlock() {
    const action = blocked ? "unblock" : "block";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    const result = await adminBlockUser(userId, !blocked);
    if (result.error) {
      toast.error(result.error);
    } else {
      setBlocked(!blocked);
      toast.success(`User ${action}ed`);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "Are you sure you want to delete this user and all their data? This cannot be undone."
      )
    )
      return;

    const result = await adminDeleteUser(userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("User deleted");
      window.location.href = "/directory";
    }
  }

  async function handleSaveNote() {
    setSaving(true);
    const result = await adminUpdateNote(userId, note);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Note saved");
    }
    setSaving(false);
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
            onClick={handleBlock}
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
            onClick={handleDelete}
            className="rounded-full text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete user
          </Button>
        </div>
      </div>
    </section>
  );
}
