"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Camera,
  ExternalLink,
  Mail,
  MailCheck,
  Merge,
  Shield,
  ShieldQuestion,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminAct } from "@/components/admin/use-admin-act";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";
import type { PlaceSelection } from "@/components/common/location-picker";
import { Chip } from "@/components/admin/admin-chip";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AdminSection } from "@/components/admin/admin-chrome";
import { batchLine, formatDisplayDate, metaLine } from "@/lib/utils";
import {
  adminBlockUser,
  adminDeleteUser,
  adminUpdateNote,
  adminUnverifyUser,
  adminVerifyUser,
} from "@/app/(main)/admin/people/actions";
import {
  adminMergeUsers,
  adminSetPhotoTrusted,
  adminSetRole,
  adminUpdatePerson,
  adminUpdatePlaces,
} from "@/app/(main)/admin/people/actions";
import { MailRows, type MailRow } from "@/components/admin/mail/mail-rows";

/* ------------------------------------------------------------------ *
 *  One person, everything about them, everything you can do to them.
 *
 *  This page is the answer to two things at once. The owner asked why the
 *  panel needed a row of icon buttons per person when clicking the name
 *  should do it, and separately fixed a member's city, two name
 *  capitalisations and a bird override by hand-writing SQL in the same week.
 *  So the list carries only the one action you take in bulk (Verify), and
 *  everything else, including the fields that had no interface at all, lives
 *  here where there is room to say what it does.
 * ------------------------------------------------------------------ */

export interface DetailPerson {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  birdOverride: string | null;
  jobTitle: string | null;
  workplace: string | null;
  accountType: string | null;
  batchType: string | null;
  batchYear: number | null;
  yearJoined: number | null;
  yearLeft: number | null;
  admissionNumber: number | null;
  role: string;
  verifyState: string;
  verifyMethod: string | null;
  verifiedAt: string | null;
  emailConfirmedAt: string | null;
  isBlocked: boolean;
  photoTrusted: boolean;
  adminNote: string | null;
  createdAt: string;
  places: PlaceSelection[];
}

export interface DetailStats {
  posts: number;
  comments: number;
  photos: number;
  contributionCount: number;
  contributionPaise: number;
  reportsAgainst: number;
}

const ACCOUNT_TYPES = [
  { value: "alumnus", label: "Alumnus" },
  { value: "teacher", label: "Teacher" },
  { value: "ex_teacher", label: "Former teacher" },
];

