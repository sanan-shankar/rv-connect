"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { normalizeHouse } from "@/lib/houses";
import { HOUSES, type HouseYearEntry } from "@/lib/houses";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { LocationPicker, type PlaceSelection } from "@/components/common/location-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  updateUserProfile,
  deleteAccount,
  updateAvatar,
  removeAvatar,
  updateCover,
  removeCover,
  updateUserPlaces,
} from "./actions";
import { saveOnboardingHouses } from "@/components/onboarding/actions";

interface SettingsUser {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  coverPhoto: string | null;
  avatarColor: string | null;
  birdOverride: string | null;
  about: string | null;
  displayEmail: string | null;
  houses: string | null;
  workplace: string | null;
  jobTitle: string | null;
  phone: string | null;
  instagram: string | null;
  linkedin: string | null;
  batchYear: number | null;
  yearJoined: number | null;
  yearLeft: number | null;
  admissionNumber: number | null;
  places: { placeId: number | null; label: string; city: string; lat: number | null; lng: number | null }[];
}

const ABOUT_MAX = 4000;
const ABOUT_PROMPTS = ["What do you do now?", "A memory from the valley", "What brought you back?"];
const OTHER_HOUSE = "__other__";

interface HouseRow {
  key: number;
  year: string;
  house: string; // one of HOUSES, or OTHER_HOUSE
  other: string; // free-text when house === OTHER_HOUSE
}

let houseKey = 0;

function parseHouseRows(raw: string | null): HouseRow[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && e.house && Number.isFinite(Number(e.year)))
      .map((e) => {
        const known = (HOUSES as readonly string[]).includes(e.house);
        return {
          key: houseKey++,
          year: String(e.year),
          house: known ? e.house : OTHER_HOUSE,
          other: known ? "" : String(e.house),
        };
      });
  } catch {
    return [];
  }
}

