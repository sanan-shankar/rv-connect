// Estimate how much of the built stylesheet exists only because of /lab sources.
// Method: every top-level rule in the CSS is a selector + body. For each selector, recover the Tailwind
// utility name (unescape, strip the leading dot, strip pseudo/at-rule wrappers), then check whether that
// exact token appears in any non-lab source file. Tokens that appear ONLY in lab files are "lab-only";
// their rule bytes are the lab's share. Tokens found nowhere are "unattributed" (base/theme/@utility output).
// Usage: node css-lab-share.mjs <built.css> <repo root>
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const [css, root] = process.argv.slice(2);
const text = readFileSync(css, "utf8");
const walk = (d, out = []) => { for (const e of readdirSync(d)) { const p = join(d, e); const s = statSync(p); if (s.isDirectory()) { if (!/node_modules|generated|\.next/.test(e)) walk(p, out); } else if (/\.(tsx?|mjs|css|md)$/.test(e)) out.push(p); } return out; };
const files = walk(join(root, "src"));
const tokensOf = (t) => new Set(t.split(/[\s"'`{}<>=;,()]+/));
const labTok = new Set(), otherTok = new Set();
for (const f of files) { const s = tokensOf(readFileSync(f, "utf8")); const isLab = f.includes("src/app/lab/"); for (const x of s) (isLab ? labTok : otherTok).add(x); }
// Split CSS into rules at top level (handles one level of @media/@supports nesting by flattening)
const rules = [];
let depth = 0, start = 0, sel = "", i = 0;
const stack = [];
while (i < text.length) {
  const c = text[i];
  if (c === "{") { const head = text.slice(start, i).trim(); stack.push(head); start = i + 1; depth++; }
  else if (c === "}") { depth--; const head = stack.pop(); const body = text.slice(start, i); if (head && !head.startsWith("@")) rules.push({ sel: head, bytes: head.length + body.length + 2 }); start = i + 1; }
  i++;
}
const unesc = (s) => s.replace(/\\(.)/g, "$1");
const utilOf = (sel) => { const m = sel.match(/^\.((?:\\.|[^\s:>+~,\[])+(?:\[[^\]]*\])?)/); return m ? unesc(m[1]) : null; };
let labOnly = 0, shared = 0, unattributed = 0, labOnlyCount = 0, total = 0;
const labOnlySamples = [];
for (const r of rules) {
  total += r.bytes;
  const u = utilOf(r.sel);
  if (!u) { unattributed += r.bytes; continue; }
  const inOther = otherTok.has(u), inLab = labTok.has(u);
  if (inLab && !inOther) { labOnly += r.bytes; labOnlyCount++; if (labOnlySamples.length < 40) labOnlySamples.push(u); }
  else if (inOther) shared += r.bytes;
  else unattributed += r.bytes;
}
const kb = (b) => (b / 1024).toFixed(1);
console.log(`stylesheet ${kb(text.length)} KB; ${rules.length} class rules parsed (${kb(total)} KB in rules)`);
console.log(`lab-only utilities: ${labOnlyCount} rules, ${kb(labOnly)} KB`);
console.log(`used by shipped code: ${kb(shared)} KB`);
console.log(`unattributed (base, theme, @utility, non-class selectors): ${kb(unattributed)} KB`);
console.log(`sample lab-only utilities: ${labOnlySamples.join(" ")}`);
