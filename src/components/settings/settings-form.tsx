"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HouseYearEntry } from "@/lib/houses";
import { academicSpanLabel, seedHouseYearRows } from "@/lib/house-spans";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { InfoTooltip } from "@/components/common/info-tooltip";
import { LocationPicker, type PlaceSelection } from "@/components/common/location-picker";
import { HousePicker } from "@/components/common/house-picker";
import { YearInput } from "@/components/common/year-input";
import { AvatarCropDialog } from "./avatar-crop-dialog";
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
  updateUserPlaces,
} from "./actions";
import { saveOnboardingHouses } from "@/components/onboarding/actions";

interface SettingsUser {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  birdOverride: string | null;
  about: string | null;
  displayEmail: string | null;
  houses: string | null;
  workplace: string | null;
  jobTitle: string | null;
  phone: string | null;
  phones: string | null;
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
/* A school career is bounded: the guard below refuses to lay out more than
   this many years, so a half-typed "Year you left" (e.g. "9021") can never
   render thousands of rows while someone is mid-keystroke. */
const MAX_HOUSE_SPAN = 25;
const MAX_PHONES = 5;

interface LinkRow {
  key: number;
  label: string;
  url: string;
}
interface PhoneRow {
  key: number;
  number: string;
}

let rowKey = 0;

function parseLinkRows(raw: string | null): LinkRow[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && typeof e.label === "string" && typeof e.url === "string")
      .map((e) => ({ key: rowKey++, label: e.label, url: e.url }));
  } catch {
    return [];
  }
}

/** Stored as a JSON string[] in User.phones; the legacy single User.phone is
 *  the seed when phones has never been written (the server mirrors the first
 *  entry back into it on save, so old readers keep working). */
