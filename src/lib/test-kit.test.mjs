import assert from "node:assert/strict";
import test from "node:test";
import { decomment, read } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The comment stripper every shape test stands on (bug audit 3, L9-02).
 *
 *  It was a regex, and a `/*` inside a string opened a "comment" that ran
 *  to the next real one, deleting the code between. A negative assertion
 *  over the deleted span passed on nothing. Each case below is a shape that
 *  did that, followed by code that must survive it.
 * ------------------------------------------------------------------ */

const survives = (src, kept, gone = []) => {
  const out = decomment(src);
  for (const k of kept) assert.ok(out.includes(k), `lost ${JSON.stringify(k)} from:\n${src}\n-> ${out}`);
  for (const g of gone) assert.ok(!out.includes(g), `kept the comment ${JSON.stringify(g)}:\n${out}`);
};

test("a file input's accept list does not swallow the code after it", () => {
  survives(
    `const f = <input type="file" accept="image/*" />;\nconst header = <DialogHeader />;\n/* a real note */`,
    ['accept="image/*"', "<DialogHeader />"],
    ["a real note"]
  );
});

test("a wildcard host in a string is code, not the start of a comment", () => {
  survives(
    `const csp = ["https://*.razorpay.com", "'self'"];\nexport const headers = ["X-Frame-Options"]; // why`,
    ["https://*.razorpay.com", "X-Frame-Options"],
    ["why"]
  );
});

test("an Accept header of */* is a string", () => {
  survives(`fetch(u, { headers: { Accept: "*/*" } });\nreal();\n// later`, ['"*/*"', "real();"], ["later"]);
});

test("a regular expression holding /* or // is a regex", () => {
  survives(
    "const block = /\\/\\*[\\s\\S]*?\\*\\//g;\nconst slashes = /[//]/;\nconst after = 2; /* gone */",
    ["const after = 2;", "/[//]/"],
    ["gone"]
  );
});

test("a // inside a string, past its first character, is not a comment", () => {
  survives(`const u = "see http://x.example // and this";\nnext();`, ["// and this", "next();"]);
});

test("a template literal keeps its slashes, and its substitutions are still code", () => {
  survives(
    "const s = `${a /* inner */} // text /* also text */`;\nok();",
    ["// text /* also text */", "ok();"],
    ["inner"]
  );
});

test("JSX text is text: an apostrophe or a // in it changes nothing", () => {
  survives(
    `const p = <p>Don't // stop</p>;\nconst q = "/*";\nreal();\n{/* gone */}`,
    ["Don't // stop", 'const q = "/*";', "real();"],
    ["gone"]
  );
});

test("comments of every kind still go, and a line comment keeps its line break", () => {
  const out = decomment("a(); // one\n/** two */\nb(); /* three */ c();\n<div>{/* four */}</div>");
  for (const word of ["one", "two", "three", "four"]) assert.ok(!out.includes(word), out);
  assert.equal(out.split("\n").length, 4, "a line comment took its line break with it");
  assert.ok(out.includes("b();  c();"), out);
});

test("text that is not TypeScript falls back to the old reading", () => {
  /* The one non-TS file a test strips is a SQL migration; its block comments
     go and its `--` lines stay, exactly as before. */
  assert.equal(decomment("SELECT 1; /* note */ -- kept"), "SELECT 1;  -- kept");
});

/* The two real files the audit measured. Both lost live code before. */

test("next.config.ts keeps every security header once its comments are gone", () => {
  const config = decomment(read("next.config.ts"));
  for (const header of [
    "Content-Security-Policy",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.ok(config.includes(header), `decomment ate ${header} out of next.config.ts`);
  }
});

test("the attach dialog keeps the header attach-well.test.mjs watches", () => {
  const dialog = decomment(read("src/components/common/attach-image-dialog.tsx"));
  assert.ok(dialog.includes('accept="image/*"'), "the file input is gone; move this probe");
  assert.ok(dialog.includes("<DialogHeader"), "decomment ate the dialog's header again");
});
