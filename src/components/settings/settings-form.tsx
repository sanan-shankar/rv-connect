"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, Loader2 } from "lucide-react";
import { SPRINGS } from "@/components/common/motion";
import { computeBatchFromSchooling } from "@/lib/utils";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  updateUserProfile,
  deleteAccount,
  updateAvatar,
  removeAvatar,
  updateCover,
  removeCover,
} from "./actions";

interface User {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  coverPhoto: string | null;
  avatarColor: string | null;
  bio: string | null;
  currentCity: string | null;
  secondaryCity: string | null;
  workplace: string | null;
  jobTitle: string | null;
  phone: string | null;
  instagram: string | null;
  linkedin: string | null;
  batchYear: number | null;
  yearJoined: number | null;
  yearLeft: number | null;
  gradeJoined: number | null;
  admissionNumber: number | null;
}

export function SettingsForm({ user }: { user: User }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(user.photoUrl);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(user.coverPhoto);
  const [coverBusy, setCoverBusy] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  // The three plain schooling facts that place someone in a batch (same three
  // fields the sign-up form collects). Kept controlled so the batch can be
  // previewed live as they're corrected, matching signup's live preview.
  const [yearJoined, setYearJoined] = useState(user.yearJoined?.toString() ?? "");
  const [yearLeft, setYearLeft] = useState(user.yearLeft?.toString() ?? "");
  const [gradeJoined, setGradeJoined] = useState(user.gradeJoined?.toString() ?? "");

  const batch = useMemo(() => {
    if (!yearJoined || !yearLeft || !gradeJoined) return null;
    return computeBatchFromSchooling(
      Number(yearJoined),
      Number(yearLeft),
      Number(gradeJoined)
    );
  }, [yearJoined, yearLeft, gradeJoined]);

  async function handlePhotoPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("Photo must be under 15MB");
      return;
    }
    setPhotoBusy(true);
    const fd = new FormData();
    fd.set("file", f);
    const result = await updateAvatar(fd);
    setPhotoBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setPhotoUrl(result.photoUrl ?? null);
    toast.success("Photo updated");
    router.refresh();
  }

  async function handlePhotoRemove() {
    setPhotoBusy(true);
    const result = await removeAvatar();
    setPhotoBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setPhotoUrl(null);
    toast.success("Photo removed");
    router.refresh();
  }

  async function handleCoverPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("Photo must be under 15MB");
      return;
    }
    setCoverBusy(true);
    const fd = new FormData();
    fd.set("file", f);
    const result = await updateCover(fd);
    setCoverBusy(false);
    if (coverRef.current) coverRef.current.value = "";
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setCoverPhoto(result.coverPhoto ?? null);
    toast.success("Header picture updated");
    router.refresh();
  }

  async function handleCoverRemove() {
    setCoverBusy(true);
    const result = await removeCover();
    setCoverBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setCoverPhoto(null);
    toast.success("Header picture removed");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateUserProfile(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteAccount();
    if (result.error) {
      toast.error(result.error);
      setDeleting(false);
    } else {
      signOut({ callbackUrl: "/" });
    }
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Profile photo</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoPick(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-4 rounded-[var(--radius)] border border-border bg-paper/50 p-4">
                <BirdAvatar
                  user={{
                    id: user.id,
                    name: user.name,
                    photoUrl,
                    avatarColor: user.avatarColor,
                  }}
                  size="lg"
                />
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">
                    {photoUrl
                      ? "Your photo shows everywhere in place of your bird."
                      : "Upload a photo, or keep your valley bird."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={photoBusy}
                      onClick={() => fileRef.current?.click()}
                    >
                      {photoBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      {photoUrl ? "Change photo" : "Upload photo"}
                    </Button>
                    {photoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={photoBusy}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={handlePhotoRemove}
                      >
                        Remove photo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Header picture</Label>
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCoverPick(e.target.files?.[0] ?? null)}
              />
              <div className="space-y-3 rounded-[var(--radius)] border border-border bg-paper/50 p-4">
                <div
                  className="relative h-28 overflow-hidden rounded-xl border border-border bg-mist bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${coverPhoto || "/images/landing.jpeg"})`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {coverPhoto
                      ? "Shown across the top of your profile."
                      : "A default valley banner shows until you add your own."}
                  </p>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={coverBusy}
                      onClick={() => coverRef.current?.click()}
                    >
                      {coverBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      {coverPhoto ? "Change header" : "Upload header"}
                    </Button>
                    {coverPhoto && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={coverBusy}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={handleCoverRemove}
                      >
                        Remove header
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={user.bio || ""}
                maxLength={1000}
                rows={3}
                placeholder="A few words about yourself..."
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label>Schooling</Label>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Your batch is worked out from these three facts, even if you
                  left before 12th. Correct them here if your batch looks wrong.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearJoined">Year joined</Label>
                  <Input
                    id="yearJoined"
                    name="yearJoined"
                    type="number"
                    inputMode="numeric"
                    placeholder="2014"
                    value={yearJoined}
                    onChange={(e) => setYearJoined(e.target.value)}
                    min={1926}
                    max={currentYear}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearLeft">Year left</Label>
                  <Input
                    id="yearLeft"
                    name="yearLeft"
                    type="number"
                    inputMode="numeric"
                    placeholder="2021"
                    value={yearLeft}
                    onChange={(e) => setYearLeft(e.target.value)}
                    min={1926}
                    max={currentYear + 1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gradeJoined">Grade joined</Label>
                  <Input
                    id="gradeJoined"
                    name="gradeJoined"
                    type="number"
                    inputMode="numeric"
                    placeholder="4"
                    value={gradeJoined}
                    onChange={(e) => setGradeJoined(e.target.value)}
                    min={1}
                    max={12}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {batch && (
                  <motion.div
                    key={batch.ok ? `ok-${batch.batchYear}` : `err-${batch.error}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={SPRINGS.snappy}
                  >
                    {batch.ok ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-canopy/25 bg-canopy/10 px-3.5 py-2.5">
                        <span className="text-[13px] text-muted-foreground">
                          Your batch
                        </span>
                        <span className="font-heading text-[15px] font-semibold text-canopy">
                          Batch of {batch.batchYear}
                        </span>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-cinnamon/30 bg-cinnamon/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-cinnamon">
                        {batch.error}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissionNumber">Admission Number</Label>
              <Input
                id="admissionNumber"
                name="admissionNumber"
                type="number"
                defaultValue={user.admissionNumber || ""}
                placeholder="e.g. 1234"
                min={0}
                max={10000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentCity">City</Label>
                <Input
                  id="currentCity"
                  name="currentCity"
                  defaultValue={user.currentCity || ""}
                  placeholder="e.g. Bangalore"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryCity">Also in</Label>
                <Input
                  id="secondaryCity"
                  name="secondaryCity"
                  defaultValue={user.secondaryCity || ""}
                  placeholder="e.g. Chennai (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workplace">Company / Organisation</Label>
                <Input
                  id="workplace"
                  name="workplace"
                  defaultValue={user.workplace || ""}
                  placeholder="e.g. Tata Consultancy Services"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  defaultValue={user.jobTitle || ""}
                  placeholder="e.g. Teacher"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={user.phone || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  name="instagram"
                  defaultValue={user.instagram || ""}
                  placeholder="@handle"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                name="linkedin"
                defaultValue={user.linkedin || ""}
                placeholder="Profile URL"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              variant="primary"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="font-heading text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          <Button
            variant="outline"
            className="mt-3 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your posts,
              comments, and data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Yes, delete my account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
