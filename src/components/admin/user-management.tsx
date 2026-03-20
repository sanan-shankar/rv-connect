"use client";

import { useState } from "react";
import { Ban, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatBatch } from "@/lib/utils";
import { adminBlockUser, adminDeleteUser } from "@/components/profile/admin-actions";
import { toast } from "sonner";
import Link from "next/link";

interface UserRow {
  id: string;
  name: string;
  email: string;
  batchType: string;
  batchYear: number;
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
    const result = await adminBlockUser(userId, block);
    if (result.error) toast.error(result.error);
    else toast.success(block ? "User blocked" : "User unblocked");
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user permanently?")) return;
    const result = await adminDeleteUser(userId);
    if (result.error) toast.error(result.error);
    else toast.success("User deleted");
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search users by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Batch</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-border">
                <td className="py-2 pr-4 font-medium">{user.name}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {user.email}
                </td>
                <td className="py-2 pr-4">
                  {formatBatch(user.batchType, user.batchYear)}
                </td>
                <td className="py-2 pr-4">
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
                <td className="py-2">
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
