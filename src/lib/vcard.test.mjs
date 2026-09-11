import test from "node:test";
import assert from "node:assert/strict";
import { vcardLines, vcardValue, vcardWithPhoto } from "./vcard.ts";

/* The bug (audit Low 97): a comma and a semicolon are STRUCTURE in a vCard
   value, and the profile's card put both into NOTE unescaped on every single
   download, so the house history reached an address book as several mangled
   fields instead of one sentence. */

test("the separators a vCard reads as structure are escaped", () => {
  assert.equal(
    vcardValue("Batch of 2011, Rishi Valley community; Houses: Aravalli 2014-15"),
    "Batch of 2011\\, Rishi Valley community\\; Houses: Aravalli 2014-15"
  );
  assert.equal(vcardValue("Rao, Anand"), "Rao\\, Anand");
});

test("a backslash is escaped first, so escapes are not escaped twice", () => {
  assert.equal(vcardValue("a\\b,c"), "a\\\\b\\,c");
});

test("a line break inside a value becomes the two characters that mean one", () => {
  // A real break would end the property and corrupt everything after it.
  assert.equal(vcardValue("line one\nline two"), "line one\\nline two");
  assert.equal(vcardValue("crlf\r\nhere"), "crlf\\nhere");
});

test("an ordinary value passes through untouched", () => {
  assert.equal(vcardValue("Bengaluru"), "Bengaluru");
  assert.equal(vcardValue("+91 98765 43210"), "+91 98765 43210");
});

test("lines are joined with CRLF and the card ends with one", () => {
  const card = vcardLines(["BEGIN:VCARD", "VERSION:3.0", null, "END:VCARD"]);
  assert.equal(card, "BEGIN:VCARD\r\nVERSION:3.0\r\nEND:VCARD\r\n");
  // Nothing is joined with a bare LF: Outlook has historically refused those.
  assert.equal(/[^\r]\n/.test(card), false);
});

test("the photo goes inside the card, as the last property", () => {
  const card = vcardLines(["BEGIN:VCARD", "VERSION:3.0", "FN:Asha", "END:VCARD"]);
  assert.equal(
    vcardWithPhoto(card, "QUJD"),
    "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Asha\r\nPHOTO;ENCODING=b;TYPE=JPEG:QUJD\r\nEND:VCARD\r\n"
  );
});
