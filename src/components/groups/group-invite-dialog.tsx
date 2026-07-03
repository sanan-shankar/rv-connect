"use client";

import { useEffect, useRef, useState } from "react";
import { UserPlus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IdentityRow } from "@/components/common/identity-row";
import { inviteToGroup } from "@/app/(main)/groups/actions";
import { toast } from "sonner";

interface PersonResult {
  id: string;
  name: string;
  avatarColor: string | null;
  photoUrl?: string | null;
  batchYear: number | null;
}

/**
 * GroupInviteDialog: a Keeper searches a person by @-name and invites them.
 * Reuses the same /api/users/search endpoint that powers @mentions in posts,
 * so tagging stays consistent across the app. The invite lands in the
 * invitee's notification bell.
 */
export function GroupInviteDialog({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const q = query.trim().replace(/^@/, "");
    if (q.length < 1) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } catch {
        // ignore
      }
      setLoading(false);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleInvite(person: PersonResult) {
    setPendingId(person.id);
    const result = await inviteToGroup(groupId, person.id);
    setPendingId(null);
    if (result?.error) {
      toast.error(result.error);
    } else {
      setInvited((prev) => new Set(prev).add(person.id));
      toast.success(`Invited ${person.name.split(" ")[0]}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="primary" size="sm" className="rounded-full" />}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Invite
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-tight">
            Invite to {groupName}
          </DialogTitle>
          <DialogDescription>
            Search a person by name. Their invite arrives in their notifications.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a name, like @Meera..."
          autoFocus
        />

        <div className="max-h-72 overflow-y-auto">
          {loading && results.length === 0 && (
            <p className="px-1 py-3 text-sm text-muted-foreground">Searching...</p>
          )}
          {!loading && query.trim().length > 0 && results.length === 0 && (
            <p className="px-1 py-3 text-sm text-muted-foreground">
              No one found by that name.
            </p>
          )}
          <div className="[&>div+div]:border-t [&>div+div]:border-border">
            {results.map((person) => {
              const done = invited.has(person.id);
              return (
                <div key={person.id} className="flex items-center gap-3 py-2.5">
                  <IdentityRow
                    user={{
                      id: person.id,
                      name: person.name,
                      avatarColor: person.avatarColor,
                      photoUrl: person.photoUrl,
                    }}
                    className="min-w-0 flex-1"
                    textClassName="flex-1"
                    name={person.name}
                    nameClassName="truncate text-sm font-semibold leading-none text-foreground"
                    meta={
                      person.batchYear != null
                        ? `Batch of '${String(person.batchYear).slice(-2)}`
                        : undefined
                    }
                    metaClassName="leading-none"
                  />
                  <Button
                    size="sm"
                    variant={done ? "outline" : "primary"}
                    className="shrink-0 rounded-full"
                    disabled={done || pendingId === person.id}
                    onClick={() => handleInvite(person)}
                  >
                    {done ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Invited
                      </>
                    ) : pendingId === person.id ? (
                      "Inviting..."
                    ) : (
                      "Invite"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
