import test from "node:test";
import assert from "node:assert/strict";

import {
  verifyEmailTemplate,
  resetPasswordTemplate,
  passwordChangedTemplate,
  deletionScheduledTemplate,
} from "./email-templates.ts";
import { read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  An email says one thing, not two.
 *
 *  Every message ships an HTML part and a plain-text part, and until
 *  2026-09-05 both were typed out by hand. Three of the four had drifted:
 *  the reset told one reader to set a password "below" and the other
 *  "here"; the password-changed and deletion notices carried a labelled
 *  button in HTML and, in text, a bare URL hung off a sentence with a
 *  colon and no label at all. Nothing anywhere read this file, so nothing
 *  noticed.
 *
 *  `shell` builds both halves from one set of words now. This is what
 *  stops the next person reintroducing a second copy.
 * ------------------------------------------------------------------ */

function decode(s) {
  return s
    .replace(/&#8203;|&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Everything `escapeHtml` writes, turned back into the characters a person
 *  reads, as one run of prose. */
function htmlToText(html) {
  return decode(html.replace(/<[^>]+>/g, " "));
}

/** The shell's own furniture, which is HTML-only by design and has no business
 *  in a plain-text part: the masthead wordmark, the "here is the raw link"
 *  preamble that exists because the pill renders as nothing on old clients,
 *  and the sender line at the foot. */
const CHROME = new Set(["Rishi Valley", "Or paste this link into your browser:", "rishivalley.space"]);

/**
 * The HTML's visible content, one entry per block, with the preheader dropped.
 *
 * The preheader is the one thing that is legitimately in the HTML and not in
 * the text: it is the line an inbox shows beside the subject, and plain text
 * has no such slot.
 */
function htmlBlocks(html) {
  return html
    .replace(/<div style="display:none[\s\S]*?<\/div>/, "")
    .replace(/<\/(?:td|p|h\d)>|<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map(decode)
    .filter((line) => line && !CHROME.has(line));
}

const MESSAGES = [
  ["verifyEmail", verifyEmailTemplate({ name: "Jerry Maguire", url: "https://x.test/v?t=a&b=1", hours: 24 })],
  [
    "resetPassword",
    resetPasswordTemplate({
      name: "Jerry Maguire",
      email: "jerry@example.com",
      url: "https://x.test/r?t=a",
      minutes: 60,
    }),
  ],
  ["passwordChanged", passwordChangedTemplate({ name: "Jerry Maguire" })],
  [
    "deletionScheduled",
    deletionScheduledTemplate({ name: "Jerry Maguire", purgeDate: "4 November 2026" }),
  ],
];

for (const [name, mail] of MESSAGES) {
  test(`${name}: every sentence the text part carries is in the HTML too`, () => {
    const rendered = htmlToText(mail.html);
    for (const line of mail.text.split("\n").filter(Boolean)) {
      // The text part labels its link "Keep my account:"; the HTML puts the
      // same words on a button, without the colon.
      const said = line.endsWith(":") ? line.slice(0, -1) : line;
      assert.ok(
        rendered.includes(said),
        `${name}: the HTML never says "${said}", so the two halves have drifted apart again`
      );
    }
  });

  test(`${name}: the text part names the action as well as linking it`, () => {
    /* The bug this exists for: passwordChanged and deletionScheduled each
       offered a labelled button in HTML and, in plain text, a naked URL. A
       reader on an old client was told to click something without being told
       what it did. */
    const lines = mail.text.split("\n");
    const href = lines.find((l) => l.startsWith("http"));
    assert.ok(href, `${name}: the text part carries no link at all`);
    const label = lines[lines.indexOf(href) - 1];
    assert.ok(
      label && label.endsWith(":") && label.length > 1,
      `${name}: the link is preceded by "${label}" rather than by what it does`
    );
    assert.ok(mail.html.includes(`href="${href}"`), `${name}: the two halves link to different places`);
  });

  test(`${name}: every sentence the HTML carries is in the text part too`, () => {
    /* The other direction, and the one that matters more: a member reading in
       plain text must not be missing something the HTML reader was told. The
       two notices used to drop their CTA label this way. */
    for (const block of htmlBlocks(mail.html)) {
      assert.ok(
        mail.text.includes(block),
        `${name}: the plain-text part never says "${block}", so one reader is told less than the other`
      );
    }
  });

  test(`${name}: the subject and the heading are not the same sentence twice`, () => {
    // Not a duplication rule -- an inbox shows both, and a subject repeated as
    // the first line of the body wastes the one line a person actually reads.
    assert.ok(mail.subject.length > 0);
    assert.notEqual(mail.subject, mail.text.split("\n")[0]);
  });
}

test("no message hard-codes an origin now that there is one to import", () => {
  const src = decomment(read("src/lib/email-templates.ts"));
  const literals = [...src.matchAll(/"https:\/\/rishivalley\.space[^"]*"/g)].map((m) => m[0]);
  assert.deepEqual(
    literals,
    [],
    "a URL is spelled out here again instead of built from CANONICAL_ORIGIN; " +
      "moving the host is then two changes, and TRAPS records what that costs"
  );
});
