"use client";

import { useState } from "react";
import { Shield, Ban, Trash2, StickyNote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="pt-6">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <Shield className="h-5 w-5" />
          Admin Tools
        </h3>

        <div className="mt-4 space-y-4">
          {/* Admin note */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-medium text-foreground">
              <StickyNote className="h-4 w-4" />
              Admin Note
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
            >
              {saving ? "Saving..." : "Save note"}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBlock}
              className={blocked ? "text-leaf" : "text-amber-600"}
            >
              <Ban className="mr-1 h-4 w-4" />
              {blocked ? "Unblock user" : "Block user"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete user
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
