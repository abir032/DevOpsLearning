/*
 * Data and rendering for the Logs Insights visual. Used at build time (so the
 * first view is in the HTML) and in the browser.
 * Teaches: structured logs answer questions that plain text can't.
 */

export interface Ev {
  t: string; level: "INFO" | "ERROR"; route: string; status: number; ms: number;
  err?: "OperationalError" | "ProgrammingError"; inst: string; detail?: string;
}

const TIMEOUT = "Can't connect to MySQL server on 'quickcart-db' (timed out)";
const NOTABLE = "Table 'quickcart.orders' doesn't exist";

export const EVENTS: Ev[] = [
  { t: "14:01:12", level: "INFO", route: "/orders", status: 200, ms: 41, inst: "i-0aa11" },
  { t: "14:01:40", level: "INFO", route: "/orders", status: 200, ms: 38, inst: "i-0bb22" },
  { t: "14:02:05", level: "ERROR", route: "/orders", status: 500, ms: 6, err: "ProgrammingError", inst: "i-0aa11", detail: NOTABLE },
  { t: "14:02:31", level: "ERROR", route: "/orders", status: 500, ms: 5, err: "ProgrammingError", inst: "i-0bb22", detail: NOTABLE },
  { t: "14:03:10", level: "INFO", route: "/orders", status: 200, ms: 44, inst: "i-0aa11" },
  { t: "14:04:02", level: "INFO", route: "/orders", status: 200, ms: 39, inst: "i-0bb22" },
  { t: "14:06:15", level: "ERROR", route: "/orders", status: 500, ms: 3004, err: "OperationalError", inst: "i-0aa11", detail: TIMEOUT },
  { t: "14:06:20", level: "ERROR", route: "/orders", status: 500, ms: 3003, err: "OperationalError", inst: "i-0bb22", detail: TIMEOUT },
  { t: "14:06:48", level: "ERROR", route: "/orders", status: 500, ms: 3005, err: "OperationalError", inst: "i-0aa11", detail: TIMEOUT },
  { t: "14:07:30", level: "ERROR", route: "/orders", status: 500, ms: 3004, err: "OperationalError", inst: "i-0bb22", detail: TIMEOUT },
  { t: "14:08:05", level: "INFO", route: "/orders", status: 200, ms: 40, inst: "i-0aa11" },
  { t: "14:08:44", level: "INFO", route: "/orders", status: 200, ms: 36, inst: "i-0bb22" },
];

