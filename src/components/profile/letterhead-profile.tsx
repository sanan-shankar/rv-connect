"use client";

/* ------------------------------------------------------------------ *
 *  The profile, as a piece of the member's own stationery.
 *
 *  Shipped 2026-07-30 from the Letterhead II concept (still browsable at
 *  /lab/profiles), replacing the Dossier-derived header + folder-tab
 *  shell. The concept file is the design record; this is the same layout
 *  against real `User` data. Keep them in step, or retire the concept.
 *
 *  THE RULES THIS LAYOUT KEEPS, and why (the owner's review, 2026-07-30):
 *
 *  - The sheet's padding is EQUAL on all four sides, so the name's
 *    distance from the top is its distance from the left.
 *  - The colophon is the mark plus a bare admission number, and the name
 *    sits exactly 8px under it. The verified leaf sits on the name's
 *    BASELINE, not above its shoulder.
 *  - One action, in line with the name: Edit profile on your own page,
 *    Get in touch on anyone else's, both at the app's default 40px
 *    button height and vertically centred on the name's line box by
 *    calc rather than by eye.
 *  - Three facts, no sub-lines: batch, the valley years, and every city
 *    as one equal comma series. No primary/secondary city.
 *  - The bird perches on the sheet's top-right edge and does not move.
 *    Upload a photo and the perch is replaced by a circle on the sheet's
 *    LEFT edge whose diameter runs from the top of the mark to the
 *    bottom of the name, measured off the DOM so it holds when a long
 *    name wraps.
 *  - The one engraved rule gets equal air above and below and is drawn
 *    only when it has a body under it to separate. A sparse profile ends
 *    after the facts, so absence never reads as a gap someone forgot to
 *    fill.
 *  - The writing below is the feed's own PostCard standing free on the
 *    page. Nothing wraps it: a bordered card inside a bordered sheet is
 *    the box-in-a-box the design system rules out.
 *
 *  Vertical rhythm is four golden-ratio steps and nothing between them:
 *      8px   colophon -> name        (one lockup)
 *      6px   name -> occupation      (title/subtitle)
 *     10px   section label -> body   (label owns its body)
 *     26px   block -> block          (peer sections)
 *     42px   sheet -> the writing    (different objects)
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { Camera, Check, Pencil, X } from "lucide-react";
import { m, AnimatePresence, useAnimationControls } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { Button } from "@/components/ui/button";
import type { PlaceSelection } from "@/components/common/location-picker";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { AdmissionStamp } from "@/components/profile/admission-stamp";
import { HouseTrail } from "@/components/profile/houses-chain";
import { buildRows, rowsToPayload, type ContactRow } from "@/lib/contact-rows";
import {
  PenBlock,
  PenSlot,
  PenValue,
  SaveMark,
  useAutoSave,
} from "@/components/profile/pen";
import { ProfileAuthorFeed } from "@/components/profile/profile-author-feed";
import type { PostData } from "@/components/posts/post-card";
import { SavedPostsFeed } from "@/components/profile/saved-posts-feed";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SPRINGS, EASE_OUT_SMOOTH, FadeRise } from "@/components/common/motion";
import { birdFor, speciesForMember } from "@/lib/avatar";
import { resolveBirdOverride, speciesNameFor } from "@/components/common/bird-avatar-v2";
import { SegmentedPills } from "@/components/common/segmented-pills";
import { updateUserPlaces, requestAccountDeletion } from "@/components/settings/actions";
import { Input } from "@/components/ui/input";
import { useAvatarUpload } from "@/components/settings/avatar-upload";
import { callAction } from "@/lib/call-action";
import {
  updateProfileField,
  updateContactMethods,
  type ProfileField,
} from "@/components/profile/profile-actions";
import { saveOnboardingHouses } from "@/components/onboarding/actions";
import { signOut } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FULL_NAME_MAX, cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";
import type { HouseYearEntry } from "@/lib/houses";
import type { HouseSpan } from "@/lib/house-spans";

/* ------------------------------------------------------------------ *
 *  The pen's machinery, fetched only by the one person who can use it.
 *
 *  This module is one `"use client"` file, so until now its whole import
 *  subtree shipped to every viewer -- and a long tail of it is reachable
 *  only when `draft` is present, which is only ever on your OWN profile.
 *  A stranger's sheet downloaded the GeoNames typeahead, the house
 *  picker with its popover and bottom sheet, the contact-row editor and
 *  both photo dialogs in order to render none of them. Measured on a
 *  production build: 1,730 KB of JavaScript for a sheet of text.
 *
 *  Split at the leaves rather than by extracting an "edit half", because
 *  the editable and read-only branches in here render byte-identical
 *  boxes on purpose ("Byte-for-byte the read-only lockup below, with the
 *  number swapped for a field") and a year of owner-tuned geometry lives
 *  in those pairings. Every one of them stays in this file; only the five
 *  self-contained editors leave, and each already renders behind a gate.
 *
 *  `ssr: false` throughout: none of this is on a stranger's server-rendered
 *  sheet either, and the owner's copy is preloaded on mount (see the effect
 *  below) so pressing Edit never waits on a network.
 * ------------------------------------------------------------------ */
const LocationPicker = dynamic(
  () => import("@/components/common/location-picker").then((m) => m.LocationPicker),
  { ssr: false }
);
/* The one of the five that keeps its server render. The other four are only
   ever reachable from a click -- an open popover, an open dialog, the pen
   turned on -- so their HTML is never in the first response anyway. The house
   chain is different: it is on your own sheet AT REST, so `ssr: false` here
   took it out of the first paint and popped it back in two frames later. */
const HouseChainEditor = dynamic(() =>
  import("@/components/profile/house-chain-editor").then((m) => m.HouseChainEditor)
);
const ContactsEditor = dynamic(
  () => import("@/components/profile/contacts-editor").then((m) => m.ContactsEditor),
  { ssr: false }
);
const AttachImageDialog = dynamic(
  () => import("@/components/common/attach-image-dialog").then((m) => m.AttachImageDialog),
  { ssr: false }
);
const AvatarCropDialog = dynamic(
  () => import("@/components/settings/avatar-crop-dialog").then((m) => m.AvatarCropDialog),
  { ssr: false }
);

/* ------------------------------------------------------------------ *
 *  Everything the sheet needs in order to be typed into.
 *
 *  Present only on your OWN profile; a stranger's sheet never receives
 *  it and renders exactly as it always did. Raw values, not the display
 *  strings the read-only sheet takes, because the moment a field is
 *  editable the display string has to be rebuilt from what you typed.
 * ------------------------------------------------------------------ */
export interface ProfileDraft {
  /** Opens with the pen already out. Nothing sets it now that /settings is
   *  gone, but ?edit=1 still works and is how a link can hand somebody a
   *  editable sheet. */
  startEditing: boolean;
  name: string;
  about: string;
  jobTitle: string;
  workplace: string;
  batchYear: string;
  yearJoined: string;
  yearLeft: string;
  /** The teacher tenure pair; empty strings on an alumnus draft. */
  taughtFrom: string;
  taughtUntil: string;
  /** Teacher subjects comma list; empty on an alumnus draft. */
  subjects: string;
  admissionNumber: string;
  /** "dark" or anything else. Not a profile field, but its tile lives under
   *  the contact rows now that there is no settings page to hold it. */
  theme: string | null;
  places: PlaceSelection[];
  houses: HouseYearEntry[];
  contacts: {
    displayEmail: string | null;
    /** false = the member removed the email row and wants none shown (B-050) */
    showEmail: boolean;
    email: string;
    phones: string[];
    instagram: string | null;
    linkedin: string | null;
    facebook: string | null;
    links: { label: string; url: string }[];
  };
}

/* A faint grain so the sheet reads as paper, not a flat fill. */
const PAPER_GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

