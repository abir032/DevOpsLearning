/*
 * Data and rendering for the incident replay.
 * Teaches: an incident is a sequence — detect, investigate, find the cause,
 * fix, learn — and the dead ends are part of the story.
 */

export type Phase = "Detect" | "Investigate" | "Cause" | "Fix" | "Learn";
export const PHASES: Phase[] = ["Detect", "Investigate", "Cause", "Fix", "Learn"];
export interface Beat { t: string; p: Phase; text: string; dead?: boolean }
export interface Incident { label: string; title: string; beats: Beat[] }

export const INCIDENTS: Record<string, Incident> = {
  egress: {
    label: "Servers never healthy",
    title: "New servers never became healthy",
    beats: [
      { t: "10:02", p: "Detect", text: "The auto scaling group launches four servers. Every one fails its health check. The group replaces them, and the new ones fail too — a loop." },
      { t: "10:09", p: "Investigate", text: "Try to open a shell with Session Manager. It can't connect either. Dead end.", dead: true },
      { t: "10:15", p: "Investigate", text: "EC2 → Get system log. The boot log shows the package update hanging, and the Session Manager agent timing out connecting to port 443." },
      { t: "10:21", p: "Cause", text: "The app's security group had no outbound rules. Replies come back automatically, but connections the server starts need an outbound rule — and a booting server starts lots of them." },
      { t: "10:23", p: "Fix", text: "Add an outbound rule to the app's security group. The next servers boot and pass their health checks within about four minutes." },
      { t: "Later", p: "Learn", text: "Timed out means the network. When you can't get in to look, read the system log — it doesn't need the network." },
    ],
  },
  twocause: {
    label: "One error, two causes",
    title: "database_unavailable, twice",
    beats: [
      { t: "14:06", p: "Detect", text: "The target 5xx alarm fires. Customers get {\"error\":\"database_unavailable\"} from the orders page." },
      { t: "14:08", p: "Investigate", text: "The health check still returns 200, so every server stays in service. The site is degraded, not down — the shallow health check did its job." },
      { t: "14:11", p: "Investigate", text: "Logs Insights: count errors by error_type. All OperationalError, all taking about 3,000 ms — the connect timeout." },
      { t: "14:13", p: "Cause", text: "The database's security group had lost its inbound rule for port 3306 from the app. CloudTrail showed when." },
      { t: "14:15", p: "Fix", text: "Put the rule back. Errors stop within a minute and the alarm returns to OK." },
      { t: "Next day", p: "Investigate", text: "The same error again. Same response, so it looks like the same problem. But error_type is now ProgrammingError, and each failure takes about 5 ms." },
      { t: "Next day", p: "Cause", text: "A different cause entirely: the orders table didn't exist in the new database. Fixed by running the missing migration." },
      { t: "Later", p: "Learn", text: "The customer saw the same message both times. Only the structured log field error_type told the two apart." },
    ],
  },
  port: {
    label: "Tasks keep restarting",
    title: "Container tasks restarting, 'Request timed out'",
    beats: [
      { t: "16:40", p: "Detect", text: "The new container service never settles. Tasks start, fail their health checks and get replaced. The deployment circuit breaker rolls the release back." },
      { t: "16:46", p: "Investigate", text: "The app's own logs say it started and is listening on 8080. The code looks fine." },
      { t: "16:50", p: "Investigate", text: "Target group health reason: Request timed out. Timed out means the traffic never arrived — look at the network." },
      { t: "16:55", p: "Cause", text: "First cause: the tasks had the load balancer's security group attached, instead of the app's." },
      { t: "17:01", p: "Investigate", text: "Fixed that. Still timing out. Dead end — or rather, a second problem hiding behind the first.", dead: true },
      { t: "17:05", p: "Cause", text: "Second cause: the app's security group rule allowed port 0 instead of 8080." },
      { t: "17:07", p: "Fix", text: "Inbound 8080 from the load balancer's security group. Tasks healthy in about 20 seconds." },
      { t: "Later", p: "Learn", text: "Two small settings, not code. After each fix, test again — one fix can reveal the next problem." },
    ],
  },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function phasesHtml(inc: Incident, shown: number) {
  const reached = new Set(inc.beats.slice(0, shown).map((b) => b.p));
  const cur = shown ? inc.beats[shown - 1].p : null;
  return PHASES.map((p) => `<li class="ir-ph${reached.has(p) ? " on" : ""}${cur === p ? " cur" : ""}">${p}</li>`).join("");
}

export function beatsHtml(inc: Incident, shown: number) {
  const left = inc.beats.length - shown;
  return inc.beats.slice(0, shown).map((b) =>
    `<li class="ir-b vis${b.dead ? " dead" : ""} p-${b.p.toLowerCase()}">` +
    `<span class="ir-t">${esc(b.t)}</span><span class="ir-p">${b.p}${b.dead ? " (dead end)" : ""}</span>` +
    `<p>${esc(b.text)}</p></li>`).join("") +
    (left ? `<li class="ir-b ir-more"><p>${left} more ${left === 1 ? "event" : "events"} to replay</p></li>` : "");
}

export function sayHtml(inc: Incident, shown: number): { html: string; tone: "" | "good" | "bad" } {
  if (!shown) return { tone: "", html: `<span class="step-l">Ready</span>Replay <b>${esc(inc.title)}</b> one event at a time. Choose <b>Next event</b> or <b>Play</b>.` };
  const b = inc.beats[shown - 1];
  const last = shown === inc.beats.length;
  return {
    tone: b.p === "Learn" ? "good" : b.dead ? "bad" : "",
    html: `<span class="step-l">${esc(b.t)} · ${b.p}${last ? " · end of the replay" : ""}</span>${esc(b.text)}`,
  };
}
