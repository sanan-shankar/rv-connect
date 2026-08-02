#!/usr/bin/env node
/**
 * Contrast audit: CIE L* deltas and WCAG contrast ratios for the token set
 * in src/app/globals.css. Adversarial CONTRAST lens, 2026-08-02.
 *
 * No eyeballing: every number below is computed from the hexes actually
 * parsed out of globals.css (:root and .dark blocks).
 */
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8');

// ---- parse the two token blocks -------------------------------------------
function block(name) {
  // find the selector, then take everything to the matching closing brace
  const start = CSS.indexOf(name + ' {');
  if (start < 0) throw new Error('no block ' + name);
  let i = CSS.indexOf('{', start);
  let depth = 0, end = i;
  for (; end < CSS.length; end++) {
    if (CSS[end] === '{') depth++;
    else if (CSS[end] === '}') { depth--; if (depth === 0) break; }
  }
  const body = CSS.slice(i + 1, end);
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}
const ROOT = block(':root');
const DARK = block('.dark');

// ---- colour maths ---------------------------------------------------------
const hex = (h) => {
  const s = h.replace('#', '').trim();
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const Y = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const Lstar = (rgb) => {
  const y = Y(rgb);
  const f = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  return 116 * f - 16;
};
const ratio = (a, b) => {
  const [l1, l2] = [Y(a), Y(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
// tint (rgb triple) at alpha over an opaque surface
const over = (tint, alpha, surface) =>
  tint.map((c, i) => Math.round(c * alpha + surface[i] * (1 - alpha)));

const f2 = (n) => (n >= 0 ? '+' : '') + n.toFixed(2);
const r2 = (n) => n.toFixed(2) + ':1';

// ---- state layer tokens ---------------------------------------------------
function stateInk(b) {
  return b['--state-ink'].split(/\s+/).map(Number);
}
function alphaOf(expr) {
  return Number(expr.match(/\/\s*([\d.]+)\s*\)/)[1]);
}
const LIGHT_INK = stateInk(ROOT);
const DARK_INK = stateInk(DARK);
const A_HOVER = alphaOf(ROOT['--state-hover']);
const A_PRESS = alphaOf(ROOT['--state-press']);

console.log('state-ink light:', LIGHT_INK.join(','), ' dark:', DARK_INK.join(','));
console.log('alphas: hover', A_HOVER, ' press', A_PRESS, '\n');

// ===========================================================================
console.log('=== 1. STATE LAYER CONSISTENCY ============================\n');

const lightSurfaces = {
  'background (page) ': ROOT['--background'],
  'mist / muted     ': ROOT['--muted'],
  'secondary        ': ROOT['--secondary'],
  'card (paper)     ': ROOT['--card'],
  'popover (float)  ': ROOT['--popover'],
  'accent (old hov) ': ROOT['--accent'],
  'primary (canopy) ': ROOT['--primary'],
  'sidebar (canopy) ': ROOT['--sidebar'],
};
const darkSurfaces = {
  'background (page) ': DARK['--background'],
  'mist / muted     ': DARK['--muted'],
  'secondary        ': DARK['--secondary'],
  'card (paper)     ': DARK['--card'],
  'popover (float)  ': DARK['--popover'],
  'accent           ': DARK['--accent'],
  'primary (leaf)   ': DARK['--primary'],
  'sidebar (rail)   ': DARK['--sidebar'],
};

function stateTable(label, surfaces, ink) {
  console.log(`-- ${label} --`);
  console.log('surface              base       hover dL*   press dL*   press-hover');
  const hovers = [], presses = [];
  for (const [name, h] of Object.entries(surfaces)) {
    const s = hex(h);
    const L = Lstar(s);
    const dh = Lstar(over(ink, A_HOVER, s)) - L;
    const dp = Lstar(over(ink, A_PRESS, s)) - L;
    hovers.push({ name, d: dh });
    presses.push({ name, d: dp });
    console.log(
      `${name} ${h.padEnd(9)} ${f2(dh).padStart(10)}  ${f2(dp).padStart(10)}   ${f2(dp - dh).padStart(7)}`
    );
  }
  const ah = hovers.map((x) => Math.abs(x.d));
  const ap = presses.map((x) => Math.abs(x.d));
  const min = Math.min(...ah), max = Math.max(...ah);
  const mn = hovers.find((x) => Math.abs(x.d) === min).name.trim();
  const mx = hovers.find((x) => Math.abs(x.d) === max).name.trim();
  console.log(`|dL*| hover  min ${min.toFixed(2)} (${mn})  max ${max.toFixed(2)} (${mx})  spread ${(max - min).toFixed(2)}`);
  console.log(`|dL*| press  min ${Math.min(...ap).toFixed(2)}  max ${Math.max(...ap).toFixed(2)}  spread ${(Math.max(...ap) - Math.min(...ap)).toFixed(2)}`);
  const fails = hovers.filter((x) => Math.abs(x.d) < 2.0);
  console.log(fails.length ? `FAIL <2.0 dL*: ${fails.map((x) => x.name.trim() + ' ' + f2(x.d)).join(', ')}` : 'PASS: every hover >= 2.0 dL*');
  console.log('');
  return { hovers, presses };
}
stateTable('LIGHT', lightSurfaces, LIGHT_INK);
stateTable('DARK', darkSurfaces, DARK_INK);

// ===========================================================================
console.log('=== 2. SIDEBAR ============================================\n');

function wcag(label, fg, bg, need) {
  const c = ratio(hex(fg), hex(bg));
  const ok = c >= need;
  console.log(`${label.padEnd(46)} ${fg} on ${bg}  ${r2(c).padStart(8)}  need ${need}  ${ok ? 'PASS' : 'FAIL'}`);
  return c;
}

console.log('-- DARK sidebar, rail --sidebar ' + DARK['--sidebar'] + ' --');
const drail = DARK['--sidebar'];
wcag('foreground (active/primary label)', DARK['--sidebar-foreground'], drail, 4.5);
wcag('foreground-idle (idle nav label)', DARK['--sidebar-foreground-idle'], drail, 4.5);
wcag('foreground-muted (account/footer meta)', DARK['--sidebar-foreground-muted'], drail, 4.5);
wcag('foreground-muted as LARGE/UI', DARK['--sidebar-foreground-muted'], drail, 3.0);
wcag('sidebar-primary (leaf)', DARK['--sidebar-primary'], drail, 3.0);
wcag('sidebar-ring', DARK['--sidebar-ring'], drail, 3.0);
wcag('sidebar-border vs rail (UI edge)', DARK['--sidebar-border'], drail, 3.0);
wcag('cinnamon edge vs rail', ROOT['--cinnamon'], drail, 3.0);
console.log('  cinnamon dL* vs rail: ' + f2(Lstar(hex(ROOT['--cinnamon'])) - Lstar(hex(drail))));
console.log('');
console.log('  active row --sidebar-active ' + DARK['--sidebar-active']);
wcag('  white label on active row', '#FFFFFF', DARK['--sidebar-active'], 4.5);
wcag('  sidebar-accent-foreground on active', DARK['--sidebar-accent-foreground'], DARK['--sidebar-active'], 4.5);
wcag('  sidebar-foreground on active row', DARK['--sidebar-foreground'], DARK['--sidebar-active'], 4.5);
wcag('  idle ink on active row (if unswapped)', DARK['--sidebar-foreground-idle'], DARK['--sidebar-active'], 4.5);
console.log('  active row dL* above rail: ' + f2(Lstar(hex(DARK['--sidebar-active'])) - Lstar(hex(drail))));
console.log('  hover row dL* above rail:  ' + f2(Lstar(hex(DARK['--sidebar-hover'])) - Lstar(hex(drail))));
console.log('  active dL* above hover:    ' + f2(Lstar(hex(DARK['--sidebar-active'])) - Lstar(hex(DARK['--sidebar-hover']))));
console.log('  rail dL* vs page:          ' + f2(Lstar(hex(drail)) - Lstar(hex(DARK['--background']))));
wcag('  hover row vs rail (UI 3:1 n/a, info)', DARK['--sidebar-hover'], drail, 3.0);
wcag('  ink on hover row', DARK['--sidebar-foreground-idle'], DARK['--sidebar-hover'], 4.5);
console.log('');

console.log('-- LIGHT sidebar, rail --sidebar ' + ROOT['--sidebar'] + ' --');
const lrail = ROOT['--sidebar'];
wcag('foreground', ROOT['--sidebar-foreground'], lrail, 4.5);
wcag('foreground-idle', ROOT['--sidebar-foreground-idle'], lrail, 4.5);
wcag('foreground-muted', ROOT['--sidebar-foreground-muted'], lrail, 4.5);
wcag('sidebar-primary (leaf-light)', ROOT['--sidebar-primary'], lrail, 3.0);
wcag('sidebar-border vs rail', ROOT['--sidebar-border'], lrail, 3.0);
wcag('cinnamon edge vs rail', ROOT['--cinnamon'], lrail, 3.0);
console.log('  cinnamon dL* vs rail: ' + f2(Lstar(hex(ROOT['--cinnamon'])) - Lstar(hex(lrail))));
wcag('white label on active row', '#FFFFFF', ROOT['--sidebar-active'], 4.5);
wcag('idle ink on hover row', ROOT['--sidebar-foreground-idle'], ROOT['--sidebar-hover'], 4.5);
console.log('  hover dL* above rail:   ' + f2(Lstar(hex(ROOT['--sidebar-hover'])) - Lstar(hex(lrail))));
console.log('  active dL* above rail:  ' + f2(Lstar(hex(ROOT['--sidebar-active'])) - Lstar(hex(lrail))));
console.log('  active dL* above hover: ' + f2(Lstar(hex(ROOT['--sidebar-active'])) - Lstar(hex(ROOT['--sidebar-hover']))));
console.log('  rail dL* vs page:       ' + f2(Lstar(hex(lrail)) - Lstar(hex(ROOT['--background']))));
console.log('');

// state-layer on the sidebar (the rows now use --sidebar-hover, but if any
// row carries state-layer instead, measure it)
console.log('  state-layer applied on the light rail:  ' + f2(Lstar(over(LIGHT_INK, A_HOVER, hex(lrail))) - Lstar(hex(lrail))));
console.log('  state-layer applied on the dark rail:   ' + f2(Lstar(over(DARK_INK, A_HOVER, hex(drail))) - Lstar(hex(drail))));
console.log('');

// ===========================================================================
console.log('=== 3. --secondary #EAE7DC (was #F0EDE4) ==================\n');

const OLD_SECONDARY = '#F0EDE4';
for (const [label, sec] of [['old #F0EDE4', OLD_SECONDARY], ['new ' + ROOT['--secondary'], ROOT['--secondary']]]) {
  const s = hex(sec);
  const onPaper = Lstar(s) - Lstar(hex(ROOT['--card']));
  const onPage = Lstar(s) - Lstar(hex(ROOT['--background']));
  const onMist = Lstar(s) - Lstar(hex(ROOT['--muted']));
  console.log(`${label.padEnd(16)} vs paper ${ROOT['--card']}: dL* ${f2(onPaper).padStart(7)} | vs page ${ROOT['--background']}: dL* ${f2(onPage).padStart(7)} | vs mist ${ROOT['--muted']}: dL* ${f2(onMist).padStart(7)}`);
}
console.log('');
console.log('ink on secondary (--secondary-foreground ' + ROOT['--secondary-foreground'] + '):');
wcag('  ink on new secondary', ROOT['--secondary-foreground'], ROOT['--secondary'], 4.5);
wcag('  muted-foreground on new secondary', ROOT['--muted-foreground'], ROOT['--secondary'], 4.5);
console.log('');
console.log('dark --secondary ' + DARK['--secondary'] + ':');
console.log('  vs dark card ' + DARK['--card'] + ': dL* ' + f2(Lstar(hex(DARK['--secondary'])) - Lstar(hex(DARK['--card']))));
console.log('  vs dark page ' + DARK['--background'] + ': dL* ' + f2(Lstar(hex(DARK['--secondary'])) - Lstar(hex(DARK['--background']))));
console.log('  vs dark mist ' + DARK['--muted'] + ': dL* ' + f2(Lstar(hex(DARK['--secondary'])) - Lstar(hex(DARK['--muted']))));
console.log('');

// ===========================================================================
console.log('=== 4. ADJACENCY: pairs within 2.0 dL* ====================\n');

function ladder(label, b) {
  const rungs = {
    background: b['--background'],
    mist: b['--muted'],
    secondary: b['--secondary'],
    card: b['--card'],
    accent: b['--accent'],
    border: b['--border'],
    popover: b['--popover'],
  };
  console.log(`-- ${label} surface ladder --`);
  const names = Object.keys(rungs);
  for (const n of names) console.log(`  ${n.padEnd(11)} ${rungs[n]}  L* ${Lstar(hex(rungs[n])).toFixed(2)}`);
  console.log('  pairs under 2.0 dL*:');
  let any = false;
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const d = Math.abs(Lstar(hex(rungs[names[i]])) - Lstar(hex(rungs[names[j]])));
      if (d < 2.0) { console.log(`    ${names[i]} vs ${names[j]}: ${d.toFixed(2)}`); any = true; }
    }
  if (!any) console.log('    none');
  console.log('');
}
ladder('LIGHT', ROOT);
ladder('DARK', DARK);

// legacy hover conventions still in the tree: hover:bg-accent / hover:bg-mist
console.log('-- legacy opaque hover fills (hover:bg-accent, hover:bg-mist, hover:bg-secondary) --');
const legacy = [
  ['accent', '--accent'],
  ['mist', '--muted'],
  ['secondary', '--secondary'],
];
for (const [mode, b] of [['LIGHT', ROOT], ['DARK', DARK]]) {
  const bases = { page: b['--background'], mist: b['--muted'], secondary: b['--secondary'], card: b['--card'], float: b['--popover'] };
  for (const [ln, lt] of legacy) {
    const row = Object.entries(bases).map(([bn, bh]) => {
      const d = Lstar(hex(b[lt])) - Lstar(hex(bh));
      return `${bn} ${f2(d)}${Math.abs(d) < 2 ? '!' : ''}`;
    });
    console.log(`  ${mode} hover:bg-${ln.padEnd(10)} ${row.join('  ')}`);
  }
}
console.log('  (! = under the 2.0 JND; 0.00 means the hover is invisible on that surface)');

// ===========================================================================
console.log('\n=== 5. REAL CALL SITES ====================================\n');

console.log('-- composer trigger pill (create-post-form.tsx:1109) --');
console.log('   .state-layer bg-secondary text-muted-foreground, inside a bg-card tile');
for (const [mode, b] of [['LIGHT', ROOT], ['DARK', DARK]]) {
  const pill = hex(b['--secondary']), card = hex(b['--card']);
  const d = Lstar(pill) - Lstar(card);
  console.log(`   ${mode}: pill ${b['--secondary']} on card ${b['--card']}  dL* ${f2(d)}  ${Math.abs(d) < 2 ? 'FAIL (<2.0 JND)' : 'ok'}`);
  console.log(`          placeholder ink ${b['--muted-foreground']} on pill: ${r2(ratio(hex(b['--muted-foreground']), pill))} (AA 4.5 ${ratio(hex(b['--muted-foreground']), pill) >= 4.5 ? 'PASS' : 'FAIL'})`);
  console.log(`          hover ink ${b['--foreground']} on hovered pill: ${r2(ratio(hex(b['--foreground']), over(stateInk(b), A_HOVER, pill)))}`);
}
console.log('   LIGHT, if --secondary were still #F0EDE4: placeholder ink ' + r2(ratio(hex(ROOT['--muted-foreground']), hex('#F0EDE4'))));
console.log('');

console.log('-- muted-foreground across light surfaces (AA 4.5 for body) --');
for (const [n, h] of Object.entries(lightSurfaces)) {
  if (n.includes('canopy')) continue;
  const c = ratio(hex(ROOT['--muted-foreground']), hex(h));
  console.log(`   on ${n} ${h}  ${r2(c).padStart(8)}  ${c >= 4.5 ? 'PASS' : 'FAIL'}`);
}
console.log('-- muted-foreground across dark surfaces --');
for (const [n, h] of Object.entries(darkSurfaces)) {
  if (n.includes('leaf') || n.includes('rail')) continue;
  const c = ratio(hex(DARK['--muted-foreground']), hex(h));
  console.log(`   on ${n} ${h}  ${r2(c).padStart(8)}  ${c >= 4.5 ? 'PASS' : 'FAIL'}`);
}
console.log('');

console.log('-- directory "More filters": rest bg-secondary vs open bg-canopy/0.08, on the page --');
for (const [mode, b] of [['LIGHT', ROOT], ['DARK', DARK]]) {
  const page = hex(b['--background']);
  const rest = hex(b['--secondary']);
  const open = over(hex(ROOT['--canopy']), 0.08, page);
  const hov = over(stateInk(b), A_HOVER, rest);
  console.log(`   ${mode}: rest L* ${Lstar(rest).toFixed(2)} | open(canopy/8% on page) L* ${Lstar(open).toFixed(2)} -> dL* rest->open ${f2(Lstar(open) - Lstar(rest))}`);
  console.log(`          hovered rest L* ${Lstar(hov).toFixed(2)} -> dL* hover vs OPEN ${f2(Lstar(hov) - Lstar(open))}`);
}
console.log('');

console.log('-- sidebar account chip: well = sidebar-hover/30 over rail, trigger hover = sidebar-hover --');
for (const [mode, b] of [['LIGHT', ROOT], ['DARK', DARK]]) {
  const rail = hex(b['--sidebar']), hov = hex(b['--sidebar-hover']);
  const well = over(hov, 0.3, rail);
  console.log(`   ${mode}: well dL* over rail ${f2(Lstar(well) - Lstar(rail))} | trigger hover dL* over well ${f2(Lstar(hov) - Lstar(well))} | rail budget ${f2(Lstar(hov) - Lstar(rail))}`);
}
console.log('');

console.log('-- borders (UI 3:1) --');
for (const [mode, b] of [['LIGHT', ROOT], ['DARK', DARK]]) {
  for (const [sn, sh] of [['page', b['--background']], ['card', b['--card']], ['popover', b['--popover']], ['secondary', b['--secondary']], ['mist', b['--muted']]]) {
    const c = ratio(hex(b['--border']), hex(sh));
    console.log(`   ${mode} border ${b['--border']} on ${sn.padEnd(10)} ${sh}  ${r2(c).padStart(7)}  dL* ${f2(Lstar(hex(b['--border'])) - Lstar(hex(sh))).padStart(7)}  ${c >= 3 ? 'PASS' : 'weak'}`);
  }
}
console.log('');

console.log('-- canopy CTA hover (button.tsx CANOPY_FILL: brightness 1.14, active 1.0) --');
{
  const base = hex(ROOT['--canopy']);
  const br = (rgb, f) => rgb.map((c) => Math.min(255, Math.round(c * f)));
  const h = br(base, 1.14);
  console.log(`   base ${ROOT['--canopy']} L* ${Lstar(base).toFixed(2)} -> hover L* ${Lstar(h).toFixed(2)} dL* ${f2(Lstar(h) - Lstar(base))}`);
  console.log(`   press returns to base: dL* hover->press ${f2(Lstar(base) - Lstar(h))} (press == rest, NO deeper-than-rest state)`);
  console.log(`   white on hover fill ${r2(ratio([255, 255, 255], h))}`);
}
console.log('');

console.log('-- destructive ghost (bg-destructive/10 -> /20) --');
for (const [mode, b] of [['LIGHT', ROOT], ['DARK', DARK]]) {
  const card = hex(b['--card']);
  const a = mode === 'LIGHT' ? [0.10, 0.20] : [0.20, 0.30];
  const rest = over(hex(b['--destructive']), a[0], card);
  const hov = over(hex(b['--destructive']), a[1], card);
  console.log(`   ${mode}: rest dL* vs card ${f2(Lstar(rest) - Lstar(card))} | hover dL* vs rest ${f2(Lstar(hov) - Lstar(rest))}  (no :active state defined)`);
}
