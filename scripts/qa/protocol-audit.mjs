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
  ["src/app/(auth)/login/page.tsx", "photo-overlay treatment (duplicated from the hero)"],
  ["src/app/(auth)/signup/page.tsx", "photo-overlay treatment (duplicated from the hero)"],
  ["src/components/common/image-viewer.tsx", "the viewer's warm-ink backdrop + photo shadow"],
  ["src/components/ui/sonner.tsx", "toast shadow, pending tokenised shadows"],
  ["src/app/layout.tsx", "themeColor meta must be a literal; kept in lockstep with --background by hand"],
  ["src/components/ui/dialog.tsx", "the dialog material's warm-ink scrim (#241a12), same register as the viewer backdrop"],
  ["src/components/ui/sheet.tsx", "the edge-anchored variant of the dialog material, sharing its warm-ink scrim (#241a12)"],
  ["src/components/common/bird-avatar.tsx", "glyph plumage support white"],
  ["src/components/landing/footer-hoopoe.tsx", "tuft plumage art (marigold family)"],
]);
const HEX_RE = /#[0-9a-fA-F]{6}\b/;

for (const f of srcFiles()) {
  if (HEX_ALLOW.has(f)) continue;
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    // Comments may cite hexes when arguing for a constant; only flag live code.
    const code = line.replace(/\/\*.*?\*\//g, "").replace(/^\s*\*.*$/, "").replace(/\/\/.*$/, "");
    if (HEX_RE.test(code)) {
      violations.push(`${f}:${i + 1}  raw hex in production code: ${line.trim().slice(0, 90)}`);
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
  ["src/components/auth/signup-form.tsx", "segmented-control selected thumb"],
  ["src/components/catchups/home/keeper-settings-dialog.tsx", "segmented-control selected thumb"],
  ["src/components/catchups/home/reminder-pref-control.tsx", "segmented-control selected thumb"],
  ["src/app/copy-editor/entry-card.tsx", "internal tool, not user-facing product"],
]);

for (const f of srcFiles()) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (SINK_RE.test(line)) {
      violations.push(`${f}:${i + 1}  hover sinks into tan (hover lifts, never sinks): ${line.trim().slice(0, 90)}`);
    }
    if (DRAB_RE.test(line) && !DRAB_ALLOW.has(f)) {
      violations.push(`${f}:${i + 1}  drab green-on-green pairing: ${line.trim().slice(0, 90)}`);
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
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/rounded-(t-)?xl(?![a-z-])/.test(line)) {
      violations.push(`${f}:${i + 1}  rounded-xl (20.8px > the 16px card) outside the hero allowlist: ${line.trim().slice(0, 90)}`);
    }
  });
}

/* 5 ---------------------------------------------------------------- */
/* Hand-written middle-dot separators in JSX text (the rule lives in
   metaLine/MetaDots). String literals passed TO metaLine are fine. */
for (const f of srcFiles()) {
  if (f === "src/lib/utils.ts") continue; // metaLine's own implementation
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (
      (/[}"]\s*·\s*[{"]|&middot;|\.join\(" · "\)/.test(line)) &&
      !/metaLine|MetaDots|dotsep/.test(line)
    ) {
      violations.push(`${f}:${i + 1}  hand-written dot separator (use metaLine/MetaDots): ${line.trim().slice(0, 90)}`);
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
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/aria-modal/.test(line)) {
      violations.push(`${f}:${i + 1}  hand-rolled modal outside ui/dialog (dialogs are one material): ${line.trim().slice(0, 90)}`);
    }
  });
}

/* ------------------------------------------------------------------ */
if (violations.length) {
  console.error(`protocol-audit: ${violations.length} violation(s)\n`);
  for (const v of violations) console.error("  " + v);
  process.exit(1);
} else {
  console.log("protocol-audit: clean");
}
