"use client";

import { useState } from "react";
import { shrinkForUpload } from "@/lib/image-downscale";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { speciesNameFor, resolveBirdOverride } from "@/components/common/bird-avatar-v2";
import { AttachImageDialog } from "@/components/common/attach-image-dialog";
import { AvatarCropDialog } from "@/components/settings/avatar-crop-dialog";
import { updateAvatar } from "@/components/settings/actions";
import type { OnboardingUser } from "../onboarding-flow";
import { isImageFile } from "@/lib/upload-shared";

/**
 * Step 4: Photo. Reuses the exact settings upload action (Sharp/WebP, R2)
 * rather than a second pipeline. If the person would rather not upload one,
 * "Proudly keep your bird" names their actual deterministic bird instead of
 * just showing the glyph, so the default reads as a real choice, not a
 * placeholder.
 *
 * And the same crop dialog the profile uses, for the same reason. `updateAvatar`
 * ends in a fixed `resize(512, 512, { fit: "cover", position: "centre" })`, so
 * whatever is not in the middle of the frame is cut off -- and this is the FIRST
 * photo a new member ever uploads, usually straight off a phone where the face
 * is rarely centred. B-030 fixed the SIZE half of this for onboarding
 * (shrinkForUpload) and left the framing half, so a step designed to make
 * somebody feel welcome could behead them (audit C-051).
 */
export function PhotoStep({
  user,
  onNext,
  onBack,
  onSkip,
}: {
  user: OnboardingUser;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(user.photoUrl);
  const [busy, setBusy] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  /** The picked file, waiting to be framed. The dialog is open while it is set. */
  const [cropFile, setCropFile] = useState<File | null>(null);
  const speciesName = speciesNameFor(user.id, resolveBirdOverride(user.id, user.birdOverride));

  async function upload(payload: Blob | File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set(
        "file",
        payload instanceof File ? payload : new File([payload], "avatar.webp", { type: "image/webp" })
      );
      const result = await callAction(() => updateAvatar(fd));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPhotoUrl(result.photoUrl ?? null);
      toast.success("Photo saved");
    } finally {
      // finally, not a trailing statement: a rejected upload used to leave
      // this control stuck spinning for the rest of onboarding (audit B-042).
      setBusy(false);
    }
  }

  function handlePick(file: File | null) {
    if (!file) return;
    if (!isImageFile(file)) {
      toast.error("Please choose an image");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Photo must be under 15MB");
      return;
    }
    // Frame it first, exactly as the profile does. The dialog hands back a
    // 512x512 WebP, which is both the crop and the shrink.
    setCropFile(file);
  }

  async function uploadUnframed(file: File) {
    /* The browser could not decode it (HEIC, mostly), so there is nothing to
       frame. Shrunk in the BROWSER before it goes anywhere: a normal phone
       photo is 5 to 12MB and Vercel rejects a request body over about 4.5MB at
       the platform, before the Server Action runs -- so the very first thing a
       new member does failed with a stuck spinner and no message at all (bug
       audit B-030). The server's sharp pipeline either handles the format or
       answers with the friendly "export as JPG" message. */
    setBusy(true);
    let ready;
    try {
      ready = await shrinkForUpload([file]);
    } finally {
      setBusy(false);
    }
    if (!ready.ok) {
      toast.error(ready.error);
      return;
    }
    await upload(ready.files[0]);
  }

  return (
    <div className="space-y-[var(--space-l)]">
      <div className="space-y-[var(--space-xxs)] text-center">
        <h2 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          Add a photo, or keep your bird
        </h2>
        <p className="mx-auto max-w-[38ch] text-[14px] leading-relaxed text-muted-foreground">
          Every member gets a valley bird by default. Upload a photo any
          time you like, from here or from settings.
        </p>
      </div>

      <div className="flex flex-col items-center gap-[var(--space-m)] rounded-2xl border border-border bg-card p-[var(--space-l)]">
        <AttachImageDialog
          open={attachOpen}
          onOpenChange={setAttachOpen}
          onFiles={(files) => handlePick(files[0] ?? null)}
          multiple={false}
          title="Add a photo"
        />
        <AvatarCropDialog
          file={cropFile}
          onConfirm={async (blob) => {
            setCropFile(null);
            await upload(blob);
          }}
          onCancel={() => setCropFile(null)}
          onDecodeError={(f) => {
            setCropFile(null);
            void uploadUnframed(f);
          }}
        />
        <BirdAvatar
          user={{
            id: user.id,
            name: user.name,
            photoUrl,
            avatarColor: user.avatarColor,
            birdOverride: user.birdOverride,
          }}
          size="lg"
        />
        {!photoUrl && (
          <p className="text-[13px] text-muted-foreground">
            You&apos;re a <span className="font-medium text-foreground">{speciesName}</span>.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => setAttachOpen(true)}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {photoUrl ? "Change photo" : "Upload a photo"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {/* One primary action. With a photo it simply continues; without one it
            keeps the charming "keep my bird" label (the upload button in the
            card above is the alternative), so there is never a confusing pair
            of buttons that do the same thing. */}
        <Button type="button" variant="primary" onClick={photoUrl ? onNext : onSkip} disabled={busy}>
          {photoUrl ? "Continue" : `Proudly keep my ${speciesName}`}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
