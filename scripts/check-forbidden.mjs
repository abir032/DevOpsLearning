/*
 * Fails if any forbidden string or pattern (forbidden-strings.json) appears in
 * the built site. Run after `astro build`. Keeps personal names, real account
 * IDs, domains and programme details out of the published course.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, extname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const cfg = JSON.parse(readFileSync(join(ROOT, "forbidden-strings.json"), "utf8"));
/* Private strings are kept out of the repository: in a local file that git
   ignores, and on CI in the FORBIDDEN_STRINGS secret (a JSON array). */
const localFile = join(ROOT, "forbidden-strings.local.json");
if (existsSync(localFile)) cfg.strings.push(...JSON.parse(readFileSync(localFile, "utf8")).strings);
if (process.env.FORBIDDEN_STRINGS) {
  /* Accept a plain JSON array, or the whole local file pasted as-is. */
  const v = JSON.parse(process.env.FORBIDDEN_STRINGS);
  cfg.strings.push(...(Array.isArray(v) ? v : v.strings || []));
}
/* The site's own address is always allowed: pages link to themselves. */
const ownSite = (process.env.SITE_URL || "").replace(/\/$/, "");
const TEXT = new Set([".html", ".js", ".css", ".json", ".xml", ".txt", ".svg", ".webmanifest"]);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rules = [
  ...cfg.strings.map((s) => ({ name: `"${s}"`, re: new RegExp(`(?<![A-Za-z0-9])${esc(s)}(?![A-Za-z0-9])`, "gi"), allow: [] })),
  ...cfg.patterns.map((p) => ({ name: p.name, re: new RegExp(p.re, "gi"), allow: p.allow || [] })),
];

function* files(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    /* dist/pagefind is the search tool's own code and compressed index, with
       its authors' credits. Our words reach it only through the HTML we check. */
    if (statSync(p).isDirectory()) { if (p !== join(DIST, "pagefind")) yield* files(p); }
    else if (TEXT.has(extname(p))) yield p;
  }
}

const hits = [];
for (const file of files(DIST)) {
  const src = readFileSync(file, "utf8");
  for (const r of rules) {
    for (const m of src.matchAll(r.re)) {
      if (r.allow.some((a) => m[0].toLowerCase().includes(a.toLowerCase()))) continue;
      if (ownSite && m[0].toLowerCase().startsWith(ownSite.toLowerCase())) continue;
      const line = src.slice(0, m.index).split("\n").length;
      hits.push(`${file.slice(ROOT.length + 1)}:${line}  ${r.name}: "${m[0]}"`);
    }
  }
}

if (hits.length) {
  console.error(`\n✗ Forbidden-strings check: ${hits.length} match(es)\n`);
  for (const h of hits.slice(0, 50)) console.error("  • " + h);
  process.exit(1);
}
console.log(`✓ Forbidden-strings check: nothing forbidden in dist/ (${rules.length} rules)`);
