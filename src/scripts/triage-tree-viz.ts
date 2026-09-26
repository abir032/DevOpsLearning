/*
 * Data and rendering for the triage decision tree.
 * Teaches: the symptom tells you which layer to look at first.
 */

export interface Opt { label: string; to: string }
export interface Node {
  q?: string; opts?: Opt[];
  /* a leaf */
  cause?: string; look?: string[]; lesson?: [string, string]; tone?: "good" | "bad";
}

export const TREE: Record<string, Node> = {
  start: {
    q: "What does the request do?",
    opts: [
      { label: "It hangs, then times out", to: "timeout" },
      { label: "Connection refused, straight away", to: "refused" },
      { label: "An HTTP 5xx error", to: "5xx" },
      { label: "An HTTP 4xx error", to: "4xx" },
      { label: "New servers never become healthy", to: "boot" },
    ],
  },
  timeout: {
    q: "Where does it time out?",
    opts: [
      { label: "The load balancer itself never answers", to: "t-lb" },
      { label: "The load balancer answers 504", to: "t-504" },
      { label: "The app's call to the database times out", to: "t-db" },
    ],
  },
  "t-lb": {
    cause: "Packets are being dropped before they reach the load balancer. A timeout means nothing answered at all — not even a refusal. That's the network, not the code.",
    look: [
      "The load balancer's security group: inbound 443 (and 80) from 0.0.0.0/0",
      "The subnets it's in: their route table must send 0.0.0.0/0 to the internet gateway",
      "DNS: does the name point at this load balancer?",
      "Network ACLs on those subnets, if anyone has changed them",
    ],
    lesson: ["security-groups", "Security groups"],
  },
  "t-504": {
    cause: "The load balancer is reachable, but the target didn't answer in time. Either the load balancer can't reach the target on its port, or the app is stuck waiting on something slow.",
    look: [
      "Target group → Targets: a health reason of Target.Timeout means the network",
      "The app's security group: inbound on the app's port from the load balancer's security group",
      "App logs and latency: is it waiting on the database or another service?",
    ],
    lesson: ["load-balancers", "Load balancers"],
  },
  "t-db": {
    cause: "The app can't open a connection to the database. A wrong password is refused instantly. A timeout this regular means a firewall is dropping the connection.",
    look: [
      "The database's security group: inbound 3306 (or 5432) from the app's security group",
      "CloudTrail: did anyone change that security group recently?",
      "Logs: filter level = \"ERROR\" and look at error_type and latency_ms",
    ],
    lesson: ["security-groups", "Security groups"],
  },
  refused: {
    cause: "Something reached the machine, and the machine said no: nothing is listening on that port. The network is fine. The process isn't there.",
    look: [
      "Is the app running at all? It may have crashed on start-up — read its logs",
      "Is it listening on the port you think? 8080 in the app, 80 in the target group?",
      "Is it listening on 0.0.0.0, or only on 127.0.0.1 (the machine itself)?",
      "Containers: is the port published, or mapped to the right container port?",
    ],
    lesson: ["ec2", "Servers on EC2"],
  },
  "5xx": {
    q: "Which 5xx, and who sent it?",
    opts: [
      { label: "503 from the load balancer", to: "x-503" },
      { label: "502 from the load balancer", to: "x-502" },
      { label: "500 from the app", to: "x-500" },
    ],
  },
  "x-503": {
    cause: "The load balancer has no healthy targets to send the request to. The app may be fine; the load balancer just doesn't think so.",
    look: [
      "Target group → Targets: how many are healthy, and what's the reason for the others?",
      "Is the health check path right, and does it return 200?",
      "Did a deploy just replace every target at once?",
    ],
    lesson: ["load-balancers", "Load balancers"],
  },
  "x-502": {
    cause: "The target answered, but badly: it closed the connection or sent something that isn't valid HTTP. Often the app crashed mid-request or is restarting.",
    look: [
      "App logs around the same time: crashes, restarts, out of memory",
      "Is the target speaking HTTPS when the target group expects HTTP, or the other way round?",
      "Container or process restarts in the last few minutes",
    ],
    lesson: ["load-balancers", "Load balancers"],
  },
  "x-500": {
    cause: "The request reached your code and your code failed. Usually the app itself, or something it depends on — the database, a secret, another service.",
    look: [
      "Logs Insights: filter level = \"ERROR\", then count by error_type",
      "Recent changes: the last deploy, a migration, a config or secret change",
      "Dependencies: database metrics, connection counts, the status of other services",
    ],
    lesson: ["logs-and-metrics", "Logs and metrics"],
  },
  "4xx": {
    cause: "The server answered and says the request was wrong: the path, the method, the login or the input. Restarting servers won't help. Look at what the client sent.",
    look: [
      "404: wrong path, or a load balancer listener rule that doesn't match",
      "401 or 403: missing or expired login, or a permissions rule",
      "400: the app rejected the input — its logs usually say which field",
      "A sudden jump in 4xx after a release: the client and server disagree about the API",
    ],
    lesson: ["load-balancers", "Load balancers"],
  },
  boot: {
    cause: "The server starts, but never passes its health check, so it's replaced — over and over. You often can't log in to see why, because whatever is broken breaks that too.",
    look: [
      "EC2 → the instance → Actions → Monitor and troubleshoot → Get system log",
      "Outbound security group rules: a booting server starts lots of connections",
      "The boot script (user data): did it finish? Does the app start?",
      "Health check grace period: is it longer than the boot takes?",
    ],
    lesson: ["auto-scaling", "Auto scaling"],
  },
};

export const START = ["start"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function trailHtml(path: string[]) {
  const steps: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const n = TREE[path[i]];
    const o = n.opts!.find((x) => x.to === path[i + 1])!;
    steps.push(`<li><span>${esc(n.q!)}</span><b>${esc(o.label)}</b></li>`);
  }
  return steps.join("");
}

export function nodeHtml(path: string[], base = "") {
  const id = path[path.length - 1];
  const n = TREE[id];
  if (n.q) {
    return `<p class="tt-q" id="tt-q-${id}">${esc(n.q)}</p><div class="tt-opts" role="group" aria-labelledby="tt-q-${id}">` +
      n.opts!.map((o) => `<button type="button" class="btn tt-opt" data-to="${o.to}">${esc(o.label)}</button>`).join("") + `</div>`;
  }
  return `<div class="tt-leaf"><p class="tt-cause"><b>Most likely:</b> ${esc(n.cause!)}</p><p class="tt-look-h">Look here, in this order</p><ol class="tt-look">` +
    n.look!.map((l) => `<li>${esc(l)}</li>`).join("") + `</ol>` +
    (n.lesson ? `<p class="tt-lesson">Covered in <a href="${base}/lessons/${n.lesson[0]}/">${esc(n.lesson[1])}</a></p>` : "") + `</div>`;
}

export function sayHtml(path: string[]) {
  const id = path[path.length - 1];
  const n = TREE[id];
  if (id === "start") return `<span class="step-l">Start here</span>Something is broken. Pick what the client actually sees. The exact symptom matters more than anything else you know so far.`;
  if (n.q) return `<span class="step-l">Narrowing down</span>${esc(n.q)} Pick the one that matches.`;
  return `<span class="step-l">Where to look</span>${esc(n.cause!.split(". ")[0])}.`;
}
