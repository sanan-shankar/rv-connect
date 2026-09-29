import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { X509Certificate } from "node:crypto";
import { ROOT, read, decomment, walk, SKIP_DIRS } from "./test-kit.mjs";
import { SUPABASE_ROOT_CA_2021, withDatabaseTls } from "./db-tls.ts";

/* ------------------------------------------------------------------ *
 *  No connection to the database travels in plaintext.
 *
 *  `pg` sends every query and every row unencrypted unless it is handed
 *  `ssl`, and until 2026-09-30 the app's own connection was exactly that
 *  (bug audit 3, O-07, proved live). The fix lives in one module,
 *  db-tls.ts, which pins Supabase's root so the connection is verified as
 *  well as encrypted. These tests hold the four things that could quietly
 *  undo it: the certificate itself, the helper's refusal to let the
 *  connection string override it, every client in the repo using TLS, and
 *  the backup job carrying the same certificate.
 * ------------------------------------------------------------------ */

/* Matched twice when it was pinned: Supabase's published download and the
   root the pooler itself presents. See db-tls.ts. */
const PINNED_SHA256 =
  "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";

test("the pinned certificate is Supabase's 2021 root, unaltered", () => {
  const cert = new X509Certificate(SUPABASE_ROOT_CA_2021);
  assert.equal(cert.fingerprint256, PINNED_SHA256);
  assert.ok(cert.ca, "the pinned certificate is not a CA");
  assert.match(cert.subject, /CN=Supabase Root 2021 CA/);
});

test("withDatabaseTls always verifies, whatever the connection string says", () => {
  const out = withDatabaseTls(
    "postgresql://u:p%40ss@h.example:6543/postgres?pgbouncer=true&sslmode=disable&sslrootcert=/x",
  );
  assert.equal(out.ssl.rejectUnauthorized, true);
  assert.equal(out.ssl.ca, SUPABASE_ROOT_CA_2021);
  // pg merges the parsed string OVER its config, so an ssl parameter left in
  // would win; every one must be gone, and nothing else touched.
  assert.doesNotMatch(out.connectionString, /ssl/i);
  assert.match(out.connectionString, /[?&]pgbouncer=true/);
  assert.match(out.connectionString, /u:p%40ss@/);
  const plain = "postgresql://u:p@h.example:5432/postgres";
  assert.equal(withDatabaseTls(plain).connectionString, plain, "a string with nothing to strip is rewritten");
});

/** The argument list of the call whose `(` is at `open`, parens balanced. */
function callArgs(src, open) {
  for (let i = open, depth = 0; i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) return src.slice(open + 1, i);
  }
  return "";
}

test("every database client in the repo is opened with TLS", () => {
  const files = ["src", "scripts"].flatMap((d) =>
    walk(join(ROOT, d), {
      skip: (name) => SKIP_DIRS.includes(name),
      match: (name) => /\.(ts|tsx|mjs|mts)$/.test(name) && !/\.test\.mjs$/.test(name),
    }),
  );
  const offenders = [];
  let clients = 0;
  for (const full of files) {
    const rel = full.slice(ROOT.length + 1);
    const src = decomment(read(rel));
    for (const m of src.matchAll(/new\s+(?:pg\.)?(?:Client|Pool)\s*\(|new\s+PrismaPg\s*\(/g)) {
      clients += 1;
      const args = callArgs(src, m.index + m[0].length - 1);
      if (!/withDatabaseTls\(|\bssl\s*:/.test(args)) {
        offenders.push(`${rel}: ${m[0]}${args.replace(/\s+/g, " ").slice(0, 70)})`);
      }
    }
  }
  // Anti-vacuity: 30 clients on 2026-09-30. A sweep that stopped reading
  // the tree would find none and pass.
  assert.ok(clients >= 20, `only ${clients} database clients found; the sweep has drifted`);
  assert.deepEqual(
    offenders,
    [],
    "these open the database in plaintext; pass `withDatabaseTls(url)` from " +
      "src/lib/db-tls.ts (or at least `ssl`):\n  " + offenders.join("\n  "),
  );
});

test("the backup job pins the same certificate and verifies with it", () => {
  const yml = read(".github/workflows/backup.yml");
  const m = yml.match(/<<'PEM'\n([\s\S]*?)\n\s*PEM\n/);
  assert.ok(m, "backup.yml no longer writes Supabase's certificate for pg_dump");
  const pem = m[1]
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  assert.equal(pem, SUPABASE_ROOT_CA_2021.trim(), "backup.yml's certificate differs from db-tls.ts's");
  assert.equal(
    (yml.match(/PGSSLMODE: verify-full/g) ?? []).length,
    2,
    "both steps that reach Supabase (the dump and the place list) must verify the server",
  );
});