export function PersonDetail({
  person,
  stats,
  mail,
  isSelf,
}: {
  person: DetailPerson;
  stats: DetailStats;
  mail: MailRow[];
  /** True when this is the acting admin's own row. Block, Merge and Delete
   *  are not rendered then: the server refuses all three (bug audit B-023),
   *  and a control that always errors is worse than no control. Blocking is
   *  the one that traps -- it lands on the next request and a blocked account
   *  cannot sign in to undo it. */
  isSelf: boolean;
}) {
  const router = useRouter();
  const { busy: acting, act } = useAdminAct();
  const [dialog, setDialog] = useState<"delete" | "merge" | "block" | null>(null);
  const [mergeInto, setMergeInto] = useState("");

  /* One key: this card's dialogs share a single set of controls, so there is
     nothing to tell apart. `run` keeps its name and its boolean answer, which
     is what closes a confirm dialog only when the thing it confirmed happened. */
  const busy = acting !== null;
  const run = (fn: () => Promise<{ error?: string } | void>, done: string) =>
    act("person", fn, done);

  const verified = person.verifyState === "verified";
  const confirmed = Boolean(person.emailConfirmedAt);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/people"
        className="inline-flex w-fit items-center gap-1.5 rounded-full text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" strokeWidth={2} />
        People
      </Link>

      {/* The one place in admin that shows a person LARGE. The list's row rule
          is about scanning a column of people; this is a single subject, so
          the avatar can carry its own weight. */}
      <header className="flex flex-wrap items-center gap-3">
        <BirdAvatar user={person} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-[26px] leading-tight tracking-[-0.02em] text-foreground">
            {person.name}
          </h1>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {metaLine(batchLine(person), person.email)}
          </p>
        </div>
        {/* Link wrapping Button: the shared Button has no `asChild`, and this
            is the idiom the rest of the app already uses for a CTA that
            navigates. */}
        <Link href={`/profile/${person.id}`} className="shrink-0">
          <Button variant="outline" size="sm">
            <ExternalLink className="size-3.5" strokeWidth={2} />
            View profile
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---- left: the things you change ---- */}
        <div className="flex flex-col gap-4">
          <DetailsCard person={person} />
          <PlacesCard person={person} />
          <NoteCard person={person} />
          <MailCard mail={mail} />
        </div>

        {/* ---- right: the things you decide ---- */}
        <div className="flex flex-col gap-4">
          <AdminSection label="Standing">
            <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3.5">
              <Fact
                label="Email"
                value={
                  confirmed
                    ? `Confirmed ${formatDisplayDate(new Date(person.emailConfirmedAt!))}`
                    : "Not confirmed"
                }
                chip={
                  confirmed ? (
                    <Chip label="Confirmed" tone="good" icon={MailCheck} />
                  ) : (
                    <Chip label="Waiting" tone="warn" icon={Mail} />
                  )
                }
              />
              <Fact
                label="Member"
                value={
                  verified
                    ? metaLine(
                        person.verifyMethod === "office_list"
                          ? "Off the office list"
                          : person.verifyMethod === "community"
                            ? "Vouched for"
                            : "By an admin",
                        person.verifiedAt
                          ? formatDisplayDate(new Date(person.verifiedAt))
                          : null
                      )
                    : person.verifyState === "flagged"
                      ? "Somebody flagged this account"
                      : "Not yet verified"
                }
                chip={
                  verified ? (
                    <Chip label="Verified" tone="good" icon={BadgeCheck} />
                  ) : person.verifyState === "flagged" ? (
                    <Chip label="Flagged" tone="bad" icon={ShieldQuestion} />
                  ) : (
                    <Chip label="Unverified" tone="idle" icon={ShieldQuestion} />
                  )
                }
              />
              <Fact
                label="Joined"
                value={formatDisplayDate(new Date(person.createdAt))}
              />
              {person.admissionNumber != null && (
                <Fact label="Admission" value={String(person.admissionNumber)} />
              )}
              {Boolean(person.yearJoined && person.yearLeft) && (
                <Fact label="Here" value={`${person.yearJoined} to ${person.yearLeft}`} />
              )}

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {verified ? (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={busy}
                    onClick={() => run(() => adminUnverifyUser(person.id), "No longer verified")}
                  >
                    Remove verification
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    variant="primary"
                    disabled={busy}
                    onClick={() =>
                      // No method: an admin pressing this checked by hand, and
                      // recording it as the office roster was untrue (Low 6).
                      run(() => adminVerifyUser(person.id), "Verified")
                    }
                  >
                    <BadgeCheck className="size-3" strokeWidth={2} />
                    Verify
                  </Button>
                )}
                {!isSelf && (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      person.isBlocked
                        ? run(() => adminBlockUser(person.id, false), "Unblocked")
                        : setDialog("block")
                    }
                  >
                    <Ban className="size-3" strokeWidth={2} />
                    {person.isBlocked ? "Unblock" : "Block"}
                  </Button>
                )}
              </div>
            </div>
          </AdminSection>

          <AdminSection label="Powers">
            <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3.5">
              <Toggle
                icon={Camera}
                title="Skip the photo queue"
                // Says what it DOES, not what the column is called.
                blurb="Their uploads go straight into the Collection instead of waiting for you."
                on={person.photoTrusted}
                disabled={busy}
                onChange={(v) =>
                  run(
                    () => adminSetPhotoTrusted(person.id, v),
                    v ? "Their photos skip the queue now" : "Their photos wait for review again"
                  )
                }
              />
              <Toggle
                icon={Shield}
                title="Admin"
                blurb="Full run of this panel, and can remove anybody's posts."
                on={person.role === "admin"}
                disabled={busy}
                onChange={(v) =>
                  run(
                    () => adminSetRole(person.id, v ? "admin" : "member"),
                    v ? "They are an admin now" : "No longer an admin"
                  )
                }
              />
            </div>
          </AdminSection>

          <AdminSection label="What they have made">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border">
              <Tally label="Posts" value={stats.posts} href={`/admin/content?author=${person.id}`} />
              <Tally label="Comments" value={stats.comments} />
              <Tally label="Photos" value={stats.photos} href={`/admin/content?author=${person.id}&type=photo`} />
              <Tally
                label="Given"
                value={
                  stats.contributionPaise > 0
                    ? `Rs ${Math.round(stats.contributionPaise / 100).toLocaleString("en-IN")}`
                    : "0"
                }
                href={stats.contributionCount > 0 ? "/admin/support" : undefined}
              />
              {stats.reportsAgainst > 0 && (
                <Tally
                  label="Reported"
                  value={stats.reportsAgainst}
                  href="/admin/reports"
                  tone="bad"
                />
              )}
            </div>
          </AdminSection>

          <AdminSection label="Careful">
            <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3.5">
              {isSelf ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This is you. Blocking, merging and deleting are not offered on your
                  own account. Leaving is done from Settings, with its 60-day grace
                  period.
                </p>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    disabled={busy}
                    onClick={() => setDialog("merge")}
                  >
                    <Merge className="size-3.5" strokeWidth={2} />
                    Merge into another account
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="justify-start"
                    disabled={busy}
                    onClick={() => setDialog("delete")}
                  >
                    <Trash2 className="size-3.5" strokeWidth={2} />
                    Delete this account
                  </Button>
                </>
              )}
            </div>
          </AdminSection>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "block"}
        onClose={() => setDialog(null)}
        title={`Block ${person.name}`}
        description="They stay in the database and keep everything they wrote, but they cannot sign in. You can undo this from the same button."
        actionLabel="Block them"
        onConfirm={async () => {
          const result = await adminBlockUser(person.id, true);
          if (!result.error) {
            toast.success("Blocked");
            router.refresh();
          }
          return result;
        }}
      />

      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title={`Delete ${person.name}`}
        description="Their account, posts, comments, photos and messages go for good. Contributions survive without a name attached. There is no undo."
        actionLabel="Delete for good"
        confirmWord={person.name}
        onConfirm={async () => {
          const result = await adminDeleteUser(person.id);
          if (!result.error) {
            toast.success("Deleted");
            router.push("/admin/people");
          }
          return result;
        }}
      />

      <ConfirmDialog
        open={dialog === "merge"}
        onClose={() => {
          setDialog(null);
          setMergeInto("");
        }}
        title={`Merge ${person.name} away`}
        destructive
        description={
          <>
            <span className="block">
              This account&apos;s posts, comments, photos, contributions and messages move to the
              account you name. Its likes, bookmarks and votes are dropped, and then it is
              deleted.
            </span>
            <span className="mt-3 block">
              Paste the id of the account to keep. You can copy it from that person&apos;s
              address bar.
            </span>
            <Input
              value={mergeInto}
              onChange={(e) => setMergeInto(e.target.value)}
              placeholder="cmsf363qi000004jr6zriodvi"
              className="mt-2"
              autoComplete="off"
              spellCheck={false}
            />
          </>
        }
        actionLabel="Merge and delete"
        confirmWord={person.name}
        onConfirm={async () => {
          const target = mergeInto.trim();
          if (!target) return { error: "Paste the id of the account to keep." };
          const result = await adminMergeUsers(person.id, target);
          if (!result.error) {
            toast.success("Merged");
            router.push(`/admin/people/${target}`);
          }
          return result;
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  The cards
 * ---------------------------------------------------------------- */

function DetailsCard({ person }: { person: DetailPerson }) {
  const [name, setName] = useState(person.name);
  const [accountType, setAccountType] = useState(person.accountType ?? "alumnus");
  const [batchYear, setBatchYear] = useState(person.batchYear?.toString() ?? "");
  const [bird, setBird] = useState(person.birdOverride ?? "");
  const [jobTitle, setJobTitle] = useState(person.jobTitle ?? "");
  const [workplace, setWorkplace] = useState(person.workplace ?? "");
  const { busy: acting, act } = useAdminAct();
  const saving = acting !== null;

  const dirty =
    name !== person.name ||
    accountType !== (person.accountType ?? "alumnus") ||
    batchYear !== (person.batchYear?.toString() ?? "") ||
    bird !== (person.birdOverride ?? "") ||
    jobTitle !== (person.jobTitle ?? "") ||
    workplace !== (person.workplace ?? "");

  const save = () =>
    act(
      "details",
      () =>
        adminUpdatePerson(person.id, {
          name,
          accountType,
          batchYear,
          birdOverride: bird,
          jobTitle,
          workplace,
        }),
      "Saved"
    );

  return (
    <AdminSection label="Their details">
      <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3.5">
        <Field label="Name" hint="Saved title-cased, the same as the profile form does it.">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Kind of account">
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-input)] border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Batch" hint="The year their class finished 12th. Blank for teachers.">
            <Input
              value={batchYear}
              onChange={(e) => setBatchYear(e.target.value)}
              inputMode="numeric"
              placeholder="2023"
            />
          </Field>
        </div>

        {/* The occupation line, in the order the profile prints it: "Lawyer at
            Trilegal". Either half stands alone -- the profile only prints the
            "at" between two real halves -- so neither is required and clearing
            one is a legitimate edit. Same 100-character cap as the member's
            own form, and the same title-casing on save.

            "Organisation" and not "Where": the card directly below this one is
            "Where they are", and two fields a screen apart both asking "where"
            read as the same question. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Occupation" hint="The half their profile prints first.">
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Lawyer"
              maxLength={100}
            />
          </Field>
          <Field label="Organisation" hint="Where they work or study.">
            <Input
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              placeholder="Trilegal"
              maxLength={100}
            />
          </Field>
        </div>

        <Field
          label="Bird"
          hint="A species slug, e.g. indian-roller. Leave it empty and they get the bird their id always gave them."
        >
          <Input
            value={bird}
            onChange={(e) => setBird(e.target.value)}
            placeholder="indian-roller"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        {/* The button appears only when there is something to save, so the
            card is not permanently offering an action that does nothing. */}
        {dirty && (
          <div className="flex justify-end">
            <Button size="sm" variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save details"}
            </Button>
          </div>
        )}
      </div>
    </AdminSection>
  );
}

