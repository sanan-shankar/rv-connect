import { z } from "zod/v4";
import { ERA_VALUES } from "./collection";
import { emailField } from "./email-address";
import { valleyYear } from "./utils";

/**
 * A school year, bounded below by the year Rishi Valley opened and above by
 * this year in the valley (plus `ahead`, for a batch that has not graduated).
 *
 * The ceiling is a `.refine`, not a `.max`, on purpose. `.max(n)` takes a
 * NUMBER, which Zod evaluates once when this module is first imported -- so a
 * warm serverless instance that booted in December kept rejecting the new year
 * for as long as it stayed warm, and every instance rejected it for the 5.5
 * hours between IST midnight and UTC midnight regardless (audit Lows 40, 50,
 * 108, 112). A refine runs per parse, against the valley's clock.
 */
function yearField(opts: { ahead?: number; tooLate: string } = { tooLate: "That year hasn't happened yet" }) {
  const ahead = opts.ahead ?? 0;
  return z
    .number()
    .int()
    .min(1926, "Rishi Valley opened in 1926")
    .refine((y) => y <= valleyYear() + ahead, opts.tooLate);
}

// Alumni now give their batch directly ("the year your 12th-grade class
// graduated, even if you left earlier") plus the two plain years they joined
// and left. batchYear is written straight through; batchType (the board
// credential) is derived server-side from yearLeft + batchYear. The old
// gradeJoined field is retired from sign-up (its column is kept but untouched).
//
// First name and surname are collected as two separate fields and joined with
// a single space into the stored `name` (see registerUser), so each half is
// validated and trimmed on its own here. Phone is optional and free-form here;
// registerUser runs it through normalizePhone before storing.
export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().min(1, "Surname is required").max(50),
    email: emailField(),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    phone: z.string().trim().max(24).optional(),
    accountType: z.enum(["alumnus", "teacher", "ex_teacher"]).default("alumnus"),
    yearJoined: yearField({ tooLate: "That year hasn't happened yet" }).optional(),
    yearLeft: yearField({ ahead: 1, tooLate: "That year hasn't happened yet" }).optional(),
    batchYear: yearField({ ahead: 7, tooLate: "That batch year looks too far ahead" })
      .optional(),
  })
  .refine(
    (d) =>
      d.accountType !== "alumnus" ||
      (d.yearJoined != null && d.yearLeft != null && d.batchYear != null),
    {
      message: "Alumni need the year they joined, the year they left, and their batch.",
      path: ["batchYear"],
    }
  )
  // Teachers give the year they started; the year they stopped is optional
  // because leaving it blank is how "still at Rishi Valley" is said.
  .refine((d) => d.accountType === "alumnus" || d.yearJoined != null, {
    message: "Please add the year you joined.",
    path: ["yearJoined"],
  });

// Settings uses the same direct-batch model as sign-up: batchYear is entered
// directly, alongside the plain yearJoined/yearLeft. batchType is derived
// server-side from yearLeft + batchYear via batchTypeFromLeaving (see
// updateUserProfile), so it is an output and not part of this input schema.
// The retired gradeJoined field is deliberately absent here; its DB column is
// left untouched.
export const profileSchema = z.object({
  name: z.string().min(2).max(100),
  bio: z.string().max(1000).optional(),
  about: z.string().max(4000).optional(),
  // The email shown on the profile. Blank means "use my sign-in email"; editing
  // it never changes the login email. Validated loosely (an empty string is
  // allowed and treated as unset by the action).
  displayEmail: z.union([z.literal(""), emailField()]).optional(),
  currentCity: z.string().max(100).optional(),
  secondaryCity: z.string().trim().max(100).optional(),
  workplace: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  // max(24) matches signupSchema's phone cap (it was 20, so a number accepted
  // at sign-up could fail to save in settings).
  phone: z.string().max(24).optional(),
  // Multiple phone numbers (the settings repeater). Free-form here;
  // updateUserProfile runs each through normalizePhone before storing and
  // mirrors the first into legacy `phone`. min(4) rejects stray fragments,
  // max(24) matches the single-phone cap, and 5 numbers is plenty of reach
  // for one person.
  phones: z.array(z.string().trim().min(4).max(24)).max(5).optional(),
  instagram: z.string().max(100).optional(),
  linkedin: z.string().max(200).optional(),
  facebook: z.string().max(200).optional(),
  // "Other links" repeater in Contact: user-defined label + URL rows. https
  // only, both to keep the "Find them" pills honest and to rule out
  // javascript:/data: hrefs sneaking through as a "URL".
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        url: z
          .string()
          .trim()
          .max(300)
          .refine((v) => /^https:\/\//i.test(v), "Links must start with https://")
          .refine((v) => {
            try {
              new URL(v);
              return true;
            } catch {
              return false;
            }
          }, "That doesn't look like a valid URL"),
      })
    )
    .max(10)
    .optional(),
  accountType: z.enum(["alumnus", "teacher", "ex_teacher"]).optional(),
  // Batch is a direct field now (headline identity). The collapsible "work it
  // out" path still derives it from the three schooling facts server-side.
  batchYear: yearField({ ahead: 7, tooLate: "That batch year looks too far ahead" }).optional(),
  yearJoined: yearField().optional(),
  yearLeft: yearField({ ahead: 1, tooLate: "That year hasn't happened yet" }).optional(),
  admissionNumber: z.number().int().min(0).max(10000).optional(),
  taughtFrom: yearField().optional(),
  taughtUntil: yearField().optional(),
  subjects: z.string().max(200).optional(),
});

