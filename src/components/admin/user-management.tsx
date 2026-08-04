"use client";

import { useState } from "react";
import { Ban, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatBatch } from "@/lib/utils";
import { adminBlockUser, adminDeleteUser } from "@/components/profile/admin-actions";
import { toast } from "sonner";
import Link from "next/link";

interface UserRow {
  id: string;
  name: string;
  email: string;
  batchType: string | null;
  batchYear: number | null;
  role: string;
  isBlocked: boolean;
  createdAt: string;
}

export function UserManagement({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleBlock(userId: string, block: boolean) {
    try {
      const result = await adminBlockUser(userId, block);
      if (result.error) toast.error(result.error);
      else toast.success(block ? "User blocked" : "User unblocked");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user permanently?")) return;
    try {
      const result = await adminDeleteUser(userId);
      if (result.error) toast.error(result.error);
      else toast.success("User deleted");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search users by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto">
        {/* min-w with w-full: `w-full` alone let the table squeeze to a 390px
            phone, which wrapped every name and batch onto two lines and still
            clipped Status and Actions off the right edge, so the block and
            delete buttons could not be reached at all. A floor wide enough for
            one line per row hands the overflow to the scroller instead. */}
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-1.5 pr-4 font-medium">Name</th>
              <th className="pb-1.5 pr-4 font-medium">Email</th>
              <th className="pb-1.5 pr-4 font-medium">Batch</th>
              <th className="pb-1.5 pr-4 font-medium">Status</th>
              <th className="pb-1.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-border">
                <td className="py-1.5 pr-4 font-medium whitespace-nowrap">{user.name}</td>
                <td className="py-1.5 pr-4 text-muted-foreground">
                  {user.email}
                </td>
                <td className="py-1.5 pr-4 whitespace-nowrap">
                  {formatBatch(user.batchType, user.batchYear)}
                </td>
                <td className="py-1.5 pr-4">
                  {user.role === "admin" && (
                    <Badge variant="outline" className="text-leaf border-leaf">
                      Admin
                    </Badge>
                  )}
                  {user.isBlocked && (
                    <Badge variant="outline" className="text-destructive border-destructive">
                      Blocked
                    </Badge>
                  )}
                  {!user.isBlocked && user.role !== "admin" && (
                    <span className="text-xs text-muted-foreground">Active</span>
                  )}
                </td>
                <td className="py-1.5">
                  <div className="flex gap-1">
                    <Link href={`/profile/${user.id}`} title="View profile">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleBlock(user.id, !user.isBlocked)}
                      title={user.isBlocked ? "Unblock user" : "Block user"}
                    >
                      <Ban className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      title="Delete user"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
