/*
 * Data, evaluation and rendering for the alarm threshold simulator.
 * Teaches: a threshold plus "M out of N" datapoints decides when an alarm
 * fires, and whether it flaps. Missing data needs a decision too.
 */

export type Pt = number | null;
export interface Scenario { label: string; data: Pt[]; prior: Pt }

export const SCENARIOS: Record<string, Scenario> = {
  outage: { label: "Real outage", prior: 0, data: [0, 1, 0, 0, 8, 12, 15, 14, 13, 2, 0, 0] },
  blip: { label: "One-minute blip", prior: 0, data: [0, 0, 1, 9, 0, 0, 1, 0, 0, 0, 0, 0] },
  noisy: { label: "Noisy but fine", prior: 4, data: [4, 7, 3, 6, 8, 2, 7, 3, 6, 4, 7, 3] },
  quiet: { label: "Quiet night", prior: null, data: [null, null, 0, null, null, null, null, null, 1, null, null, null] },
};

export const MN: Record<string, [number, number]> = { "1of1": [1, 1], "2of3": [2, 3], "3of3": [3, 3] };
export type Missing = "missing" | "good" | "bad" | "ignore";
export const MISSING_LABEL: Record<Missing, string> = { missing: "missing", good: "good", bad: "bad", ignore: "ignore" };
export type State = "OK" | "ALARM" | "INSUFFICIENT_DATA";

export interface Cfg { sc: string; thr: number; mn: string; miss: Missing }
export const START: Cfg = { sc: "outage", thr: 5, mn: "1of1", miss: "good" };

/* Evaluate the alarm once per minute, looking back over the last N datapoints. */
export function evaluate(c: Cfg): State[] {
  const s = SCENARIOS[c.sc];
  const [m, n] = MN[c.mn];
  const series: Pt[] = [...Array(n - 1).fill(s.prior), ...s.data];
  const out: State[] = [];
  let prev: State = "OK";
  for (let t = 0; t < s.data.length; t++) {
    const win = series.slice(t, t + n);
    let st: State;
    if (c.miss === "good" || c.miss === "bad") {
      const bad = win.filter((v) => (v === null ? c.miss === "bad" : v > c.thr)).length;
      st = bad >= m ? "ALARM" : "OK";
    } else {
      const have = win.filter((v): v is number => v !== null);
      if (!have.length) st = c.miss === "ignore" ? prev : "INSUFFICIENT_DATA";
      else st = have.filter((v) => v > c.thr).length >= Math.min(m, have.length) && have.some((v) => v > c.thr) ? "ALARM" : "OK";
    }
    out.push(st);
    prev = st;
  }
  return out;
}

export function fired(states: State[]) {
  let n = 0;
  let prev: State = "OK";
  for (const s of states) { if (s === "ALARM" && prev !== "ALARM") n++; prev = s; }
  return n;
}

const W = 640, H = 230, L = 44, R = 16, T = 16, B = 34;
const MAXV = 16;
const x = (i: number) => L + (i + 0.5) * ((W - L - R) / 12);
const y = (v: number) => T + (1 - Math.min(v, MAXV) / MAXV) * (H - T - B);
export const minute = (i: number) => `02:${String(i).padStart(2, "0")}`;

export function chartSvg(c: Cfg) {
  const s = SCENARIOS[c.sc];
  const states = evaluate(c);
  const colW = (W - L - R) / 12;
  let g = "";
  /* state background per minute */
  states.forEach((st, i) => {
    const cls = st === "ALARM" ? "as-bg-alarm" : st === "INSUFFICIENT_DATA" ? "as-bg-insuf" : "as-bg-ok";
    g += `<rect class="${cls}" x="${L + i * colW}" y="${T}" width="${colW}" height="${H - T - B}" />`;
  });
  /* axis */
  for (const v of [0, 5, 10, 15]) g += `<line class="as-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" /><text class="as-ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  s.data.forEach((_, i) => { if (i % 2 === 0) g += `<text class="as-ax" x="${x(i)}" y="${H - 12}" text-anchor="middle">${minute(i)}</text>`; });
  /* threshold */
  g += `<line class="as-thr" x1="${L}" x2="${W - R}" y1="${y(c.thr)}" y2="${y(c.thr)}" /><text class="as-thr-t" x="${W - R - 4}" y="${y(c.thr) - 6}" text-anchor="end">threshold: more than ${c.thr}</text>`;
  /* line, broken where data is missing */
  let path = "";
  let pen = false;
  s.data.forEach((v, i) => {
    if (v === null) { pen = false; return; }
    path += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    pen = true;
  });
  if (path) g += `<path class="as-line" d="${path.trim()}" />`;
  s.data.forEach((v, i) => {
    if (v === null) g += `<text class="as-miss" x="${x(i)}" y="${y(0) - 6}" text-anchor="middle">no data</text>`;
    else g += `<circle class="as-pt${v > c.thr ? " over" : ""}" cx="${x(i)}" cy="${y(v)}" r="5" />`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="as-title"><title id="as-title">Errors per minute over twelve minutes, with the alarm threshold at more than ${c.thr}. Shaded minutes show the alarm state.</title>${g}</svg>`;
}

