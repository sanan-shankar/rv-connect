"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HouseYearEntry } from "@/lib/houses";
import {
  academicSpanLabel,
  missingYears,
  restoreAllYearRows,
  seedHouseYearRows,
  type HouseYearRow,
} from "@/lib/house-spans";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { InfoTooltip } from "@/components/common/info-tooltip";
import { LocationPicker, type PlaceSelection } from "@/components/common/location-picker";
import { HousePicker } from "@/components/common/house-picker";
import { YearInput } from "@/components/common/year-input";
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
import { toast } from "sonner";
import { SPRINGS } from "@/components/common/motion";
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
  facebook: string | null;
  links: string | null;
  batchYear: number | null;
  yearJoined: number | null;
  yearLeft: number | null;
  admissionNumber: number | null;
  places: { placeId: number | null; label: string; city: string; lat: number | null; lng: number | null }[];
}

const ABOUT_MAX = 4000;
const ABOUT_PROMPTS = ["What do you do now?", "A memory from the valley", "What brought you back?"];
const BATCH_EXPLANATION =
  "Your batch is the year your class finished 12th grade at Rishi Valley, even if you left earlier. Left after 10th in 2021? Your batch is still 2023.";
const MIN_HOUSE_YEAR = 1926;

interface LinkRow {
  key: number;
  label: string;
  url: string;
}

let linkKey = 0;

function parseLinkRows(raw: string | null): LinkRow[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && typeof e.label === "string" && typeof e.url === "string")
      .map((e) => ({ key: linkKey++, label: e.label, url: e.url }));
  } catch {
    return [];
  }
}

/** Forgiving https normaliser for the "Other links" repeater: upgrades a bare
 *  http:// or protocol-less entry rather than rejecting it outright. */
function toHttpsUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (v.startsWith("https://")) return v;
  if (v.startsWith("http://")) return `https://${v.slice(7)}`;
  return `https://${v}`;
}

