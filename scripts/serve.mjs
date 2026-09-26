/* A tiny static server for dist/, used by the Playwright tests. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

const DIST = resolve(import.meta.dirname, "../dist");
const PORT = Number(process.env.PORT || 4400);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff", ".wasm": "application/wasm", ".png": "image/png" };

createServer(async (req, res) => {
  let p = join(DIST, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(DIST)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(p)).isDirectory()) p = join(p, "index.html");
    const body = await readFile(p);
    res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404, { "content-type": TYPES[".html"] }).end(await readFile(join(DIST, "404.html")).catch(() => "Not found"));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Serving dist/ on http://127.0.0.1:${PORT}`));
