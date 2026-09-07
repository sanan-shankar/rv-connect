"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { speciesNameFor, resolveBirdOverride } from "@/components/common/bird-avatar-v2";
import { AttachImageDialog } from "@/components/common/attach-image-dialog";
import { AvatarCropDialog } from "@/components/settings/avatar-crop-dialog";
import { useAvatarUpload } from "@/components/settings/avatar-upload";
import type { OnboardingUser } from "../types";

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
  const { busy, cropFile, setCropFile, attachOpen, setAttachOpen, pick, send, sendUndecodable } =
    useAvatarUpload({ onSaved: setPhotoUrl });
  const speciesName = speciesNameFor(user.id, resolveBirdOverride(user.id, user.birdOverride));


  return (
    <div className="space-y-[var(--space-l)]">
      <div className="space-y-[var(--space-xxs)] text-center">
        <h2 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          Add a photo, or keep your bird
        </h2>
        <p className="mx-auto max-w-[38ch] text-[14px] leading-relaxed text-muted-foreground">
          Every member gets a valley bird by default. Upload a photo any
          time you like, from here or from your profile.
        </p>
      </div>

      <div className="flex flex-col items-center gap-[var(--space-m)] rounded-2xl border border-border bg-card p-[var(--space-l)]">
        <AttachImageDialog
          open={attachOpen}
          onOpenChange={setAttachOpen}
          onFiles={(files) => pick(files[0] ?? null)}
          multiple={false}
          title="Add a photo"
        />
        <AvatarCropDialog
          file={cropFile}
          onConfirm={async (blob) => {
            setCropFile(null);
            await send(blob);
          }}
          onCancel={() => setCropFile(null)}
          onDecodeError={(f) => {
            setCropFile(null);
            void sendUndecodable(f);
          }}
        />
        <BirdAvatar
          user={{
            id: user.id,
            name: user.name,
            photoUrl,
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
