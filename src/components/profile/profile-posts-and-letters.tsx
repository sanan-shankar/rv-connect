import { Feather, PenLine } from "lucide-react";
import { ProfileAuthorFeed } from "@/components/profile/profile-author-feed";

/**
 * The "Posts & Letters" tab: one tab, two labelled groups. Letters lead (the
 * flagship register the owner singled out), then Posts. Each group carries a
 * count in its eyebrow and reuses the shared author feed filtered by `kind`.
 * A group with zero items is hidden; when both are empty a single warm empty
 * state stands in.
 */
function GroupHeader({
  icon: Icon,
  label,
  count,
  accent,
}: {
  icon: typeof Feather;
  label: string;
  count: number;
  accent: "cinnamon" | "muted";
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${
          accent === "cinnamon" ? "text-cinnamon" : "text-muted-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

export function ProfilePostsAndLetters({
  authorId,
  firstName,
  isOwnProfile,
  letterCount,
  postCount,
}: {
  authorId: string;
  firstName: string;
  isOwnProfile: boolean;
  letterCount: number;
  postCount: number;
}) {
  if (letterCount === 0 && postCount === 0) {
    return (
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-10 text-center">
        <p className="font-heading text-lg tracking-tight text-foreground">
          {isOwnProfile ? "You haven't shared anything yet." : `Nothing from ${firstName} yet.`}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {isOwnProfile
            ? "Write a letter or post a note, and it will gather here."
            : "When they write a letter or post a note, it will show up here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {letterCount > 0 && (
        <section>
          <GroupHeader icon={Feather} label="Letters" count={letterCount} accent="cinnamon" />
          <ProfileAuthorFeed
            authorId={authorId}
            firstName={firstName}
            isOwnProfile={isOwnProfile}
            kind="letter"
          />
        </section>
      )}
      {postCount > 0 && (
        <section>
          <GroupHeader icon={PenLine} label="Posts" count={postCount} accent="muted" />
          <ProfileAuthorFeed
            authorId={authorId}
            firstName={firstName}
            isOwnProfile={isOwnProfile}
            kind="post"
          />
        </section>
      )}
    </div>
  );
}
