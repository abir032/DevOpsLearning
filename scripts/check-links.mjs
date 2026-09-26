/*
 * Checks every link in the built site.
 *   Internal: the page exists, and any #anchor exists on it.
 *   External (with --external): the URL answers without an error.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const BASE = (process.env.SITE_BASE || "/").replace(/\/$/, "");
const external = process.argv.includes("--external");

function* pages(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== "pagefind" && f !== "_astro") yield* pages(p); }
    else if (p.endsWith(".html")) yield p;
  }
}

const idCache = new Map();
function ids(file) {
  if (!idCache.has(file)) {
    const src = readFileSync(file, "utf8");
    idCache.set(file, new Set([...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

function target(fromFile, url) {
  let path = url;
  if (path.startsWith("/")) {
    if (BASE && !path.startsWith(BASE + "/")) return null;
    path = join(DIST, path.slice(BASE.length));
  } else path = join(dirname(fromFile), path);
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  return existsSync(path) ? path : null;
}

const broken = [];
const ext = new Map();
for (const file of pages(DIST)) {
  const rel = file.slice(DIST.length);
  const src = readFileSync(file, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  for (const m of src.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const url = m[1].replace(/&amp;/g, "&");
    if (!url || url.startsWith("mailto:") || url.startsWith("data:")) continue;
    if (/^https?:\/\//.test(url)) { if (!ext.has(url)) ext.set(url, rel); continue; }
    const [path, hash] = url.split("#");
    const t = path ? target(file, path) : file;
    if (!t) { broken.push(`${rel} → ${url} (no such page)`); continue; }
    if (hash && t.endsWith(".html") && !ids(t).has(decodeURIComponent(hash))) broken.push(`${rel} → ${url} (no #${hash} on that page)`);
  }
}

if (external) {
  for (const [url, from] of ext) {
    try {
      let r = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (r.status >= 400) r = await fetch(url, { redirect: "follow" });
      if (r.status >= 400) broken.push(`${from} → ${url} (HTTP ${r.status})`);
    } catch (e) { broken.push(`${from} → ${url} (${e.cause?.code || e.message})`); }
  }
}

if (broken.length) {
  console.error(`\n✗ Link check: ${broken.length} broken link(s)\n`);
  for (const b of broken) console.error("  • " + b);
  process.exit(1);
}
console.log(`✓ Link check: all internal links resolve${external ? `, ${ext.size} external links answer` : ` (${ext.size} external links not checked; use --external)`}`);
