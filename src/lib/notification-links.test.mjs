import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

import { adminThreadLink, postNotificationLink, postNoun } from "./notification-links.ts";
import { ROOT } from "./test-kit.mjs";

test("a letter's notification goes to the letter, where its comments are", () => {
  assert.equal(postNotificationLink({ id: "abc", kind: "letter" }), "/letters/abc");
  assert.equal(postNoun("letter"), "letter");
});

test("a plain post's notification goes to the feed", () => {
  assert.equal(postNotificationLink({ id: "abc", kind: "post" }), "/feed#abc");
  assert.equal(postNotificationLink({ id: "abc" }), "/feed#abc");
  assert.equal(postNoun("post"), "post");
  assert.equal(postNoun(null), "post");
});

test("an admin notification goes to the inbox thread, not the retired route", () => {
  assert.equal(adminThreadLink("t1"), "/admin/messages/t1");
});

test("nothing anywhere mints a link to the retired /admin?thread= route", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === "generated" || name === "node_modules") continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(name)) continue;
      const src = readFileSync(full, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
      if (src.includes("/admin?thread=")) offenders.push(full.slice(ROOT.length + 1));
    }
  };
  walk(resolve(ROOT, "src"));
  assert.deepEqual(offenders, [], `still linking to the retired route: ${offenders.join(", ")}`);
});

test("no notification writer hard-codes a feed fragment any more", () => {
  // The four writers in feed/actions.ts each built `/feed#${postId}` inline
  // with no idea what kind of post it was. They must go through the helper.
  const src = readFileSync(resolve(ROOT, "src/app/(main)/feed/actions.ts"), "utf8");
  assert.ok(
    !/link: `\/feed#\$\{/.test(src),
    "a notification writer hard-codes /feed# again instead of using postNotificationLink"
  );
});

test("nothing links a member to /settings, which does not exist", () => {
  /* The settings page was retired ("your profile IS it", sidebar.tsx) and the
     links that pointed at it were not moved, so the notification a member gets
     after cancelling their account deletion -- the exact moment they are most
     likely to want to check their own details -- sent them to a 404 (audit
     M49). Swept rather than spot-checked, and over `link:` / `href=` targets
     only, so prose that happens to mention settings is not a false positive.
     /lab is excluded: it is the dev index, and its rooms catalogue routes that
     have been retired on purpose. */
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = resolve(dir, name);
      if (statSync(full).isDirectory()) {
        if (name === "node_modules" || full.endsWith("/src/app/lab")) continue;
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(name)) continue;
      const src = readFileSync(full, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
      if (/(link:\s*|href=\{?)["'`]\/settings\b/.test(src)) {
        offenders.push(full.slice(ROOT.length + 1));
      }
    }
  };
  walk(resolve(ROOT, "src"));
  assert.deepEqual(offenders, [], `linking to the retired /settings: ${offenders.join(", ")}`);
});
