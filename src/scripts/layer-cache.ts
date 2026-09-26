/* Data for the Dockerfile layer-cache visual (LayerCache.astro). */

export type Order = "good" | "bad";
export type Edit = "app" | "req" | "none";
/* secs: how long the step takes when it has to run. No secs: a setting only, no layer. */
export type Line = { code: string; secs?: number; reads?: ("app" | "req")[] };

const CMD = 'CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]';

export const FILES: Record<Order, Line[]> = {
  good: [
    { code: "FROM python:3.12-slim", secs: 0 },
    { code: "WORKDIR /app", secs: 0.1 },
    { code: "RUN useradd --create-home --uid 1001 appuser", secs: 0.9 },
    { code: "COPY requirements.txt .", secs: 0.1, reads: ["req"] },
    { code: "RUN pip install --no-cache-dir -r requirements.txt", secs: 38 },
    { code: "COPY app.py .", secs: 0.1, reads: ["app"] },
    { code: "USER 1001" },
    { code: "EXPOSE 8080" },
    { code: CMD },
  ],
  bad: [
    { code: "FROM python:3.12-slim", secs: 0 },
    { code: "WORKDIR /app", secs: 0.1 },
    { code: "RUN useradd --create-home --uid 1001 appuser", secs: 0.9 },
    { code: "COPY . .", secs: 0.2, reads: ["app", "req"] },
    { code: "RUN pip install --no-cache-dir -r requirements.txt", secs: 38 },
    { code: "USER 1001" },
    { code: "EXPOSE 8080" },
    { code: CMD },
  ],
};

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function rowsHtml(order: Order): string {
  let n = 0;
  return FILES[order].map((l) => {
    const layer = l.secs !== undefined;
    const step = layer ? `${++n}` : "";
    const reads = l.reads
      ? `<span class="lc-reads">reads ${l.reads.map((r) => (r === "app" ? "app.py" : "requirements.txt")).join(" and ")}</span>`
      : "";
    const status = layer
      ? `<span class="lc-st" data-st="idle">built before</span>`
      : `<span class="lc-st meta">setting, no layer</span>`;
    return `<li class="lc-row${layer ? "" : " meta"}"><span class="lc-n">${step}</span><code>${esc(l.code)}</code>${reads}${status}</li>`;
  }).join("");
}
