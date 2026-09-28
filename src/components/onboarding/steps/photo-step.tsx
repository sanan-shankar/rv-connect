"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speciesNameFor, resolveBirdOverride } from "@/components/common/bird-avatar-v2";
import { AttachImageDialog } from "@/components/common/attach-image-dialog";
import { AvatarCropDialog } from "@/components/settings/avatar-crop-dialog";
import { useAvatarUpload } from "@/components/settings/avatar-upload";
import type { OnboardingUser } from "../types";
import { StepActions, StepHead, StepNext, YouCard } from "../step-kit";

/**
 * Step 4: Photo. Reuses the exact settings upload action (Sharp/WebP, R2)
 * rather than a second pipeline. The line under the title names their actual
 * deterministic bird ("You're a Verditer Flycatcher") instead of just showing
 * the glyph, so keeping it reads as a real choice, not a placeholder. That is
 * the step's one warm line; the button that keeps it just says so ("Keep the
 * bird"), where it used to read "Proudly keep my Verditer Flycatcher".
 *
 * One canopy action at a time: Upload a photo while there is none, Continue
 * once there is. The Directory card shows the photo the moment it lands.
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
  onSaved,
  onNext,
  onSkip,
}: {
  user: OnboardingUser;
  onSaved: (patch: Partial<OnboardingUser>) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { photoUrl } = user;
  const { busy, cropFile, setCropFile, attachOpen, setAttachOpen, pick, send, sendUndecodable } =
    useAvatarUpload({ onSaved: (url) => onSaved({ photoUrl: url }) });
  const speciesName = speciesNameFor(user.id, resolveBirdOverride(user.id, user.birdOverride));

  return (
    <>
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
      <StepHead
        title="Add a photo"
        line={
          photoUrl ? (
            "It shows beside your name everywhere on the site."
          ) : (
            <>
              Or keep your bird. You&apos;re a{" "}
              <span className="font-medium text-foreground">{speciesName}</span>.
            </>
          )
        }
      />
      <div className="mt-[var(--space-m)]">
        <YouCard user={user} avatar="md" />
      </div>
      <StepActions
        secondary={
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={busy}
            onClick={photoUrl ? () => setAttachOpen(true) : onSkip}
          >
            {busy && photoUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {photoUrl ? "Change photo" : "Keep the bird"}
          </Button>
        }
      >
        {photoUrl ? (
          <StepNext type="button" busy={busy} onClick={onNext}>
            Continue
          </StepNext>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={busy}
            onClick={() => setAttachOpen(true)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Upload a photo
          </Button>
        )}
      </StepActions>
    </>
  );
}