function parsePhoneRows(phones: string | null, legacyPhone: string | null): PhoneRow[] {
  try {
    const arr = phones ? JSON.parse(phones) : null;
    if (Array.isArray(arr) && arr.length > 0) {
      return arr
        .filter((n): n is string => typeof n === "string" && n.trim() !== "")
        .map((n) => ({ key: rowKey++, number: n }));
    }
  } catch {
    /* fall through to the legacy single value */
  }
  return legacyPhone ? [{ key: rowKey++, number: legacyPhone }] : [];
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

/** A four-digit year or null; the intermediate states YearInput allows
 *  ("2", "20", "202") read as null so nothing derives from them. */
function parsedYear(raw: string): number | null {
  return /^\d{4}$/.test(raw) ? Number(raw) : null;
}

/* ------------------------------------------------------------------ *
 *  ONE sheet (owner, 2026-07-30: "too many elements within other
 *  elements... too many organizational lines"). The previous layout was
 *  eight separate cards, each with its own border and double shadow -
 *  70 rounded surfaces down one page. Now every section lives inside a
 *  single 16px card: section labels are quiet in-sheet headers separated
 *  by whitespace (not borders), field rows keep one hairline BETWEEN
 *  rows (none after a section's last row), and the only other bordered
 *  box on the page is the Danger zone, which earns it.
 *  Radius ladder on this page: 16px sheet -> 12px inputs -> pills on
 *  buttons/chips. Nothing else.
 * ------------------------------------------------------------------ */

/**
 * One section = one CARD, with its label sitting outside and above it.
 *
 * Reverted on 2026-08-02 to the shape that shipped before c5d826c's "one
 * sheet" rewrite. That rewrite dropped the per-section card and ran every
 * group inside a single bordered container separated only by hairlines. The
 * owner rejected the result outright: "it ruined everything ... joined all of
 * these different elements when they were all separated and broken up. It was
 * better when it was broken up." A settings page is a list of unrelated
 * subjects (who you are, where you are, how you are reachable), and stacking
 * them into one object asks the eye to find boundaries that the surface is
 * actively hiding.
 *
 * The label is deliberately OUTSIDE the card, on the page: it names the card
 * rather than being its first row, which is what lets the card start with real
 * content instead of a heading.
 */
function SettingsSection({
  label,
  hint,
  children,
}: {
  label: string;
  /** kept for call-site compatibility; spacing is uniform between cards now */
  first?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h2>
      {hint && <p className="mb-2 px-1 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}
      <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="divide-y divide-border">{children}</div>
      </div>
    </section>
  );
}

/** One field, one row: the label in a fixed-width left column, the control
 *  RIGHT-ALIGNED against the card's trailing edge. `block` stacks the control
 *  full-width below the label instead (for a textarea, a repeater, a picker).
 *
 *  The right alignment is `sm:justify-end`, restored 2026-08-02. It was removed
 *  in c5d826c on the reasoning that it left dead space mid-row, and the owner
 *  rejected that too: "it's moved a bunch of things that were right aligned to
 *  the left. And it all looks really horrible." The dead space was the point.
 *  Two hard edges, labels flush left and values flush right, give the eye two
 *  columns to run down; ragged values pinned to a 168px label column give it
 *  neither. */
function SettingsRow({
  label,
  hint,
  htmlFor,
  block = false,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  block?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3.5 sm:gap-6",
        block ? "flex-col" : "flex-col sm:flex-row sm:items-center"
      )}
    >
      <div className={cn(block ? "" : "sm:w-[168px] sm:shrink-0")}>
        <Label htmlFor={htmlFor} className="text-[13.5px] font-medium text-foreground">
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{hint}</p>}
      </div>
      <div className={cn("min-w-0 flex-1", !block && "flex flex-wrap items-center gap-3 sm:justify-end")}>
        {children}
      </div>
    </div>
  );
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
  /* The file waiting in the crop dialog; null = dialog closed. */
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [about, setAbout] = useState(user.about ?? "");

  // Batch-first, same direct model as sign-up: the batch year is entered
  // directly, alongside the two plain years joined/left. batchType is worked
  // out server-side from yearLeft + batchYear via batchTypeFromLeaving.
  const [batchYear, setBatchYear] = useState(user.batchYear?.toString() ?? "");
  const [yearJoined, setYearJoined] = useState(user.yearJoined?.toString() ?? "");
  const [yearLeft, setYearLeft] = useState(user.yearLeft?.toString() ?? "");

  // Cities, houses, links and phones are array data with no native form-field
  // equivalent, so they live in their own state and are folded into the single
  // consolidated save below.
  const [places, setPlaces] = useState<PlaceSelection[]>(user.places);
  /* House PICKS keyed by year. The list of YEARS is not state at all - it is
     derived live from the "Year you joined/left" fields above (owner: "Remove
     the earlier year and later year. Let it just show all the years I was
     there."), so correcting a year up there immediately re-lays-out the rows
     down here. Saved picks for years outside the current range stay in this
     record (harmless) but are not rendered and not saved. */
  const [housePicks, setHousePicks] = useState<Record<number, string[]>>(() => {
    const picks: Record<number, string[]> = {};
    for (const row of seedHouseYearRows(user.houses, null, null)) {
      if (row.houses.length > 0) picks[row.year] = row.houses;
    }
    return picks;
  });
  const [linkRows, setLinkRows] = useState<LinkRow[]>(() => parseLinkRows(user.links));
  const [phoneRows, setPhoneRows] = useState<PhoneRow[]>(() =>
    parsePhoneRows(user.phones, user.phone)
  );
  // Which year's house panel is open. Held here (not inside HousePicker) so
  // committing one year can hand the run to the next.
  const [openHouseYear, setOpenHouseYear] = useState<number | null>(null);

  /* The years laid out in the Houses section, derived from the LIVE year
     fields (end-exclusive: joining 2014 and leaving 2021 is the academic
     years 2014-15 through 2020-21, matching seedHouseYearRows). Falls back
     to the years that already have saved picks when the range is absent or
     nonsensical, so existing data always stays visible and editable. */
  const houseYears = useMemo<number[]>(() => {
    const joined = parsedYear(yearJoined);
    const left = parsedYear(yearLeft);
    if (
      joined != null &&
      left != null &&
      joined >= MIN_HOUSE_YEAR &&
      left > joined &&
      left - joined <= MAX_HOUSE_SPAN
    ) {
      return Array.from({ length: left - joined }, (_, i) => joined + i);
    }
    return Object.keys(housePicks)
      .map(Number)
      .sort((a, b) => a - b);
  }, [yearJoined, yearLeft, housePicks]);

  function markDirty() {
    setDirty(true);
  }

  function updateHousePicks(year: number, houses: string[]) {
    setHousePicks((p) => ({ ...p, [year]: houses }));
    markDirty();
  }
  // Picking a house hands the run straight to the next year still needing one,
  // so a whole school career is one click per year with no dismiss in between.
  function advanceHouseYear(fromYear: number) {
    const next = houseYears.find((y) => y > fromYear && (housePicks[y] ?? []).length === 0);
    setOpenHouseYear(next ?? null);
  }

  function updateLinkRow(key: number, patch: Partial<LinkRow>) {
    setLinkRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    markDirty();
  }
  function updatePhoneRow(key: number, number: string) {
    setPhoneRows((rs) => rs.map((r) => (r.key === key ? { ...r, number } : r)));
    markDirty();
  }

  /* Upload a ready blob (the crop dialog's 512px webp output, or the raw file
     when the browser could not decode it and the server has to cope). */
  async function uploadAvatarBlob(payload: Blob | File) {
    setPhotoBusy(true);
    const fd = new FormData();
    fd.set("file", payload instanceof File ? payload : new File([payload], "avatar.webp", { type: "image/webp" }));
    const result = await updateAvatar(fd);
    setPhotoBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (result.error) return toast.error(result.error);
    setPhotoUrl(result.photoUrl ?? null);
    toast.success("Photo updated");
    router.refresh();
  }

  /* Picking a photo opens the crop dialog rather than uploading blind: the
     old path shipped the ORIGINAL bytes to a hard-coded centre crop, so an
     off-centre face was silently beheaded and a 6MB phone photo could die on
     Vercel's ~4.5MB serverless body cap. The dialog sends back a ~40KB
     512x512 webp instead. */
  function handlePhotoPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image");
    if (f.size > 15 * 1024 * 1024) return toast.error("Photo must be under 15MB");
    setCropFile(f);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);

    const cleanedLinks = linkRows
      .map((r) => ({ label: r.label.trim(), url: toHttpsUrl(r.url) }))
      .filter((r) => r.label && r.url);
    formData.set("links", JSON.stringify(cleanedLinks));

    const cleanedPhones = phoneRows.map((r) => r.number.trim()).filter(Boolean);
    formData.set("phones", JSON.stringify(cleanedPhones));

    // Only the years currently laid out are saved: shrinking your range
    // drops picks outside it, exactly what "show all the years I was there"
    // implies the source of truth is.
    const housePayload: HouseYearEntry[] = houseYears.flatMap((year) =>
      (housePicks[year] ?? []).map((house) => ({ year, house }))
    );

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
    setHousePicks(() => {
      const picks: Record<number, string[]> = {};
      for (const row of seedHouseYearRows(user.houses, null, null)) {
        if (row.houses.length > 0) picks[row.year] = row.houses;
      }
      return picks;
    });
    setLinkRows(parseLinkRows(user.links));
    setPhoneRows(parsePhoneRows(user.phones, user.phone));
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
      <form key={resetKey} onSubmit={handleSubmit} onChange={markDirty}>
        {/* Each section brings its own card (see SettingsSection). This is
            only the rhythm between them: space-y-7 is the section gap, wider
            than the space-y-6 the page uses between top-level blocks so a
            section reads as its own subject rather than another row. */}
        <div className="space-y-7">
          <SettingsSection label="You" first>
            <SettingsRow label="Your name" htmlFor="name">
              <Input id="name" name="name" defaultValue={user.name} required minLength={2} className="sm:max-w-[280px]" />
            </SettingsRow>

            <SettingsRow
              label="Profile photo"
              hint={photoUrl ? "Shows everywhere in place of your bird." : "Upload a photo, or keep your valley bird."}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoPick(e.target.files?.[0] ?? null)}
              />
              {/* md (64px), not sm (40px): this is the one control whose whole
                  job is answering "is this the right photo?" */}
              <BirdAvatar
                user={{
                  id: user.id,
                  name: user.name,
                  photoUrl,
                  birdOverride: user.birdOverride,
                }}
                size="md"
              />
              <Button type="button" variant="outline" size="sm" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
                {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {photoUrl ? "Change" : "Upload"}
              </Button>
              {photoUrl && (
                <Button type="button" variant="ghost" size="sm" disabled={photoBusy} className="text-muted-foreground hover:text-foreground" onClick={handlePhotoRemove}>
                  Remove
                </Button>
              )}
            </SettingsRow>
          </SettingsSection>

          <SettingsSection label="About">
            <SettingsRow
              label="About"
              hint="A few lines about who you are now. Not homework, just enough that a batchmate smiles when they land here."
              htmlFor="about"
              block
            >
              <div className="flex flex-wrap gap-2">
                {ABOUT_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setAbout((a) => (a ? `${a}\n\n${p} ` : `${p} `));
                      markDirty();
                    }}
                    // These prompt pills sit on bg-card, where the old
                    // hover:bg-accent measured +2.06 dL* and read as nothing.
                    // state-layer tints instead of swapping the fill, so the
                    // canopy border hint still has something to sit against.
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground transition-[colors,transform] duration-150 state-layer hover:border-canopy/40 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                className="mt-2.5"
              />
              <p className="mt-1.5 text-right text-[12px] tabular-nums text-muted-foreground">
                {about.length} / {ABOUT_MAX}
              </p>
            </SettingsRow>

            <SettingsRow label="Admission number" htmlFor="admissionNumber">
              <Input
                id="admissionNumber"
                name="admissionNumber"
                type="number"
                defaultValue={user.admissionNumber || ""}
                placeholder="e.g. 1234"
                min={0}
                max={10000}
                className="sm:max-w-[160px]"
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection label="Your batch">
            <SettingsRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  Which batch are you in?
                  <InfoTooltip label="What does batch mean?">{BATCH_EXPLANATION}</InfoTooltip>
                </span>
              }
              htmlFor="batchYear"
            >
              <YearInput
                id="batchYear"
                name="batchYear"
                placeholder="e.g. 2023"
                value={batchYear}
                onValueChange={setBatchYear}
                className="sm:max-w-[140px]"
              />
            </SettingsRow>
            <SettingsRow label="Year you joined" htmlFor="yearJoined">
              <YearInput id="yearJoined" name="yearJoined" placeholder="e.g. 2014" value={yearJoined} onValueChange={setYearJoined} className="sm:max-w-[140px]" />
            </SettingsRow>
            <SettingsRow label="Year you left" htmlFor="yearLeft">
              <YearInput id="yearLeft" name="yearLeft" placeholder="e.g. 2021" value={yearLeft} onValueChange={setYearLeft} className="sm:max-w-[140px]" />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection label="Work">
            <SettingsRow label="What you do" htmlFor="jobTitle">
              <Input id="jobTitle" name="jobTitle" defaultValue={user.jobTitle || ""} placeholder="e.g. Teacher" className="sm:max-w-[280px]" />
            </SettingsRow>
            <SettingsRow label="Where" htmlFor="workplace">
              <Input id="workplace" name="workplace" defaultValue={user.workplace || ""} placeholder="e.g. Tata Consultancy Services" className="sm:max-w-[280px]" />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection label="Contact">
            <SettingsRow label="Email shown on your profile" htmlFor="displayEmail">
              <Input id="displayEmail" name="displayEmail" type="email" defaultValue={user.displayEmail || ""} placeholder={user.email} className="sm:max-w-[280px]" />
            </SettingsRow>
            <SettingsRow
              label="Phone numbers"
              hint="Shown to signed-in members on your profile."
              block
            >
              <div className="space-y-2">
                {phoneRows.map((row) => (
                  <div key={row.key} className="flex items-center gap-2">
                    <Input
                      aria-label="Phone number"
                      type="tel"
                      inputMode="tel"
                      placeholder="+91 ..."
                      value={row.number}
                      onChange={(e) => updatePhoneRow(row.key, e.target.value)}
                      className="min-w-0 sm:max-w-[220px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove this number"
                      onClick={() => {
                        setPhoneRows((rs) => rs.filter((r) => r.key !== row.key));
                        markDirty();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {phoneRows.length < MAX_PHONES && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPhoneRows((rs) => [...rs, { key: rowKey++, number: "" }])}
                  >
                    <Plus className="h-4 w-4" />
                    {phoneRows.length === 0 ? "Add a number" : "Add another number"}
                  </Button>
                )}
              </div>
            </SettingsRow>
            <SettingsRow label="Instagram" htmlFor="instagram">
              <Input id="instagram" name="instagram" defaultValue={user.instagram || ""} placeholder="@handle" className="sm:max-w-[220px]" />
            </SettingsRow>
            <SettingsRow label="LinkedIn" htmlFor="linkedin">
              <Input id="linkedin" name="linkedin" defaultValue={user.linkedin || ""} placeholder="Profile URL" className="sm:max-w-[280px]" />
            </SettingsRow>
            <SettingsRow label="Facebook" htmlFor="facebook">
              <Input id="facebook" name="facebook" defaultValue={user.facebook || ""} placeholder="Profile URL" className="sm:max-w-[280px]" />
            </SettingsRow>
            <SettingsRow
              label="Other links"
              hint="Your blog, a project, anything else worth a link. Give each one a short label."
              block
            >
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
                  onClick={() => setLinkRows((rs) => [...rs, { key: rowKey++, label: "", url: "" }])}
                >
                  <Plus className="h-4 w-4" />
                  Add a link
                </Button>
              </div>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection label="Where you are">
            <SettingsRow
              label="Your cities"
              hint="Every place you call home. Add as many as you like; they all show equally on your profile."
              block
            >
              <LocationPicker
                mode="multi"
                value={places}
                onChange={(v) => {
                  setPlaces(v);
                  markDirty();
                }}
                aria-label="Your cities"
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            label="Houses"
            hint={
              houseYears.length > 0
                ? "One row per year you were here. Pick a house for each (or two, if you switched)."
                : "Fill in the years you joined and left, up in Your batch, and your years will be laid out here."
            }
          >
            {/* No hairlines, no year chips, no per-row remove, no add buttons:
                the rows ARE the years derived from the batch section above
                (owner: "Remove the earlier year and later year. Let it just
                show all the years I was there."). The year is plain quiet
                text; the answered house names read in ink inside the trigger.
                State colour is spent on nothing here - the one saturated
                moment in this flow is the picker panel's canopy check. */}
            {houseYears.length > 0 && (
              <div className="space-y-2 px-4 pb-1 pt-2">
                {houseYears.map((year) => (
                  <div key={year} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-[13px] font-semibold tabular-nums leading-tight text-muted-foreground">
                      {academicSpanLabel(year, year)}
                    </span>
                    <HousePicker
                      value={housePicks[year] ?? []}
                      onChange={(next) => updateHousePicks(year, next)}
                      ariaLabel={`House(s) for ${academicSpanLabel(year, year)}`}
                      yearLabel={academicSpanLabel(year, year)}
                      open={openHouseYear === year}
                      onOpenChange={(o) => setOpenHouseYear(o ? year : null)}
                      onPicked={() => advanceHouseYear(year)}
                    />
                  </div>
                ))}
              </div>
            )}
          </SettingsSection>
        </div>

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
              {/* 16px, matching the sheet it floats over (it used to be
                  rounded-2xl = 27.2px, ROUNDER than the cards under it,
                  inverting the ladder), with the shared elevated shadow. */}
              <div className="glass card-elevated flex w-full max-w-3xl items-center justify-between gap-4 rounded-[var(--radius)] border border-border px-5 py-3.5">
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

      {/* Danger zone -- the one place a second box is still earned: it is the
          only destructive action on the screen, and it deliberately reads as
          a separate, heavier thing than the sheet above it. */}
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

      <AvatarCropDialog
        file={cropFile}
        onConfirm={async (blob) => {
          setCropFile(null);
          await uploadAvatarBlob(blob);
        }}
        onCancel={() => {
          setCropFile(null);
          if (fileRef.current) fileRef.current.value = "";
        }}
        onDecodeError={(f) => {
          // The browser could not decode this file (HEIC etc.). Send the
          // original straight to the server, whose sharp pipeline either
          // handles it or answers with the friendly "export as JPG" message.
          setCropFile(null);
          void uploadAvatarBlob(f);
        }}
      />

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