/* The picker drags base-ui's combobox with it -- 53 KB raw, the single
   heaviest thing on this route, for one field in one of the four cards on the
   left. SSR stays ON (no `ssr: false`): unlike the letterhead's, which sits
   behind an edit affordance, this one is drawn at rest in PlacesCard, so
   deferring the paint would pop a control in under an admin's cursor. This is
   a client-chunk split and nothing else.

   Note for anyone re-reading audit 2's bundle-build-05: it says this picker
   "sits behind the admin's edit affordance". It does not. */
const LocationPicker = dynamic(
  () => import("@/components/common/location-picker").then((m) => m.LocationPicker)
);

function PlacesCard({ person }: { person: DetailPerson }) {
  const [places, setPlaces] = useState<PlaceSelection[]>(person.places);
  const { busy: acting, act } = useAdminAct();
  const saving = acting !== null;

  const dirty = JSON.stringify(places) !== JSON.stringify(person.places);

  const save = () => act("places", () => adminUpdatePlaces(person.id, places), "Saved");

  return (
    <AdminSection label="Where they are">
      <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3.5">
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          The first one becomes the city shown on their profile and in the directory, and pins
          them on the map. The same picker members use in their own settings, so a city set here
          carries real coordinates rather than a typed string.
        </p>
        <LocationPicker
          mode="multi"
          value={places}
          onChange={setPlaces}
          placeholder="Add a city"
          aria-label="Their cities"
        />
        {dirty && (
          <div className="flex justify-end">
            <Button size="sm" variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save cities"}
            </Button>
          </div>
        )}
      </div>
    </AdminSection>
  );
}