/* ------------------------------------------------------------------ *
 *  THE COLOPHON: the mark and the admission number, as one lockup.
 *
 *  The number is BIGGER than it was (owner, 2026-08-02: "kind of really
 *  tiny when it doesn't have to be"), but it is NOT sat on the hills'
 *  ground line. A later pass moved the row to `items-end` and dropped
 *  the digits until their baseline met the silhouette's lowest ink; the
 *  owner rejected that outright (2026-08-03): "the admission number is
 *  now bottom aligned to the logo. I don't want that ... maybe something
 *  like the Rishi Valley in the sidebar with the logo, it's not bottom
 *  aligned, it's a bit above that ... let's revert that decision."
 *
 *  So this matches the reference he named. The app's own Wordmark
 *  (peaks-mark.tsx) centres its two boxes and then nudges the text down
 *  a couple of px, because a text box carries ascender and descender air
 *  that centring alone leaves looking high. Same device here, same
 *  reason: `items-center` plus a small paint-only drop. The number ends
 *  up optically centred on the mark and a little above its base, which
 *  is the state the owner remembers and asked for back.
 *
 *  The mark stays at 16 (== the row height). THE NUMERALS MOVED FROM 13px
 *  TO 16px on 2026-09-08, because the number was losing to the hill. The
 *  test is the ratio the sidebar lockup is built on (see the Wordmark
 *  comment in peaks-mark.tsx): cap height over the mark's INK height, which
 *  wants to land between 0.70 and 0.85. At 13px it was 0.56, well under,
 *  which is why the owner could feel something wrong without being able to
 *  name it -- "something needs to change I can't point my finger at the
 *  problem". At 16px it is 0.69.
 *
 *  TRACKING IS 0.12em, AND THE em VALUE DELIBERATELY DIFFERS FROM THE REST
 *  OF THE SHEET. It used to be 0.16em, matching BATCH / IN THE VALLEY /
 *  CITIES / ABOUT / HOUSES, with a comment saying that kept ONE caps
 *  tracking value on the sheet. That was the right goal reached by the
 *  wrong measure: letter-spacing in `em` scales with font size, so equal em
 *  is only equal space when the sizes match. Those labels are 11px and 12px
 *  and carry 1.76px and 1.92px of space. At 16px, 0.16em is 2.56px -- 45%
 *  airier than anything else here, which is why it had to move at all.
 *
 *  0.14em is 2.24px. The arithmetic argued for 0.12em, which is 1.92px and
 *  therefore identical to ABOUT and HOUSES; the owner looked at both and
 *  took 0.14em anyway (2026-09-08). Recorded rather than quietly corrected,
 *  because the two are half a pixel apart and his eye is the tiebreak: the
 *  digits want reading as an accession number, and the tighter value starts
 *  reading as a quantity. Do not "fix" this back to 0.12em on the strength
 *  of the paragraph above.
 *
 *  THE GAP WENT 6px -> 9px in the same pass, also on his eye, and walked
 *  there in three goes: "increase the gap a good amount", then "just a bit"
 *  (10px), then "a teeny bit closer" (9px). It is a step toward the sidebar
 *  lockup's proportion without arriving: gap over the mark's ink height is
 *  0.65 here against the Wordmark's 0.83. Past 12px the number stops
 *  belonging to the hill and becomes a second object on the row, which is
 *  the ceiling this sits under rather than on. 9px is off the Tailwind
 *  scale on purpose -- gap-2 is 8 and gap-2.5 is 10, and both were looked
 *  at beside it.
 *
 *  THE THREE NEAR-MISSES, kept because the owner asked for them by name as
 *  the ones to reach for if this ever wants changing (2026-09-08): 16px at
 *  0.12em, and 15px at either 0.12em or 0.14em (both ratio 0.64, still
 *  slightly under the band). Weight stays 700 and the mark stays 16 in all
 *  four -- he ruled both out of scope.
 * ------------------------------------------------------------------ */
const COLOPHON = {
  /** px. Equal to `--lh-colophon`, so the mark fills the row exactly. */
  markSize: 16,
  /**
   * px, downward, paint-only so it can never reflow the row. Centring two
   * boxes puts the digits high, because a text box carries ascender and
   * descender air that four numerals do not fill. 1px lands the digits'
   * cap band 0.4px below the mark's geometric centre -- the same rule the
   * Wordmark follows, and still correct at 16px, so it did not move when
   * the numerals grew. Not the mark's centre of MASS, which sits 66.6% down
   * (a hill is bottom-heavy): aligning there drops the digits far enough
   * that the peaks loom, which is the bottom-aligned version the owner
   * rejected on 2026-08-03.
   */
  numberNudge: 1,
} as const;

/**
 * The identity lockup's geometry, declared once and then derived from. The
 * photo circle and the action pill both have to agree with the name's type,
 * so both are calc()ed off these instead of carrying magic numbers.
 */
const IDENTITY_VARS = {
  "--lh-colophon": "1rem", // the colophon row's fixed height: 16px
  "--lh-gap": "0.5rem", // colophon -> name: 8px
  // cqi, not vw (changed 2026-08-18, owner: "it wraps, then unwraps and then
  // wraps"). The old 7vw sized the name against the VIEWPORT while the column
  // it sits in steps discretely (the sidebar collapse alone hands it ~220px
  // at once), so narrowing the window wrapped, unwrapped and re-wrapped the
  // name. Sized against the sheet itself (the @container on the padded
  // wrapper), characters-per-line is CONSTANT while the clamp is between its
  // bounds: a name that fits keeps fitting through the whole scaling band,
  // and wrapping happens once, at the floor, instead of flickering. 6.1cqi
  // reaches the 2.6rem cap at a 682px content box, just inside the 688px
  // the full-width sheet has behind its sm:p-10, so at rest the name
  // renders exactly the size it always did.
  "--lh-name": "clamp(1.9rem, 6.1cqi, 2.6rem)",
  "--lh-head": "calc(var(--lh-colophon) + var(--lh-gap) + var(--lh-name) * 1.05)",
  // Centre a 40px (h-10) pill on the name's first line.
  "--lh-cta-top":
    "calc(var(--lh-colophon) + var(--lh-gap) + (var(--lh-name) * 1.05 - 2.5rem) / 2)",
} as CSSProperties;

type TabKey = "all" | "posts" | "letters" | "photos" | "saved";

export interface LetterheadProfileUser {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  verifyState: string | null;
  accountType: string | null;
  batchType: string | null;
  batchYear: number | null;
}

