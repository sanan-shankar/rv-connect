import assert from "node:assert/strict";
import test from "node:test";

import { read } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The landing's stand-in and the real auth columns must not drift.
 *
 *  auth-first-frame.tsx draws /signup's or /login's opening frame on the
 *  LANDING, during the photo slide, so the cream arrives with the content
 *  already on it. At the end of the slide the router pushes and the real
 *  column replaces the drawing with no crossfade and no entrance — the
 *  swap is invisible only for as long as the two render the same thing.
 *
 *  Nothing in the type system connects them, so this is the connection:
 *  every string and every measured class the stand-in copies is asserted
 *  to still exist in the file it was copied from. Change a heading, a
 *  perch height, a row gap or the entrance, and this fails until the
 *  stand-in is changed with it.
 * ------------------------------------------------------------------ */

const FRAME = read("src/components/auth/auth-first-frame.tsx");
const SIGNUP = read("src/app/(auth)/signup/signup-client.tsx");
const LOGIN = read("src/app/(auth)/login/login-client.tsx");
const GATE = read("src/components/auth/trivia-gate.tsx");

const NAMES = new Map([
  [SIGNUP, "signup-client.tsx"],
  [LOGIN, "login-client.tsx"],
  [GATE, "trivia-gate.tsx"],
]);

/** What the stand-in copies, and the file it is copied from. */
const COPIED = [
  // The shell both auth pages share: the cream column, and the entrance the
  // stand-in now plays on their behalf.
  [SIGNUP, "px-[var(--space-l)] py-[var(--space-l)]", "the cream column's padding"],
  [SIGNUP, "w-full max-w-[400px] self-center text-center", "the 400px column"],
  [SIGNUP, "{ opacity: 0, x: 48 }", "the entrance pose"],
  [SIGNUP, "transition={SPRINGS.gentle}", "the entrance spring"],
  [SIGNUP, "font-heading text-[27px] leading-tight tracking-tight text-foreground", "the heading"],

  // /signup. The perch box is empty in the stand-in (the bird is still in the
  // air), so its height is the only thing holding the heading below it still.
  [SIGNUP, "mx-auto mb-1 grid h-[112px] place-items-center", "the signup perch box"],
  [SIGNUP, "First, a quick check", "the signup heading's words"],
  [
    GATE,
    "min-h-[1.75rem] text-center font-heading text-lg text-balance text-foreground",
    "the question line",
  ],
  [GATE, "Your answer...", "the answer field's placeholder"],
  [GATE, "px-4 text-center text-base text-foreground outline-none", "the answer field"],
  [GATE, "mt-3 text-center text-sm text-muted-foreground", "the signup footer line"],
  [GATE, "Already have an account?", "the signup footer's words"],

  // /login. The fields themselves are the real components, so only the rows
  // around them can drift.
  [LOGIN, "mx-auto mb-1 grid h-[128px] place-items-center", "the login perch box"],
  [LOGIN, "Welcome back", "the login heading's words"],
  [LOGIN, "relative mt-5 space-y-3 text-left", "the login form's rows"],
  [LOGIN, "mt-1.5 text-right leading-none", "the Forgot it? row"],
  [LOGIN, "text-[12.5px] font-medium text-muted-foreground", "the Forgot it? link"],
  [LOGIN, "mt-6 text-sm text-muted-foreground", "the login footer line"],
  [LOGIN, "New here?", "the login footer's words"],
];

for (const [source, snippet, what] of COPIED) {
  const where = NAMES.get(source);
  test(`the landing's stand-in still matches ${where} on ${what}`, () => {
    assert.ok(
      FRAME.includes(snippet),
      `auth-first-frame.tsx no longer contains ${what}: ${snippet}`
    );
    assert.ok(
      source.includes(snippet),
      `${where} changed ${what}, so the frame the landing hands over is now wrong: ${snippet}`
    );
  });
}

test("both destinations mount settled off the flag the landing sets", () => {
  const LANDING = read("src/components/landing/landing-hero.tsx");
  const HOOK = read("src/components/mascot/use-flight-arrival.ts");
  assert.ok(
    LANDING.includes("setItem(AUTH_PREVIEW_FLAG, target)"),
    "the landing must name the destination in the flag, so only that page skips its entrance"
  );
  assert.ok(
    HOOK.includes("removeItem(AUTH_PREVIEW_FLAG)"),
    "the flag must be cleared, or a later direct visit in the same tab loses its entrance"
  );
  for (const page of [SIGNUP, LOGIN]) {
    assert.ok(
      page.includes("initial={entrancePlayedOnLanding ? false : { opacity: 0, x: 48 }}"),
      `${NAMES.get(page)} must mount settled when the landing already slid its column in`
    );
  }
});

test("no row in the auth columns fades itself in at mount", () => {
  // The stand-in draws every row opaque, and the real column mounts settled
  // on top of it, so a row that fades ITSELF in has nothing covering it any
  // more: /login's password row blinked for ~180ms right as the bird flew in
  // (owner, 2026-08-26). Its `initial={{ opacity: 0 }}` was left over from
  // when the field could appear later, and was only ever invisible because
  // the column used to fade in over it. Rows may still animate `layout` —
  // the error line arriving has to push them — and the error line itself may
  // fade, because it genuinely does arrive later.
  for (const field of ["<FloatField", "<PasswordField"]) {
    const at = LOGIN.indexOf(field);
    assert.ok(at > 0, `login-client.tsx no longer renders ${field}`);
    /* `<m.div`, not `<motion.div`: the app moved to LazyMotion + `m` so the
       132 KB feature runtime loads off the critical path. Asserted rather
       than assumed, because lastIndexOf returns -1 when the opener is not
       found and slice(-1, at) would hand back the wrong text and pass. */
    const open = LOGIN.lastIndexOf("<m.div", at);
    assert.ok(open > 0, "login-client.tsx no longer opens its rows with <m.div");
    const row = LOGIN.slice(open, at);
    assert.ok(
      !row.includes("initial="),
      `the row around ${field} mounts with its own entrance, which blinks once the column stops covering it`
    );
  }
});
