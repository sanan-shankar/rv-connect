"use client";

import { useState } from "react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { isImageFile } from "@/lib/upload-shared";
import { shrinkForUpload } from "@/lib/image-downscale";
import { removeAvatar, updateAvatar } from "@/components/settings/actions";

/* ------------------------------------------------------------------ *
 *  Picking, framing and sending a profile photograph.
 *
 *  Two surfaces do this -- the onboarding step and the profile letterhead --
 *  and they had written it out twice: the same size and type checks, the same
 *  AttachImageDialog into AvatarCropDialog pair, the same FormData, the same
 *  B-042 finally. They differed in one place that mattered and shouldn't
 *  have: onboarding shrank an undecodable file in the browser before sending
 *  it and the profile did not, so the same HEIC off the same phone worked
 *  during the wizard and died at Vercel's ~4.5MB body cap from the profile,
 *  with a stuck spinner and no message (bug audit B-030). One copy, one
 *  guard, both surfaces.
 *
 *  What stays with each caller is what genuinely differs: their dialogs' JSX,
 *  their words, and what they do once the photo is saved -- onboarding holds
 *  the new URL in state, the profile refreshes the route.
 * ------------------------------------------------------------------ */

/** Nobody's avatar is a 20MB RAW. Checked before anything is read. */
const MAX_PICK_BYTES = 15 * 1024 * 1024;

export function useAvatarUpload({
  onSaved,
  savedMessage = "Photo saved",
}: {
  /** Called with the stored URL once the server has it. */
  onSaved: (photoUrl: string | null) => void;
  savedMessage?: string;
}) {
  const [busy, setBusy] = useState(false);
  /** The picked file, waiting to be framed. The crop dialog is open while set. */
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);

  async function send(payload: Blob | File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set(
        "file",
        payload instanceof File
          ? payload
          : new File([payload], "avatar.webp", { type: "image/webp" })
      );
      const result = await callAction(() => updateAvatar(fd));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onSaved(result.photoUrl ?? null);
      toast.success(savedMessage);
    } finally {
      // finally, not a trailing statement: a rejected upload used to leave the
      // avatar control stuck spinning for the rest of the session (audit B-042).
      setBusy(false);
    }
  }

  /** A file straight off the picker. Validated, then handed to the framer. */
  function pick(file: File | null) {
    if (!file) return;
    if (!isImageFile(file)) {
      toast.error("Please choose an image");
      return;
    }
    if (file.size > MAX_PICK_BYTES) {
      toast.error("Photo must be under 15MB");
      return;
    }
    /* Framed first rather than uploaded blind: the old path shipped the
       ORIGINAL bytes to a hard-coded centre crop, so an off-centre face was
       silently beheaded. The dialog hands back a 512x512 WebP, which is both
       the crop and the shrink. */
    setCropFile(file);
  }

  /**
   * The browser could not decode it (HEIC, mostly), so there is nothing to
   * frame. Shrunk in the BROWSER before it goes anywhere, because a normal
   * phone photo is 5 to 12MB and Vercel rejects a request body over about
   * 4.5MB at the platform, before the Server Action runs (B-030). The
   * server's sharp pipeline then either handles the format or answers with
   * the friendly "export as JPG" message.
   */
  async function sendUndecodable(file: File) {
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
    await send(ready.files[0]);
  }

  async function remove() {
    setBusy(true);
    try {
      const result = await callAction(() => removeAvatar());
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onSaved(null);
      toast.success("Photo removed");
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    cropFile,
    setCropFile,
    attachOpen,
    setAttachOpen,
    pick,
    send,
    sendUndecodable,
    remove,
  };
}
