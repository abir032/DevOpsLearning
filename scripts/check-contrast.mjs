/*
 * Checks WCAG AA contrast (4.5:1 for text, 3:1 for large text and UI) for the
 * colour pairs the site actually uses, in both themes. Reads the tokens from
 * src/styles/global.css.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(import.meta.dirname, "../src/styles/global.css"), "utf8");
function tokens(block) {
  const t = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) t[m[1]] = m[2];
  return t;
}
const light = tokens(css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)")));
const dark = { ...light, ...tokens(css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf("/* Each element picks up"))) };

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const tracks = ["ship", "cloud", "box", "code", "auto", "start", "proj"];
const pairs = [
  ["ink", "bg", 4.5], ["ink-2", "bg", 4.5], ["ink-3", "bg", 4.5], ["ink-2", "surface", 4.5], ["ink-3", "surface", 4.5], ["ink-3", "sunk", 4.5],
  ["ok", "ok-bg", 4.5], ["bad", "bad-bg", 4.5], ["warn", "warn-bg", 4.5], ["ok", "surface", 4.5],
  ["code-ink", "code-bg", 4.5], ["code-dim", "code-bg", 4.5], ["focus", "bg", 3],
  ...tracks.map((t) => [`${t}-t`, "bg", 4.5]),
  ...tracks.map((t) => [`${t}-t`, "surface", 4.5]),
  ...tracks.map((t) => [`on-${t}`, t, 4.5]),
  ...tracks.map((t) => [t, "bg", 3]),
];

let bad = 0;
for (const [name, t] of [["light", light], ["dark", dark]]) {
  for (const [fg, bg, min] of pairs) {
    if (!t[fg] || !t[bg]) { console.error(`  missing token ${fg} or ${bg} in ${name}`); bad++; continue; }
    const r = ratio(t[fg], t[bg]);
    if (r < min) { console.error(`  ✗ ${name}: --${fg} on --${bg} = ${r.toFixed(2)} (needs ${min})`); bad++; }
  }
}
if (bad) { console.error(`\n✗ Contrast check: ${bad} pair(s) below WCAG AA`); process.exit(1); }
console.log(`✓ Contrast check: ${pairs.length * 2} colour pairs meet WCAG AA in both themes`);
