#!/usr/bin/env node
/**
 * Where the security audit actually stands, proved from the code.
 *
 * The problem this solves. The security audit was 85 findings (now condensed
 * into docs/SECURITY.md; the full text lives in git history) and
 * the work spans many sessions. A status column in a markdown file is a claim:
 * it is written by whoever last touched it, it goes stale the moment someone
 * edits code without editing prose, and a fresh session has no way to tell a
 * closed finding from one that was merely written up as closed. That is
 * exactly the failure the audit itself kept finding -- documentation that
 * contradicts the implementation (R7).
 *
 * So this asks the tree instead. Every check below is a mechanical probe of
 * real files. It cannot be satisfied by editing a document, and a regression
 * re-opens a finding automatically.
 *
 * It is a status board, NOT a test suite. A probe answering "fixed" means the
 * shape of the fix is present -- the auth() call is there, the column exists,
 * the header is configured. It does not prove the fix is correct. Correctness
 * is what `npm run check`, the visual suite and the written verification notes
 * in progress.md are for. Read this to know WHERE you are, not whether you
 * were right.
 *
 * Usage:
 *   node scripts/qa/audit-status.mjs             # the board
 *   node scripts/qa/audit-status.mjs --open      # only what is left
 *   node scripts/qa/audit-status.mjs --json      # for scripting
 *   node scripts/qa/audit-status.mjs --fail-on-open critical,high
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { balancedBody } from "../../src/lib/test-fn-body.mjs";

const ROOT = process.cwd();
const read = (p) => { try { return readFileSync(join(ROOT, p), "utf8"); } catch { return ""; } };
const has = (p) => existsSync(join(ROOT, p));
const pkg = () => { try { return JSON.parse(read("package.json")); } catch { return {}; } };

/** Source with comments removed.
 *
 *  Every probe that asks "does this file still mention X" MUST go through
 *  this. The first run of this script reported C1-a and C1-c as still open
 *  because the probes were matching the comments explaining that those very
 *  findings had been fixed -- a status board that punishes you for writing
 *  down why. `//` is only treated as a comment when it is not part of a
 *  scheme like https://, which is the one case that matters here. */
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/** Every file under a directory, recursively, filtered by extension. */
function walk(dir, exts = [".ts", ".tsx", ".mjs"], acc = []) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return acc;
  for (const name of readdirSync(full)) {
    const rel = join(dir, name);
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "generated" || name === ".next") continue;
      walk(rel, exts, acc);
    } else if (exts.some((e) => name.endsWith(e))) acc.push(rel);
  }
  return acc;
}

/** Source text of every server action module and API route. */
function appSources() {
  return [...walk("src/app"), ...walk("src/components"), ...walk("src/lib")]
    .filter((p) => !p.includes("/lab/"))
    .map((p) => ({ path: p, text: read(p) }));
}

/** The body of a named function, brace-matched from its declaration.
 *
 *  Finding the body's opening brace is fiddlier than "the next {", and
 *  getting it wrong is dangerous rather than merely annoying: it makes a
 *  guarded function look unguarded, which reads as a finding still being open.
 *  Three real cases bit this during Phase 1 and 2:
 *    authorize(credentials) {}                  -- METHOD, not `function foo`
 *    loadComments(postId, opts?: { take })      -- brace in a PARAMETER type
 *    loadDirectoryPage(...): Promise<{ users }> -- brace in a RETURN type
 *
 *  The brace-matching itself is `balancedBody`, shared with every shape test
 *  in src/lib -- this file kept a byte-identical copy of it, and this file is
 *  the one that decides what the security status board reports. What stays
 *  here is only the part that is genuinely its own: the two DECLARATION
 *  shapes to look for. The RegExp is handed over rather than the match index,
 *  because a number passed as `decl` would be coerced through `text.match()`
 *  and silently find something else.
 */
function fnBody(text, name) {
  for (const decl of [
    new RegExp(`(export\\s+)?(async\\s+)?function\\s+${name}\\b`),
    new RegExp(`(^|[\\s,{])(async\\s+)?${name}\\s*\\(`, "m"),
  ]) {
    if (decl.test(text)) return balancedBody(text, decl);
  }
  return null;
}

const ok   = (note) => ({ state: "fixed", note });
const open = (note) => ({ state: "open", note });
const acc  = (note) => ({ state: "accepted", note });
const owner= (note) => ({ state: "owner", note });

/* ------------------------------------------------------------------ *
 *  The findings. `probe` returns one of the four helpers above.
 * ------------------------------------------------------------------ */
