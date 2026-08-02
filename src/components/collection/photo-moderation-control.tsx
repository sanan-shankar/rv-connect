"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { adminRemovePhoto } from "@/app/(main)/collection/actions";
import { ModerationDialog } from "@/components/admin/moderation-dialog";

/** Admin-only "Remove" affordance on the Collection photo detail page. */
export function PhotoModerationControl({ photoId }: { photoId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleConfirm(note: string) {
    const result = await adminRemovePhoto(photoId, note || undefined);
    if (!result.error) router.push("/collection");
    return result;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Remove photo (admin)"
        title="Remove photo (admin)"
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ShieldAlert className="h-4 w-4" />
      </button>
      <ModerationDialog
        open={open}
        onClose={() => setOpen(false)}
        itemLabel="photo"
        onConfirm={handleConfirm}
      />
    </>
  );
}