export interface Q { fmt: "plain" | "json"; level: "any" | "ERROR"; err: "any" | "OperationalError" | "ProgrammingError"; group: "lines" | "err" | "inst" }
export const START: Q = { fmt: "json", level: "any", err: "any", group: "lines" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* How each event looks in each format. */
export function plainLine(e: Ev) {
  return e.level === "ERROR"
    ? `${e.t} ERROR GET ${e.route} 500 database_unavailable`
    : `${e.t} INFO GET ${e.route} 200 ok`;
}
export function jsonLine(e: Ev) {
  const o: Record<string, string | number> = { level: e.level, route: e.route, status: e.status, latency_ms: e.ms };
  if (e.err) o.error_type = e.err;
  o.instance_id = e.inst;
  if (e.detail) o.detail = e.detail;
  return JSON.stringify(o);
}

/* The Logs Insights query that matches the controls. */
export function queryText(q: Q) {
  const lines: string[] = [];
  if (q.fmt === "plain") {
    lines.push("fields @timestamp, @message");
    if (q.level === "ERROR") lines.push("| filter @message like /ERROR/");
    if (q.err !== "any") lines.push(`| filter @message like /${q.err}/`);
    if (q.group !== "lines") lines.push(`| stats count() by ${q.group === "err" ? "error_type" : "instance_id"}`);
    else lines.push("| sort @timestamp asc");
    return lines.join("\n");
  }
  const f: string[] = [];
  if (q.level === "ERROR") f.push('level = "ERROR"');
  if (q.err !== "any") f.push(`error_type = "${q.err}"`);
  if (q.group === "lines") {
    lines.push("fields @timestamp, level, error_type, latency_ms, instance_id");
    if (f.length) lines.push("| filter " + f.join(" and "));
    lines.push("| sort @timestamp asc");
  } else {
    if (f.length) lines.push("filter " + f.join(" and "));
    const by = q.group === "err" ? "error_type" : "instance_id";
    lines.push(`${f.length ? "| " : ""}stats count() as events, avg(latency_ms) as avg_ms by ${by}`);
  }
  return lines.join("\n");
}

function matches(e: Ev, q: Q) {
  if (q.level === "ERROR" && e.level !== "ERROR") return false;
  if (q.err !== "any") {
    if (q.fmt === "plain") return false; /* the text never contains it */
    if (e.err !== q.err) return false;
  }
  return true;
}

/* Why a query can't run in plain-text mode, if it can't. */
function plainBlock(q: Q): string | null {
  if (q.fmt !== "plain") return null;
  if (q.err !== "any") return "No results. The plain-text lines never say which error it was, so there is nothing to match.";
  if (q.group !== "lines") return `Logs Insights can't find a field called ${q.group === "err" ? "error_type" : "instance_id"}. In plain text, the whole line is one string: <code>@message</code>.`;
  return null;
}

export function resultHtml(q: Q) {
  const block = plainBlock(q);
  if (block) return `<p class="lq-none">${block}</p>`;
  const rows = EVENTS.filter((e) => matches(e, q));
  if (q.group !== "lines") {
    const key = (e: Ev) => (q.group === "err" ? e.err || "(none)" : e.inst);
    const groups = new Map<string, Ev[]>();
    rows.forEach((e) => groups.set(key(e), [...(groups.get(key(e)) || []), e]));
    const head = q.group === "err" ? "error_type" : "instance_id";
    return `<table class="lq-tbl"><thead><tr><th scope="col">${head}</th><th scope="col">events</th><th scope="col">avg_ms</th></tr></thead><tbody>` +
      [...groups].map(([k, es]) => `<tr><td><code>${esc(k)}</code></td><td>${es.length}</td><td>${Math.round(es.reduce((a, e) => a + e.ms, 0) / es.length)}</td></tr>`).join("") +
      `</tbody></table>`;
  }
  if (!rows.length) return '<p class="lq-none">No matching events.</p>';
  return `<ol class="lq-lines">` + rows.map((e) => {
    const bad = e.level === "ERROR" ? " err" : "";
    return q.fmt === "plain"
      ? `<li class="lq-l${bad}"><code>${esc(plainLine(e))}</code></li>`
      : `<li class="lq-l${bad}"><span class="lq-t">${e.t}</span><code>${esc(jsonLine(e))}</code></li>`;
  }).join("") + `</ol>`;
}

export function countOf(q: Q) {
  if (plainBlock(q)) return 0;
  const rows = EVENTS.filter((e) => matches(e, q));
  if (q.group === "lines") return rows.length;
  return new Set(rows.map((e) => (q.group === "err" ? e.err || "(none)" : e.inst))).size;
}

export function sayHtml(q: Q): { html: string; tone: "" | "good" | "bad" } {
  const n = countOf(q);
  const step = (s: string) => `<span class="step-l">${s}</span>`;
  if (q.fmt === "plain") {
    if (q.err !== "any" || q.group !== "lines") return { tone: "bad", html: step("Plain text can't answer this") + "Every error line reads <b>database_unavailable</b>. Two different problems happened, but the text is identical, so no query can tell them apart. Switch to <b>Structured JSON</b>." };
    if (q.level === "ERROR") return { tone: "", html: step(`${n} lines match`) + "Searching for the word ERROR works. But all six lines say the same thing. Were they one problem or two? Which server? How slow? The text doesn't say." };
    return { tone: "", html: step(`${n} lines`) + "The same 12 events as plain text: a timestamp, a level and a short message. Try filtering by <b>error_type</b>." };
  }
  if (q.group === "err" && q.level !== "ERROR" && q.err === "any") return { tone: "", html: step(`${n} groups`) + "Grouped by <b>error_type</b>, the normal requests show up as <code>(none)</code>. Set <b>level</b> to ERROR to keep only the failures." };
  if (q.group === "err") return { tone: "good", html: step(`${n} ${n === 1 ? "group" : "groups"}`) + "Two causes, one message. <b>ProgrammingError</b> failed in about 5 ms: the table was missing. <b>OperationalError</b> took about 3,000 ms, the database connect timeout: a firewall was dropping the connection. The customer saw the same error for both." };
  if (q.group === "inst") return { tone: "good", html: step(`${n} ${n === 1 ? "group" : "groups"}`) + "Both servers failed equally. That rules out one bad server and points at something they share, like the database." };
  if (q.err === "OperationalError") return { tone: "good", html: step(`${n} events`) + "Every one took just over 3,000 ms. A wrong password is refused instantly. A timeout this exact means the network dropped the connection: check the database's security group." };
  if (q.err === "ProgrammingError") return { tone: "good", html: step(`${n} events`) + "These failed in about 5 ms. The database answered quickly and said <b>Table 'quickcart.orders' doesn't exist</b>. A different problem entirely." };
  if (q.level === "ERROR") return { tone: "", html: step(`${n} events`) + "Six errors. Each line carries <b>error_type</b> and <b>latency_ms</b> as their own fields, so you can filter and count by them. Try <b>Count by error_type</b>." };
  return { tone: "", html: step(`${n} events`) + "The same 12 events, each written as JSON. Every piece of information is a named field that Logs Insights can filter on." };
}
