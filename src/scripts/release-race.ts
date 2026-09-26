/*
 * Data and rendering for the "Ways to release" visual. Used at build time
 * (so the first state is in the HTML) and in the browser.
 */
/* o = version 1, n = version 2, i = version 2 running but getting no traffic, x = removed */
export type Step = { s: string; pct: number; note: string };
export type Plan = { name: string; sub: string; good: Step[]; bad: Step[] };

export const PLANS: Plan[] = [
  { name: "Rolling", sub: "Replace servers a few at a time", good: [
    { s: "oooo", pct: 0, note: "Four servers, all on version 1." },
    { s: "nooo", pct: 25, note: "One server is replaced with version 2. The other three keep serving." },
    { s: "nnoo", pct: 50, note: "A second server is replaced." },
    { s: "nnno", pct: 75, note: "A third." },
    { s: "nnnn", pct: 100, note: "All four are on version 2. At no point was more than one server out." },
    { s: "nnnn", pct: 100, note: "Done. No extra servers were needed." },
  ], bad: [
    { s: "oooo", pct: 0, note: "Four servers, all on version 1." },
    { s: "nooo", pct: 25, note: "One server is on version 2. A quarter of requests start failing." },
    { s: "nnoo", pct: 50, note: "The new servers start and pass their health checks, so the rollout carries on. Half of requests now fail." },
    { s: "nooo", pct: 25, note: "The error alarm fires. The rollout is reversed, one server at a time." },
    { s: "oooo", pct: 0, note: "Back on version 1." },
    { s: "oooo", pct: 0, note: "Rolling back took as long as rolling forward." },
  ] },
  { name: "Blue/green", sub: "Build a full copy, then switch", good: [
    { s: "oooo xxxx", pct: 0, note: "Blue: four servers on version 1, taking all traffic." },
    { s: "oooo iiii", pct: 0, note: "Green: four more servers start with version 2. No users reach them yet." },
    { s: "oooo iiii", pct: 0, note: "Tests run against green. Customers are still all on blue." },
    { s: "oooo nnnn", pct: 100, note: "The switch: all traffic moves to green at once." },
    { s: "oooo nnnn", pct: 100, note: "Blue stays running for a while, so switching back would be instant." },
    { s: "xxxx nnnn", pct: 100, note: "Blue is removed. For a while, you paid for eight servers." },
  ], bad: [
    { s: "oooo xxxx", pct: 0, note: "Blue: four servers on version 1, taking all traffic." },
    { s: "oooo iiii", pct: 0, note: "Green: four more servers start with version 2. No users reach them yet." },
    { s: "oooo iiii", pct: 0, note: "Tests run against green, and pass. This bug only shows up with real customers' data." },
    { s: "oooo nnnn", pct: 100, note: "The switch: all traffic moves to green. <b>Every customer</b> hits the bad version." },
    { s: "oooo iiii", pct: 0, note: "The alarm fires. Traffic switches back to blue in seconds." },
    { s: "oooo xxxx", pct: 0, note: "Green is removed. Short, but everyone was hit." },
  ] },
  { name: "Canary", sub: "A small share first, then grow", good: [
    { s: "oooo", pct: 0, note: "Four servers on version 1." },
    { s: "oooo n", pct: 10, note: "One canary server on version 2 gets 10% of traffic. Its error rate is watched." },
    { s: "oooo n", pct: 10, note: "After a few minutes its errors and speed match version 1. It passes." },
    { s: "oonn n", pct: 50, note: "Promoted to half of the traffic." },
    { s: "nnnn", pct: 100, note: "Promoted to all traffic. The canary server is no longer needed." },
    { s: "nnnn", pct: 100, note: "Done. Slower than the others, but checked at every step." },
  ], bad: [
    { s: "oooo", pct: 0, note: "Four servers on version 1." },
    { s: "oooo n", pct: 10, note: "One canary server on version 2 gets 10% of traffic. Its error rate is watched." },
    { s: "oooo i", pct: 0, note: "The canary's error rate is far above version 1's. The release is <b>aborted</b> automatically." },
    { s: "oooo", pct: 0, note: "The canary is removed. Only 1 in 10 customers saw errors, for a few minutes." },
    { s: "oooo", pct: 0, note: "Version 1 carries on as if nothing happened." },
    { s: "oooo", pct: 0, note: "The team fixes the bug and tries again." },
  ] },
];
export const LAST = 5;

export function col(p: Plan, st: Step, bad: boolean, peak: number) {
  const servers = [...st.s].map((c) => c === " " ? '<span style="width:6px"></span>'
    : c === "o" ? '<span class="rr-s">v1</span>'
    : c === "x" ? '<span class="rr-s gone" aria-hidden="true">·</span>'
    : `<span class="rr-s ${bad ? "bad" : "new"}${c === "i" ? " idle" : ""}">v2</span>`).join("");
  const running = [...st.s].filter((c) => "oni".includes(c)).length;
  return `<div class="rr-col"><h3>${p.name}</h3><div class="rr-sub">${p.sub}</div>` +
    `<div class="rr-lab">Servers running: ${running}</div><div class="rr-servers">${servers}</div>` +
    `<div class="rr-bar${bad ? " bad" : ""}"><div style="width:${st.pct}%"></div></div>` +
    `<div class="rr-pct">Traffic on version 2: <b>${st.pct}%</b></div>` +
    `<div class="rr-note">${st.note}</div>` +
    (bad ? `<div class="rr-peak${peak ? " hit" : ""}">Most users on the bad version at once: ${peak}%</div>` : "") + "</div>";
}
