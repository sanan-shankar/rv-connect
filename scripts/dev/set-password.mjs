#!/usr/bin/env node
/**
 * BREAK GLASS: set a password directly on an account, from this laptop.
 *
 * Why this exists. The security audit's C1 finding was a password-less admin
 * bypass: an unauthenticated POST to /api/auth/admin-login minted a 30-day
 * admin session from an email string alone, and the ordinary login form
 * skipped bcrypt entirely for the admin address. Removing both is the single
 * most important fix in the audit -- but it raised a fair worry from the
 * owner: "don't lock me out of my own site forever."
 *
 * This script is the answer, and it is why that removal needed no ceremony.
 * It depends on nothing the fix touches: no session, no cookie, no API route,
 * no email delivery, no Resend, no browser. It needs only DIRECT_URL from
 * .env, which is already the keys to the whole kingdom -- anyone who can run
 * this could already read every row by hand. So it adds no new exposure.
 *
 * It is NOT importable, NOT a server action, NOT reachable over HTTP. It is a
 * file you run on the machine that already holds the database credential.
 *
 * Usage:
 *   node scripts/dev/set-password.mjs you@example.com 'the-new-password'
 *   node scripts/dev/set-password.mjs you@example.com            (prompts, hidden)
 *   node scripts/dev/set-password.mjs you@example.com --admin    (also grant admin)
 *
 * --admin replaces the signIn callback that used to re-promote whoever
 * matched ADMIN_EMAIL on every sign-in. Same recovery, but deliberate, local,
 * and leaving a person rather than an environment variable in charge of who
 * administers the community.
 */
import { createInterface } from "node:readline";
import pg from "pg";
import { readEnv } from "./_env.mjs";
import bcrypt from "bcryptjs";
import { withDatabaseTls } from "../../src/lib/db-tls.ts";

/* Same loader the sibling run-sql.mjs uses: read .env by hand rather than
   pulling in dotenv, and never print the connection string. */

function askHidden(question) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    /* Suppress the echo so the password never lands in the terminal
       scrollback or in a screen recording. */
    const onData = () => rl.output.write("\x1B[2K\x1B[200D" + question);
    rl.input.on("data", onData);
    rl.question(question, (answer) => {
      rl.input.off("data", onData);
      rl.output.write("\n");
      rl.close();
      res(answer);
    });
  });
}

const argv = process.argv.slice(2);
const makeAdmin = argv.includes("--admin");
const [email, passwordArg] = argv.filter((a) => a !== "--admin");
if (!email) {
  console.error("Usage: node scripts/dev/set-password.mjs <email> [password]");
  process.exit(1);
}

const env = readEnv();
const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  console.error("No DIRECT_URL or DATABASE_URL in .env");
  process.exit(1);
}

const password = passwordArg ?? (await askHidden("New password (hidden): "));
/* The same floor the signup and reset paths enforce (validators.ts). A break
   glass tool that quietly accepts a weaker password than the front door is
   how the front door stops meaning anything. */
if (!password || password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

/* Cost 12, matching src/components/auth/actions.ts and email-actions.ts. If
   those ever change, this must change with them or the owner's own hash
   becomes the odd one out. */
const hash = await bcrypt.hash(password, 12);

const client = new pg.Client(withDatabaseTls(url));
await client.connect();
try {
  /* emailVerified is set alongside the password on purpose: an account that
     can sign in but has never confirmed its address hits the verification
     gate on every write, which for the owner's own account would look
     exactly like the lockout this script exists to prevent. */
  const { rows } = await client.query(
    `UPDATE "User"
        SET password = $1,
            "emailVerified" = COALESCE("emailVerified", now()),
            role = CASE WHEN $3 THEN 'admin' ELSE role END,
            -- Same rule the app's own reset follows: changing the password
            -- ends every session already signed in on this account. A break
            -- glass tool that left the intruder's cookie alive would be the
            -- one path around the revocation it exists to provide.
            "credentialVersion" = "credentialVersion" + 1
      WHERE lower(email) = lower($2)
      RETURNING email, role, "verifyState", ("emailVerified" IS NOT NULL) AS email_confirmed`,
    [hash, email, makeAdmin]
  );
  if (rows.length === 0) {
    console.error(`No account found for ${email}`);
    process.exitCode = 1;
  } else {
    const u = rows[0];
    console.log(`Password set for ${u.email}`);
    console.log(`  role=${u.role}  verifyState=${u.verifyState}  emailConfirmed=${u.email_confirmed}`);
    console.log(`\nSign in at /login with that address and the password you just set.`);
  }
} finally {
  await client.end();
}