// The Contact block (updateContactMethods) writes exactly these columns, and
// used to write them with NO validation at all — no length cap, no https check
// on links, no email format (audit M18). Its rules are the same ones
// profileSchema already applies to the same columns; this is the second write
// path to them, so it gets the same gate. The read side (parseUserLinks) also
// re-checks `^https://`, but a bad value must never reach the column in the
// first place. Nullable because the action passes explicit nulls for cleared
// fields; blank rows are dropped by the caller before this runs.
export const contactMethodsSchema = z.object({
  displayEmail: z
    .union([z.literal(""), z.email("Please enter a valid email").max(200)])
    .nullable(),
  // Free-form here (each is run through normalizePhone before storing); the cap
  // matches signupSchema's phone, and five numbers is plenty of reach.
  phones: z.array(z.string().trim().max(24)).max(5),
  instagram: z.string().max(100).nullable(),
  linkedin: z.string().max(200).nullable(),
  facebook: z.string().max(200).nullable(),
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        url: z
          .string()
          .trim()
          .max(300)
          .refine((v) => /^https:\/\//i.test(v), "Links must start with https://")
          .refine((v) => {
            try {
              new URL(v);
              return true;
            } catch {
              return false;
            }
          }, "That doesn't look like a valid URL"),
      })
    )
    .max(10),
});

export const postSchema = z.object({
  content: z.string().min(1, "Post cannot be empty").max(20000),
  kind: z.enum(["post", "letter"]).optional(),
  title: z.string().max(160).optional(),
  // No `tag`: post types were abandoned 2026-08-02 (owner call). The Post.tag
  // column survives for a future cleanup migration and has no reader or writer.
  targetBatches: z.string().optional(),
  groupId: z.string().optional(),
  images: z.string().optional(),
  pollOptions: z.array(z.string().min(1).max(200)).min(2).max(4).optional(),
  // City-scoped audience: the poster's own city string, or omitted for "Everyone".
  // Validated server-side against the poster's actual UserPlace list (createPost).
  cityScope: z.string().max(120).optional(),
  // Save this letter as a draft instead of publishing it. Only meaningful
  // when kind === "letter" (createPost ignores it for a plain post).
  saveAsDraft: z.boolean().optional(),
  // The composer's "Also add to the Collection" tick. Only meaningful when the
  // post actually carries images, and never for a draft (see createPost).
  toCollection: z.boolean().optional(),
});

// The Collection contribute form (contribute-dialog.tsx) simplified to three
// facts: a caption, which part of school it's from (free text, no longer a
// fixed picklist), and when. "When" is either an exact year (with an optional
// month) or, when the contributor isn't sure, a decade fallback from ERA_VALUES
// (see docs: subject tagging and the bird/species free-tag field were removed
// per the owner's rework, 2026-07-18).
export const photoSchema = z
  .object({
    caption: z.string().trim().max(300).optional(),
    area: z.string().trim().max(100).optional(),
    photoYear: yearField().optional(),
    photoMonth: z.number().int().min(1).max(12).optional(),
    era: z.enum(ERA_VALUES as [string, ...string[]]).optional(),
    datePrecision: z.enum(["month", "year", "decade", "unknown"]).optional(),
  })
  .refine((d) => d.photoMonth === undefined || d.photoYear !== undefined, {
    message: "A month needs a year",
    path: ["photoMonth"],
  });

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(1000),
  postId: z.string().min(1),
  parentId: z.string().optional(),
});

export const reportSchema = z.object({
  postId: z.string().min(1),
  reason: z.string().min(1, "Please provide a reason").max(500),
});

// Messages between a member and the admins (src/lib/admin-threads.ts). The
// only required field anywhere in this feature is the text itself: the kind
// chip and the screenshot are both optional, so the fast path stays "type one
// thing, send". `imageUrl` is checked again server-side against our own upload
// prefixes (isUploadedImageUrl) so an arbitrary remote URL can't be injected.
export const adminMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a line first and we'll take it from there")
    .max(4000, "That's longer than we can take in one go. Trim it a little?"),
  kind: z.enum(["bug", "idea", "message"]).optional(),
  imageUrl: z.string().max(500).optional(),
});
