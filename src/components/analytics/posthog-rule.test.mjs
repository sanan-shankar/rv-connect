import assert from "node:assert/strict";
import test from "node:test";
import { relative } from "node:path";
import { ROOT, read, decomment, walk } from "../../lib/test-kit.mjs";
import { MASKED_QUERY_PARAMS, NO_CAPTURE, maskSearchWords } from "../../lib/posthog-privacy.ts";
import { renderRichText } from "../../lib/rich-text.ts";

/* ------------------------------------------------------------------ *
 *  What PostHog reads, and when it stops reading as somebody.
 *
 *  Bug audit 3, two rows:
 *
 *   - T7b-22: autocapture sent the words and the attributes of every click,
 *     so a classmate's name left off a directory card and their address or
 *     number left off a mailto:/tel: row of their contact card, under the
 *     identity of whoever tapped. The owner's ruling (2026-10-29): hide
 *     anything that shows a person, keep the rest. So: NO_CAPTURE on every
 *     surface that shows a person, no page titles, and search words masked.
 *   - T7b-21: signing out never ended the PostHog identity, so the next
 *     person on that browser was filed under the member who had left; and
 *     the owner's opt-out outlived his sign-out with nothing to lift it, so a
 *     member signing in after him was never counted.
 *
 *  Mostly shape assertions, because the components are .tsx and the unit
 *  gate runs bare `node`. Two are behaviour: the masking helper and the
 *  mention renderer are plain modules and run here. One reads the INSTALLED
 *  posthog-js: everything below leans on what the library does with the
 *  class, and a version that stopped doing it would leak with every test
 *  here still green.
 * ------------------------------------------------------------------ */

const CLIENT = "src/components/analytics/posthog-client.ts";
const IDENTIFY = "src/components/analytics/posthog-identify.tsx";
const SIGN_OUT = "src/components/auth/sign-out.ts";

test("PostHog gets no page title, no search words and no replay", () => {
  const src = decomment(read(CLIENT));
  assert.match(
    src,
    /property_denylist:\s*\["title"\]/,
    "every pageview carries document.title again: a profile's is the member's name"
  );
  assert.match(src, /mask_personal_data_properties:\s*true/);
  assert.match(
    src,
    /custom_personal_data_properties:\s*MASKED_QUERY_PARAMS/,
    "the search words are back in every URL PostHog records"
  );
  assert.match(
    src,
    /before_send:\s*maskSearchWords/,
    "the referrer carries the search words again: the library leaves it as the browser gave it"
  );
  assert.match(src, /disable_session_recording:\s*true/);
  assert.deepEqual(MASKED_QUERY_PARAMS, ["q"]);
});

test("the search words are masked in every address an event carries, and only there", () => {
  const event = {
    event: "$pageview",
    properties: {
      $current_url: "https://rishivalley.space/directory?q=Jane%20Doe&year=2004",
      $referrer: "https://rishivalley.space/feed?q=Ravi#top",
      $external_click_url: "https://example.com/?qq=1&q=2",
      $session_entry_url: "https://rishivalley.space/collection",
      $el_text: "a q=word that is not an address",
      $pathname: "/directory",
      token: "phc_project_key",
    },
    $set: { $referrer: "$direct" },
    $set_once: { $initial_referrer: "https://rishivalley.space/admin/people?q=someone@example.com" },
  };
  const out = maskSearchWords(event);
  assert.equal(out, event, "the same event comes back, so nothing posthog-js relies on is lost");
  assert.equal(out.properties.$current_url, "https://rishivalley.space/directory?q=<masked>&year=2004");
  assert.equal(out.properties.$referrer, "https://rishivalley.space/feed?q=<masked>#top");
  assert.equal(out.properties.$external_click_url, "https://example.com/?qq=1&q=<masked>");
  assert.equal(out.properties.$session_entry_url, "https://rishivalley.space/collection");
  assert.equal(out.properties.$el_text, "a q=word that is not an address");
  assert.equal(out.properties.token, "phc_project_key", "ingest rejects an event without its token");
  assert.equal(out.$set.$referrer, "$direct");
  assert.equal(out.$set_once.$initial_referrer, "https://rishivalley.space/admin/people?q=<masked>");
  assert.equal(maskSearchWords(null), null);
  // Masking twice changes nothing: the library has often masked $current_url first.
  assert.equal(
    maskSearchWords({ properties: { $current_url: out.properties.$current_url } }).properties.$current_url,
    out.properties.$current_url
  );
});