const CHECKS = [
  // ---------------------------------------------------------------- CRITICAL
  { id: "C1-a", sev: "critical", title: "Password-less admin branch in authorize()", probe: () => {
      const s = decomment(read("src/lib/auth.ts"));
      const body = fnBody(s, "authorize") ?? s;
      return /ADMIN_EMAIL/.test(body)
        ? open("authorize() still references ADMIN_EMAIL")
        : ok("no ADMIN_EMAIL in authorize(); role comes from the row");
    }},
  { id: "C1-b", sev: "critical", title: "Unauthenticated /api/auth/admin-login", probe: () =>
      has("src/app/api/auth/admin-login/route.ts")
        ? open("route file still present")
        : ok("route deleted; replaced by dev-login (404 in production)") },
  { id: "C1-c", sev: "critical", title: "Admin email compiled into the browser bundle", probe: () => {
      const hits = appSources().filter((f) => decomment(f.text).includes("NEXT_PUBLIC_ADMIN_EMAIL"));
      const inEnv = /^NEXT_PUBLIC_ADMIN_EMAIL=/m.test(read(".env"));
      if (hits.length) return open(`read in ${hits.length} file(s): ${hits[0].path}`);
      if (inEnv) return open("still set in .env (unused, but delete it from Vercel too)");
      return ok("not referenced in src/ and not in .env");
    }},
  { id: "C2", sev: "critical", title: "Any member can delete every image in R2", probe: () => {
      // The fix has two halves, and both must be present. (1) Keys are minted
      // server-side under the uploader's own prefix (storage.ownerPrefix), so
      // ownership is provable from the key. (2) Every write that accepts
      // client image URLs runs them through ownedUploadUrls before storing, so
      // a row can only ever hold URLs its owner minted. Behaviour is
      // scripts/qa/phase5-probe.mjs. See also the ownership rule's unit test.
      const store = decomment(read("src/lib/storage.ts"));
      const scoped = /export function ownerPrefix\b/.test(store) && /KNOWN_ROOTS/.test(store);
      const feed = decomment(read("src/app/(main)/feed/actions.ts"));
      const validatedOnWrite = /ownedUploadUrls\(/.test(feed);
      const hasRule = has("src/lib/upload-ownership-rule.ts");
      if (scoped && validatedOnWrite && hasRule) {
        return ok("keys owner-scoped (ownerPrefix); post images validated by ownedUploadUrls on write");
      }
      const missing = [];
      if (!scoped) missing.push("keys not owner-scoped in storage.ts");
      if (!validatedOnWrite) missing.push("createPost does not validate image ownership");
      if (!hasRule) missing.push("no ownership rule");
      return open(missing.join("; "));
    }},
  { id: "C3", sev: "critical", title: "Dependency advisories (auth library, sharp)", probe: () => {
      const d = { ...pkg().dependencies, ...pkg().devDependencies };
      const na = d["next-auth"] ?? "";
      const sharp = d.sharp ?? "";
      const naOk = /beta\.(3[2-9]|[4-9]\d)/.test(na) || /^\^?[6-9]\./.test(na);
      const shOk = /0\.3[5-9]|0\.[4-9]\d/.test(sharp);
      if (naOk && shOk) return ok(`next-auth ${na}, sharp ${sharp}`);
      return open(`${naOk ? "" : `next-auth ${na} (need >= 5.0.0-beta.32); `}${shOk ? "" : `sharp ${sharp} (need >= 0.35)`}`);
    }},
  { id: "C4", sev: "critical", title: "No verified DB backup / no media backup", probe: () => {
      const b = read(".github/workflows/backup.yml");
      const db = /pg_dump/.test(b), media = /media/.test(b);
      return db && media
        ? ok("nightly pg_dump + media copy to a private R2 bucket")
        : open(`${db ? "" : "no pg_dump job; "}${media ? "" : "no media copy job"}`);
    }},

  // -------------------------------------------------------------------- HIGH
  { id: "H1", sev: "high", title: "loadDirectoryPage has no authentication check", probe: () => {
      const body = fnBody(read("src/app/(main)/directory/actions.ts"), "loadDirectoryPage");
      if (!body) return open("loadDirectoryPage not found");
      return /auth\(\)|requireVerified/.test(body) ? ok("guarded") : open("no auth() call in the action body");
    }},
  { id: "H3", sev: "high", title: "Private-content IDOR (comments/likes/polls)", probe: () => {
      const s = read("src/app/(main)/feed/actions.ts");
      const guarded = ["loadComments", "createComment", "toggleLike", "toggleBookmark", "votePoll"]
        .filter((n) => { const b = fnBody(s, n); return b && /canViewPost|assertCanViewPost/.test(b); });
      return guarded.length === 5
        ? ok("all five interaction paths re-derive post visibility")
        : open(`${guarded.length}/5 guarded by a visibility check`);
    }},
  { id: "H4", sev: "high", title: "isBlocked never enforced (blocking is cosmetic)", probe: () => {
      const s = decomment(read("src/lib/auth.ts"));
      return /isBlocked/.test(s) ? ok("read in the auth layer") : open("isBlocked absent from src/lib/auth.ts");
    }},
  { id: "H5", sev: "high", title: "reportUser strips any member's verified badge", probe: () => {
      const b = fnBody(decomment(read("src/components/posts/report-action.ts")), "reportUser");
      if (!b) return open("reportUser not found");
      if (/verifyState:\s*"flagged"/.test(b))
        return open("a single report still writes verifyState:'flagged'");
      // Phase 3 removed the badge-strip and member-gated reporting; the rest
      // of H5 (per-pair dedupe, threshold, rate limit) is Phase 7 and keeps
      // this open until it lands.
      if (!/@@unique\(\[reporterId, reportedUserId\]\)/.test(read("prisma/schema.prisma")))
        return open("badge-strip gone, reporting member-gated; per-pair dedupe/threshold still missing (Phase 7)");
      return ok("no verifyState write, and repeat reports deduped per reporter");
    }},
  { id: "H6", sev: "high", title: "No rate limiting or lockout on authentication", probe: () => {
      // Both keys must be read at the door AND spent somewhere: a check
      // that never consumes is decoration. Behaviour is phase4-probe's job.
      const s = decomment(read("src/lib/auth.ts"));
      const wired = /hasBudget\("login-ip"/.test(s) && /hasBudget\("login-account"/.test(s) && /consume\("login-/.test(s);
      return wired ? ok("per-IP + per-account failure limits in authorize(); run phase4-probe for behaviour") : open("no limiter on the credentials path");
    }},
  { id: "H7", sev: "high", title: "No security headers at all", probe: () => {
      const c = read("next.config.ts");
      if (!/headers\s*\(/.test(c)) return open("next.config.ts defines no headers()");
      const want = ["Content-Security-Policy", "X-Frame-Options", "Referrer-Policy", "X-Content-Type-Options", "Permissions-Policy"];
      const missing = want.filter((h) => !c.includes(h));
      return missing.length ? open(`headers() present but missing: ${missing.join(", ")}`) : ok("all five headers configured");
    }},
  { id: "H8", sev: "high", title: "deleteAccount throws for anyone who filed a report", probe: () => {
      // Phase 8 moved deletion into purgeUserAccount (account-purge.ts),
      // shared by adminDeleteUser and the retention sweep's grace purge; the
      // filed-report clearing must sit there, before the user.delete.
      const purge = read("src/lib/account-purge.ts");
      if (!purge) return open("account-purge.ts not found");
      return /report\.deleteMany/.test(decomment(purge))
        ? ok("purgeUserAccount clears filed reports first")
        : open("no report.deleteMany in purgeUserAccount");
    }},
  { id: "H9", sev: "high", title: "Deletion never removes stored image bytes", probe: () => {
      // Three parts, all required: the purge deletes R2 objects, the admin
      // delete routes through it, and the retention sweep purges accounts
      // whose 60-day grace window has closed (nothing else ever finalises a
      // self-deletion). Run phase8-probe for the behavioural proof against
      // the real bucket.
      const purge = decomment(read("src/lib/account-purge.ts"));
      if (!/delImage/.test(purge)) return open("purgeUserAccount does not delete R2 objects");
      if (!/purgeUserAccount/.test(decomment(read("src/app/(main)/admin/people/actions.ts"))))
        return open("adminDeleteUser does not route through purgeUserAccount");
      if (!/purgeUserAccount/.test(decomment(read("src/lib/retention.ts"))))
        return open("retention sweep does not purge grace-expired accounts");
      return ok("purge deletes R2 objects; both deletion paths route through it");
    }},
  { id: "H10", sev: "high", title: "No audit log", probe: () =>
      /model\s+AuditLog\b/.test(read("prisma/schema.prisma"))
        ? ok("AuditLog model present") : open("no AuditLog model in the schema") },
  { id: "H11", sev: "high", title: "No monitoring, alerting or error tracking", probe: () => {
      const d = { ...pkg().dependencies };
      return d["@sentry/nextjs"] && has("src/instrumentation.ts")
        ? ok(`@sentry/nextjs ${d["@sentry/nextjs"]}`) : open("no Sentry instrumentation");
    }},
  { id: "H12", sev: "high", title: "No privacy policy, consent or transparency layer", probe: () => {
      const routes = walk("src/app").filter((p) => /privacy|terms|guidelines/i.test(p) && p.endsWith("page.tsx"));
      if (routes.length < 3) return open(`only ${routes.length} of the 3 policy pages exist`);
      // The pages alone are not the finding closed: signup must REQUIRE the
      // consent tick server-side and record it on the row.
      const signup = decomment(read("src/components/auth/actions.ts"));
      if (!/consent/.test(signup) || !/consentAt/.test(signup))
        return open("policy pages exist but signup records no consent");
      return ok(`${routes.length} policy pages; signup consent enforced and stamped`);
    }},
  { id: "H13", sev: "high", title: "Cross-border transfer, no DPAs", probe: () => owner("owner action: sign DPAs with Vercel, Supabase, Cloudflare, Resend, Razorpay") },
  { id: "H14", sev: "high", title: "No breach-detection capability", probe: () =>
      /model\s+AuditLog\b/.test(read("prisma/schema.prisma"))
        ? ok("audit log in place (alerting still owner-side)") : open("depends on H10") },
  { id: "H15", sev: "high", title: "Production and dev share one database", probe: () =>
      acc("owner declined a staging database 2026-08-19; C4 backup removes the unrecoverable outcome") },
  { id: "H16", sev: "high", title: "No CI/CD, no branch protection, no security gate", probe: () => {
      if (!has(".github/workflows/check.yml")) return open("no check workflow");
      const w = read(".github/workflows/check.yml");
      if (!/npm run check/.test(w)) return open("the workflow does not run the gate");
      // The real mechanisms, not a keyword: the allowlisted npm-audit gate
      // (a bare `npm audit` would be permanently red on the accepted
      // residual) and this very script as a regression tripwire. Both were
      // extra CI-only STEPS until 2026-09-02, which is why this used to read
      // check.yml for them; that arrangement made CI a superset of the local
      // gate, so a clean `npm run check` could still fail the push. They are
      // gates inside check.mjs now, and that is where the proof lives.
      const c = read("scripts/qa/check.mjs");
      if (!/npm-audit-gate\.mjs/.test(c)) return open("the gate does not run the npm-audit gate");
      if (!/audit-status\.mjs"[\s\S]{0,80}--fail-on-open/.test(c)) return open("nothing fails on a re-opened critical/high");
      return ok("CI runs `npm run check`, which includes the npm-audit gate and audit-status --fail-on-open");
    }},
  { id: "H17", sev: "high", title: "No security tests", probe: () => {
      const tests = walk("src", [".test.mjs", ".test.ts"]).concat(walk("e2e", [".spec.ts"]));
      const sec = tests.filter((p) => /auth|security|permission|gate|access/i.test(p));
      return sec.length ? ok(`${sec.length} security-related test file(s)`) : open(`${tests.length} test files, none covering authorization`);
    }},
  { id: "H18", sev: "high", title: "Unbounded queries that will OOM", probe: () => {
      const admin = read("src/app/(main)/admin/(index)/page.tsx");
      const byBatch = read("src/app/api/users-by-batch/route.ts");
      const bad = [];
      if (/user\.findMany\(\{(?![^}]*take:)/s.test(admin) && !/take:/.test(admin)) bad.push("admin/page.tsx");
      if (byBatch && !/take:/.test(byBatch)) bad.push("users-by-batch");
      return bad.length ? open(`no take: in ${bad.join(", ")}`) : ok("bounded");
    }},
  { id: "H19", sev: "high", title: "No RTO/RPO, runbook or incident-response plan", probe: () => {
      const ops = read("docs/OPERATIONS.md");
      return /restore|RTO|RPO/i.test(ops) ? ok("restore procedure documented in OPERATIONS.md") : open("no documented restore/RTO/RPO");
    }},
  { id: "H20", sev: "high", title: "Object storage public-read and permanent", probe: () =>
      acc("owner chose option A (leave public) 2026-08-19; revisit post-launch") },
  { id: "H21", sev: "high", title: "verifyState gates nothing (verification is decorative)", probe: () => {
      // Existence is not application: the gate must be defined AND sitting in
      // the write paths. Correctness beyond shape is scripts/qa/phase3-probe.mjs.
      const gate = decomment(read("src/lib/member-gate.ts"));
      if (!/verifyState !== "verified"/.test(gate)) return open("no member-tier gate; verifyState still unread by any permission");
      /* Follow the indirection. "one door per kind of route" (60e8ee0) moved the
         gate into src/lib/api-gate.ts, so grepping a route for the literal call
         reported a gate that was very much still applied -- and failed CI on
         main for a day. A route counts as gated if it calls
         requireVerifiedMember itself, OR calls a vetter that does. Splitting on
         the export keeps each vetter's body to itself, so a gated neighbour
         cannot vouch for an ungated one. */
      const apiGate = decomment(read("src/lib/api-gate.ts"));
      const vetters = apiGate
        .split(/\bexport async function /)
        .slice(1)
        .map((body) => ({ name: (body.match(/^(\w+)/) ?? [])[1], body }))
        .filter((v) => v.name && /requireVerifiedMember\(/.test(v.body))
        .map((v) => v.name);
      const gated = (src) =>
        /requireVerifiedMember\(\)/.test(src) ||
        vetters.some((v) => new RegExp(`\\b${v}\\(`).test(src));
      const missing = [];
      if (!gated(decomment(read("src/app/(main)/feed/actions.ts")))) missing.push("feed actions");
      if (!gated(decomment(read("src/app/api/upload/route.ts")))) missing.push("upload route");
      if (missing.length) return open(`gate exists but unused in: ${missing.join(", ")}`);
      if (!vetters.length) return open("api-gate.ts defines no vetter that calls requireVerifiedMember");
      return ok(`requireVerifiedMember reaches the write paths (via ${vetters.join(", ")}); run phase3-probe for behaviour`);
    }},
  { id: "H22", sev: "high", title: "No bot defence on any public entry point", probe: () => {
      // Verified at all three doors, or it is not closed: login (inside
      // authorize, the one place a direct POST cannot skip), signup, reset.
      const missing = [];
      // The form doors verify through verifyHumanFromForm, which wraps
      // verifyTurnstile — the simplify pass consolidated them post-Phase 4.
      const door = /verifyTurnstile\(|verifyHumanFromForm\(/;
      if (!door.test(decomment(read("src/lib/auth.ts")))) missing.push("login");
      if (!door.test(decomment(read("src/components/auth/actions.ts")))) missing.push("signup");
      if (!door.test(decomment(read("src/components/auth/email-actions.ts")))) missing.push("reset");
      if (missing.length === 3) {
        const env = /TURNSTILE/.test(read(".env"));
        return open(env ? "keys in .env but no code verifies them yet" : "no Turnstile anywhere");
      }
      return missing.length ? open(`Turnstile verified on some doors but not: ${missing.join(", ")}`)
        : ok("Turnstile verified server-side on login, signup and reset");
    }},

  // ------------------------------------------------------------------ MEDIUM
  { id: "M2", sev: "medium", title: "No rate limiting on content-creating actions", probe: () => {
      if (!has("src/lib/rate-limit.ts")) return open("no shared limiter module");
      const missing = [];
      if (!/rateLimit\("posts"/.test(decomment(read("src/app/(main)/feed/actions.ts")))) missing.push("posts");
      if (!/rateLimit\("comments"/.test(decomment(read("src/app/(main)/feed/actions.ts")))) missing.push("comments");
      if (!/rateLimit\("uploads"/.test(decomment(read("src/app/api/upload/route.ts")))) missing.push("uploads");
      if (!/rateLimit\("reports"/.test(decomment(read("src/components/posts/report-action.ts")))) missing.push("reports");
      if (!/rateLimit\("catchups"/.test(decomment(read("src/app/(main)/catchups/actions.ts")))) missing.push("catchups");
      return missing.length ? open(`limiter exists but unused on: ${missing.join(", ")}`)
        : ok("one Upstash limiter on posts/comments/uploads/reports/catchups; run phase4-probe for behaviour");
    }},
  { id: "M3", sev: "medium", title: "Public reset requests can exhaust the daily mail budget", probe: () => {
      const b = fnBody(read("src/components/auth/email-actions.ts"), "requestPasswordReset");
      if (!b) return open("requestPasswordReset not found");
      return /rateLimit\("reset"/.test(decomment(b))
        ? ok("reset requests metered per IP before any mail is queued")
        : open("still limited per user id only, never per IP");
    }},
  { id: "M4", sev: "medium", title: "Password reset does not revoke sessions", probe: () =>
      /credentialVersion|sessionsValidFrom/.test(read("prisma/schema.prisma"))
        ? ok("credential epoch column present") : open("no credentialVersion/sessionsValidFrom column") },
  { id: "M6", sev: "medium", title: "Deleted user keeps a working session", probe: () => {
      /* Two halves, and only both together revoke anything: the session
         callback must NOTICE the row is gone (it cannot return null itself --
         its return type is Session), and the auth() wrapper must turn that
         mark into null before any caller sees it. */
      const s = decomment(read("src/lib/auth.ts"));
      const notices = /!dbUser/.test(s) && /session\.invalid\s*=\s*true/.test(s);
      const drops = /session\.invalid[\s\S]{0,80}return null/.test(s);
      if (notices && drops) return ok("missing row marks the session invalid; auth() drops it");
      return open(`${notices ? "" : "session callback does not detect a missing row; "}${drops ? "" : "auth() does not drop invalid sessions"}`);
    }},
  { id: "M7", sev: "medium", title: "Trivia gate: hardcoded fallback secret", probe: () =>
      /rv-connect-trivia-dev-secret/.test(decomment(read("src/components/auth/trivia-actions.ts")))
        ? open("hardcoded fallback secret still present") : ok("no hardcoded fallback") },

  // ---- Phase 5: object deletion and uploads (behaviour: phase5-probe.mjs) ----
  { id: "M10", sev: "medium", title: "Feed/Catch-up accept arbitrary external image URLs", probe: () => {
      // Both write paths must reject a URL this app did not mint. They share
      // ownedUploadUrls, which requires isUploadedImageUrl of every entry.
      const feed = decomment(read("src/app/(main)/feed/actions.ts"));
      const catchups = decomment(read("src/app/(main)/catchups/actions.ts"));
      const missing = [];
      if (!/ownedUploadUrls\(/.test(feed)) missing.push("feed");
      if (!/ownedUploadUrls\(/.test(catchups)) missing.push("catchups");
      return missing.length ? open(`external URLs still accepted in: ${missing.join(", ")}`)
        : ok("post + Catch-up images validated by ownedUploadUrls (origin + ownership)");
    }},
  { id: "M11", sev: "medium", title: "Removed Collection photos stay publicly fetchable", probe: () => {
      const b = fnBody(read("src/app/(main)/collection/actions.ts"), "adminRemovePhoto");
      if (!b) return open("adminRemovePhoto not found");
      return /delImage\(/.test(decomment(b))
        ? ok("adminRemovePhoto deletes the stored bytes, not just the row")
        : open("adminRemovePhoto still keeps the file after hiding the row");
    }},
  { id: "M12", sev: "medium", title: "Collection originals published with EXIF/GPS", probe: () => {
      // The direct path must no longer store the raw original as the canonical
      // url; it re-encodes through sharp (which drops metadata) and stops using
      // publicUrlForKey(input.key) as the stored url.
      const b = fnBody(read("src/app/(main)/collection/actions.ts"), "contributePhotoDirect");
      if (!b) return open("contributePhotoDirect not found");
      const src = decomment(b);
      const reencoded = /sharpImage\([^)]*\)[\s\S]*\.webp\(/.test(src);
      const storesRaw = /url:\s*publicUrlForKey\(input\.key\)/.test(src);
      return reencoded && !storesRaw
        ? ok("direct original re-encoded to strip metadata; raw original not stored")
        : open(storesRaw ? "still stores the raw EXIF-bearing original as the url" : "original not re-encoded");
    }},
  { id: "M13", sev: "medium", title: "Content-type trusted from the client", probe: () => {
      // Magic-byte sniff before sharp on every byte-ingesting path.
      const sniff = decomment(read("src/lib/upload-shared.ts"));
      if (!/export function sniffImageType\b/.test(sniff)) return open("no sniffImageType helper");
      const paths = {
        "upload route": "src/app/api/upload/route.ts",
        finalize: "src/app/api/upload/finalize/route.ts",
        collection: "src/app/(main)/collection/actions.ts",
        avatar: "src/components/settings/actions.ts",
      };
      const missing = Object.entries(paths)
        .filter(([, p]) => !/sniffImageType\(/.test(decomment(read(p))))
        .map(([n]) => n);
      return missing.length ? open(`magic-byte check missing on: ${missing.join(", ")}`)
        : ok("sniffImageType guards every path that ingests client bytes");
    }},
  { id: "M14", sev: "medium", title: "No sharp limitInputPixels (decompression bomb)", probe: () => {
      const img = decomment(read("src/lib/image.ts"));
      if (!/limitInputPixels/.test(img) || !/export function sharpImage\b/.test(img)) {
        return open("no sharpImage helper with limitInputPixels");
      }
      // No call site may still use raw sharp() to open an upload buffer.
      const sites = [
        "src/app/api/upload/route.ts",
        "src/app/api/upload/finalize/route.ts",
        "src/app/(main)/collection/actions.ts",
        "src/components/settings/actions.ts",
        "src/lib/collection-intake.ts",
      ];
      const raw = sites.filter((p) => /\bfrom "sharp"/.test(read(p)));
      return raw.length ? open(`raw sharp import still in: ${raw.join(", ")}`)
        : ok("all five call sites route through sharpImage (limitInputPixels set)");
    }},
  { id: "M16", sev: "medium", title: "Presigned PUT cannot enforce object size", probe: () => {
      // R2 has no content-length-range; the mitigation is a HEAD size check
      // before the object is pulled into memory, on both finalize paths.
      const store = decomment(read("src/lib/storage.ts"));
      if (!/export async function headObjectSize\b/.test(store)) return open("no headObjectSize helper");
      const fin = /headObjectSize\(/.test(decomment(read("src/app/api/upload/finalize/route.ts")));
      const col = /headObjectSize\(/.test(decomment(read("src/app/(main)/collection/actions.ts")));
      return fin && col ? ok("oversized presigned objects HEAD-checked and deleted before fetch")
        : open(`HEAD size check missing on: ${[!fin && "finalize", !col && "collection"].filter(Boolean).join(", ")}`);
    }},
  { id: "M17", sev: "medium", title: "No per-account storage quota", probe: () => {
      if (!/MAX_PHOTOS_PER_ACCOUNT/.test(read("src/lib/upload-shared.ts"))) return open("no quota constant");
      const col = decomment(read("src/app/(main)/collection/actions.ts"));
      return /photoQuotaError\(/.test(col)
        ? ok("Collection contributions capped per account (MAX_PHOTOS_PER_ACCOUNT)")
        : open("quota not enforced on the contribute paths");
    }},

  { id: "M18", sev: "medium", title: "updateContactMethods bypasses profileSchema", probe: () => {
      const b = fnBody(read("src/components/profile/profile-actions.ts"), "updateContactMethods");
      if (!b) return open("updateContactMethods not found");
      return /Schema\.|safeParse|parse\(/.test(b) ? ok("validated") : open("still writes with no Zod validation");
    }},
  { id: "M19", sev: "medium", title: "/lab public in production", probe: () => {
      const p = decomment(read("src/proxy.ts"));
      const i = p.indexOf("publicPaths");
      if (i < 0) return open("publicPaths not found in proxy.ts");
      const arr = p.slice(p.indexOf("[", i), p.indexOf("]", i) + 1);
      return /["'`]\/lab["'`]/.test(arr)
        ? open('"/lab" still listed in publicPaths')
        : ok("/lab no longer public");
    }},
  { id: "M27", sev: "medium", title: "vercel.json cron points at a route that does not exist", probe: () => {
      let cfg; try { cfg = JSON.parse(read("vercel.json")); } catch { return open("vercel.json unreadable"); }
      const missing = (cfg.crons ?? []).filter((c) => {
        const p = c.path.replace(/^\//, "");
        return !has(`src/app/${p}/route.ts`);
      });
      return missing.length ? open(`cron target missing: ${missing.map((c) => c.path).join(", ")}`) : ok("every cron target exists");
    }},
  { id: "M32", sev: "medium", title: "Poll options created outside a transaction", probe: () => {
      const b = fnBody(read("src/app/(main)/feed/actions.ts"), "createPost");
      if (!b) return open("createPost not found");
      const src = decomment(b);
      // Atomic either way: an explicit $transaction, OR — as done here — the
      // options written as a nested create in the SAME post.create, which
      // Prisma commits in one transaction. What must be gone is the old
      // separate pollOption.create loop that ran after the post existed.
      const nested = /pollOptions:\s*\{\s*create:/.test(src) && !/prisma\.pollOption\.create/.test(src);
      if (/\$transaction/.test(src) || nested) return ok("poll + options written atomically (nested create)");
      return open("poll options still written in a loop outside a transaction");
    }},
  { id: "M34", sev: "medium", title: "No retention policy; unbounded accumulation", probe: () => {
      const r = decomment(read("src/lib/retention.ts"));
      if (!r) return open("no retention sweep");
      const models = ["adminMessage", "report", "contribution", "notification", "loginAttempt", "auditLog", "outboundEmail"];
      const missing = models.filter((m) => !new RegExp(`${m}\\.deleteMany`).test(r));
      if (missing.length) return open(`sweep misses: ${missing.join(", ")}`);
      if (!has("src/app/api/retention/sweep/route.ts")) return open("sweep has no route to trigger it");
      if (!has(".github/workflows/retention.yml")) return open("no schedule fires the sweep");
      return ok("sweep covers all seven tables, on a nightly schedule");
    }},
  { id: "M35", sev: "medium", title: "No deletion confirmation, re-auth, grace period or data export", probe: () => {
      const b = fnBody(read("src/components/settings/actions.ts"), "requestAccountDeletion");
      if (!b) return open("requestAccountDeletion not found (deletion still fires on one call?)");
      const src = decomment(b);
      if (!/bcrypt\.compare/.test(src)) return open("deletion does not re-ask for the password");
      if (!/deletionRequestedAt/.test(src)) return open("deletion is immediate; no grace window recorded");
      if (!has("src/app/api/account/export/route.ts")) return open("no data export route");
      return ok("re-auth + 60-day grace + export route; run phase8-probe for behaviour");
    }},

  /* ---- Phase 10: the remaining mediums and lows, tracked at last ---- */

  { id: "M1", sev: "medium", title: "Member enumeration and bulk harvesting", probe: () => {
      // The harvesting half is closed (Stage gates + take: caps + per-IP
      // limits). The residual oracle — signup's honest "already exists"
      // answer — is rate-limited and kept deliberately: hiding it strands
      // real returning members, a worse trade for a community this size.
      const s = decomment(read("src/components/auth/actions.ts"));
      return /rateLimit\("signup"/.test(s)
        ? ok("surfaces gated + capped; signup oracle metered per IP (kept, deliberate)")
        : open("signup oracle no longer metered");
    }},
  { id: "M5", sev: "medium", title: "JWT sessions: no revocation, docs wrong", probe: () => {
      const a = decomment(read("src/lib/auth.ts"));
      if (!/credentialVersion/.test(a)) return open("no revocation primitive in auth.ts");
      const docs = read("AGENTS.md");
      return /JWT/.test(docs) && !/database-backed \(Prisma adapter\)/.test(docs)
        ? ok("credentialVersion epoch revokes; AGENTS.md corrected")
        : open("AGENTS.md still claims database sessions");
    }},
  { id: "M8", sev: "medium", title: "Password policy is length-only", probe: () => {
      if (!has("src/lib/password-rule.ts")) return open("no password quality rule");
      const signup = decomment(read("src/components/auth/actions.ts"));
      const reset = decomment(read("src/components/auth/email-actions.ts"));
      return /passwordProblem/.test(signup) && /passwordProblem/.test(reset)
        ? ok("denylist + own-email rule wired into signup and reset")
        : open("password-rule exists but is not wired into signup and reset");
    }},
  { id: "M9", sev: "medium", title: "No re-authentication for sensitive operations", probe: () => {
      const b = fnBody(read("src/components/settings/actions.ts"), "requestAccountDeletion") ?? "";
      return /bcrypt\.compare/.test(decomment(b))
        ? ok("deletion re-asks the password; password change is the emailed reset flow (its own re-auth)")
        : open("account deletion no longer re-authenticates");
    }},
  { id: "M20", sev: "medium", title: "No row-level security", probe: () =>
      has("prisma/migrations-manual/2026-08-20-enable-rls.sql")
        ? ok("RLS enabled on every table (PostgREST anon-key surface closed, 2026-08-20)")
        : open("no RLS migration") },
  { id: "M21", sev: "medium", title: "No field-level encryption for phones/admission numbers", probe: () =>
      acc("bounded by RLS + private DB + private backups; app-layer crypto adds key management a one-person operation cannot carry — revisit post-launch") },
  { id: "M22", sev: "medium", title: "Schema-quality debt", probe: () =>
      acc("refactoring, not exposure; tracked in the audit for the post-launch backlog") },
  { id: "M23", sev: "medium", title: "Secrets in plaintext .env, no rotation", probe: () =>
      owner("owner-side practice: secrets live in .env + Vercel/GitHub dashboards; rotate on departure/compromise, starting with AUTH_SECRET and the R2 keys") },
  { id: "M24", sev: "medium", title: "Single signing key, no rotation path", probe: () =>
      acc("one AUTH_SECRET; rotation = set a new value and every session re-authenticates (30-day cost, acceptable); no code change needed") },
  { id: "M25", sev: "medium", title: "Single region, single points of failure", probe: () =>
      acc("owner locked Hobby/Free tiers 2026-08-19; bom1 + the nightly backup is the accepted posture") },
  { id: "M26", sev: "medium", title: "Free-tier services on the critical path", probe: () =>
      acc("owner decision 2026-08-19: no paid plans; the mail queue and backups are the mitigations") },
  { id: "M28", sev: "medium", title: "No scheduler: things advance on page view", probe: () => {
      const crons = read("vercel.json");
      return /catchups\/tick/.test(crons) && has(".github/workflows/retention.yml")
        ? ok("nightly Vercel cron (catchups) + GitHub Actions (retention, backup); page-view ticks remain as backstop")
        : open("a scheduled trigger went missing");
    }},
  { id: "M29", sev: "medium", title: "Forced enrolment: one member adds 500 users to a group", probe: () => {
      const c = decomment(read("src/app/(main)/catchups/actions.ts"));
      const caps = c.match(/max\(100/g) ?? [];
      return caps.length >= 2
        ? ok("both enrolment paths capped at 100 (a whole batch), Stage 2 gated, rate limited")
        : open("an enrolment path lost its 100 cap");
    }},
  { id: "M30", sev: "medium", title: "photoTrusted auto-approval has no revocation path", probe: () => {
      const b = fnBody(read("src/app/(main)/admin/people/actions.ts"), "adminSetPhotoTrusted");
      return b ? ok("adminSetPhotoTrusted toggles it from the person page") : open("no adminSetPhotoTrusted action");
    }},
  { id: "M31", sev: "medium", title: "No security-relevant metrics", probe: () =>
      /model\s+LoginAttempt\b/.test(read("prisma/schema.prisma")) && has("src/app/(main)/admin/audit/page.tsx")
        ? ok("LoginAttempt + AuditLog land on /admin/audit; MetricSnapshot keeps history")
        : open("the security metrics surface went missing") },
  { id: "M33", sev: "medium", title: "API routes rely solely on SameSite=Lax", probe: () => {
      if (!has("src/lib/origin-rule.ts")) return open("no origin rule");
      const routes = ["src/app/api/upload/route.ts", "src/app/api/upload/presign/route.ts", "src/app/api/upload/finalize/route.ts"];
      const missing = routes.filter((r) => !/originAllowed/.test(decomment(read(r))));
      return missing.length ? open(`origin check missing in: ${missing.join(", ")}`) : ok("origin checked on all three upload routes");
    }},
  { id: "M36", sev: "medium", title: "Deletion is silent and unlogged", probe: () => {
      const s = decomment(read("src/components/settings/actions.ts"));
      return /account\.delete_request/.test(s) && /deletion-scheduled/.test(s)
        ? ok("audited and confirmed in writing, with the grace window")
        : open("self-deletion lost its audit entry or its confirmation email");
    }},

  { id: "L1", sev: "low", title: "Login email is the default public contact", probe: () =>
      acc("mitigated: contacts serialize only for verified members (Stage 2); the displayEmail-only switch is an owner call because it would blank most existing contacts") },
  { id: "L2", sev: "low", title: "Reset/verify tokens in URLs, no Referrer-Policy", probe: () => {
      const c = read("next.config.ts");
      return /strict-origin-when-cross-origin/.test(c)
        ? ok("Referrer-Policy shipped (H7); tokens stay single-use and short-lived")
        : open("Referrer-Policy gone from next.config.ts");
    }},
  { id: "L3", sev: "low", title: "requestPasswordReset timing side-channel", probe: () => {
      const b = fnBody(read("src/components/auth/email-actions.ts"), "requestPasswordReset") ?? "";
      const src = decomment(b);
      // The await inside the after() callback is fine — post-response. What
      // must not return is an enqueue awaited BEFORE the deferral begins.
      const deferAt = src.indexOf("after(");
      const enqueueAt = src.indexOf("enqueueMail");
      return deferAt >= 0 && enqueueAt > deferAt
        ? ok("enqueue moved into after(); both branches return after one lookup")
        : open("the enqueue runs before the response again");
    }},
  { id: "L4", sev: "low", title: "Verification gate skipped report/message/createCatchup", probe: () => {
      const c = decomment(read("src/app/(main)/catchups/actions.ts"));
      const r = decomment(read("src/components/posts/report-action.ts"));
      return /requireVerifiedMember/.test(c) && /requireVerifiedMember/.test(r)
        ? ok("all three moved to the Stage 2 member gate in Phase 3")
        : open("a write path fell off the member gate");
    }},
  { id: "L5", sev: "low", title: "PII in application logs", probe: () => {
      const e = decomment(read("src/lib/email.ts"));
      return /maskEmail\(opts\.to\)/.test(e)
        ? ok("the one production log line with an address is masked; dev prints are local-only by design; log tables expire on the M34 schedule")
        : open("email.ts logs a raw address in production again");
    }},
  { id: "L6", sev: "low", title: "Upload finalize validates key shape, not ownership", probe: () => {
      const f = decomment(read("src/app/api/upload/finalize/route.ts"));
      return /keyBelongsTo/.test(f) ? ok("finalize binds the staged key to the caller (Phase 5)") : open("keyBelongsTo gone from finalize");
    }},
  { id: "L7", sev: "low", title: "Poll voting: no window, unlimited switching", probe: () => {
      const feed = decomment(read("src/app/(main)/feed/actions.ts"));
      return /canViewPost/.test(feed)
        ? ok("visibility checked (H3); switching your own vote is product behaviour, kept")
        : open("votePoll lost its visibility check");
    }},
  { id: "L8", sev: "low", title: "livemode filtering on contribution totals unverified", probe: () => {
      const s = decomment(read("src/app/(main)/support/actions.ts"));
      return /livemode/.test(s) ? ok("totals filter on livemode via razorpayLivemode()") : open("no livemode filter in support actions");
    }},
  { id: "L9", sev: "low", title: "Signup race surfaces an unhandled P2002", probe: () => {
      const b = fnBody(read("src/components/auth/actions.ts"), "registerUser") ?? "";
      return /P2002/.test(b) ? ok("the create catches P2002 and answers like the pre-check") : open("no P2002 handling around user.create");
    }},
  { id: "L10", sev: "low", title: "extendDeadline deletes notifications unscoped", probe: () => {
      const c = decomment(read("src/app/(main)/catchups/actions.ts"));
      return /catchup_reminder", link:/.test(c) || /type: "catchup_reminder",\s*link:/.test(c)
        ? ok("the delete is scoped to this Catch-up's reminder link (and Keeper-gated)")
        : open("the reminder cleanup lost its link scope");
    }},
  { id: "L11", sev: "low", title: "R2 token is object-scoped, cannot manage CORS", probe: () =>
      acc("least-privilege is the right posture; CORS changes are a dashboard action (documented in storage.ts)") },
  { id: "L12", sev: "low", title: "Client-side-only enforcement patterns", probe: () => {
      const feed = decomment(read("src/app/(main)/feed/actions.ts"));
      return /ownedUploadUrls/.test(feed)
        ? ok("the caps that matter (images, sizes, tiers) are server-side since Phase 5; tour/onboarding localStorage is UX state")
        : open("server-side image validation went missing");
    }},
];

/* ------------------------------------------------------------------ *
 *  Run and report
 * ------------------------------------------------------------------ */
const args = process.argv.slice(2);
const onlyOpen = args.includes("--open");
const asJson = args.includes("--json");
const failOn = (args.find((a) => a.startsWith("--fail-on-open"))?.split("=")[1] ?? "").split(",").filter(Boolean);

const results = CHECKS.map((c) => {
  let r;
  try { r = c.probe(); } catch (err) { r = open(`probe threw: ${err.message}`); }
  return { id: c.id, sev: c.sev, title: c.title, ...r };
});

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const GLYPH = { fixed: "ok      ", open: "OPEN    ", accepted: "accepted", owner: "owner   " };
  const shown = onlyOpen ? results.filter((r) => r.state === "open") : results;
  let sev = "";
  for (const r of shown) {
    if (r.sev !== sev) { sev = r.sev; console.log(`\n  ${sev.toUpperCase()}`); }
    console.log(`  ${GLYPH[r.state]} ${r.id.padEnd(5)} ${r.title}`);
    console.log(`           ${" ".repeat(5)} ${r.note}`);
  }
  const tally = results.reduce((a, r) => ((a[r.state] = (a[r.state] ?? 0) + 1), a), {});
  console.log(
    `\n  ${results.length} checked -- ` +
      `${tally.fixed ?? 0} fixed, ${tally.open ?? 0} open, ` +
      `${tally.accepted ?? 0} accepted, ${tally.owner ?? 0} awaiting the owner\n`
  );
  console.log("  This proves the SHAPE of a fix is present, never that it is correct.");
  console.log("  Correctness lives in `npm run check`, `npm run visual`, and progress.md.\n");
}

if (failOn.length) {
  const bad = results.filter((r) => r.state === "open" && failOn.includes(r.sev));
  if (bad.length) {
    console.error(`FAIL: ${bad.length} open finding(s) at severity ${failOn.join("/")}: ${bad.map((b) => b.id).join(", ")}`);
    process.exit(1);
  }
}