export function SettingsForm({ user }: { user: SettingsUser }) {
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

  const [about, setAbout] = useState(user.about ?? "");

  // Batch-first, same direct model as sign-up: the batch year is entered
  // directly, alongside the two plain years joined/left. No grade-joined
  // input and no derive-from-three-facts panel; batchType is worked out
  // server-side from yearLeft + batchYear via batchTypeFromLeaving.
  const [batchYear, setBatchYear] = useState(user.batchYear?.toString() ?? "");
  const [yearJoined, setYearJoined] = useState(user.yearJoined?.toString() ?? "");
  const [yearLeft, setYearLeft] = useState(user.yearLeft?.toString() ?? "");

  // Cities (multi picker) and houses (repeater) are array data with their own
  // save buttons, since they don't fit a plain form field.
  const [places, setPlaces] = useState<PlaceSelection[]>(user.places);
  const [placesBusy, setPlacesBusy] = useState(false);
  const [houseRows, setHouseRows] = useState<HouseRow[]>(() => parseHouseRows(user.houses));
  const [housesBusy, setHousesBusy] = useState(false);

  const currentYear = new Date().getFullYear();

  async function handlePhotoPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image");
    if (f.size > 15 * 1024 * 1024) return toast.error("Photo must be under 15MB");
    setPhotoBusy(true);
    const fd = new FormData();
    fd.set("file", f);
    const result = await updateAvatar(fd);
    setPhotoBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (result.error) return toast.error(result.error);
    setPhotoUrl(result.photoUrl ?? null);
    toast.success("Photo updated");
    router.refresh();
  }

  async function handlePhotoRemove() {
    setPhotoBusy(true);
    const result = await removeAvatar();
    setPhotoBusy(false);
    if (result.error) return toast.error(result.error);
    setPhotoUrl(null);
    toast.success("Photo removed");
    router.refresh();
  }

  async function handleCoverPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image");
    if (f.size > 15 * 1024 * 1024) return toast.error("Photo must be under 15MB");
    setCoverBusy(true);
    const fd = new FormData();
    fd.set("file", f);
    const result = await updateCover(fd);
    setCoverBusy(false);
    if (coverRef.current) coverRef.current.value = "";
    if (result.error) return toast.error(result.error);
    setCoverPhoto(result.coverPhoto ?? null);
    toast.success("Header picture updated");
    router.refresh();
  }

  async function handleCoverRemove() {
    setCoverBusy(true);
    const result = await removeCover();
    setCoverBusy(false);
    if (result.error) return toast.error(result.error);
    setCoverPhoto(null);
    toast.success("Header picture removed");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateUserProfile(formData);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Saved. Looking good.");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleSavePlaces() {
    setPlacesBusy(true);
    const result = await updateUserPlaces(
      places.map((p) => ({ placeId: p.placeId, label: p.label, city: p.city, lat: p.lat, lng: p.lng }))
    );
    setPlacesBusy(false);
    if (result.error) return toast.error(result.error);
    toast.success("Cities saved");
    router.refresh();
  }

  async function handleSaveHouses() {
    const payload: HouseYearEntry[] = houseRows
      .map((r) => {
        const house = r.house === OTHER_HOUSE ? normalizeHouse(r.other) : r.house;
        return { year: Number(r.year), house };
      })
      .filter((r) => Number.isFinite(r.year) && r.year > 0 && r.house);
    setHousesBusy(true);
    const result = await saveOnboardingHouses(payload);
    setHousesBusy(false);
    if ("error" in result) return toast.error(result.error);
    toast.success(payload.length ? "Houses saved" : "Houses cleared");
    router.refresh();
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

  function updateHouseRow(key: number, patch: Partial<HouseRow>) {
    setHouseRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-6">
      {/* ---- You + About + Batch + Work + Contact (one save) ---- */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">You</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" defaultValue={user.name} required minLength={2} />
            </div>

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
                    birdOverride: user.birdOverride,
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
                    <Button type="button" variant="outline" size="sm" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
                      {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      {photoUrl ? "Change photo" : "Upload photo"}
                    </Button>
                    {photoUrl && (
                      <Button type="button" variant="ghost" size="sm" disabled={photoBusy} className="text-muted-foreground hover:text-foreground" onClick={handlePhotoRemove}>
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
                  style={{ backgroundImage: `url(${coverPhoto || "/images/collection/v1.webp"})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {coverPhoto ? "Shown across the top of your profile." : "A valley photo shows until you add your own."}
                  </p>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={coverBusy} onClick={() => coverRef.current?.click()}>
                      {coverBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      {coverPhoto ? "Change header" : "Upload header"}
                    </Button>
                    {coverPhoto && (
                      <Button type="button" variant="ghost" size="sm" disabled={coverBusy} className="text-muted-foreground hover:text-foreground" onClick={handleCoverRemove}>
                        Remove header
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              A few lines about who you are now. Not homework, just enough that a batchmate smiles when they land here.
            </p>
            <div className="flex flex-wrap gap-2">
              {ABOUT_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAbout((a) => (a ? `${a}\n\n${p} ` : `${p} `))}
                  className="rounded-full border border-border bg-mist/60 px-3 py-1.5 text-[12px] font-semibold text-foreground transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
                >
                  {p}
                </button>
              ))}
            </div>
            <Textarea
              id="about"
              name="about"
              value={about}
              onChange={(e) => setAbout(e.target.value.slice(0, ABOUT_MAX))}
              rows={5}
              placeholder="I studied here from 2014, was in Neem and Palm, and now I build small software in Bengaluru..."
            />
            <p className="text-right text-[12px] tabular-nums text-muted-foreground">
              {about.length} / {ABOUT_MAX}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Your batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchYear">Which batch are you in?</Label>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Your batch is the year your class finished 12th grade at Rishi Valley, even if you
                left earlier. Left after 10th in 2021? Your batch is still 2023.
              </p>
              <Input
                id="batchYear"
                name="batchYear"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 2023"
                value={batchYear}
                onChange={(e) => setBatchYear(e.target.value)}
                min={1926}
                max={currentYear + 7}
                className="max-w-[160px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearJoined">Year you joined</Label>
                <Input id="yearJoined" name="yearJoined" type="number" inputMode="numeric" placeholder="e.g. 2014" value={yearJoined} onChange={(e) => setYearJoined(e.target.value)} min={1926} max={currentYear} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearLeft">Year you left</Label>
                <Input id="yearLeft" name="yearLeft" type="number" inputMode="numeric" placeholder="e.g. 2021" value={yearLeft} onChange={(e) => setYearLeft(e.target.value)} min={1926} max={currentYear + 1} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissionNumber">Admission number</Label>
              <Input id="admissionNumber" name="admissionNumber" type="number" defaultValue={user.admissionNumber || ""} placeholder="e.g. 1234" min={0} max={10000} className="max-w-[200px]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">What you do</Label>
                <Input id="jobTitle" name="jobTitle" defaultValue={user.jobTitle || ""} placeholder="e.g. Teacher" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workplace">Where</Label>
                <Input id="workplace" name="workplace" defaultValue={user.workplace || ""} placeholder="e.g. Tata Consultancy Services" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayEmail">Email shown on your profile</Label>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Leave blank to use your sign-in email ({user.email}). Editing this never changes how you log in.
              </p>
              <Input id="displayEmail" name="displayEmail" type="email" defaultValue={user.displayEmail || ""} placeholder={user.email} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={user.phone || ""} placeholder="+91 ..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" name="instagram" defaultValue={user.instagram || ""} placeholder="@handle" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input id="linkedin" name="linkedin" defaultValue={user.linkedin || ""} placeholder="Profile URL" />
            </div>
          </CardContent>
        </Card>

        <div>
          <Button type="submit" disabled={saving} variant="primary">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>

      {/* ---- Where you are (own save) ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Where you are</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Every place you call home. Add as many as you like; they all show equally on your profile.
          </p>
          <LocationPicker mode="multi" value={places} onChange={setPlaces} aria-label="Your cities" />
          <Button type="button" variant="primary" size="sm" onClick={handleSavePlaces} disabled={placesBusy}>
            {placesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save cities
          </Button>
        </CardContent>
      </Card>

      {/* ---- Houses (own save) ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Houses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Which house, which year. Houses change year to year for a lot of us, so add a row per year you remember.
          </p>
          <div className="space-y-2">
            {houseRows.map((row) => (
              <div key={row.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Year"
                    type="number"
                    inputMode="numeric"
                    placeholder="Year"
                    value={row.year}
                    onChange={(e) => updateHouseRow(row.key, { year: e.target.value })}
                    min={1926}
                    max={currentYear + 1}
                    className="w-24 shrink-0"
                  />
                  <Select value={row.house || undefined} onValueChange={(v) => updateHouseRow(row.key, { house: v ?? "" })}>
                    <SelectTrigger className="w-full flex-1" aria-label="House">
                      <SelectValue placeholder="Pick a house" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUSES.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                      <SelectItem value={OTHER_HOUSE}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove this year" onClick={() => setHouseRows((rs) => rs.filter((r) => r.key !== row.key))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {row.house === OTHER_HOUSE && (
                  <Input
                    aria-label="House name"
                    placeholder="House name"
                    value={row.other}
                    onChange={(e) => updateHouseRow(row.key, { other: e.target.value })}
                    className="w-full"
                  />
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setHouseRows((rs) => [...rs, { key: houseKey++, year: "", house: "", other: "" }])}>
              <Plus className="h-4 w-4" />
              Add a year
            </Button>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={handleSaveHouses} disabled={housesBusy}>
            {housesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save houses
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="font-heading text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button variant="outline" className="mt-3 text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your posts, comments, and data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Yes, delete my account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
