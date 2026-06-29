import Link from "next/link";
import { Lock, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GroupCardData {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  visibility: string;
  memberCount: number;
  postCount: number;
  keeperName: string | null;
}

/**
 * GroupCard: the warm browse tile for a group. Cover strip (photo or a soft
 * brand gradient), name with a public/private chip, description, and a meta
 * line (members, posts, Keeper). The whole card links to the group.
 */
export function GroupCard({ group }: { group: GroupCardData }) {
  const isPrivate = group.visibility === "private";

  return (
    <Link
      href={`/groups/${group.id}`}
      className="group card-elevated block overflow-hidden rounded-[var(--radius)] border border-border bg-card transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0"
    >
      <div className="relative h-20 w-full bg-gradient-to-br from-leaf/25 via-sky/15 to-cinnamon/15">
        {group.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.coverImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span
          className={cn(
            "absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold backdrop-blur-sm",
            isPrivate
              ? "bg-cinnamon/20 text-cinnamon"
              : "bg-leaf/20 text-leaf"
          )}
        >
          {isPrivate ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
          {isPrivate ? "Private" : "Public"}
        </span>
      </div>

      <div className="p-4 pt-3.5">
        <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {group.name}
        </h2>
        {group.description && (
          <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {group.description}
          </p>
        )}
        <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {group.memberCount}
          </span>
          <span>{group.postCount} posts</span>
          {group.keeperName && (
            <span className="truncate">
              Keeper: {group.keeperName.split(" ")[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
