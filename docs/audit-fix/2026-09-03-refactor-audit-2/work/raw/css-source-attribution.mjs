// Attribute every class rule in the built stylesheet to where its utility token occurs:
//   shipped  = in src/**/*.{ts,tsx} outside src/app/lab
//   lab-only = only in src/app/lab
//   prose    = in NO src TypeScript file, but somewhere else Tailwind scans (docs, progress.md, .claude, scripts, e2e, md/json)
//   none     = token found nowhere (theme/@utility output, generated variants)
// Usage: node css-source-attribution.mjs <built.css> <repo root>
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const [css, rootArg] = process.argv.slice(2); const root = (await import("node:path")).resolve(rootArg);
const text = readFileSync(css, "utf8");
const SKIP = /^(node_modules|\.next|\.git|\.scratch|\.next-stale.*|sanan's stuff|\.backups|\.pw-browsers)$/;
const walk = (d, out = []) => { for (const e of readdirSync(d)) { if (SKIP.test(e)) continue; const p = join(d, e); let s; try { s = statSync(p); } catch { continue; } if (s.isDirectory()) walk(p, out); else if (s.size < 3_000_000 && !/\.(png|jpe?g|webp|ico|svg|woff2?|pdf|zip|gz|data)$/i.test(e)) out.push(p); } return out; };
const files = walk(root);
const tokensOf = (t) => new Set(t.split(/[\s"'`{}<>=;,()]+/));
const shipped = new Set(), lab = new Set(), prose = new Set();
const proseFiles = new Map();
for (const f of files) {
  let s; try { s = readFileSync(f, "utf8"); } catch { continue; }
  const rel = f.slice(root.length + 1);
  const toks = tokensOf(s);
  const isSrcTs = rel.startsWith("src/") && /\.(ts|tsx)$/.test(rel) && !rel.startsWith("src/generated/");
  if (isSrcTs) { const isLab = rel.startsWith("src/app/lab/"); for (const x of toks) (isLab ? lab : shipped).add(x); }
  else { for (const x of toks) { prose.add(x); if (!proseFiles.has(x)) proseFiles.set(x, rel); } }
}
const rules = []; let start = 0; const stack = [];
for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === "{") { stack.push(text.slice(start, i).trim()); start = i + 1; } else if (c === "}") { const head = stack.pop(); const body = text.slice(start, i); if (head && !head.startsWith("@")) rules.push({ sel: head, bytes: head.length + body.length + 2 }); start = i + 1; } }
const unesc = (s) => s.replace(/\\(.)/g, "$1");
const utilOf = (sel) => { const m = sel.match(/^\.((?:\\.|[^\s:>+~,\[])+(?:\[[^\]]*\])?)/); return m ? unesc(m[1]) : null; };
const acc = { shipped: [0, 0], "lab-only": [0, 0], prose: [0, 0], none: [0, 0] };
const proseSamples = new Map();
for (const r of rules) {
  const u = utilOf(r.sel); let k = "none";
  if (u) { if (shipped.has(u)) k = "shipped"; else if (lab.has(u)) k = "lab-only"; else if (prose.has(u)) { k = "prose"; const src = proseFiles.get(u); proseSamples.set(src, (proseSamples.get(src) ?? 0) + 1); } }
  acc[k][0]++; acc[k][1] += r.bytes;
}
const kb = (b) => (b / 1024).toFixed(1);
console.log(`stylesheet ${kb(text.length)} KB, ${rules.length} class rules, ${files.length} scanned files`);
for (const [k, [n, b]] of Object.entries(acc)) console.log(`${k.padEnd(9)} ${String(n).padStart(5)} rules ${kb(b).padStart(7)} KB`);
console.log("prose-only rules by the first non-src file that mentions the token:");
for (const [f, n] of [...proseSamples].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(4)}  ${f}`);