export function SettingsForm({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [resetKey, setResetKey] = useState(0);
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

  // Cities (multi picker), houses (repeater) and links (repeater) are array
  // data with no native form-field equivalent, so they live in their own
  // state and are folded into the single consolidated save below.
  const [places, setPlaces] = useState<PlaceSelection[]>(user.places);
  const [houseRows, setHouseRows] = useState<HouseYearRow[]>(() =>
    seedHouseYearRows(user.houses, user.yearJoined, user.yearLeft)
  );
  const [linkRows, setLinkRows] = useState<LinkRow[]>(() => parseLinkRows(user.links));
  // Which year's house panel is open. Held here (not inside HousePicker) so
  // committing one year can hand the run to the next.
  const [openHouseYear, setOpenHouseYear] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const missingHouseYears = missingYears(houseRows, user.yearJoined, user.yearLeft);

  // One sticky save bar for the whole form: any change (native form field,
  // or one of the array reducers above) marks the form dirty, the bar
  // appears, and "Save changes" persists everything -- profile fields,
  // cities, and houses -- in one action. "Discard" restores every field
  // (controlled state directly, uncontrolled defaultValue fields via the
  // resetKey remount) to what was last saved.
  function markDirty() {
    setDirty(true);
  }

  function updateHouseRowHouses(year: number, houses: string[]) {
    setHouseRows((rs) => rs.map((r) => (r.year === year ? { ...r, houses } : r)));
    markDirty();
  }
  function removeHouseRow(year: number) {
    setHouseRows((rs) => rs.filter((r) => r.year !== year));
    markDirty();
  }
  // Picking a house hands the run straight to the next year still needing one,
  // so a whole school career is one click per year with no dismiss in between.
  // Skips years already filled in (someone correcting a single mid-career year
  // is not made to walk the rest of the list), and stops at the end rather
  // than wrapping around to the top.
  function advanceHouseYear(fromYear: number) {
    const next = [...houseRows]
      .sort((a, b) => a.year - b.year)
      .find((r) => r.year > fromYear && r.houses.length === 0);
    setOpenHouseYear(next ? next.year : null);
  }
  function restoreHouseYears() {
    setHouseRows((rs) => restoreAllYearRows(rs, user.yearJoined, user.yearLeft));
    markDirty();
  }
  // Anchor for "add a year without typing": whatever we know about when this
  // person was here, or last year as a fallback.
  const houseAnchorYear = user.yearJoined ?? user.yearLeft ?? currentYear - 1;
  function addEarlierHouseYear() {
    setHouseRows((rs) => {
      const year = (rs.length ? Math.min(...rs.map((r) => r.year)) : houseAnchorYear + 1) - 1;
      if (year < MIN_HOUSE_YEAR) return rs;
      return [{ year, houses: [] }, ...rs];
    });
    markDirty();
  }
  function addLaterHouseYear() {
    setHouseRows((rs) => {
      const year = (rs.length ? Math.max(...rs.map((r) => r.year)) : houseAnchorYear - 1) + 1;
      if (year > currentYear + 1) return rs;
      return [...rs, { year, houses: [] }];
    });
    markDirty();
  }

  function updateLinkRow(key: number, patch: Partial<LinkRow>) {
    setLinkRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    markDirty();
  }

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

    const cleanedLinks = linkRows
      .map((r) => ({ label: r.label.trim(), url: toHttpsUrl(r.url) }))
      .filter((r) => r.label && r.url);
    formData.set("links", JSON.stringify(cleanedLinks));

    const housePayload: HouseYearEntry[] = houseRows
      .filter((r) => r.year >= MIN_HOUSE_YEAR)
      .flatMap((r) => r.houses.map((house) => ({ year: r.year, house })));

    const placesPayload = places.map((p) => ({
      placeId: p.placeId,
      label: p.label,
      city: p.city,
      lat: p.lat,
      lng: p.lng,
    }));

    const [profileResult, placesResult, housesResult] = await Promise.all([
      updateUserProfile(formData),
      updateUserPlaces(placesPayload),
      saveOnboardingHouses(housePayload),
    ]);

    setSaving(false);

    const error =
      profileResult.error || placesResult.error || ("error" in housesResult ? housesResult.error : undefined);
    if (error) return toast.error(error);

    toast.success("Saved");
    setDirty(false);
    router.refresh();
  }

  function handleDiscard() {
    setAbout(user.about ?? "");
    setBatchYear(user.batchYear?.toString() ?? "");
    setYearJoined(user.yearJoined?.toString() ?? "");
    setYearLeft(user.yearLeft?.toString() ?? "");
    setPlaces(user.places);
    setHouseRows(seedHouseYearRows(user.houses, user.yearJoined, user.yearLeft));
    setLinkRows(parseLinkRows(user.links));
    setDirty(false);
    setResetKey((k) => k + 1); // remounts the form, resetting uncontrolled defaultValue fields
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

  return (
    // Extra bottom clearance while the sticky save bar is showing, so it
    // never covers the Danger zone's delete button when scrolled to the end.
    <div className={cn("space-y-6", dirty && "pb-20")}>
      <form
        key={resetKey}
        onSubmit={handleSubmit}
        onChange={markDirty}
        className="space-y-6 pb-4"
      >
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
                  onClick={() => {
                    setAbout((a) => (a ? `${a}\n\n${p} ` : `${p} `));
                    markDirty();
                  }}
                  className="rounded-full border border-border bg-mist/60 px-3 py-1.5 text-[12px] font-semibold text-foreground transition-[colors,transform] duration-150 hover:border-canopy/40 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
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
              <div className="flex items-center gap-1.5">
                <Label htmlFor="batchYear">Which batch are you in?</Label>
                <InfoTooltip label="What does batch mean?">{BATCH_EXPLANATION}</InfoTooltip>
              </div>
              <YearInput
                id="batchYear"
                name="batchYear"
                placeholder="e.g. 2023"
                value={batchYear}
                onValueChange={setBatchYear}
                className="max-w-[160px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearJoined">Year you joined</Label>
                <YearInput id="yearJoined" name="yearJoined" placeholder="e.g. 2014" value={yearJoined} onValueChange={setYearJoined} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearLeft">Year you left</Label>
                <YearInput id="yearLeft" name="yearLeft" placeholder="e.g. 2021" value={yearLeft} onValueChange={setYearLeft} />
              </div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input id="linkedin" name="linkedin" defaultValue={user.linkedin || ""} placeholder="Profile URL" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" name="facebook" defaultValue={user.facebook || ""} placeholder="Profile URL" />
              </div>
            </div>

            <div className="space-y-2 border-t border-dashed border-border pt-4">
              <Label>Other links</Label>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Your blog, a project, anything else worth a link. Give each one a short label.
              </p>
              <div className="space-y-2">
                {linkRows.map((row) => (
                  <div key={row.key} className="flex items-center gap-2">
                    <Input
                      aria-label="Link label"
                      placeholder="e.g. My blog"
                      value={row.label}
                      onChange={(e) => updateLinkRow(row.key, { label: e.target.value })}
                      className="w-2/5 min-w-0 shrink-0"
                    />
                    <Input
                      aria-label="Link URL"
                      // Deliberately type="text", not type="url": the browser's
                      // native url validity check requires a scheme up front
                      // and silently blocks submission (no visible error) the
                      // moment someone types "example.com" without "https://"
                      // -- exactly the case toHttpsUrl() exists to forgive.
                      type="text"
                      inputMode="url"
                      placeholder="https://..."
                      value={row.url}
                      onChange={(e) => updateLinkRow(row.key, { url: e.target.value })}
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove this link"
                      onClick={() => {
                        setLinkRows((rs) => rs.filter((r) => r.key !== row.key));
                        markDirty();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLinkRows((rs) => [...rs, { key: linkKey++, label: "", url: "" }])}
                >
                  <Plus className="h-4 w-4" />
                  Add a link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Where you are</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Every place you call home. Add as many as you like; they all show equally on your profile.
            </p>
            <LocationPicker
              mode="multi"
              value={places}
              onChange={(v) => {
                setPlaces(v);
                markDirty();
              }}
              aria-label="Your cities"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Houses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admissionNumber">Admission number</Label>
              <Input id="admissionNumber" name="admissionNumber" type="number" defaultValue={user.admissionNumber || ""} placeholder="e.g. 1234" min={0} max={10000} className="max-w-[200px]" />
            </div>

            <div className="space-y-2 border-t border-dashed border-border pt-4">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {user.yearJoined != null && user.yearLeft != null && houseRows.length > 0
                  ? "We've laid out your years below. Pick a house for each; add or remove years if we got the range wrong."
                  : "Which house, which year. Add an academic year, then pick the house (or two, if you switched)."}
              </p>
              <div className="space-y-2">
                {houseRows.map((row) => (
                  <div key={row.year} className="flex items-center gap-2 rounded-xl bg-mist/40 p-2.5">
                    <div className="flex h-10 w-[68px] shrink-0 items-center justify-center rounded-lg bg-canopy/10 px-1 text-center">
                      <span className="text-[13px] font-bold tabular-nums leading-tight text-canopy">
                        {academicSpanLabel(row.year, row.year)}
                      </span>
                    </div>
                    <HousePicker
                      value={row.houses}
                      onChange={(next) => updateHouseRowHouses(row.year, next)}
                      ariaLabel={`House(s) for ${academicSpanLabel(row.year, row.year)}`}
                      yearLabel={academicSpanLabel(row.year, row.year)}
                      open={openHouseYear === row.year}
                      onOpenChange={(o) => setOpenHouseYear(o ? row.year : null)}
                      onPicked={() => advanceHouseYear(row.year)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${academicSpanLabel(row.year, row.year)}`}
                      onClick={() => removeHouseRow(row.year)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addEarlierHouseYear}>
                    <Plus className="h-4 w-4" />
                    Earlier year
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addLaterHouseYear}>
                    <Plus className="h-4 w-4" />
                    Later year
                  </Button>
                  {missingHouseYears.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={restoreHouseYears}>
                      <Plus className="h-4 w-4" />
                      Add all my years ({missingHouseYears.length})
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* One sticky save bar for the whole form: appears the moment
            anything above changes, saves it all in a single action. */}
        <AnimatePresence>
          {dirty && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={SPRINGS.gentle}
              // Sits BELOW floating popups (--z-floating: 30), not above them.
              // The bar appears the moment anything is edited, so on a phone a
              // z-40 bar covered the bottom of the city/house suggestion lists
              // and swallowed taps on the last few rows. It only has to clear
              // page content, and a dropdown opened on top of it should win.
              className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]"
            >
              <div className="glass flex w-full max-w-3xl items-center justify-between gap-4 rounded-2xl border border-border px-5 py-3.5 shadow-[0_18px_38px_-16px_rgba(35,36,30,0.35)]">
                <p className="text-[13.5px] font-semibold text-foreground">You have unsaved changes</p>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={handleDiscard}>
                    Discard
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

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
