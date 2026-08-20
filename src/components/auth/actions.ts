"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";
import { titleCase, normalizePhone } from "@/lib/normalize";
import { batchTypeFromLeaving } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/verification-mail";
import { verifyHumanFromForm } from "@/lib/turnstile";
import { BOT_CHECK_FAILED } from "@/lib/bot-check-message";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { mintHumanPass } from "@/lib/human-pass";
import { hasPassedTrivia } from "./trivia-actions";

export async function registerUser(formData: FormData) {
  // The trivia gate is enforced server-side: a valid signed pass cookie must be
  // present, so the gate cannot be skipped by jumping straight to register.
  if (!(await hasPassedTrivia())) {
    return { error: "Please answer the entry question before signing up." };
  }

  // Bulk account creation is what a bot farm actually wants from this app
  // (audit H22), so signup proves a human server-side: a Turnstile token
  // from the widget, or the QA scripts' dev bypass, which is refused
  // outright in production builds.
  const ip = await clientIp();
  if (!(await verifyHumanFromForm(formData, ip))) {
    return { error: BOT_CHECK_FAILED };
  }

  const password = formData.get("password") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // The consent box (audit H12) is enforced HERE, not just as a `required`
  // attribute in the form: a POST that skips the browser must still carry it.
  // The tick is recorded as a timestamp on the row, which is the receipt
  // GDPR Art. 7 asks for.
  if (formData.get("consent") !== "on") {
    return { error: "Please agree to the terms and the privacy policy to join." };
  }

  const accountType = (formData.get("accountType") as string) || "alumnus";
  const isAlum = accountType === "alumnus";
  const num = (key: string) =>
    formData.get(key) ? Number(formData.get(key)) : undefined;
  const rawPhone = (formData.get("phone") as string) || "";
  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    password,
    phone: rawPhone.trim() || undefined,
    accountType,
    // Alumni give their batch directly plus the two plain years they joined
    // and left; the board credential is derived below. Teachers give the same
    // two years (their tenure, stored as taughtFrom/taughtUntil instead) and
    // no batch; a blank "left" means they are still at the school.
    yearJoined: num("yearJoined"),
    yearLeft: num("yearLeft"),
    batchYear: isAlum ? num("batchYear") : undefined,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (
    parsed.data.yearJoined != null &&
    parsed.data.yearLeft != null &&
    parsed.data.yearLeft < parsed.data.yearJoined
  ) {
    return { error: "The year you left cannot be before the year you joined." };
  }

  // batchYear is written straight through (the person told us their batch).
  // batchType (the board credential) is the only derived value now, worked out
  // from the year they left and their batch.
  let batchYear: number | null = null;
  let batchType: "ICSE" | "ISC" | null = null;
  if (isAlum) {
    batchYear = parsed.data.batchYear!;
    batchType = batchTypeFromLeaving(parsed.data.yearLeft!, batchYear);
  }

  // Metered from here, per IP, AFTER validation: a member fumbling the form
  // never spends budget, but both of the things worth metering sit past this
  // line — the "already exists" answer (the membership oracle, audit M1) and
  // the row creation itself.
  const limited = await rateLimit("signup", ip);
  if (!limited.ok) return { error: limited.error };

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return { error: "An account with this email already exists. Try signing in instead." };
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12);

  // First name and surname are collected separately but stored as one plain
  // name, joined by a single space. Both halves are already trimmed by the
  // schema; titleCase silently fixes casing (all-caps or all-lowercase typing)
  // so "AMY IYER" and "amy iyer" both store as "Amy Iyer".
  const name = `${titleCase(parsed.data.firstName)} ${titleCase(parsed.data.lastName)}`;

  // Phone is optional and never verified; we only normalize it to digits with
  // an optional leading "+" so every stored number reads the same way.
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;

  // A teacher's "left" year decides which of the two teacher account types
  // this is: filled in means their time at the school is behind them
  // (ex_teacher, "Former teacher" everywhere batchLine renders), blank means
  // they are still there and the profile reads "to present". The signup
  // toggle only says "Teacher"; nobody is asked to self-classify.
  const storedAccountType = isAlum
    ? "alumnus"
    : parsed.data.yearLeft != null
      ? "ex_teacher"
      : "teacher";

  // Create the user. gradeJoined is deliberately not written here: sign-up now
  // takes the batch directly, so that column stays untouched. The two year
  // columns are strictly student facts; a teacher's years land in the tenure
  // pair instead so neither reading ever has to guess what a column means.
  const user = await prisma.user.create({
    data: {
      name,
      email: parsed.data.email,
      password: hashedPassword,
      phone,
      accountType: storedAccountType,
      batchType,
      batchYear,
      yearJoined: isAlum ? (parsed.data.yearJoined ?? null) : null,
      yearLeft: isAlum ? (parsed.data.yearLeft ?? null) : null,
      taughtFrom: isAlum ? null : (parsed.data.yearJoined ?? null),
      taughtUntil: isAlum ? null : (parsed.data.yearLeft ?? null),
      // The consent receipt (audit H12). Members who joined before the box
      // existed carry null, which the owner's decision reads as agreement.
      consentAt: new Date(),
    },
  });

  // Every alumnus is auto-added to their batch group ("Batch of {year}"), which
  // is created on demand by the first person from that batch to join. No manual
  // joining. Teachers have no batch and skip this. A failure here must not sink
  // an otherwise-successful registration, so it is best-effort.
  if (isAlum && batchYear != null) {
    try {
      await joinBatchGroup(user.id, batchYear);
    } catch (err) {
      console.error("Batch group auto-join failed", err);
    }
  }

  // The confirmation link goes out now, while they are still at the keyboard,
  // so it is already waiting by the time they finish the setup steps. Also
  // best-effort: an account that exists with an unsent confirmation is
  // recoverable from the banner's resend button, whereas failing the signup
  // over it would lose the whole form they just filled in.
  try {
    await sendVerificationEmail({ id: user.id, name, email: user.email });
  } catch (err) {
    console.error("Verification email failed", err);
  }

  // The signup form signs the new account straight in, which lands in
  // authorize()'s bot check with no widget on screen. This five-minute pass,
  // bound to exactly this address, is how the account just proven human
  // above crosses that door without solving Turnstile twice in one minute.
  await mintHumanPass(user.email);

  return { success: true, email: parsed.data.email };
}

/**
 * Find-or-create the "Batch of {year}" group and add the user as a member.
 * Idempotent on membership via the GroupMember (groupId, userId) unique
 * constraint, so re-running is safe.
 */
async function joinBatchGroup(userId: string, batchYear: number) {
  const name = `Batch of ${batchYear}`;

  // Group.name is not unique in the schema, so match by exact name. The first
  // person from a batch creates the group (they become its creator only to
  // satisfy the required FK; everyone joins as a plain member since a batch
  // group has no keeper).
  let group = await prisma.group.findFirst({
    where: { name },
    select: { id: true },
  });

  if (!group) {
    group = await prisma.group.create({
      data: {
        name,
        description: `Everyone from the batch of ${batchYear}.`,
        visibility: "public",
        creatorId: userId,
      },
      select: { id: true },
    });
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    create: { groupId: group.id, userId, role: "member" },
    update: {},
  });
}