export function stripHtml(c: Cfg) {
  const states = evaluate(c);
  const short = { OK: "OK", ALARM: "ALARM", INSUFFICIENT_DATA: "NO DATA" } as const;
  return states.map((st, i) => `<li class="as-cell ${st === "ALARM" ? "alarm" : st === "OK" ? "ok" : "insuf"}"><span>${minute(i)}</span><b>${short[st]}</b></li>`).join("");
}

export function sayHtml(c: Cfg): { html: string; tone: "" | "good" | "bad" } {
  const st = evaluate(c);
  const n = fired(st);
  const first = st.indexOf("ALARM");
  const insuf = st.filter((s) => s === "INSUFFICIENT_DATA").length;
  const [m, nn] = MN[c.mn];
  const rule = nn === 1 ? `more than ${c.thr} errors in the last minute` : `more than ${c.thr} errors in ${m} of the last ${nn} minutes`;
  const head = (t: string) => `<span class="step-l">${t}</span>`;
  const emails = n === 1 ? "1 email" : `${n} emails`;
  if (c.sc === "outage") {
    if (n === 0) return { tone: "bad", html: head("It never fired") + `The outage ran for five minutes and nobody was told. With the rule <b>${rule}</b>, the threshold is too high to catch it.` };
    if (n === 1) return { tone: "good", html: head(`Fired at ${minute(first)}: ${emails}`) + `The rule <b>${rule}</b> caught the outage and sent one notification. ${m > 1 ? "Needing several bad minutes costs a little time, but it won't wake anyone for a blip." : "It fired on the first bad minute. Now try the one-minute blip with the same settings."}` };
    return { tone: "bad", html: head(`Flapping: ${emails}`) + "It fired, recovered and fired again during one outage." };
  }
  if (c.sc === "blip") {
    if (n === 0) return { tone: "good", html: head("Stayed quiet") + `One bad minute isn't an outage. <b>${rule}</b> needs the problem to last, so nobody is woken up for nothing.` };
    return { tone: "bad", html: head(`False alarm at ${minute(first)}: ${emails}`) + "A single bad minute woke someone up, and it had already fixed itself. Try <b>2 of 3</b>: the problem must last before anyone is paged." };
  }
  if (c.sc === "noisy") {
    if (n === 0) return { tone: "good", html: head("Stayed quiet") + `This metric bounces around ${c.thr > 5 ? "but stays under the line" : "the line all the time"}. ${c.thr > 5 ? "A threshold above normal noise is the fix." : "Needing 3 of 3 filters it out, but a higher threshold is the more honest fix."}` };
    return { tone: "bad", html: head(`Flapping: ${emails} in 12 minutes`) + "The normal level of this metric sits right on the threshold, so the alarm keeps flipping between OK and ALARM. People soon learn to ignore it. Raise the threshold, or ask for more datapoints." };
  }
  /* quiet night */
  if (c.miss === "missing") return { tone: "bad", html: head(`No data for ${insuf} of 12 minutes`) + "The metric only reports when there is traffic. With missing data treated as <b>missing</b>, the alarm sits in INSUFFICIENT_DATA and can't tell you anything. For an error count, no data means no errors: treat it as <b>good</b>." };
  if (c.miss === "bad") return { tone: "bad", html: head(`False alarm: ${emails}`) + "Treating missing data as <b>bad</b> means a quiet night looks like an outage. That setting is for metrics that should always report, like a heartbeat." };
  if (c.miss === "ignore") return { tone: "", html: head("Stayed in its last state") + "<b>ignore</b> keeps whatever state the alarm had before the data stopped. Here that's OK, but it could just as easily stay stuck in ALARM." };
  return { tone: "good", html: head("OK all night") + "For an error count, no data means nothing went wrong. Treating missing data as <b>good</b> keeps the alarm calm and meaningful." };
}
