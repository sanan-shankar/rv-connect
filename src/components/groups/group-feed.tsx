"use client";

import { useState } from "react";
import { Users, MoreHorizontal, Trash2, LogOut, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/common/user-avatar";
import { toast } from "sonner";
import { createGroupPost, deleteGroupPost, leaveGroup } from "@/app/(main)/groups/actions";
import { useRouter } from "next/navigation";

interface GroupFeedProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    creatorName: string;
  };
  members: {
    id: string;
    name: string;
    avatarColor: string | null;
    batchYear: number;
    role: string;
  }[];
  posts: {
    id: string;
    content: string;
    images: string | null;
    createdAt: string;
    author: { id: string; name: string; avatarColor: string | null; batchYear: number };
    isOwn: boolean;
  }[];
  isAdmin: boolean;
  currentUserId: string;
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function GroupFeed({ group, members, posts, isAdmin, currentUserId }: GroupFeedProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  async function handlePost() {
    if (!content.trim()) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.set("groupId", group.id);
    formData.set("content", content);

    const result = await createGroupPost(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      setContent("");
      router.refresh();
    }
    setSubmitting(false);
  }

  async function handleDelete(postId: string) {
    const result = await deleteGroupPost(postId);
    if (result.error) toast.error(result.error);
    else router.refresh();
  }

  async function handleLeave() {
    if (!confirm("Leave this group?")) return;
    await leaveGroup(group.id);
    router.push("/groups");
  }

  return (
    <div className="space-y-4">
      {/* Group header */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {group.name}
            </h1>
            {group.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {group.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMembers(!showMembers)}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              {members.length}
            </Button>
            {!isAdmin && (
              <Button variant="outline" size="sm" onClick={handleLeave}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Leave
              </Button>
            )}
          </div>
        </div>

        {showMembers && (
          <div className="mt-4 border-t border-white/20 pt-4 dark:border-white/10">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-lg p-1.5">
                  <UserAvatar name={m.name} avatarColor={m.avatarColor} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {m.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      &apos;{String(m.batchYear).slice(-2)}
                      {m.role === "admin" && " · admin"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Post input */}
      <div className="glass rounded-xl p-4">
        <textarea
          placeholder={`Share something with ${group.name}...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          maxLength={5000}
          className="w-full resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {content.trim() && (
          <div className="mt-2 flex justify-end border-t border-white/20 pt-2 dark:border-white/10">
            <Button
              onClick={handlePost}
              disabled={submitting}
              size="sm"
              className="bg-leaf text-white hover:bg-leaf-light"
            >
              {submitting ? "Posting..." : "Post"}
            </Button>
          </div>
        )}
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center">
          <p className="font-heading text-lg text-foreground">
            No posts yet in this group.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to share something!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={post.author.name}
                    avatarColor={post.author.avatarColor}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {post.author.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Batch of &apos;{String(post.author.batchYear).slice(-2)} · {timeAgo(post.createdAt)}
                    </p>
                  </div>
                </div>
                {(post.isOwn || isAdmin) && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    title="Delete post"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                {post.content}
              </p>
              {post.images && (() => {
                try {
                  const imgs = JSON.parse(post.images) as string[];
                  if (imgs.length === 0) return null;
                  return (
                    <div className="mt-3 flex gap-2">
                      {imgs.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="max-h-64 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
