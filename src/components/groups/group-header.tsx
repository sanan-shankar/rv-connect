"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, LogOut, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IdentityRow } from "@/components/common/identity-row";
import { GroupInviteDialog } from "./group-invite-dialog";
import { leaveGroup, joinGroup } from "@/app/(main)/groups/actions";
import { batchLine, cn } from "@/lib/utils";
import { toast } from "sonner";

/** Warm name for the group organizer. Stored as role "admin" in the DB. */
export function roleLabel(role: string): string {
  return role === "admin" ? "Keeper" : "Member";
}

interface MemberView {
  id: string;
  name: string;
  avatarColor: string | null;
  photoUrl?: string | null;
  accountType?: string | null;
  batchYear: number | null;
  role: string;
}

interface GroupHeaderProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    coverImage: string | null;
    visibility: string;
  };
  members: MemberView[];
  /** The viewer's role, or null when they are not a member. */
  myRole: string | null;
}

export function GroupHeader({ group, members, myRole }: GroupHeaderProps) {
  const router = useRouter();
  const [showMembers, setShowMembers] = useState(false);
  const [busy, setBusy] = useState(false);

  const isMember = myRole !== null;
  const isKeeper = myRole === "admin";
  const isPrivate = group.visibility === "private";

  async function handleLeave() {
    if (!confirm("Leave this group?")) return;
    setBusy(true);
    const result = await leaveGroup(group.id);
    if (result?.error) {
      toast.error(result.error);
      setBusy(false);
    } else {
      router.push("/groups");
    }
  }

  async function handleJoin() {
    setBusy(true);
    const result = await joinGroup(group.id);
    if (result?.error) {
      toast.error(result.error);
      setBusy(false);
    } else {
      toast.success(`Welcome to ${group.name}`);
      router.refresh();
    }
  }

  return (
    <section className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      {/* Cover */}
      <div className="relative h-32 w-full bg-gradient-to-br from-leaf/25 via-sky/15 to-cinnamon/15 sm:h-40">
        {group.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.coverImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                {group.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  isPrivate
                    ? "bg-cinnamon/12 text-cinnamon"
                    : "bg-leaf/12 text-leaf"
                )}
              >
                {isPrivate ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Globe className="h-3 w-3" />
                )}
                {isPrivate ? "Private" : "Public"}
              </span>
            </div>
            {group.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {group.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
              <button
                type="button"
                onClick={() => setShowMembers((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Users className="h-3.5 w-3.5" />
                {members.length} {members.length === 1 ? "member" : "members"}
              </button>
              {isMember && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="dotsep" aria-hidden>·</span>
                  You are the{" "}
                  <span className="font-semibold text-leaf">
                    {roleLabel(myRole!)}
                  </span>
                  {!isKeeper && " here"}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isKeeper && (
              <GroupInviteDialog groupId={group.id} groupName={group.name} />
            )}
            {isMember && !isKeeper && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={handleLeave}
                disabled={busy}
              >
                <LogOut className="h-3.5 w-3.5" />
                Leave
              </Button>
            )}
            {!isMember && !isPrivate && (
              <Button
                variant="primary"
                size="sm"
                className="rounded-full"
                onClick={handleJoin}
                disabled={busy}
              >
                {busy ? "Joining..." : "Join group"}
              </Button>
            )}
          </div>
        </div>

        {showMembers && (
          <div className="mt-4 grid grid-cols-1 gap-1.5 border-t border-border pt-4 sm:grid-cols-2">
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/profile/${m.id}`}
                className="block rounded-lg p-1.5 transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
              >
                <IdentityRow
                  user={{ id: m.id, name: m.name, avatarColor: m.avatarColor, photoUrl: m.photoUrl }}
                  className="gap-2.5"
                  textClassName="flex-1"
                  name={m.name}
                  nameClassName="truncate text-sm font-semibold leading-none text-foreground"
                  meta={
                    <>
                      {batchLine(m)}
                      {m.role === "admin" && (
                        <>
                          <span className="dotsep" aria-hidden>·</span>
                          <span className="font-semibold text-leaf">{roleLabel(m.role)}</span>
                        </>
                      )}
                    </>
                  }
                  metaClassName="flex items-center gap-1.5 leading-none"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