export function LetterheadProfile({
  user,
  firstName,
  isOwnProfile,
  occupation,
  admissionNumber,
  about,
  cities,
  rvYears,
  batchLabel,
  subjects,
  houseSpans,
  contactMethods,
  contactsLock = null,
  vcard,
  postCount,
  letterCount,
  photoCount,
  savedCount,
  photosNode,
  initialAuthorPosts,
  initialAuthorCursor,
  initialAuthorHasMore,
  adminNode,
  flagNode,
  installNode,
  draft,
  deviceTheme,
}: {
  user: LetterheadProfileUser;
  firstName: string;
  isOwnProfile: boolean;
  occupation: string | null;
  admissionNumber: number | null;
  about: string | null;
  cities: string[];
  rvYears: string | null;
  batchLabel: string | null;
  /** Teacher subjects comma list; null for alumni. */
  subjects?: string | null;
  houseSpans: HouseSpan[];
  contactMethods: ContactMethod[];
  /** Which gate is between the VIEWER and these contact details, if any:
   *  "email" = confirm your address (Stage 1), "member" = wait on profile
   *  verification (Stage 2). Decides which card the locked pill opens. */
  contactsLock?: "email" | "member" | null;
  vcard: string;
  postCount: number;
  letterCount: number;
  photoCount: number;
  savedCount: number;
  photosNode: ReactNode;
  /** The All tab's first page, fetched on the server. See ProfileAuthorFeed. */
  initialAuthorPosts?: PostData[];
  initialAuthorCursor?: string | null;
  initialAuthorHasMore?: boolean;
  adminNode: ReactNode;
  flagNode: ReactNode;
  /** The "add it to your phone" tile, or null. A node rather than a boolean
   *  because who is allowed to see it is the page's business, not the
   *  sheet's: today that is admins on their own profile only (owner,
   *  2026-08-22: "for now only show it for admins"), and opening it up is a
   *  one-line change where that decision is written down rather than here. */
  installNode?: ReactNode;
  /** Only ever passed on your own profile. Its presence is what makes the
   *  sheet typeable at all. */
  draft?: ProfileDraft;
  /** The theme THIS device is rendering, read from the rv-theme cookie by the
   *  page. Not `draft.theme`, which is the cross-device record; see Low 95 at
   *  the dark-mode tile below. */
  deviceTheme?: "light" | "dark" | null;
}) {
  const router = useRouter();
  const hasPhoto = Boolean(user.photoUrl);

  /* ---------------------------------------------------------------- *
   *  The pen.
   *
   *  These hooks run whether or not `draft` is here, because hooks
   *  cannot be conditional; when it is absent they hold empty values
   *  nothing ever reads. `editable` is the switch, and `live` is
   *  editable AND currently turned on.
   * ---------------------------------------------------------------- */
  const editable = Boolean(draft);
  // Teachers (current and former) carry tenure and subjects where an alumnus
  // carries batch, admission number and houses; every fork below hangs off
  // this one flag.
  const isTeacher = user.accountType === "teacher" || user.accountType === "ex_teacher";
  const [live, setLive] = useState(draft?.startEditing ?? false);
  const [form, setForm] = useState(() => ({
    name: draft?.name ?? "",
    about: draft?.about ?? "",
    jobTitle: draft?.jobTitle ?? "",
    workplace: draft?.workplace ?? "",
    batchYear: draft?.batchYear ?? "",
    yearJoined: draft?.yearJoined ?? "",
    yearLeft: draft?.yearLeft ?? "",
    taughtFrom: draft?.taughtFrom ?? "",
    taughtUntil: draft?.taughtUntil ?? "",
    subjects: draft?.subjects ?? "",
    admissionNumber: draft?.admissionNumber ?? "",
  }));
  const [places, setPlaces] = useState<PlaceSelection[]>(draft?.places ?? []);
  const [houses, setHouses] = useState<HouseYearEntry[]>(draft?.houses ?? []);
  const [contactRows, setContactRows] = useState<ContactRow[]>(() =>
    draft ? buildRows(draft.contacts, formatPhoneDisplay) : []
  );
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /* The photograph. It used to be a row on the settings form; that form is
     gone, and this is the only place left that is yours to change, so the
     upload comes here rather than nowhere. Same crop dialog, same two
     actions, same 15MB gate. */
  const {
    busy: photoBusy,
    cropFile,
    setCropFile,
    attachOpen,
    setAttachOpen,
    pick: handlePhotoPick,
    send: uploadAvatarBlob,
    sendUndecodable: uploadUndecodableAvatar,
    remove: handlePhotoRemove,
  } = useAvatarUpload({ onSaved: () => router.refresh(), savedMessage: "Photo updated" });
  const { state: saveState, message: saveMessage, run } = useAutoSave();

  /* The value last written, per field, so a blur that changed nothing does
     not fire a round trip. Typing into a field and tabbing straight out of it
     is the commonest thing anyone does on this page. */
  const saved = useRef<Record<string, string>>({});

  /* The five deferred editors above are fetched the moment we know the sheet
     is yours -- after first paint, in parallel, off the critical path -- so
     the pen is already in hand by the time anyone presses Edit. Without this
     the split would trade a stranger's 300 KB for an owner's visible beat,
     which is the one thing the finding said would change its mind. A
     stranger's sheet never runs this, and never fetches any of it. */
  useEffect(() => {
    if (!editable) return;
    void import("@/components/profile/house-chain-editor");
    void import("@/components/profile/contacts-editor");
    void import("@/components/common/location-picker");
    void import("@/components/common/attach-image-dialog");
    void import("@/components/settings/avatar-crop-dialog");
  }, [editable]);

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function commitField(key: ProfileField) {
    const value = form[key];
    if (saved.current[key] === value) return;
    void run(async () => {
      const result = await updateProfileField(key, value);
      /* Stamped on SUCCESS, not before the call (audit M68). Marking it saved
         up front meant a failed save could never be retried the natural way:
         the banner said "That did not save", the member clicked back into the
         field and blurred again, and this function returned on its first line
         because the ref already claimed that text was on file. The only escape
         was to type something different. A field that reports a failure has to
         accept the retry that failure asks for. */
      if (!result.error) {
        saved.current[key] = value;
        router.refresh();
      }
      return result;
    });
  }

  function commitPlaces(next: PlaceSelection[]) {
    setPlaces(next);
    void run(async () => {
      const result = await updateUserPlaces(
        next.map((p) => ({ placeId: p.placeId, label: p.label, city: p.city, lat: p.lat, lng: p.lng }))
      );
      /* Refreshed either way (audit C-045). `updateUserPlaces` is a
         wipe-and-recreate, so a refusal means the OLD list is what is on file
         while the screen is showing the new one -- the one state where leaving
         the local copy up tells a lie. A failed save reconverges with the
         database rather than sitting on a list nobody has. */
      router.refresh();
      return result;
    });
  }

  function commitHouses(next: HouseYearEntry[]) {
    setHouses(next);
    void run(async () => {
      const result = await saveOnboardingHouses(next);
      if (!("error" in result)) router.refresh();
      return "error" in result ? { error: result.error } : undefined;
    });
  }

  // `next` when the caller has it (the remove button, which computed the list
  // it wants saved), the current state otherwise (a field blur, where the state
  // is already what is on screen). Reading `contactRows` unconditionally was
  // the stale-closure bug: removal saved the PRE-removal list (B-049).
  function commitContacts(next?: ContactRow[]) {
    const rows = next ?? contactRows;
    void run(async () => {
      const result = await updateContactMethods(rowsToPayload(rows));
      if (!result.error) router.refresh();
      return result;
    });
  }

  /* Editing, About comes from what is on screen right now, so `showAbout`
     below never blinks the section away mid-keystroke. */
  const aboutText = editable ? form.about : (about?.trim() ?? "");

  /* Three facts, no sub-lines, in the owner's order.
     Editable, every one of them is present whether or not it has a value,
     because a fact that appears the moment you type into it would be a row
     arriving mid-transition, which is exactly the resizing this is avoiding. */
  const liveCities = editable ? places.map((p) => p.city) : cities;
  /* "Subject" for one, "Subjects" for more, the same rule the City/Cities
     fact beside it follows. Counted off the comma list because that is how
     subjects are stored, and blanks are dropped so a trailing comma mid-typing
     does not pluralise a single subject. */
  const subjectCount = (raw: string) => raw.split(",").filter((s) => s.trim()).length;
  const facts: { label: string; value: ReactNode; wide?: boolean; pen?: boolean }[] = [];

  if (editable) {
    if (isTeacher) {
      facts.push({
        label: subjectCount(form.subjects) > 1 ? "Subjects" : "Subject",
        pen: true,
        // Wide for the same reason Cities is: a comma list is the kind of
        // fact that runs long, and truncating someone's second subject to
        // fit a column is a ranking nobody chose.
        wide: true,
        value: (
          <PenValue
            value={form.subjects}
            onChange={(v) => setField("subjects", v)}
            onCommit={() => commitField("subjects")}
            editing={live}
            placeholder="Physics, Theatre"
            ariaLabel={
              user.accountType === "teacher" ? "Subjects you teach" : "Subjects you taught"
            }
            delay={0.1}
            maxLength={200}
          />
        ),
      });
    } else {
      facts.push({
        label: "Batch",
        pen: true,
        value: (
          <PenValue
            value={form.batchYear}
            onChange={(v) => setField("batchYear", digits(v, 4))}
            onCommit={() => commitField("batchYear")}
            editing={live}
            placeholder="0000"
            ariaLabel="Which batch you are in"
            delay={0.1}
            className="tabular-nums"
            inputMode="numeric"
          />
        ),
      });
    }
    facts.push({
      label: "In the valley",
      pen: true,
      value: (
        <span className="inline-flex items-center">
          <PenValue
            value={isTeacher ? form.taughtFrom : form.yearJoined}
            onChange={(v) => setField(isTeacher ? "taughtFrom" : "yearJoined", digits(v, 4))}
            onCommit={() => commitField(isTeacher ? "taughtFrom" : "yearJoined")}
            editing={live}
            placeholder="0000"
            ariaLabel={isTeacher ? "Year you started teaching" : "Year you joined"}
            delay={0.14}
            className="tabular-nums"
            inputMode="numeric"
          />
          {/* An en dash with no spaces, which is exactly what rvYearsLabel
              prints on the read-only sheet. The first version wrote
              "2014 to 2023" and pushed the fact 30px wider. */}
          <span>&ndash;</span>
          <PenValue
            value={isTeacher ? form.taughtUntil : form.yearLeft}
            onChange={(v) => setField(isTeacher ? "taughtUntil" : "yearLeft", digits(v, 4))}
            onCommit={() => commitField(isTeacher ? "taughtUntil" : "yearLeft")}
            editing={live}
            // "now", not "0000": for a teacher the empty slot is a statement
            // (still at the school, the sheet reads "to present"), and the
            // placeholder is where that is said. Typing the year they finish
            // is the whole of "I'm done teaching" — the byline flips to
            // Former teacher on its own, and clearing it flips it back.
            placeholder={isTeacher ? "now" : "0000"}
            restText={isTeacher ? "present" : undefined}
            ariaLabel={
              isTeacher ? "Year you stopped teaching, blank if you still do" : "Year you left"
            }
            delay={0.18}
            className="tabular-nums"
            inputMode="numeric"
          />
        </span>
      ),
    });
    facts.push({
      label: liveCities.length > 1 ? "Cities" : "City",
      wide: true,
      pen: true,
      /* The one fact whose editor cannot be an input: adding a city is a
         search. So the VALUE stays exactly the text it is at rest and becomes
         a button that opens the picker in a popover. The cell never changes
         size, which is what keeps the facts row from reflowing when the pen
         comes out (owner: "the desktop version seems to put cities on the next
         line, I don't know how we'll transition from same line to next line"). */
      value: (
        <CitiesPen
          live={live}
          open={citiesOpen}
          onOpenChange={setCitiesOpen}
          places={places}
          onChange={commitPlaces}
        />
      ),
    });
  } else {
    if (batchLabel) facts.push({ label: "Batch", value: batchLabel });
    if (isTeacher && subjects)
      facts.push({
        label: subjectCount(subjects) > 1 ? "Subjects" : "Subject",
        wide: true,
        value: subjects,
      });
    if (rvYears) facts.push({ label: "In the valley", value: rvYears });
    if (cities.length > 0) {
      facts.push({
        label: cities.length > 1 ? "Cities" : "City",
        // Wide on the 2-column phone grid: a comma series is the one fact that
        // can run long, and truncating someone's third city to fit a column is
        // the ranking this design exists to remove.
        wide: true,
        value: cities.join(", "),
      });
    }
  }

  /* About shows for a stranger only when there is something to read. On your
     own profile the empty state is a prompt, which is worth the space. */
  const showAbout = Boolean(aboutText) || isOwnProfile;
  /* The stamp: pressed on demand, held a moment, faded away. */
  const [stamp, setStamp] = useState(0);
  const stampTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function fireStamp() {
    setStamp((k) => k + 1);
    if (stampTimer.current) clearTimeout(stampTimer.current);
    stampTimer.current = setTimeout(() => setStamp(0), 1700);
  }
  useEffect(
    () => () => {
      if (stampTimer.current) clearTimeout(stampTimer.current);
    },
    []
  );

  /* The photo circle's diameter is "the top of the mark to the bottom of the
     name", taken from the DOM rather than assumed. The calc above is the
     first-paint value and is exact for a one-line name; this keeps the promise
     when a long name wraps. The loop settles because a wider circle can only
     push the name to MORE lines, never back to fewer. */
  const lockupRef = useRef<HTMLDivElement>(null);
  const [diameter, setDiameter] = useState<number | null>(null);
  useEffect(() => {
    const el = lockupRef.current;
    if (!hasPhoto || !el) return;
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      setDiameter((prev) => (prev !== null && Math.abs(prev - h) < 0.5 ? prev : h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasPhoto]);
  const circle = diameter ? `${diameter}px` : "var(--lh-head)";

  /* The page's one action. On your own profile that is Edit profile, at the
     same 40px height and canopy fill as every other primary CTA in the app
     (the old header set it at "sm", which read as a secondary control on the
     page it belongs to). Matches the app's Button-inside-Link pattern. */
  const action = editable ? (
    /* One button in one place, its label swapped. Not two buttons crossfading:
       the pill must not move or resize when the pen comes out, and a
       fixed-width morph would lie about how long each word is. The width does
       change between "Edit profile" and "Done", but only once, on a press the
       reader made, which is the one moment a control is allowed to move. */
    /* The mark sits on whichever side of the button is NOT that button's
       anchor, which is a different side per breakpoint -- hence the reverse.

       "Saving" appearing is 34px of new width (measured), and a flex row grows
       away from whichever edge is pinned. On phones this row is a block at the
       foot of the sheet, so its LEFT edge is fixed and the mark has to trail
       the button. On desktop it is a shrink-0 cell at the end of the header's
       flex row, so its RIGHT edge is fixed and the same order pushed the
       button 34px left the instant a field saved (owner, 2026-08-22: "when I
       make an edit on profiles the done button moves while saving. it can just
       save to the left of it on desktop and to the right on mobile"). Reversed
       there, the button's right edge is the row's and the mark grows leftward
       into the name's empty column.

       DOM order stays button-first for the reason it was put first: `gap-3`
       sits BETWEEN flex children whether or not one of them renders anything,
       and at rest (state "idle") SaveMark's AnimatePresence draws nothing but
       the gap still counted, pushing the button 12px right of every other left
       edge on the sheet (owner, same day: "this button isn't left aligned
       properly" -- measured, 57px against their 45px, exactly one gap-3).
       flex-row-reverse only repaints the order on the breakpoint where the
       left edge is nobody's anchor. */
    <div className="flex items-center gap-3 sm:flex-row-reverse">
      <Button
        variant={live ? "primary" : "default"}
        /* No min-width. "Done" is narrower than "Edit profile" and that is
           allowed to be true: the name beside it is sized to its own text, so
           the column growing by 13px moves nothing anyone can see. A
           min-width here made the RESTING pill 13px wider than it has always
           been, which is a change nobody asked for. */
        className="rounded-full"
        onClick={() => setLive((v) => !v)}
      >
        {live ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        {live ? "Done" : "Edit profile"}
      </Button>
      <SaveMark state={saveState} message={saveMessage} />
    </div>
  ) : contactsLock ? (
    // The viewer is below the contacts tier, so this person's details were
    // never sent to the browser (see profile/[id]/page.tsx). The control
    // still appears, because a missing button reads as "they shared nothing"
    // and this is a different fact with a different fix.
    <GetInTouch
      name={user.name}
      methods={[]}
      vcard={vcard}
      showSave={false}
      size="default"
      lock={contactsLock}
    />
  ) : contactMethods.length > 0 ? (
    <GetInTouch name={user.name} methods={contactMethods} vcard={vcard} showSave={false} size="default" />
  ) : null;

  return (
    /* Perch clearance. The bird hangs 48px above the sheet's top edge. This
       reserve used to be 16px and leaned on the shell's gutter for the rest,
       which held only at exactly the desktop gutter: the 28px mid-band gutter
       shaved the crest by 4px, and any future gutter change re-clipped the
       bird (owner, 2026-08-18: "even the freaking bird is cut off"). 20px
       covers the worst real case on its own (28px gutter + 20 = 48), so the
       bird's head no longer depends on what the page around it does. */
    <div className="pt-5">
      {/* Not clipped, so the perched bird can overlap the sheet's own edge. */}
      <div className="relative" style={IDENTITY_VARS}>
        {!hasPhoto && (
          <PerchedBird user={user} live={live} onPick={() => setAttachOpen(true)} />
        )}

        <div
          className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card"
          style={{
            boxShadow:
              "0 1px 2px rgba(35,36,30,0.05), 0 24px 48px -32px rgba(35,36,30,0.55), 0 46px 96px -55px color-mix(in srgb, var(--color-cinnamon) 26%, transparent)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
            style={{ backgroundImage: `url("${PAPER_GRAIN}")` }}
          />
          <div
            className="pointer-events-none absolute -top-16 right-14 h-56 w-56 rounded-full opacity-60"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-canopy) 14%, transparent), transparent 70%)",
            }}
          />

          <AnimatePresence>
            {stamp > 0 && admissionNumber && (
              <m.div
                key={stamp}
                exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeOut" } }}
                className="pointer-events-none absolute left-1/2 top-[44px] z-20 -translate-x-1/2"
              >
                <AdmissionStamp number={admissionNumber} />
              </m.div>
            )}
          </AnimatePresence>

          {/* The original padding scale (tightened to a flat p-6 on
              2026-08-18, then reverted the same day: "I said I liked it
              before. I don't anymore"). @container makes this box the
              measure the name's cqi type reads. */}
          <div className="@container relative p-6 sm:p-10">
            <FadeRise>
              <header>
                <div className="flex items-start gap-[var(--space-m)]">
                  {hasPhoto && (
                    /* Same circle, same size, in flow. With the pen out it
                       becomes the control: press it to change the photo, and
                       the small x beside it takes it off and gives you your
                       bird back. Both badges are absolutely positioned, so
                       nothing about the lockup moves. */
                    <span
                      className="group/photo relative block shrink-0 rounded-full"
                      style={{ width: circle, height: circle }}
                    >
                      {live && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAttachOpen(true)}
                            aria-label="Change your photo"
                            className="absolute inset-0 z-10 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          />
                          {/* No badge on a photograph. The scrim only appears
                              when you are actually pointing at it, so the
                              picture is a picture until the moment you reach
                              for it. */}
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-full bg-ink/45 text-white opacity-0 transition-opacity duration-150 group-hover/photo:opacity-100 group-focus-within/photo:opacity-100"
                          >
                            <Camera className="h-6 w-6" strokeWidth={1.6} />
                          </span>
                          <m.button
                            type="button"
                            onClick={handlePhotoRemove}
                            disabled={photoBusy}
                            aria-label="Remove your photo and use your bird"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ ...SPRINGS.snappy, delay: 0.06 }}
                            className="absolute -right-1 -top-1 z-20 grid h-6 w-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm outline-none transition-colors duration-150 hover:text-heart focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            <X className="h-3 w-3" />
                          </m.button>
                        </>
                      )}
                      <span
                        className="relative block h-full w-full overflow-hidden rounded-full border border-border/60 bg-mist"
                        role="img"
                        aria-label={user.name}
                      >
                      {/* The one photograph the page is about, so it is the one
                          image here allowed to be `priority`: it is the LCP
                          candidate on a profile and it must not arrive after
                          the name beside it (owner, 2026-08-03). It was a raw
                          <img> pointed at the R2 original, which is stored at
                          up to 1920px.
                          `fill` rather than width/height because `circle` is a
                          CSS length, not a number: it is either a measured px
                          string or `var(--lh-head)` before the ResizeObserver
                          reports (see the lockup comment above), and neither
                          form is something next/image can size from. The
                          parent already carries the exact box, so filling it is
                          the honest fit; it gains `relative` for that.
                          sizes 128px covers the real range, roughly 68px for a
                          one-line name up to ~115px when a long one wraps, and
                          still lets Next serve the 256 bucket to a 2x screen
                          rather than the full original. */}
                      <Image
                        src={user.photoUrl ?? ""}
                        alt=""
                        fill
                        sizes="128px"
                        priority
                        className="object-cover"
                      />
                      </span>
                    </span>
                  )}

                  {/* The lockup, and only the lockup: mark, number, name. The
                      occupation is deliberately outside it, so the measured
                      circle answers "top of the mark to the bottom of the
                      name" and not a line more. */}
                  <div ref={lockupRef} className="min-w-0 flex-1">
                    {/* A block-level row, not inline-flex: an inline box would
                        add its line's leading under the mark and quietly turn
                        the 8px step into 14.5px. */}
                    {editable && !isTeacher ? (
                      /* The mark, then the number as a field. The stamp easter
                         egg still fires from the mark itself, so pressing it
                         keeps working while the digits are typeable. Teachers
                         never had an admission number, so their editable sheet
                         gets the bare mark below instead of an empty field
                         asking for one. */
                      /* Byte-for-byte the read-only lockup below, with the
                         number swapped for a field: same row height, same
                         gap, same 13px caps, same paint-only nudge. */
                      <span className="flex h-[var(--lh-colophon)] w-fit items-center gap-[9px] text-cinnamon">
                        <button
                          type="button"
                          onClick={fireStamp}
                          aria-label="Stamp the sheet"
                          className="flex items-center rounded-sm transition-opacity duration-150 hover:opacity-75 active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <PeaksMark size={COLOPHON.markSize} />
                        </button>
                        <span
                          className="text-[16px] font-bold uppercase leading-none tracking-[0.14em]"
                          style={{ transform: `translateY(${COLOPHON.numberNudge}px)` }}
                        >
                          <PenValue
                            value={form.admissionNumber}
                            onChange={(v) => setField("admissionNumber", digits(v, 5))}
                            onCommit={() => commitField("admissionNumber")}
                            editing={live}
                            // Not "0000": there is no label beside this one,
                            // only the mark, so the placeholder says what the
                            // field is rather than what shape it takes.
                            placeholder="adm no"
                            ariaLabel="Admission number"
                            delay={0.02}
                            inputMode="numeric"
                          />
                        </span>
                      </span>
                    ) : admissionNumber ? (
                      <button
                        type="button"
                        onClick={fireStamp}
                        aria-label={`Admission number ${admissionNumber}. Press to stamp the sheet.`}
                        className="flex h-[var(--lh-colophon)] w-fit items-center gap-[9px] rounded-sm text-cinnamon transition-opacity duration-150 hover:opacity-75 active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <PeaksMark size={COLOPHON.markSize} />
                        <span
                          className="text-[16px] font-bold uppercase leading-none tracking-[0.14em]"
                          style={{ transform: `translateY(${COLOPHON.numberNudge}px)` }}
                        >
                          {admissionNumber}
                        </span>
                      </button>
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-[var(--lh-colophon)] w-fit items-center text-cinnamon"
                      >
                        <PeaksMark size={COLOPHON.markSize} />
                      </span>
                    )}

                    {/* The leaf rides inline after the last word so a wrapping
                        name never strands it on a line of its own, and sits on
                        the baseline. */}
                    {editable ? (
                      /* A textarea, not an input: the <h1> it stands in for
                         wraps to two lines on a phone, so this has to as well
                         or a long name runs off the sheet. */
                      /* The h1's own box, with the text swapped for a field.
                         Same mt, same type, and the leaf keeps its 10px gap
                         and its baseline. */
                      <div
                        className="mt-[var(--lh-gap)] flex items-baseline gap-2.5 font-heading font-bold tracking-[-0.03em] text-foreground"
                        style={{ fontSize: "var(--lh-name)", lineHeight: 1.05 }}
                      >
                        <PenBlock
                          value={form.name}
                          onChange={(v) => setField("name", v)}
                          onCommit={() => commitField("name")}
                          editing={live}
                          placeholder="Your name"
                          ariaLabel="Your name"
                          singleLine
                          snug
                          /* FULL_NAME_MAX, not a hand-typed 80. Signup accepts
                             a hundred characters, so a member with a longer
                             name than this could not finish typing the name
                             they already had -- the same lockout Low 84 fixed
                             on the server and this input re-created (audit
                             C-172). */
                          maxLength={FULL_NAME_MAX}
                          className="min-w-0"
                        />
                        <span className="shrink-0">
                          <VerifiedMark user={user} size={16} />
                        </span>
                      </div>
                    ) : (
                      <h1
                        className="mt-[var(--lh-gap)] font-heading font-bold tracking-[-0.03em] text-foreground"
                        style={{ fontSize: "var(--lh-name)", lineHeight: 1.05 }}
                      >
                        {/* The leaf rides in a no-wrap group with the name's
                            LAST word: a long name used to push just the leaf
                            onto a line of its own under itself. Now the pair
                            wraps together or not at all. */}
                        {(() => {
                          const words = user.name.trim().split(/\s+/);
                          const last = words.pop();
                          return (
                            <>
                              {words.length > 0 && `${words.join(" ")} `}
                              <span className="whitespace-nowrap">
                                {last}
                                <span className="ml-2.5 inline-flex align-baseline">
                                  <VerifiedMark user={user} size={16} />
                                </span>
                              </span>
                            </>
                          );
                        })()}
                      </h1>
                    )}
                  </div>

                  {/* Held back on phones, where a 40px pill beside a 30px
                      display name would squeeze the name's own column. */}
                  {action && (
                    <div className="hidden shrink-0 sm:block" style={{ marginTop: "var(--lh-cta-top)" }}>
                      {action}
                    </div>
                  )}
                </div>

                {editable ? (
                  /* The sentence the sheet prints, with two holes in it. Each
                     hole is exactly as wide as what is in it, so "Student" is
                     never followed by 100px of nothing before the word "at"
                     ("at" itself carries ONE space each side and no padding:
                     px-1 plus pen padding once spaced it out like a shop
                     sign).

                     The LINE only exists when it has something to say: at
                     rest with both halves empty it is not an empty row of
                     invisible mirrors under the name, it is gone, exactly
                     like the read-only sheet. The pen coming out grows the
                     row in with the same height+fade the Houses hint uses,
                     the one sanctioned height animation on this sheet,
                     because the alternative is the line popping in a frame. */
                  <AnimatePresence initial={false}>
                    {(live || Boolean(form.jobTitle.trim() || form.workplace.trim())) && (
                      <m.div
                        key="occupation"
                        /* marginBottom is ANIMATED, not a class, and that is
                           the whole of the fix below the comment: a static
                           -6px cancels a +6px that only exists while the box
                           is open. Driven to height 0 the padding's 6px is
                           gone but the margin's is not, so the sheet settled
                           6px SHORT and then snapped 6px back the frame
                           AnimatePresence unmounted the node -- measured on
                           the live page at exactly 6.00px (owner, 2026-08-22:
                           "it shrinks but then it shrinks a bit extra and it
                           expands marginally a beat later"). Sharing one
                           spring, height and margin run on one progress
                           curve, so the net contribution is (H-6)*s: it falls
                           straight to zero and unmounting changes nothing. */
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: -6 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={SPRINGS.gentle}
                        className="overflow-hidden"
                      >
                        {/* The dotted PenRule sits 6px below its own field
                            (pen.tsx: -bottom-1 offset + h-[2px]) -- outside
                            the text it draws under, which is the whole point
                            everywhere else it is used. Everywhere else, that
                            works. Here it does not: this `<p>` is the ONLY
                            in-flow content this m.div's `height: auto`
                            measures, so at rest the row was exactly tall
                            enough for the TEXT and the rule below both
                            PenValues was clipped by the `overflow-hidden`
                            this animation needs (owner, 2026-08-22: "the
                            dotted editable line doesn't come under the
                            occupation and organisation").

                            The 6px reserve has to live on the CHILD (pb-6,
                            below) because a box's own margin never counts
                            toward its own auto-height, only a child's does --
                            padding on the m.div itself would not have
                            grown what "auto" measures at all. The matching
                            -6px that cancels it back out for the page
                            therefore has to live on the m.div instead:
                            put on the same `<p>`, a negative child margin
                            gets folded into that same auto-height
                            measurement and cancels itself before it ever
                            reaches the parent, which is what the first
                            version of this fix got wrong (measured: the rule
                            still clipped 4px short after "fixing" it). A
                            box's OWN margin, unlike a child's, never affects
                            its own auto-height either way, so it is free to
                            cancel the gap for every sibling below without
                            touching the reserve the padding just bought. */}
                        <p className="mt-[var(--space-xs)] pb-[6px] text-[15px] leading-[1.6] text-muted-foreground">
                          {/* PenBlock, not PenValue, for both halves of this
                              sentence: these are the only two pens whose text
                              can outrun the column it sits in, and an <input>
                              answers that by pinning at max-w-full and
                              scrolling to keep the caret in view, which walks
                              the front of the sentence off the left edge as
                              you type. Measured at 390px: past the line width
                              scrollLeft went 6px, 26px, 100px, 173px, so
                              "Imperial" was simply gone. A textarea wraps to a
                              second line instead, which is what the read-only
                              sheet does with the same words. `inline` keeps
                              both holes in the run of text; `singleLine` keeps
                              Enter meaning "done", as it did on the input. */}
                          <PenBlock
                            value={form.jobTitle}
                            onChange={(v) => setField("jobTitle", v)}
                            onCommit={() => commitField("jobTitle")}
                            editing={live}
                            placeholder="what you do"
                            ariaLabel="What you do"
                            delay={0.06}
                            singleLine
                            inline
                            maxLength={120}
                          />
                          {/* The read-only sheet only prints "at" between two
                              real halves; the resting editable sheet follows
                              the same rule. With the pen out both holes are
                              visible, so the word returns to hold their
                              shape. */}
                          <span
                            className={cn(
                              "whitespace-pre",
                              !live &&
                                !(form.jobTitle.trim() && form.workplace.trim()) &&
                                "hidden"
                            )}
                          >
                            {" "}
                            at{" "}
                          </span>
                          <PenBlock
                            value={form.workplace}
                            onChange={(v) => setField("workplace", v)}
                            onCommit={() => commitField("workplace")}
                            editing={live}
                            placeholder="where"
                            ariaLabel="Where you work or study"
                            delay={0.08}
                            singleLine
                            inline
                            maxLength={120}
                          />
                        </p>
                      </m.div>
                    )}
                  </AnimatePresence>
                ) : (
                  occupation && (
                    <p className="mt-[var(--space-xs)] text-[15px] leading-[1.6] text-muted-foreground">
                      {occupation}
                    </p>
                  )
                )}
              </header>

              {facts.length > 0 && (
                <dl className="mt-[var(--space-l)] grid grid-cols-2 gap-x-[var(--space-l)] gap-y-[var(--space-m)] sm:grid-cols-3">
                  {facts.map((f) => (
                    <div key={f.label} className={f.wide ? "col-span-2 sm:col-span-1" : "min-w-0"}>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-canopy">
                        {f.label}
                      </dt>
                      {/* 15px, not 17. Owner (2026-08-02): "the font size for
                          that seems weirdly bigger than everywhere else in the
                          app ... we should try to standardize that." 15px is
                          the single most used rung in the product (every feed
                          post body, every letter body, the directory's person
                          name); 17px is almost entirely long-form reading
                          measures, and a fact is a datum, not a reading
                          measure. Semibold stays, which is where the emphasis
                          was actually coming from. */}
                      <dd className="mt-[var(--space-xs)] text-[15px] font-semibold leading-[1.35] text-foreground">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {/* The engraved rule that used to sit here is DELETED (owner
                  handed the call over, 2026-08-02).
                  What it did: separate the masthead from the body.
                  Why it no longer has to: the body now opens with a canopy caps
                  label ("About", "Houses") after a full block gap. That label is
                  a colour change, a case change, a weight change and a size
                  change at once; a 3px groove cannot add to a boundary that
                  emphatic, only restate it. A box must earn its border, and a
                  band whose whole job is already done by the thing under it has
                  not earned one. Deleting it also buys back 29px of sheet
                  height on every profile. */}
            </FadeRise>

            {showAbout && (
              <FadeRise delay={0.06}>
                <section className="mt-[var(--space-l)]">
                  <SectionLabel>About</SectionLabel>
                  {/* The written About is 15px/1.7, byte-for-byte the feed
                      PostCard's body style, because it is the same kind of
                      text. At 17 the sheet held the one paragraph in the app
                      set larger than a post. */}
                  {editable && (live || form.about) ? (
                    <PenBlock
                      value={form.about}
                      onChange={(v) => setField("about", v)}
                      onCommit={() => commitField("about")}
                      editing={live}
                      // At rest this IS the empty state: the same sentence the
                      // read-only sheet shows, sitting in the field it fills.
                      placeholder="You haven't written an About yet. A few lines, so people know who you are now."
                      ariaLabel="About you"
                      delay={0.22}
                      maxLength={4000}
                      className="mt-[var(--space-s)] text-[15px] leading-[1.7] text-foreground"
                    />
                  ) : editable ? (
                    /* Resting, with nothing written: the sentence the sheet has
                       always shown, link and all. The link no longer leaves for
                       anywhere, it just hands you the pen. Same type, same one
                       line, so picking it up moves nothing. */
                    <p className="mt-[var(--space-s)] text-[15px] leading-[1.7] text-muted-foreground">
                      You haven&rsquo;t written an About yet.{" "}
                      <button
                        type="button"
                        onClick={() => setLive(true)}
                        className="rounded-sm font-semibold text-leaf hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        Add a few lines
                      </button>{" "}
                      so people know who you are now.
                    </p>
                  ) : aboutText ? (
                    <p className="mt-[var(--space-s)] whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">
                      {aboutText}
                    </p>
                  ) : (
                    <p className="mt-[var(--space-s)] text-[15px] leading-[1.7] text-muted-foreground">
                      You haven&rsquo;t written an About yet.
                    </p>
                  )}
                </section>
              </FadeRise>
            )}

            {/* Houses are a student record; a teacher's sheet has no Houses
                section in either state, the same way their onboarding skips
                the Houses step. */}
            {editable && !isTeacher ? (
              <FadeRise delay={0.09}>
                <section className="mt-[var(--space-l)]">
                  <SectionLabel>Houses</SectionLabel>
                  {/* `empty:hidden` because HouseChainEditor renders NOTHING
                      for a member with no years and no houses recorded, which
                      left this div as a childless box carrying a margin -- and
                      a childless box's margin collapses through itself and then
                      escapes the section, but only once it is the LAST child.
                      The hint below it is what held it in, so the margin left
                      the moment AnimatePresence unmounted that hint, roughly
                      100ms after its exit spring had already finished: the
                      sheet settled, sat still for a beat, then dropped another
                      9.888px (= --space-s at 16px, measured on the live page).
                      Two steps to say one thing, which is the same complaint
                      the occupation row above answers with an animated
                      marginBottom (owner, 2026-08-28: "they adjust and then
                      maybe half a second later it moves up a tiny bit more").
                      It cannot be fixed the same way here, because the residual
                      is 9.888px for a member with an empty chain and 0px for
                      one with houses, so no fixed exit value is right for both.
                      Hidden while empty, the margin does not exist at all and
                      unmounting the hint costs exactly its animated height.
                      Nothing moves at rest: measured 18px section height either
                      way, and the settled sheet is 476.34px before and after. */}
                  <div className="mt-[var(--space-s)] empty:hidden">
                    {/* The SAME component in both states, never a swap: turning
                        the pen on must not remount the chain, or it re-measures
                        its pill widths and re-runs its entrance. */}
                    <HouseChainEditor
                      entries={houses}
                      onChange={commitHouses}
                      yearJoined={Number(form.yearJoined) || null}
                      yearLeft={Number(form.yearLeft) || null}
                      editing={live}
                    />
                  </div>
                  <AnimatePresence initial={false}>
                    {live && (
                      /* Height, not just opacity. This one line is the only
                         thing that makes the sheet taller in edit mode, and
                         fading it while its 26px vanished in a frame is what
                         made the whole card snap shut on Done (owner,
                         2026-08-07: "the profile just kind of snaps up ...
                         instead of transitioning up and becoming shorter, it
                         just snaps suddenly"). Animating a height is normally
                         off the table here; it is on it for exactly this,
                         because the alternative is the jump. */
                      <m.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={SPRINGS.gentle}
                        className="overflow-hidden"
                      >
                        <p className="pt-[var(--space-s)] text-[12px] text-muted-foreground">
                          Tap a house to change it.
                        </p>
                      </m.div>
                    )}
                  </AnimatePresence>
                </section>
              </FadeRise>
            ) : (
              !isTeacher &&
              houseSpans.length > 0 && (
                <FadeRise delay={0.09}>
                  <section className="mt-[var(--space-l)]">
                    <SectionLabel>Houses</SectionLabel>
                    <div className="mt-[var(--space-s)]">
                      <HouseTrail spans={houseSpans} />
                    </div>
                  </section>
                </FadeRise>
              )
            )}

            {/* On phones the one action moves to the FOOT of the sheet
                (owner, 2026-08-22): it used to sit mid-header, right under
                the occupation line, which put it before About, Houses and
                everything else a visitor came to read -- "weirdly in the
                middle" rather than the place a call to action belongs once
                you have actually read the page. Also a plain block-level
                div now, sibling to every other section here rather than
                nested in the header's flex row and FadeRise wrapper, so its
                left edge is the container's own `p-6` edge by construction
                instead of by inheriting whatever the header row was doing.
                `sm:hidden` because larger screens keep it beside the name
                (see the `hidden shrink-0 sm:block` copy up in the header
                row). */}
            {action && <div className="mt-[var(--space-l)] sm:hidden">{action}</div>}
          </div>
        </div>
      </div>

      {/* What sits under the sheet.
          Reading, it is the tab strip over your writing. With the pen out it
          is the contact rows instead (owner: "right now it shows All posts,
          Letters, Saved. We can remove all of that, fade it out and put this
          stuff that isn't above"). One crossfade, no height animation: both
          blocks are absolutely the same kind of object in the same place, and
          animating the height between them is what would read as janky. */}
      <div className="mt-[var(--space-l)] sm:mt-[var(--space-xl)]">
        {/* popLayout, not "wait". With "wait" the outgoing block unmounts and
            the incoming one only starts after it, so for 200ms this container
            holds nothing at all and the page collapses to the sheet before
            springing back out: two jumps to say one thing. popLayout takes the
            outgoing block out of flow immediately, so the incoming one owns
            the height from the first frame and there is only ever one move. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {live ? (
            <m.div
              key="reaching"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={SPRINGS.gentle}
            >
              <ContactsEditor
                rows={contactRows}
                onChange={setContactRows}
                onCommit={commitContacts}
              />

              {/* The two things on this page that are NOT your profile. Both
                  used to sit on /settings; that route is gone, and stranding
                  them was never an option. Both stay out of the sheet itself,
                  because neither is something anybody reads about you.
                  The photograph is not here: it is the circle at the top of
                  the sheet, which is where somebody looks for it. */}
              <div
                className="mt-[var(--space-m)] flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card px-[var(--space-m)] py-3.5 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(35,36,30,0.04), 0 10px 24px -20px rgba(35,36,30,0.5)",
                }}
              >
                {/* Keyed on THIS DEVICE's theme, not `draft.theme` from the
                    database (audit Low 95). /dark-mode gates on the cookie, on
                    purpose -- it is what the device actually renders -- so a
                    tile reading the database told a member on a new phone
                    "Dark mode is on / Turn it off" over a light-looking app,
                    and the button then walked them into the five-question
                    gauntlet instead of the one-press exit. The two surfaces
                    read the same fact now. */}
                <div>
                  <p className="text-[13.5px] font-medium text-foreground">
                    {deviceTheme === "dark" ? "Dark mode is on" : "Dark mode"}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                    {deviceTheme === "dark"
                      ? "You made it through the questions. Turning it off is one press."
                      : "Experimental. Turning it on involves some questions."}
                  </p>
                </div>
                <Link href="/dark-mode" className="inline-flex rounded-full">
                  <Button variant="outline" size="sm">
                    {deviceTheme === "dark" ? "Turn it off" : "Explore the dark"}
                  </Button>
                </Link>
              </div>

              {/* Directly under the dark mode tile, which is where the owner
                  put it, and for the same reason it belongs next to it: both
                  are settings for THIS device rather than facts about you.
                  It hides itself on anything that is not a phone and on a
                  phone that already has the app. */}
              {installNode}

              {/* Two quiet lines, not red-bordered boxes: the dialog is where
                  a warning belongs. The export sits beside deletion because
                  the person most likely to want their data out is the one
                  about to leave (audit M35, GDPR Art. 20). A plain anchor:
                  the route answers with a JSON attachment, so the browser
                  downloads it without any client plumbing. */}
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <a
                  href="/api/account/export"
                  className="state-layer rounded-full px-2 py-1.5 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Request your data
                </a>
                <span aria-hidden className="text-[13px] text-muted-foreground/50">·</span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="state-layer rounded-full px-2 py-1.5 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-heart focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Delete account
                </button>
              </div>
            </m.div>
          ) : (
            <m.div
              key="writing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={SPRINGS.gentle}
            >
              <Writing
                authorId={user.id}
                firstName={firstName}
                isOwnProfile={isOwnProfile}
                postCount={postCount}
                letterCount={letterCount}
                photoCount={photoCount}
                savedCount={savedCount}
                photosNode={photosNode}
                initialAuthorPosts={initialAuthorPosts}
                initialAuthorCursor={initialAuthorCursor}
                initialAuthorHasMore={initialAuthorHasMore}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gated, where they used to be mounted unconditionally with
          `open={false}`: rendering nothing still costs the download, and a
          stranger has no control anywhere on this page that opens any of
          them. */}
      {editable && (
        <>
          <AttachImageDialog
            open={attachOpen}
            onOpenChange={setAttachOpen}
            onFiles={(files) => handlePhotoPick(files[0] ?? null)}
            multiple={false}
            title="Add a profile photo"
          />
          <AvatarCropDialog
            file={cropFile}
            onConfirm={async (blob) => {
              setCropFile(null);
              await uploadAvatarBlob(blob);
            }}
            onCancel={() => setCropFile(null)}
            onDecodeError={(f) => {
              setCropFile(null);
              void uploadUndecodableAvatar(f);
            }}
          />

          <Dialog
            open={confirmDelete}
            onOpenChange={(open) => {
              setConfirmDelete(open);
              if (!open) {
                setDeletePassword("");
                setDeleteError(null);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete account</DialogTitle>
                <DialogDescription>
                  Your account, posts, comments and photos will be permanently deleted 60
                  days from now. If you change your mind before then, just sign in again
                  and the deletion is cancelled. Confirm with your password.
                </DialogDescription>
              </DialogHeader>
              {/* The password, not the session, is what authorises this (audit
                  M35): a stolen cookie must not be enough to schedule someone's
                  history for destruction. */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (deleting || deletePassword.length === 0) return;
                  setDeleting(true);
                  setDeleteError(null);
                  const fd = new FormData();
                  fd.set("password", deletePassword);
                  try {
                    const result = await callAction(() => requestAccountDeletion(fd));
                    if (result.error) {
                      setDeleteError(result.error);
                      return;
                    }
                    signOut({ callbackUrl: "/" });
                  } finally {
                    // finally, not a trailing statement: a rejected call used to
                    // leave the dialog stuck on "Scheduling..." forever, with no
                    // error shown and no way to retry (audit B-042).
                    setDeleting(false);
                  }
                }}
                className="space-y-[var(--space-s)]"
              >
                {/* The standard bordered Input, NOT the auth pages' mist
                    FloatField: that material is scoped to pages that ARE a form
                    (design system, section 3), and this is a dialog like every
                    other dialog. No reveal toggle for the same reason no other
                    dialog has one. */}
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Your password"
                  aria-label="Your password"
                />
                {deleteError && (
                  <p role="alert" className="text-[13px] leading-snug text-heart">
                    {deleteError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={deleting || deletePassword.length === 0}
                  >
                    {deleting ? "Scheduling..." : "Delete my account"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

      {(adminNode || flagNode) && (
        <div className="mt-[var(--space-xl)] space-y-[var(--space-m)]">
          {adminNode}
          {flagNode}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-canopy">{children}</p>;
}

/* ------------------------------------------------------------------ *
 *  The bird, perched on the sheet's own top edge so it costs the
 *  masthead no vertical space. It does not bob (owner: "don't keep
 *  moving the bird"). Pressing it chirps, because that only happens
 *  when someone asks for it.
 *
 *  The species name shows in a chip over the bird on hover/focus, and
 *  rides along with a chirp for a beat on touch (owner, 2026-08-13:
 *  "add bird name when you hover or somehow when on someone's
 *  profile") -- the same warm opaque chip the lab's ProfileAvatar
 *  settled on after the see-through variants failed over cover photos.
 * ------------------------------------------------------------------ */
/* The pause between the tap and the bird answering it (owner, 2026-08-04:
   "when you tap it, it'll trigger something that starts a beat later"). The
   old reaction fired on the same frame as the press, which is what made it
   feel rushed: the cause and the effect landed together with nothing in
   between. */
const CHIRP_BEAT_MS = 110;

/** Ignore taps that land inside an answer already in progress. */
const CHIRP_MIN_GAP_MS = 700;

function PerchedBird({
  user,
  live,
  onPick,
}: {
  user: LetterheadProfileUser;
  /** With the pen out the bird sits in a circle you can tap to upload a
   *  photo (owner, 2026-08-07: "let the bird transform into a circle that you
   *  can tap to upload your profile picture when you click edit"). */
  live?: boolean;
  onPick?: () => void;
}) {
  const [chirp, setChirp] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [named, setNamed] = useState(false);
  const controls = useAnimationControls();
  const lastChirp = useRef(0);
  const beat = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(beat.current);
      clearTimeout(nameTimer.current);
    },
    []
  );

  /* The same resolution chain as BirdAvatar itself (override > pin > hash),
     so the chip can never name a different bird than the one drawn. The pose
     comes from the same hash: pose >= 2 is the mirrored glyph, and the call
     arcs below follow it -- they were hard-coded to the upper-right, so a
     mirrored bird chirped out of the back of its head (owner, 2026-08-13). */
  const seed = user.id || user.name || "valley";
  const species = speciesNameFor(seed, speciesForMember(seed, resolveBirdOverride(user.id, user.birdOverride)));
  const flipped = birdFor(seed).pose >= 2;

  const showName = !live && (hovered || named);

  function tap() {
    const now = Date.now();
    if (now - lastChirp.current < CHIRP_MIN_GAP_MS) return;
    lastChirp.current = now;
    clearTimeout(beat.current);
    beat.current = setTimeout(async () => {
      setChirp((c) => c + 1); // arcs go out on the same beat as the movement
      // The name rides the chirp (the touch path has no hover to reveal it).
      setNamed(true);
      clearTimeout(nameTimer.current);
      nameTimer.current = setTimeout(() => setNamed(false), 1700);
      /* Out and back on two soft springs, driven by controls rather than a
         key-remount. The old version remounted the element ALREADY displaced
         to scale 1.1 and snapped it home on the stiffest spring we have, so
         the whole thing was one hard recoil with no outward move to watch:
         "way too fast, way too little frames ... very compressed". Starting
         from rest means there is a rise to see, and `gentle` then `settle`
         are the two softest springs in the set. */
      await controls.start({ scale: 1.09, rotate: -6 }, SPRINGS.gentle);
      await controls.start({ scale: 1, rotate: 0 }, SPRINGS.settle);
    }, CHIRP_BEAT_MS);
  }

  return (
    /* Scaled from its FEET on phones, so the perch line stays put at both
       sizes and only one offset has to be right. */
    <div className="absolute -top-12 right-6 z-20 origin-bottom scale-[0.8] sm:right-10 sm:scale-100">
      <button
        type="button"
        onClick={live ? onPick : tap}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={
          live
            ? "Add a profile photo"
            : `${user.name}'s bird, a ${species}. Tap for a chirp.`
        }
        /* No press sink and no transition on this control (owner: "I don't
           want to depress when you press it down ... that itself is a bad way
           to go about it"). The sink also put the bird on its own composited
           layer for the duration, which is where the faint extra shadow under
           it on click was coming from; without a transform there is no layer
           and no second shadow. The chirp below is the entire feedback. */
        className="group/slot relative block rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {/* The bird steps aside and an empty photo slot takes its place
            (owner, 2026-08-07: "just disappear the bird and have a circle
            floating there that they'd click to add a profile picture").
            Not a badge on the bird, and not a ring around it: those both say
            "this bird does something", when what is true is that this is
            where a photograph goes.

            Both live in the same 80px box and only opacity and scale change,
            so the perch line holds and nothing below it moves. A dashed edge
            because it is a slot waiting to be filled; a camera because that
            is the one glyph nobody has to be taught. */}
        <m.span
          animate={controls}
          initial={false}
          className="relative block"
          style={{ opacity: live ? 0 : 1, pointerEvents: live ? "none" : undefined }}
        >
          <BirdAvatar user={user} size={80} />
        </m.span>

        <AnimatePresence initial={false}>
          {live && (
            <m.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.72 }}
              transition={SPRINGS.snappy}
              className="absolute inset-0 grid place-items-center"
            >
              {/* Smaller than the 80px bird box it sits inside, close to the
                  size of a bird avatar elsewhere on the page, so it does not
                  loom in the corner the way filling the whole box did. Still
                  centred on the same footprint, so the perch position and the
                  bird's own size are untouched. */}
              <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-canopy/40 bg-card/85 text-canopy transition-colors duration-150 group-hover/slot:border-canopy/70 group-hover/slot:bg-card">
                <Camera className="h-6 w-6" strokeWidth={1.6} />
              </span>
            </m.span>
          )}
        </AnimatePresence>

        {chirp > 0 && (
          /* Anchored to whichever side the beak actually faces: the glyph
             mirrors when its pose says so, and a scaleX(-1) on this anchor
             mirrors the whole emission with it, so the call always leaves
             the front of the bird. */
          <span
            key={`arcs-${chirp}`}
            aria-hidden
            className={`pointer-events-none absolute top-[22px] ${flipped ? "left-[-2px]" : "right-[-2px]"}`}
            style={flipped ? { transform: "scaleX(-1)" } : undefined}
          >
            {[0, 1, 2].map((n) => {
              const s = 13 + n * 9;
              return (
                <m.span
                  key={n}
                  initial={{ opacity: 0.9, scale: 0.35, rotate: -45 }}
                  animate={{ opacity: 0, scale: 1.2, rotate: -45 }}
                  transition={{ duration: 0.55, delay: n * 0.07, ease: EASE_OUT_SMOOTH }}
                  className="absolute block rounded-full border-r-2 border-cinnamon"
                  style={{ width: s, height: s, left: 0, top: -s / 2 }}
                />
              );
            })}
          </span>
        )}

        {/* Species name as a NATURALIST'S ANNOTATION: fine italic ink written
            straight on the sheet, a thin hand-curved arrow rising toward the
            bird -- a field-guide specimen label, not a tooltip. This is the
            third shape this has worn in one day: below the bird it covered
            the Get in touch pill, and the ink speech bubble that replaced it
            was called out too ("the pill and arrow shape ... seems a bit
            janky"). No box at all now -- a box must earn its border, and on
            the sheet's own paper plain ink needs none. Sits at the bird's
            lower-left, nudged below the sheet's top rule so the words always
            land on paper, never on the cover behind the edge. */}
        <span
          className="pointer-events-none absolute right-[calc(100%+8px)] top-[calc(50%+20px)] z-[3] -translate-y-1/2"
          aria-hidden
        >
          <AnimatePresence>
            {showName && (
              <m.span
                className="flex w-max items-center gap-2 whitespace-nowrap font-heading text-[13.5px] italic leading-none tracking-[0.01em] text-foreground/75"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                transition={SPRINGS.snappy}
              >
                {species}
                {/* The annotating stroke: one gentle pencil curve up toward
                    the bird, open arrowhead, no fill, fading with the words
                    (opacity only; nothing draws itself on). The FULL curve
                    (owner kept this sweep, not the flatter redraw), with the
                    whole svg translated up so the curve's departure point --
                    viewBox y=14.5 in a 16-tall box, i.e. 6.5px below the
                    box's centre -- sits a hair BELOW the middle of the text
                    height that items-center pins the box centre to: -6.5px
                    was the exact midline, and the owner asked for very
                    slightly lower, so 1.5px of that translate comes back. */}
                <svg
                  width="30"
                  height="16"
                  viewBox="0 0 30 16"
                  fill="none"
                  className="text-foreground/40"
                  style={{ transform: "translateY(-5px)" }}
                  aria-hidden
                >
                  <path
                    d="M1.5 14.5 C 10 14, 20 10, 27 3.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  {/* Open-V head, derived, not eyeballed: the curve's exit
                      direction at its endpoint is (7,-6.5) (the P3-P2 tangent,
                      ~43° up-right), and both barbs sit at exactly 28° either
                      side of it, length 5, vertex ON the endpoint. The old
                      hand-placed head had one barb 50° off the shaft and the
                      other 24°, which is the unevenness the owner saw. */}
                  <path
                    d="M22.2 4.8 L 27 3.5 L 25.4 8.2"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </m.span>
            )}
          </AnimatePresence>
        </span>
      </button>

      {/* A soft contact shadow on the paper: what makes it read as perched on
          the edge rather than pasted over it.

          `willChange: filter` is not a performance hint here, it is the fix for
          a real artifact (owner, 2026-08-18, with two screenshots): hovering the
          bird mounts the name label, and repainting that corner invalidated a
          RECTANGLE that cut through this blur. A blur repainted inside a dirty
          rect gets no pixels from outside it, so the soft ellipse came back with
          a hard vertical edge through it, and it stayed wrong until the next
          full repaint about a second later. Promoted, this span owns its raster
          and no neighbour's invalidation can slice it. Nothing about how it
          looks changes: same bar, same 3px blur, same 0.14. */}
      <span
        aria-hidden
        className="mx-auto -mt-1 block h-2 w-11 rounded-full"
        style={{
          background: "var(--color-ink)",
          opacity: 0.14,
          filter: "blur(3px)",
          willChange: "filter",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  What they have written.
 *
 *  The switcher is the app's own segmented pill (the same control as the
 *  Catch-ups cadence switcher) with one canopy fill gliding between
 *  segments on a shared layoutId. Underline tabs read as a hint rather
 *  than a control, and folder tabs need a folder, which would put the
 *  post tiles back in a box.
 *
 *  Four segments either way: Photos is other-people-only (a stranger's
 *  pictures are worth browsing as a set), Saved is yours-only (nobody
 *  else's business), so the control never grows past what fits a 390px
 *  phone and never needs to become a scroll container. That matters
 *  beyond tidiness: a horizontally scrollable strip swallows the wheel,
 *  and parking the pointer on it stops the page dead.
 * ------------------------------------------------------------------ */
function Writing({
  authorId,
  firstName,
  isOwnProfile,
  postCount,
  letterCount,
  photoCount,
  savedCount,
  photosNode,
  initialAuthorPosts,
  initialAuthorCursor,
  initialAuthorHasMore,
}: {
  authorId: string;
  firstName: string;
  isOwnProfile: boolean;
  postCount: number;
  letterCount: number;
  photoCount: number;
  savedCount: number;
  photosNode: ReactNode;
  initialAuthorPosts?: PostData[];
  initialAuthorCursor?: string | null;
  initialAuthorHasMore?: boolean;
}) {
  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: postCount + letterCount },
    { key: "posts", label: "Posts", count: postCount },
    { key: "letters", label: "Letters", count: letterCount },
    isOwnProfile
      ? { key: "saved" as const, label: "Saved", count: savedCount }
      : { key: "photos" as const, label: "Photos", count: photoCount },
  ];

  const [tab, setTab] = useState<TabKey>("all");

  /* The count the OPEN pill is printing, handed to the feed below it so the
     two cannot disagree. Read off TABS rather than re-deriving the same three
     sums: the pill and the feed must be quoting one number, and that is the
     whole reason the feed can stop guessing how tall it is about to be. */
  const openCount = TABS.find((t) => t.key === tab)?.count;

  return (
    /* The top margin lives on the caller now, because the contact block that
       takes this one's place in edit mode has to sit at exactly the same y. */
    <div>
      <SegmentedPills
        ariaLabel="Profile sections"
        layoutId="profileWriting"
        segments={TABS}
        value={tab}
        onChange={setTab}
        className="bg-card"
        style={{ boxShadow: "0 1px 2px rgba(35,36,30,0.04), 0 10px 24px -20px rgba(35,36,30,0.5)" }}
      />

      {/* Nothing wraps the tiles. */}
      <div className="mt-[var(--space-m)]">
        {(tab === "all" || tab === "posts" || tab === "letters") && (
          <ProfileAuthorFeed
            key={tab}
            authorId={authorId}
            firstName={firstName}
            isOwnProfile={isOwnProfile}
            kind={tab === "all" ? undefined : tab === "posts" ? "post" : "letter"}
            expectedCount={openCount}
            /* Only the All tab is seeded: it is the one the page opens on, so
               it is the one whose round trip a reader waits through. Posts and
               Letters are a press away and keep their skeleton. */
            initialPosts={tab === "all" ? initialAuthorPosts : undefined}
            initialCursor={initialAuthorCursor}
            initialHasMore={initialAuthorHasMore}
            emptyTitle={
              tab === "letters"
                ? isOwnProfile
                  ? "You haven't written a letter yet."
                  : `No letters yet from ${firstName}.`
                : undefined
            }
          />
        )}

        {tab === "photos" &&
          (photosNode ?? (
            <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-10 text-center">
              <p className="font-heading text-lg tracking-tight text-foreground">
                No photos yet from {firstName}.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pictures they post to the feed collect here.
              </p>
            </div>
          ))}

        {tab === "saved" && <SavedPostsFeed expectedCount={savedCount} />}
      </div>
    </div>
  );
}

/** Digits only, capped. Every numeric field on the sheet takes the same
 *  treatment, so a stray letter can never reach the server. */
function digits(raw: string, max: number): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

/* ------------------------------------------------------------------ *
 *  The cities fact.
 *
 *  The only value on the sheet whose editor cannot be a field, because
 *  adding a city is a search against GeoNames rather than a typed
 *  string. Putting the picker inline would swap a one-line comma series
 *  for a chip list and a search box, which is the fact growing three
 *  rows taller the moment you press Edit.
 *
 *  So the value stays the value. It reads as the same comma series it
 *  always did, in the same cell, at the same height; with the pen out it
 *  becomes a button, and the picker opens over the page instead of
 *  inside the sheet. The cell cannot resize, because nothing in it
 *  changed.
 * ------------------------------------------------------------------ */
function CitiesPen({
  live,
  open,
  onOpenChange,
  places,
  onChange,
}: {
  live: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  places: PlaceSelection[];
  onChange: (next: PlaceSelection[]) => void;
}) {
  const label = places.map((p) => p.city).join(", ");

  return (
    <Popover open={live && open} onOpenChange={onOpenChange}>
      <PenSlot editing={live} delay={0.2} className="inline-block max-w-full">
        <PopoverTrigger
          type="button"
          disabled={!live}
          aria-label="Cities you call home"
          className={cn(
            // Zero box, like every other pen: the trigger occupies exactly the
            // text the read-only <dd> printed, so the facts row cannot change
            // shape when the pen comes out. No hover or focus paint either --
            // this control keeps DOM focus after its popover closes, so any
            // focus styling here outlives the popover and sits on the value
            // until you click elsewhere.
            "m-0 block max-w-full truncate border-0 bg-transparent p-0 text-left text-inherit outline-none",
            live && "cursor-pointer",
            !label && "text-muted-foreground"
          )}
        >
          {label || (live ? "Add a city" : "\u00A0")}
        </PopoverTrigger>
      </PenSlot>
      <PopoverPortal>
        <PopoverPositioner sideOffset={8} align="start" side="bottom">
          <PopoverContent className="w-[320px]">
            <p className="mb-2 text-[13px] font-semibold text-foreground">
              Everywhere you call home
            </p>
            <LocationPicker
              mode="multi"
              value={places}
              onChange={onChange}
              placeholder="Add a city"
              aria-label="Your cities"
            />
          </PopoverContent>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
