"use client";

import { useState } from "react";
import { shrinkForUpload } from "@/lib/image-downscale";
import { postImages } from "@/lib/upload-client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { m, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS, EASE_OUT_SMOOTH } from "@/components/common/motion";
import { AttachImageDialog } from "@/components/common/attach-image-dialog";
import { COMPOSER_KINDS, MAX_MESSAGE_LENGTH, kindLabel } from "@/lib/admin-threads";
import {
  adminReplyToThread,
  replyToThread,
  startThread,
} from "@/app/(main)/messages/actions";

/**
 * The one box for writing to the admins, reused for a new message, a member's
 * reply, and an admin's reply.
 *
 * The whole point of this feature is speed: the old Tally form asked for a
 * category before it would show you a text field, which is exactly what made
 * reporting a bug feel like a chore. Here the text box is the first and only
 * required thing. The kind chips and the screenshot sit under it, optional,
 * and nothing blocks Send but an empty box. Cmd/Ctrl + Enter sends too.
 */
export function MessageComposer({
  mode,
  threadId,
  sender,
  placeholder,
  submitLabel = "Send",
  autoFocus = false,
}: {
  mode: "new" | "reply" | "admin-reply";
  threadId?: string;
  /** Shown beside the box so it reads as "you, writing". Omitted on the admin side. */
  sender?: AvatarUser | null;
  placeholder: string;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const busy = sending || uploading;
  const canSend = body.trim().length > 0 && !busy;
  const remaining = MAX_MESSAGE_LENGTH - body.length;

  async function handlePickImage(file: File) {
    setUploading(true);
    try {
      // A screenshot straight off a phone is routinely over Vercel's ~4.5MB
      // body cap, which refuses the request before /api/upload runs. This path
      // had no size check of any kind (bug audit B-030).
      const ready = await shrinkForUpload([file]);
      if (!ready.ok) {
        toast.error(ready.error);
        return;
      }
      const { urls } = await postImages(ready.files);
      setImageUrl(urls[0] ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That photo did not upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSend() {
    if (!canSend) return;
    setSending(true);

    const payload = {
      body: body.trim(),
      ...(kind ? { kind } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    };

    try {
      // callAction: a rejected send (deploy skew, dropped network, expired
      // session) used to skip the `setSending(false)` below entirely and
      // leave Send disabled for the rest of the session (audit B-042).
      const result = await callAction(() =>
        mode === "new"
          ? startThread(payload)
          : mode === "reply"
            ? replyToThread(threadId!, payload)
            : adminReplyToThread(threadId!, payload)
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setBody("");
      setKind(null);
      setImageUrl(null);

      if (mode === "new") {
        toast.success("Sent. The admins will read it and reply here.");
        router.push(`/messages/${result.threadId}`);
        return;
      }
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex gap-3">
      {sender && <BirdAvatar user={sender} size={36} className="mt-0.5 hidden sm:inline-grid" />}

      <div className="min-w-0 flex-1">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={mode === "new" ? 3 : 2}
          className="resize-none bg-background/60 text-[15px] leading-[1.65]"
          aria-label={placeholder}
        />

        <AnimatePresence initial={false}>
          {imageUrl && (
            <m.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE_OUT_SMOOTH }}
              className="relative mt-2.5 w-fit"
            >
              <Image
                src={imageUrl}
                alt="The screenshot you attached"
                width={160}
                height={110}
                className="h-[88px] w-auto rounded-lg border border-border object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                aria-label="Remove this screenshot"
                // state-layer replaces hover:bg-mist: mist over this card was
              // about 2 dL*, the just-noticeable floor, on a 24px control.
              className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_1px_3px_rgba(30,28,22,0.12)] transition-[color,transform] duration-150 state-layer hover:text-foreground active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X className="size-3.5" strokeWidth={2.2} />
              </button>
            </m.div>
          )}
        </AnimatePresence>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {mode === "new" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {COMPOSER_KINDS.map((k) => {
                const active = kind === k;
                return (
                  <m.button
                    key={k}
                    type="button"
                    onClick={() => setKind(active ? null : k)}
                    aria-pressed={active}
                    whileTap={{ scale: 0.94 }}
                    transition={SPRINGS.snappy}
                    // Selected stays canopy (the app's one selection green).
                    // The idle chip keeps its mist rest fill and gets the state
                    // layer on top; hover:bg-border/70 used to REPLACE the fill
                    // with the hairline colour, which read as a different chip
                    // rather than the same chip under the cursor.
                    className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      active
                        ? "bg-canopy text-white"
                        : "bg-mist text-muted-foreground state-layer hover:text-foreground"
                    }`}
                  >
                    {kindLabel(k)}
                  </m.button>
                );
              })}
            </div>
          )}

          <AttachImageDialog
            open={attachOpen}
            onOpenChange={setAttachOpen}
            onFiles={(files) => {
              if (files[0]) handlePickImage(files[0]);
            }}
            multiple={false}
            title="Add a screenshot"
          />
          <m.button
            type="button"
            onClick={() => setAttachOpen(true)}
            disabled={busy}
            whileTap={{ scale: 0.94 }}
            transition={SPRINGS.snappy}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors state-layer hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ImagePlus className="size-3.5" strokeWidth={1.9} />
            {uploading ? "Adding..." : imageUrl ? "Swap screenshot" : "Screenshot"}
          </m.button>

          <div className="ml-auto flex items-center gap-2.5">
            {remaining < 400 && (
              <span className="text-[12px] tabular-nums text-muted-foreground">{remaining}</span>
            )}
            <Button variant="primary" size="sm" onClick={handleSend} disabled={!canSend}>
              <Send className="size-3.5" strokeWidth={2} />
              {sending ? "Sending..." : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
