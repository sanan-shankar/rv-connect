import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { read, decomment } from "../../src/lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The nightly backup keeps what it should, and only that.
 *
 *  backup.yml runs against production from GitHub, so nothing here can run
 *  the job. What can run is each step's own shell, under the flags GitHub
 *  gives it (`bash -eo pipefail`), with `aws` swapped for a stand-in that
 *  prints what it was asked and answers from a fixture. So these pin what
 *  the steps DO with a listing, not how they happen to be spelled.
 * ------------------------------------------------------------------ */

const YML = read(".github/workflows/backup.yml");

/** The shell one step runs, found by the step's name and dedented the way
 *  GitHub hands it to bash. */
function stepScript(name) {
  const lines = YML.split("\n");
  const at = lines.findIndex((l) => l.trim() === `- name: ${name}`);
  assert.ok(at >= 0, `backup.yml has no step named "${name}"`);
  const stepIndent = lines[at].search(/\S/);
  for (let i = at + 1; i < lines.length; i++) {
    const indent = lines[i].search(/\S/);
    if (indent >= 0 && indent <= stepIndent) break; // the next step
    if (!/^\s*run:\s*\|\s*$/.test(lines[i])) continue;
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const k = lines[j].search(/\S/);
      if (k >= 0 && k <= indent) break;
      body.push(lines[j]);
    }
    const pad = Math.min(...body.filter((l) => l.trim()).map((l) => l.search(/\S/)));
    return body.map((l) => l.slice(pad)).join("\n");
  }
  assert.fail(`the step "${name}" runs no shell`);
}

/** Run a step's shell as GitHub would, after `stubs`. Returns stdout and the
 *  exit status rather than throwing, so a test can assert a refusal. */
function runStep(name, stubs, env = {}) {
  try {
    const out = execFileSync(
      "bash",
      ["--noprofile", "--norc", "-eo", "pipefail", "-c", `${stubs}\n${stepScript(name)}`],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH,
          BUCKET: "rv-backup-test",
          ENDPOINT: "https://r2.invalid",
          GITHUB_STEP_SUMMARY: "/dev/null",
          ...env,
        },
      }
    );
    return { status: 0, out };
  } catch (err) {
    return { status: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

/** An `aws` that records every call, one line each, its arguments bracketed. */
const RECORDING_AWS = `aws() { printf 'aws'; printf ' [%s]' "$@"; printf '\\n'; }`;

/* ---------------------------------------------- L11-02: staging/ stays out */

test("the photo backup copies everything but staging/, and still deletes nothing", () => {
  const { status, out } = runStep("Copy new photos to the private bucket", RECORDING_AWS);
  assert.equal(status, 0, out);
  const sync = out.split("\n").find((l) => l.startsWith("aws [s3] [sync]"));
  assert.ok(sync, "the media step no longer runs aws s3 sync");
  assert.ok(sync.includes("[s3://rv-alumni-media] [s3://rv-backup-test/media/]"), sync);
  /* Exactly one exclusion. staging/ holds only uploads in flight or abandoned;
     anything else left out of this copy is a photograph with no undelete. */
  const excluded = [...sync.matchAll(/\[--exclude\] \[([^\]]*)\]/g)].map((m) => m[1]);
  assert.deepEqual(excluded, ["staging/*"], "the sync must leave out staging/ and nothing else");
  assert.ok(!sync.includes("[--include]"), "an --include would put staging/ back");
  // The asymmetry the job exists for (C2/C4): a deletion never reaches the backup.
  assert.ok(!sync.includes("[--delete]"), "the backup must never delete what the live bucket deleted");
});

test("staging/ is still where the uploads wait, so the exclusion still aims at them", () => {
  /* The other half of the reason the folder can be left out: every staged
     original is minted under it, by the photo presign and the recording
     presign alike. A new staging root would need the backup to know. */
  for (const route of ["src/app/api/upload/presign/route.ts", "src/app/api/upload/audio/route.ts"]) {
    assert.match(decomment(read(route)), /ownerPrefix\(\s*"staging"/, `${route} no longer stages under staging/`);
  }
});

/** The two listings the verify step reads, as `aws s3 ls --recursive` prints
 *  them: whole keys, the backup's under media/. */
const line = (key) => `2026-10-30 21:00:00     123456 ${key}`;
const listingAws = (live, saved) =>
  [
    `LIVE_LISTING='${live.map(line).join("\n")}'`,
    `SAVED_LISTING='${saved.map(line).join("\n")}'`,
    `aws() { case "$3" in s3://rv-alumni-media) L="$LIVE_LISTING";; *) L="$SAVED_LISTING";; esac;`,
    `  if [ -n "$L" ]; then printf '%s\\n' "$L"; fi; }`,
  ].join("\n");

const VERIFY = "Verify the backup holds at least everything live";

test("a complete backup passes, whatever is waiting in staging/", () => {
  const { status, out } = runStep(
    VERIFY,
    listingAws(
      // Abandoned uploads the sync no longer copies must not count as missing.
      ["uploads/u1/2026/10/a.webp", "collection/u1/2026/10/b.webp", "staging/u1/2026/10/c-o.jpg", "staging/u2/2026/10/d.jpg"],
      ["media/uploads/u1/2026/10/a.webp", "media/collection/u1/2026/10/b.webp"]
    )
  );
  assert.equal(status, 0, out);
  assert.match(out, /live 2 objects, backup 2 objects/);
});

test("a missing photograph fails the check, however many old staged originals the backup holds", () => {
  /* Before the exclusion was counted on this side too, the staged originals
     copied before 2026-10-30 (330 of them) could stand in for real
     photographs the sync had failed to copy. */
  const { status, out } = runStep(
    VERIFY,
    listingAws(
      ["uploads/u1/2026/10/a.webp", "collection/u1/2026/10/b.webp"],
      ["media/uploads/u1/2026/10/a.webp", "media/staging/u1/2026/09/x-o.jpg", "media/staging/u1/2026/09/y-o.jpg"]
    )
  );
  assert.equal(status, 1, `a backup missing a photograph passed:\n${out}`);
  assert.match(out, /::error::Backup holds 1 objects but the live bucket holds 2/);
});

test("a photograph deleted from the live bucket stays in the backup, and that is fine", () => {
  const { status, out } = runStep(
    VERIFY,
    listingAws(["uploads/u1/2026/10/a.webp"], ["media/uploads/u1/2026/10/a.webp", "media/collection/u1/2026/08/gone.webp"])
  );
  assert.equal(status, 0, out);
  assert.match(out, /live 1 objects, backup 2 objects/);
});
