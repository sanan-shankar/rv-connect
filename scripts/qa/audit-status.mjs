#!/usr/bin/env node
/**
 * Where the security audit actually stands, proved from the code.
 *
 * The problem this solves. docs/planning/SECURITY-AUDIT.md is 85 findings and
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

/** The body of a named function, brace-matched from its declaration. */
function fnBody(text, name) {
  /* Matches both `function foo(` and the object-method shorthand
     `async foo(`. Missing the second form made this fall back to scanning
     the entire file, which is how the C1-a probe reported a hit from a
     completely different callback further down auth.ts. */
  const m =
    text.match(new RegExp(`(export\\s+)?(async\\s+)?function\\s+${name}\\b`)) ??
    text.match(new RegExp(`(^|[\\s,{])(async\\s+)?${name}\\s*\\(`, "m"));
  if (!m) return null;
  let i = text.indexOf("{", m.index);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === "{") depth++;
    else if (text[j] === "}") { depth--; if (depth === 0) return text.slice(i, j + 1); }
  }
  return text.slice(i);
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
      const v = read("src/lib/validators.ts");
      const store = read("src/lib/storage.ts");
      const validated = /images:\s*z[^\n]*\.refine|isUploadedImageUrl/.test(v);
      const scoped = /ownerPrefix|assertOwnedKey|objectKey/.test(store);
      if (validated && scoped) return ok("images validated on write and delete is key-scoped");
      return open(`${validated ? "" : "postSchema.images unvalidated; "}${scoped ? "" : "delImage still derives keys from caller URLs"}`);
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
      return /verifyState:\s*"flagged"/.test(b)
        ? open("a single report still writes verifyState:'flagged'")
        : ok("no unconditional verifyState write");
    }},
  { id: "H6", sev: "high", title: "No rate limiting or lockout on authentication", probe: () => {
      const s = decomment(read("src/lib/auth.ts") + read("src/app/(auth)/login/page.tsx"));
      return /ratelimit|rateLimit|Ratelimit/.test(s) ? ok("a limiter is wired into the auth path") : open("no limiter on the credentials path");
    }},
  { id: "H7", sev: "high", title: "No security headers at all", probe: () => {
      const c = read("next.config.ts");
      if (!/headers\s*\(/.test(c)) return open("next.config.ts defines no headers()");
      const want = ["Content-Security-Policy", "X-Frame-Options", "Referrer-Policy", "X-Content-Type-Options", "Permissions-Policy"];
      const missing = want.filter((h) => !c.includes(h));
      return missing.length ? open(`headers() present but missing: ${missing.join(", ")}`) : ok("all five headers configured");
    }},
  { id: "H8", sev: "high", title: "deleteAccount throws for anyone who filed a report", probe: () => {
      const b = fnBody(read("src/components/settings/actions.ts"), "deleteAccount");
      if (!b) return open("deleteAccount not found");
      return /report\.deleteMany/.test(b) ? ok("clears filed reports first") : open("no report.deleteMany before user.delete");
    }},
  { id: "H9", sev: "high", title: "Deletion never removes stored image bytes", probe: () => {
      const b = fnBody(read("src/components/settings/actions.ts"), "deleteAccount");
      if (!b) return open("deleteAccount not found");
      return /delImage/.test(b) ? ok("removes R2 objects") : open("no delImage call");
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
      return routes.length ? ok(`${routes.length} policy page(s)`) : open("no privacy/terms/guidelines route");
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
      return /npm audit/.test(w) ? ok("check + npm audit run in CI") : open("CI runs check but not `npm audit`");
    }},
  { id: "H17", sev: "high", title: "No security tests", probe: () => {
      const tests = walk("src", [".test.mjs", ".test.ts"]).concat(walk("e2e", [".spec.ts"]));
      const sec = tests.filter((p) => /auth|security|permission|gate|access/i.test(p));
      return sec.length ? ok(`${sec.length} security-related test file(s)`) : open(`${tests.length} test files, none covering authorization`);
    }},
  { id: "H18", sev: "high", title: "Unbounded queries that will OOM", probe: () => {
      const admin = read("src/app/(main)/admin/page.tsx");
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
      const gate = read("src/lib/email-verification.ts") + read("src/lib/member-gate.ts");
      return /requireVerifiedMember/.test(gate) ? ok("requireVerifiedMember exists") : open("no member-tier gate; verifyState still unread by any permission");
    }},
  { id: "H22", sev: "high", title: "No bot defence on any public entry point", probe: () => {
      const src = appSources().some((f) => /turnstile/i.test(decomment(f.text)));
      const env = /TURNSTILE/.test(read(".env"));
      if (src) return ok("Turnstile verified server-side");
      return open(env ? "keys in .env but no code verifies them yet" : "no Turnstile anywhere");
    }},

  // ------------------------------------------------------------------ MEDIUM
  { id: "M4", sev: "medium", title: "Password reset does not revoke sessions", probe: () =>
      /credentialVersion|sessionsValidFrom/.test(read("prisma/schema.prisma"))
        ? ok("credential epoch column present") : open("no credentialVersion/sessionsValidFrom column") },
  { id: "M6", sev: "medium", title: "Deleted user keeps a working session", probe: () => {
      const s = read("src/lib/auth.ts");
      return /if\s*\(!dbUser\)\s*return null|dbUser\s*==\s*null[^\n]*return null/.test(s)
        ? ok("session callback returns null for a missing row") : open("session still returned when the row is gone");
    }},
  { id: "M7", sev: "medium", title: "Trivia gate: hardcoded fallback secret", probe: () =>
      /rv-connect-trivia-dev-secret/.test(decomment(read("src/components/auth/trivia-actions.ts")))
        ? open("hardcoded fallback secret still present") : ok("no hardcoded fallback") },
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
      return /\$transaction/.test(b) ? ok("transactional") : open("poll options still written in a loop outside a transaction");
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