function NoteCard({ person }: { person: DetailPerson }) {
  const [note, setNote] = useState(person.adminNote ?? "");
  const { busy: acting, act } = useAdminAct();
  const saving = acting !== null;
  const dirty = note !== (person.adminNote ?? "");

  const save = () => act("note", () => adminUpdateNote(person.id, note.trim()), "Note saved");

  return (
    <AdminSection label="Your note">
      <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3.5">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Only you and the other admins can see this. Nothing here is shown to them."
        />
        {dirty && (
          <div className="flex justify-end">
            <Button size="sm" variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save note"}
            </Button>
          </div>
        )}
      </div>
    </AdminSection>
  );
}

function MailCard({ mail }: { mail: MailRow[] }) {
  if (mail.length === 0) {
    return (
      <AdminSection label="Mail we sent them">
        <p className="px-0.5 py-1 text-[13px] text-muted-foreground">
          Nothing has ever been sent to this address.
        </p>
      </AdminSection>
    );
  }

  return (
    <AdminSection label="Mail we sent them" action={
      <Link
        href="/admin/mail"
        className="text-[12.5px] font-medium text-canopy underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
      >
        The whole queue
      </Link>
    }>
      {/* The queue's own row, not a second drawing of it. They rendered the
          same facts in two files, and the copy here had drifted to an absolute
          date and a Try again that only appeared on a failed row. Owner,
          2026-09-07, told exactly what would change: "16a". */}
      <MailRows rows={mail} showActions showRecipient={false} />
    </AdminSection>
  );
}

/* ---------------------------------------------------------------- *
 *  Small parts
 * ---------------------------------------------------------------- */

function Fact({
  label,
  value,
  chip,
}: {
  label: string;
  value: string;
  chip?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-[13px] text-foreground">{value}</p>
      </div>
      {chip && <div className="shrink-0 pt-0.5">{chip}</div>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11.5px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({
  icon: Icon,
  title,
  blurb,
  on,
  disabled,
  onChange,
}: {
  icon: typeof Camera;
  title: string;
  blurb: string;
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={
          on
            ? "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-leaf/30 bg-leaf/[0.07] text-leaf"
            : "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border bg-secondary text-muted-foreground"
        }
      >
        <Icon className="size-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{blurb}</p>
      </div>
      <Button
        size="xs"
        variant={on ? "outline" : "secondary"}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className="shrink-0"
      >
        {on ? "Turn off" : "Turn on"}
      </Button>
    </div>
  );
}

function Tally({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: "bad";
}) {
  const inner = (
    <>
      <p
        className={`text-[17px] font-semibold leading-none tabular-nums ${
          tone === "bad" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[12px] text-muted-foreground">{label}</p>
    </>
  );
  const shell = "bg-card px-3 py-2.5";
  return href ? (
    <Link
      href={href}
      className={`${shell} state-layer block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`}
    >
      {inner}
    </Link>
  ) : (
    <div className={shell}>{inner}</div>
  );
}
