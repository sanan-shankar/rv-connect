"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ExternalLink, EyeOff, MoreHorizontal, Search, Trash2, X } from "lucide-react";
import { useAdminAct } from "@/components/admin/use-admin-act";
import { AdminFilterBar, useAdminFilterParams } from "@/components/admin/admin-filter-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FacetSelect } from "@/components/common/filters/facet-select";
import { type SentenceToken } from "@/components/common/filters/sentence-line";
import { Chip } from "@/components/admin/admin-chip";
import { AdminEmpty } from "@/components/admin/admin-chrome";
import { ModerationDialog } from "@/components/admin/moderation-dialog";
import { formatTimeAgo } from "@/lib/utils";
import { TYPE_OPTIONS, typeLabel, type ContentItem } from "@/lib/admin-content";
import { adminRemoveComment, adminRemovePost } from "@/app/(main)/feed/actions";
import {
  adminRemovePhoto,
  approvePhoto,
  declinePhoto,
} from "@/app/(main)/collection/actions";

const KIND_LABEL: Record<ContentItem["kind"], string> = {
  post: "Post",
  letter: "Letter",
  comment: "Comment",
  photo: "Photo",
};

export function ContentList({
  items,
  pendingPhotos,
  author,
  capped,
}: {
  items: ContentItem[];
  pendingPhotos: number;
  author: { id: string; name: string } | null;
  capped: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useAdminFilterParams("/admin/content");
  const { setParam } = filters;
  const { busy, act } = useAdminAct();
  const [removing, setRemoving] = useState<ContentItem | null>(null);

  const type = searchParams.get("type") ?? "";
  const hidden = searchParams.get("hidden") === "1";

  const tokens: SentenceToken[] = useMemo(() => {
    const out: SentenceToken[] = [];
    if (type) out.push({ key: "type", label: typeLabel(type), onClear: () => setParam("type", "") });
    if (author)
      out.push({ key: "author", label: author.name, onClear: () => setParam("author", "") });
    if (hidden)
      out.push({ key: "hidden", label: "Including removed", onClear: () => setParam("hidden", "") });
    return out;
  }, [type, author, hidden, setParam]);

  const hasFilter = tokens.length > 0 || Boolean(filters.q);

  async function removeItem(item: ContentItem, note: string) {
    switch (item.kind) {
      case "comment":
        return adminRemoveComment(item.id, note);
      case "photo":
        return adminRemovePhoto(item.id, note);
      default:
        return adminRemovePost(item.id, note);
    }
  }

  const activeCount = (type ? 1 : 0) + (hidden ? 1 : 0);

  function facets(fullWidth: boolean, compact = false) {
    const className = fullWidth ? (compact ? "w-full h-9" : "w-full") : undefined;
    return (
      <>
        <FacetSelect
          label="Kind"
          value={type}
          onChange={(v) => setParam("type", v)}
          options={TYPE_OPTIONS}
          anyLabel="Everything"
          className={className}
        />
        <Button
          size="sm"
          variant={hidden ? "secondary" : "outline"}
          onClick={() => setParam("hidden", hidden ? "" : "1")}
          aria-pressed={hidden}
          className={fullWidth ? "w-full justify-start" : undefined}
        >
          <EyeOff className="size-3.5" strokeWidth={2} />
          {hidden ? "Showing removed things" : "Show removed things"}
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AdminFilterBar
        filters={filters}
        searchPlaceholder="Search the words"
        searchAriaLabel="Search content"
        facets={facets}
        tokens={tokens}
        activeCount={activeCount}
        count={items.length}
        singular="thing"
        plural="things"
        maxTokens={3}
        sheetShowLabel={`Show ${items.length} ${items.length === 1 ? "thing" : "things"}`}
        banner={
          /* The queue is a filter, so the panel says how long it is here
             rather than keeping a permanent section for it. */
          pendingPhotos > 0 && type !== "pending" ? (
            <button
              type="button"
              onClick={() => setParam("type", "pending")}
              className="state-layer flex w-fit items-center gap-2 rounded-full border border-cinnamon/30 bg-cinnamon/[0.07] px-3 py-1.5 text-[12.5px] font-medium text-cinnamon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {pendingPhotos} {pendingPhotos === 1 ? "photo is" : "photos are"} waiting for you
            </button>
          ) : null
        }
      />

      {items.length === 0 ? (
        <AdminEmpty>
          {hasFilter ? "Nothing matches that." : "Nobody has posted anything yet."}
        </AdminEmpty>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="flex gap-3 rounded-[var(--radius)] border border-border bg-card p-3.5"
            >
              {item.thumbUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.thumbUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-[var(--radius-sm)] border border-border object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px]">
                  <Chip label={KIND_LABEL[item.kind]} tone="info" />
                  {/* No link when the account behind it has been purged: the row
                      survives as an anchor for other members' replies and there
                      is no person page to open (audit M34). */}
                  {item.authorId ? (
                    <Link
                      href={`/admin/people/${item.authorId}`}
                      className="rounded-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {item.authorName}
                    </Link>
                  ) : (
                    <span className="font-medium text-muted-foreground">{item.authorName}</span>
                  )}
                  <span className="text-muted-foreground">
                    {formatTimeAgo(new Date(item.createdAt))}
                  </span>
                  {item.isHidden && <Chip label="Removed" tone="bad" icon={EyeOff} />}
                  {item.approved === false && !item.isHidden && (
                    <Chip label="Waiting for you" tone="warn" />
                  )}
                </p>
                {item.title && (
                  <p className="mt-1 truncate text-[13.5px] font-semibold text-foreground">
                    {item.title}
                  </p>
                )}
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-foreground">
                  {item.excerpt || (
                    <span className="text-muted-foreground">
                      {item.kind === "photo" ? "No caption" : "A picture, no words"}
                    </span>
                  )}
                </p>
              </div>

              {/* A ROW, not a column. Stacked, these two buttons were the
                  tallest thing in the card and set a ~100px row height for a
                  single line of text. There are only ever two. */}
              {/* A photo in the queue is the one row with a JOB attached, so
                  its two answers are real buttons. Everything else is
                  something you are browsing, and its actions live behind the
                  same "..." menu the feed's own post card uses. Two buttons
                  on every row made the list read as a page of controls with
                  some text between them (owner: "no overcrowded elements"). */}
              <div className="flex shrink-0 items-start gap-1.5">
                {item.approved === false && !item.isHidden ? (
                  <>
                    <Button
                      size="xs"
                      variant="primary"
                      disabled={busy === item.id}
                      onClick={() =>
                        act(item.id, () => approvePhoto(item.id), "In the Collection")
                      }
                    >
                      <Check className="size-3" strokeWidth={2} />
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy === item.id}
                      onClick={() => act(item.id, () => declinePhoto(item.id), "Declined")}
                    >
                      <X className="size-3" strokeWidth={2} />
                      Decline
                    </Button>
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`What to do with this ${KIND_LABEL[item.kind].toLowerCase()}`}
                      className="state-layer grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <MoreHorizontal className="size-4" strokeWidth={2} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {item.href && (
                        <DropdownMenuItem render={<Link href={item.href} />}>
                          <ExternalLink className="mr-2 size-4" strokeWidth={2} />
                          See it on the site
                        </DropdownMenuItem>
                      )}
                      {item.authorId && (
                        <DropdownMenuItem render={<Link href={`/admin/content?author=${item.authorId}`} />}>
                          <Search className="mr-2 size-4" strokeWidth={2} />
                          Everything by {item.authorName.split(" ")[0]}
                        </DropdownMenuItem>
                      )}
                      {!item.isHidden && (
                        <DropdownMenuItem variant="destructive" onClick={() => setRemoving(item)}>
                          <Trash2 className="mr-2 size-4" strokeWidth={2} />
                          Take it down
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {capped && (
        /* Say what was dropped. A list that quietly stops at 40 reads as
           "that is everything", and here it very often is not. */
        <p className="px-0.5 text-[12.5px] text-muted-foreground">
          Showing the first {items.length}. Narrow it with the search or the kind filter to see
          further back.
        </p>
      )}

      <ModerationDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        itemLabel={removing ? KIND_LABEL[removing.kind].toLowerCase() : "post"}
        onConfirm={async (note) => {
          if (!removing) return;
          const result = await removeItem(removing, note);
          if (result?.error) return result;
          router.refresh();
        }}
      />
    </div>
  );
}