test("the installed posthog-js still drops a click inside the class, and replay still blocks it", () => {
  assert.equal(NO_CAPTURE, "ph-no-capture");
  const map = JSON.parse(read("node_modules/posthog-js/dist/module.js.map"));
  const source = (suffix) => {
    const i = map.sources.findIndex((s) => s.endsWith(suffix));
    assert.notEqual(i, -1, `posthog-js no longer bundles ${suffix}: re-read what the class does`);
    return map.sourcesContent[i];
  };
  const autocapture = source("src/autocapture.ts");
  assert.match(
    autocapture,
    /if \(includes\(classes, 'ph-no-capture'\)\) \{\s*explicitNoCapture = true/,
    "posthog-js no longer treats ph-no-capture on the pressed element or an ancestor as 'send nothing'"
  );
  assert.match(autocapture, /if \(explicitNoCapture\) \{\s*return false\s*\}/);
  assert.match(
    source("src/extensions/replay/external/lazy-loaded-session-recorder.ts"),
    /blockClass: 'ph-no-capture'/,
    "session replay's block class changed: a person would show in a recording if replay were ever on"
  );
  assert.match(
    source("browser-common/dist/utils/autocapture-utils.mjs"),
    /DEFAULT_DEAD_CLICK_IGNORE_LIST = \[\s*'\.ph-no-deadclick',\s*'\.ph-no-capture'\s*\]/
  );
});

test("a mention renders with the class, in a post and in the composer", () => {
  const html = renderRichText("thanks @[Aditi Parekh](cmu816m5e000004l8d2tfip0x)");
  assert.match(html, /<a href="\/profile\/cmu816m5e000004l8d2tfip0x" data-mention-id="[^"]+" class="ph-no-capture /);
  assert.match(
    decomment(read("src/lib/mention-editing.ts")),
    /const TOKEN_CLASS = `\$\{NO_CAPTURE\} /
  );
});

/* Every surface that shows a person, and the element that carries the class.
   A new one belongs here. The pattern names the element so the class cannot
   drift onto a neighbour, or a wrapper, without this failing. */
const SURFACES = [
  ["src/components/profile/get-in-touch.tsx", /<a\s+href=\{method\.href\}[\s\S]*?className=\{`\$\{NO_CAPTURE\} /, "a contact row"],
  ["src/components/directory/profile-card.tsx", /<Link\s+href=\{`\/profile\/\$\{user\.id\}`\}\s+className=\{`\$\{NO_CAPTURE\} /, "a directory card"],
  ["src/components/common/identity-row.tsx", /<div className=\{cn\(NO_CAPTURE, /, "an avatar, name and byline row"],
  ["src/components/common/person-name.tsx", /className=\{`\$\{NO_CAPTURE\} font-semibold/, "a name"],
  ["src/components/common/bird-avatar.tsx", /className=\{`\$\{NO_CAPTURE\} \$\{base\}/, "a photo avatar"],
  ["src/components/common/bird-avatar.tsx", /className=\{`\$\{NO_CAPTURE\} \$\{v2Base\}/, "a bird avatar"],
  ["src/components/common/image-viewer.tsx", /href=\{`\/profile\/\$\{current\.author\.id\}`\}\s+className=\{`\$\{NO_CAPTURE\} /, "the viewer's byline"],
  ["src/components/posts/comments-section.tsx", /aria-label=\{author\.name\}\s+className=\{`\$\{NO_CAPTURE\} /, "a comment's avatar link"],
  ["src/components/directory/alumni-map.tsx", /className=\{`\$\{NO_CAPTURE\} group block rounded-\[var\(--radius-md\)\]/, "a map drilldown row"],
  ["src/components/collection/photo-river.tsx", /className=\{`\$\{NO_CAPTURE\} group relative block/, "a Collection tile"],
  ["src/components/layout/notification-bell.tsx", /<DropdownMenuItem\s+key=\{notif\.id\}[\s\S]*?className=\{`\$\{NO_CAPTURE\} /, "a notification"],
  ["src/components/profile/letterhead-profile.tsx", /aria-label=\{`Admission number \$\{admissionNumber\}[^`]*`\}\s+className=\{`\$\{NO_CAPTURE\} /, "the admission number"],
  ["src/components/profile/letterhead-profile.tsx", /!live && NO_CAPTURE/, "the perched bird, while it is labelled with the name"],
  ["src/app/(main)/admin/layout.tsx", /<div className=\{`\$\{NO_CAPTURE\} contents`\}>/, "the admin area"],
];

test("every surface that shows a person carries NO_CAPTURE", () => {
  for (const [file, pattern, what] of SURFACES) {
    const src = decomment(read(file));
    assert.match(src, /import \{ NO_CAPTURE \} from "@\/lib\/posthog-privacy";/, `${file} no longer imports NO_CAPTURE`);
    assert.match(src, pattern, `${what} (${file}) no longer carries NO_CAPTURE: a tap on it hands PostHog a person`);
  }
});

test("nothing spells the class out by hand, where a typo would leak in silence", () => {
  const offenders = walk(`${ROOT}/src`, { match: /\.(ts|tsx)$/ })
    .map((full) => relative(ROOT, full))
    .filter((file) => file !== "src/lib/posthog-privacy.ts")
    .filter((file) => decomment(read(file)).includes("ph-no-capture"));
  assert.deepEqual(offenders, [], "use NO_CAPTURE from src/lib/posthog-privacy.ts");
});

test("the presses that open no page still count, without the person on them", () => {
  /* The class takes the whole autocaptured click, and these three change no
     address a pageview could count instead: a mail app or dialler, the photo
     viewer, the composer (whose button is the member's own bird). */
  assert.match(
    decomment(read("src/components/profile/get-in-touch.tsx")),
    /ph\.capture\("contact_tapped", \{ method: method\.kind \}\)/,
    "a contact tap counts as which kind of contact, never the address or number itself"
  );
  assert.match(decomment(read("src/components/collection/photo-river.tsx")), /ph\.capture\("photo_opened"\)/);
  assert.match(decomment(read("src/components/feed/new-post-cta.tsx")), /ph\.capture\("composer_opened"\)/);
});

test("every sign-out ends the PostHog identity", () => {
  const importers = walk(`${ROOT}/src`, { match: /\.(ts|tsx)$/ })
    .map((full) => relative(ROOT, full))
    .filter((file) => /import \{[^}]*\bsignOut\b[^}]*\} from "next-auth\/react"/.test(decomment(read(file))));
  assert.deepEqual(
    importers,
    [SIGN_OUT],
    "a sign-out that calls next-auth directly leaves the next person on that browser filed under this one"
  );
  const wrapper = decomment(read(SIGN_OUT));
  assert.ok(
    wrapper.indexOf("endPostHogIdentity();") !== -1 &&
      wrapper.indexOf("endPostHogIdentity();") < wrapper.indexOf("signOut({"),
    "the identity must end before the sign-out navigates away"
  );
  for (const file of ["src/components/layout/sidebar.tsx", "src/components/profile/letterhead-profile.tsx"]) {
    assert.match(decomment(read(file)), /signOutOfSite\(\)/, `${file} no longer signs out through signOutOfSite`);
  }
});

test("the reset keeps an opt-out, and a member after an excluded account is counted again", () => {
  const client = decomment(read(CLIENT));
  const end = client.slice(client.indexOf("export function endPostHogIdentity"));
  assert.match(
    end,
    /const optedOut = ph\.has_opted_out_capturing\(\);\s*ph\.reset\(\);\s*if \(optedOut\) ph\.opt_out_capturing\(\);/,
    "reset() clears consent: without putting the opt-out back, the owner's device starts counting him the moment he signs out"
  );

  const identify = decomment(read(IDENTIFY));
  const optIn = identify.indexOf("ph.opt_in_capturing({ captureEventName: false })");
  assert.notEqual(optIn, -1, "a member signing in on the owner's device is never counted, or sends an $opt_in event");
  assert.match(identify, /if \(!DEV_SILENCED && ph\.has_opted_out_capturing\(\)\) \{/, "the opt-in must not undo a dev server's opt-out");
  assert.ok(optIn < identify.indexOf("ph.identify("), "opt in first, or identify's own events are dropped");
  assert.match(identify, /if \(excluded\) \{\s*ph\.opt_out_capturing\(\);\s*return;\s*\}/, "an excluded account must never reach the opt-in");
});
