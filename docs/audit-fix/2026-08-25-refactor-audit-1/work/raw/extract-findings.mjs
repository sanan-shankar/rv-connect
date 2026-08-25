// Parse agents/*.md finding blocks into findings-index.json for the verify workflow.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const dir = process.argv[2];
const out = [];
for (const f of readdirSync(join(dir, "agents")).filter((x) => x.endsWith(".md")).sort()) {
  const txt = readFileSync(join(dir, "agents", f), "utf8");
  const blocks = txt.split(/^### /m).slice(1);
  for (const b of blocks) {
    const title = b.split("\n")[0].trim();
    const m = title.match(/^([a-z0-9-]+?-\d+)\s*[-–]\s*(.*)$/);
    if (!m) continue;
    const grab = (label) => {
      const r = b.match(new RegExp(`\\*\\*${label}\\*\\*:?\\s*([^\\n]*(?:\\n(?![-#*]|\\s*- \\*\\*)[^\\n]*)*)`));
      return r ? r[1].replace(/\s+/g, " ").trim() : "";
    };
    const tierLine = b.match(/\*\*Tier\*\*:?\s*(T\d)[^\n]*/);
    const cls = b.match(/\*\*Class\*\*:?\s*(structural|cheap)/);
    const dec = b.match(/\*\*Decides\*\*:?\s*([a-z]+(?:\s*\([^)]*\))?(?:\s*\/\s*[a-z]+(?:\s*\([^)]*\))?)?)/);
    out.push({
      id: m[1], title: m[2], file: f,
      where: grab("Where").slice(0, 400),
      phase: grab("Phase").split(/\s{2,}|\*\*/)[0].trim().slice(0, 60),
      tier: tierLine ? tierLine[1] : "",
      class: cls ? cls[1] : "",
      decides: dec ? dec[1].trim() : "",
      saving: grab("Saving").slice(0, 200),
      gate: grab("Risk & gate").slice(0, 200),
      claim: grab("Evidence").slice(0, 500),
    });
  }
}
writeFileSync(join(dir, "findings-index.json"), JSON.stringify(out, null, 1));
console.log(`${out.length} findings from ${new Set(out.map(o=>o.file)).size} reports`);
const tally = {};
for (const o of out) { tally[o.tier] = (tally[o.tier]||0)+1; }
console.log("tiers:", JSON.stringify(tally));
console.log("owner-decides:", out.filter(o=>/owner/.test(o.decides)).length);
