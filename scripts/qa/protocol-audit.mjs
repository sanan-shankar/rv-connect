#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  protocol-audit - static gate for the shape + colour protocol
 *  (docs/spec/DESIGN-SYSTEM.md, "The surface ladder" and "The radius
 *  ladder", 2026-07-30). Run: node scripts/qa/protocol-audit.mjs
 *
 *  Like lab-audit, this catches the *detectable* drift, not taste:
 *    1. New raw hex colours outside the sanctioned files (tokens live
 *       in globals.css; plumage art is exempt).
 *    2. Hover states that SINK instead of lift (hover:bg-muted,
 *       hover:bg-secondary, any hover:bg-*\/NN darker-alpha of the
 *       resting surface).
 *    3. The dead drab pairings: bg-canopy/10 chips and the retired
 *       #1A6B3C anywhere.
 *    4. rounded-xl (20.8px, rounder than the 16px card) inside
 *       production components - allowed only on the standalone-hero
 *       allowlist below.
 *    5. Hand-written " · " separators in TSX (use metaLine/MetaDots).
 *
 *  Exit 0 = clean. Exit 1 = violations listed. Every allowlist entry
 *  states its reason; an entry without a reason is itself a violation
 *  of the protocol's spirit.
 * ------------------------------------------------------------------ */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const violations = [];

/** git-tracked production sources; lab rooms explore freely. */
function srcFiles({ includeLab = false } = {}) {
  const out = execSync("git ls-files 'src/**/*.tsx' 'src/**/*.ts'", {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean)
    .filter((f) => !f.startsWith("src/generated/"));
  return includeLab ? out : out.filter((f) => !f.startsWith("src/app/lab/"));
}

/* `git ls-files` names paths, not contents, and the two can disagree for a
   whole pass: a tracked file staged as deleted is still listed, and in this
   checkout -- where several sessions work at once -- a rename can land between
   the listing and the read. Either way the audit used to die with a raw ENOENT
   halfway through, which reads as "the tool crashed" rather than "one file
   moved". A path with nothing behind it has no code to audit, so it is skipped.
   Reported, never silent: a run that skipped anything says so at the end. */
const skipped = [];
function readSource(file) {
  try {
    return readFileSync(file, "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    skipped.push(file);
    return null;
  }
}

/* Read a file as lines with every COMMENT blanked out, so a rule that greps for
   a pattern never fires on the prose arguing about that pattern. This codebase
   comments heavily and cites the exact things these rules ban ("--card is
   #F5F2EA, so one row...", "a canopy OUTLINE thumb (`bg-canopy/10`) instead
   of..."), which is the house style working as intended.

   The old check was a per-line regex. It handled `//`, an inline block, and a
   JSDoc line starting with `*`, but NOT a block comment whose continuation
   lines are indented with plain spaces. On 2026-08-08 that was 6 of the 9
   findings this script reported: every one of them a comment. A gate that cries
   wolf two times out of three is a gate people learn to skim, so the state has
   to be tracked across lines instead.

   Line indices are preserved (blanked, never dropped) so violations still point
   at the right line number. `://` is skipped so a URL is not read as a comment. */
function codeLines(file) {
  const out = [];
  let inBlock = false;
  const src = readSource(file);
  if (src === null) return out;
  for (const raw of src.split("\n")) {
    let res = "";
    let i = 0;
    while (i < raw.length) {
      if (inBlock) {
        const end = raw.indexOf("*/", i);
        if (end === -1) break;
        inBlock = false;
        i = end + 2;
        continue;
      }
      let lineC = raw.indexOf("//", i);
      while (lineC > 0 && raw[lineC - 1] === ":") lineC = raw.indexOf("//", lineC + 2);
      const blockC = raw.indexOf("/*", i);
      if (blockC !== -1 && (lineC === -1 || blockC < lineC)) {
        res += raw.slice(i, blockC);
        inBlock = true;
        i = blockC + 2;
        continue;
      }
      if (lineC !== -1) {
        res += raw.slice(i, lineC);
        break;
      }
      res += raw.slice(i);
      break;
    }
    out.push(res);
  }
  return out;
}

/* 1 ---------------------------------------------------------------- */
/* Files allowed to carry raw hexes, with reasons. */
const HEX_ALLOW = new Map([
  ["src/components/common/bird-avatar-v2.tsx", "50 species' real plumage - fixed art, never theme-flipped"],
  ["src/components/mascot/hoopoe.tsx", "mascot plumage - fixed art"],
  ["src/components/mascot/mascot-flight-layer.tsx", "mascot plumage duplicate rig"],
  ["src/components/landing/perching-birds.tsx", "landing plumage art"],
  ["src/components/landing/ambient-leaves.tsx", "landing foliage art"],
  ["src/components/layout/peaks-mark.tsx", "the final logo's fixed fills"],
  ["src/components/common/love-button.tsx", "the heart is hardcoded #E03A33 with transition:none by design (no-black-flash guarantee)"],
  ["src/components/layout/notification-bell.tsx", "the bell's heart-red badge, same guarantee as LoveButton"],
  ["src/components/common/motion.tsx", "motion tokens file"],
  ["src/lib/avatar.ts", "deterministic avatar palette (hash-stable; do not retint without a migration)"],
  ["src/lib/utils.ts", "legacy avatar palette kept hash-stable"],
  ["src/components/onboarding/steps/houses-step.tsx", "TEMP: house tints pending the Wave-2 houses rebuild"],
  ["src/components/directory/alumni-map.tsx", "TEMP: map land fills pending the Wave-4 directory redo"],
  ["src/components/landing/landing-hero.tsx", "photo-overlay treatment on the hero image"],
  // page.tsx became a thin server wrapper when Turnstile arrived (Phase 4);
  // the photo overlay moved with the client half into *-client.tsx.
  ["src/app/(auth)/login/login-client.tsx", "photo-overlay treatment (duplicated from the hero)"],
  ["src/app/(auth)/signup/signup-client.tsx", "photo-overlay treatment (duplicated from the hero)"],
  ["src/components/auth/auth-panel.tsx", "the same photo-overlay treatment as login/signup above; this is the shared shell the three email pages use instead of copying their flight wiring"],
  ["src/lib/email-templates.ts", "an inbox cannot read a CSS custom property: Gmail strips <style> blocks, Outlook renders through Word, and no client loads our webfonts. Every brand value has to ship as an inline hex, so these are transcribed from globals.css and kept in lockstep with it by hand (same reason as layout.tsx's themeColor and the Razorpay theme above)"],
  ["src/components/common/image-viewer.tsx", "the viewer's warm-ink backdrop + photo shadow"],
  ["src/components/ui/sonner.tsx", "toast shadow, pending tokenised shadows"],
  ["src/app/layout.tsx", "themeColor meta must be a literal; kept in lockstep with --background by hand"],
  ["src/app/manifest.ts", "a web app manifest is JSON read by the OS installer before any stylesheet exists, so background_color/theme_color cannot be custom properties; both are --background, kept in lockstep by hand (same reason as layout.tsx above)"],
  ["src/components/support/support-contribute.tsx", "Razorpay's checkout theme.color is read by their SDK inside an iframe on their domain, so it cannot be a CSS variable; it is Canopy, kept in lockstep with --color-canopy by hand (same reason as layout.tsx above)"],
  ["src/components/ui/dialog.tsx", "the dialog material's warm-ink scrim (#241a12), same register as the viewer backdrop"],
  ["src/components/ui/sheet.tsx", "the edge-anchored variant of the dialog material, sharing its warm-ink scrim (#241a12)"],
  ["src/components/common/bird-avatar.tsx", "glyph plumage support white"],
  ["src/components/settings/nightfall.tsx", "the dark-mode payoff scene's fixed dusk sky, sun and stars - scene art that must render identically under either theme"],
  ["src/components/landing/footer-hoopoe.tsx", "tuft plumage art (marigold family)"],
]);
const HEX_RE = /#[0-9a-fA-F]{6}\b/;

for (const f of srcFiles()) {
  if (HEX_ALLOW.has(f)) continue;
  const src = readSource(f);
  if (src === null) continue;
  const raw = src.split("\n");
  codeLines(f).forEach((code, i) => {
    if (HEX_RE.test(code)) {
      violations.push(`${f}:${i + 1}  raw hex in production code: ${raw[i].trim().slice(0, 90)}`);
    }
  });
}

/* 2 + 3 ------------------------------------------------------------ */
const SINK_RE = /hover:bg-(muted|secondary)(?![a-z-])|hover:bg-(secondary|muted)\/\d+/;
const DRAB_RE = /bg-canopy\/10(?!\d)|#1A6B3C/i;
/* The canopy wash is sanctioned ONLY as a selected/active state (protocol
   colour rule 4) - these files use it exactly that way - plus surfaces whose
   rebuild wave owns the migration (TEMP entries). */
const DRAB_ALLOW = new Map([
  ["src/components/settings/settings-form.tsx", "TEMP: Wave-2 settings rebuild owns this"],
  ["src/components/onboarding/steps/houses-step.tsx", "TEMP: Wave-2"],
  ["src/components/directory/directory-client.tsx", "TEMP: Wave-4 directory redo"],
  ["src/components/messages/thread-list.tsx", "selected thread row (selection state)"],
  ["src/components/posts/post-feed.tsx", "pressed feed filter (selection state)"],
  ["src/components/posts/edit-post-dialog.tsx", "selected tag (selection state)"],
  ["src/components/support/bird-picker.tsx", "selected bird cell on /pick-bird (selection state)"],
  ["src/components/auth/signup-form.tsx", "segmented-control selected thumb"],
  ["src/components/catchups/home/keeper-settings-dialog.tsx", "segmented-control selected thumb"],
  ["src/components/catchups/home/reminder-pref-control.tsx", "segmented-control selected thumb"],
]);

/* `transition-property` takes real CSS property names, and `colors` is not
   one -- it is a Tailwind SHORTHAND that only exists as the whole utility
   `transition-colors`. Inside the arbitrary-value bracket it is passed through
   verbatim, so `transition-[colors,transform]` emits
   `transition-property: colors, transform`: the transform eases and the colour
   SNAPS, silently, with no error anywhere. Eleven shipped surfaces animated
   nothing this way. Spell the properties the element's own hover actually
   changes -- `color`, `background-color`, `border-color` -- or, where the
   hover is `state-layer` (a background-IMAGE, which cannot transition at all),
   just `transition-transform`. */
const FAKE_PROP_RE = /transition-\[[^\]]*\bcolors\b/;

for (const f of srcFiles()) {
  const src = readSource(f);
  if (src === null) continue;
  const raw = src.split("\n");
  codeLines(f).forEach((code, i) => {
    if (SINK_RE.test(code)) {
      violations.push(`${f}:${i + 1}  hover sinks into tan (hover lifts, never sinks): ${raw[i].trim().slice(0, 90)}`);
    }
    if (DRAB_RE.test(code) && !DRAB_ALLOW.has(f)) {
      violations.push(`${f}:${i + 1}  drab green-on-green pairing: ${raw[i].trim().slice(0, 90)}`);
    }
    if (FAKE_PROP_RE.test(code)) {
      violations.push(
        `${f}:${i + 1}  transition-property: colors matches no CSS property, so this transition does nothing: ${raw[i].trim().slice(0, 90)}`
      );
    }
  });
}

/* 4 ---------------------------------------------------------------- */
/* rounded-xl = 20.8px in this repo: rounder than the 16px card. Allowed only
   on standalone hero surfaces that are NOT nested in a card. */
const XL_ALLOW = new Map([
  ["src/components/landing/landing-hero.tsx", "standalone hero photo frame"],
  ["src/components/common/image-viewer.tsx", "caption fold panel, standalone overlay"],
  ["src/components/tour/tour-panel.tsx", "floating tour sheet, standalone overlay"],
  ["src/components/tour/tour-offer.tsx", "floating offer sheet, standalone overlay"],
  ["src/components/ui/dialog.tsx", "THE floating-modal radius: the dialog material is a standalone overlay, not a nested card"],
  ["src/components/onboarding/steps/houses-step.tsx", "TEMP: Wave-2 houses rebuild owns this file"],
  ["src/components/layout/sidebar.tsx", "nav rows on the canopy panel, not nested in a card; radius revisit deferred"],
  ["src/components/layout/notification-bell.tsx", "sidebar bell row, same panel as above"],
  ["src/components/layout/logo-fact.tsx", "sidebar lockup row, same panel as above"],
]);
for (const f of srcFiles()) {
  if (XL_ALLOW.has(f)) continue;
  const src = readSource(f);
  if (src === null) continue;
  const raw = src.split("\n");
  codeLines(f).forEach((code, i) => {
    if (/rounded-(t-)?xl(?![a-z-])/.test(code)) {
      violations.push(`${f}:${i + 1}  rounded-xl (20.8px > the 16px card) outside the hero allowlist: ${raw[i].trim().slice(0, 90)}`);
    }
  });
}

/* 5 ---------------------------------------------------------------- */
/* Hand-written middle-dot separators in JSX text (the rule lives in
   metaLine/MetaDots). String literals passed TO metaLine are fine. */
for (const f of srcFiles()) {
  if (f === "src/lib/utils.ts") continue; // metaLine's own implementation
  const src = readSource(f);
  if (src === null) continue;
  const raw = src.split("\n");
  codeLines(f).forEach((code, i) => {
    if (
      (/[}"]\s*·\s*[{"]|&middot;|\.join\(" · "\)/.test(code)) &&
      !/metaLine|MetaDots|dotsep/.test(code)
    ) {
      violations.push(`${f}:${i + 1}  hand-written dot separator (use metaLine/MetaDots): ${raw[i].trim().slice(0, 90)}`);
    }
  });
}

/* 6 ---------------------------------------------------------------- */
/* Dialogs are ONE material (ui/dialog.tsx). A hand-rolled aria-modal
   anywhere else is a fork of the template. The image viewer is the one
   exception: a full-screen experience, not a dialog. */
const MODAL_ALLOW = new Set([
  "src/components/ui/dialog.tsx",
  "src/components/ui/sheet.tsx", // the edge-anchored variant of the same system
  "src/components/common/image-viewer.tsx",
]);
for (const f of srcFiles()) {
  if (MODAL_ALLOW.has(f)) continue;
  const src = readSource(f);
  if (src === null) continue;
  const raw = src.split("\n");
  codeLines(f).forEach((code, i) => {
    if (/aria-modal/.test(code)) {
      violations.push(`${f}:${i + 1}  hand-rolled modal outside ui/dialog (dialogs are one material): ${raw[i].trim().slice(0, 90)}`);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Said out loud rather than swallowed: "clean" must not be able to mean "clean
   over the files I could open". A skip is normal mid-rename and not worth
   failing over, but a run that quietly audited less than it listed is exactly
   the shape of gate this project has had to fix before (C-190/C-195). */
if (skipped.length) {
  const names = [...new Set(skipped)];
  console.warn(
    `protocol-audit: ${names.length} listed file(s) had vanished by the time they were read ` +
      `(a staged deletion, or a rename landing mid-pass in a shared checkout) and were not audited:`
  );
  for (const f of names) console.warn("  " + f);
}

if (violations.length) {
  console.error(`protocol-audit: ${violations.length} violation(s)\n`);
  for (const v of violations) console.error("  " + v);
  process.exit(1);
} else {
  console.log(`protocol-audit: clean${skipped.length ? ` (${new Set(skipped).size} file(s) skipped, above)` : ""}`);
}
