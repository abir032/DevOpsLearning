/* Dev helper (run node scripts/serve.mjs first): node scripts/shot.mjs /path out.png [width] [height] [light|dark] [full 0|1] [selector] */
import { chromium } from "@playwright/test";
const [,, path, out, w = "1440", h = "900", scheme = "light", full = "0", sel = ""] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, colorScheme: scheme });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await p.goto((process.env.URL || "http://127.0.0.1:4400") + path, { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
if (sel) await p.locator(sel).first().screenshot({ path: out });
else await p.screenshot({ path: out, fullPage: full === "1" });
if (errs.length) console.log("ERRORS", errs);
await b.close();
