"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { leaveGroup } from "@/app/(main)/groups/actions";
import { batchLine } from "@/lib/utils";
import { toast } from "sonner";

interface GroupHeaderProps {
  group: { id: string; name: string; description: string | null };
  members: {
    id: string;
    name: string;
    avatarColor: string | null;
    accountType?: string | null;
    batchYear: number | null;
    role: string;
  }[];
  isAdmin: boolean;
}

export function GroupHeader({ group, members, isAdmin }: GroupHeaderProps) {
  const router = useRouter();
  const [showMembers, setShowMembers] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function handleLeave() {
    if (!confirm("Leave this group?")) return;
    setLeaving(true);
    const result = await leaveGroup(group.id);
    if (result?.error) {
      toast.error(result.error);
      setLeaving(false);
    } else {
      router.push("/groups");
    }
  }

  return (
    <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {group.name}
          </h1>
          {group.description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {group.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant={showMembers ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setShowMembers((s) => !s)}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            {members.length}
          </Button>
          {!isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={handleLeave}
              disabled={leaving}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Leave
            </Button>
          )}
        </div>
      </div>

      {showMembers && (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 sm:grid-cols-3">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/profile/${m.id}`}
              className="flex items-center gap-2.5 rounded-lg p-1.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <BirdAvatar user={{ id: m.id, name: m.name }} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {m.name}
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  {batchLine(m)}
                  {m.role === "admin" && " · admin"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
