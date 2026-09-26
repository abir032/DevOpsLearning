/*
 * Data and rendering for the two Terraform state visuals. Used both at build
 * time (so the first state is in the HTML) and in the browser.
 */

/* ---------------- code vs state vs AWS ---------------- */

type Chip = [name: string, kind?: "" | "add" | "chg" | "lost", note?: string];
export interface ThreeWay { label: string; code: Chip[]; state: Chip[]; aws: Chip[]; plan: string; say: string; tone: "" | "good" | "bad" }

const BASE = ["VPC", "Load balancer", "Orders API"];
const ok = (n: string): Chip => [n, ""];

export const THREEWAY: Record<string, ThreeWay> = {
  sync: {
    label: "Everything in sync",
    code: BASE.map(ok), state: BASE.map(ok), aws: BASE.map(ok),
    plan: '<span class="d">No changes. Your infrastructure matches the configuration.</span>',
    say: "Code, state and AWS all agree, so Terraform does nothing. That is why running apply twice is safe.", tone: "good",
  },
  add: {
    label: "Add a database to the code",
    code: [...BASE.map(ok), ["Orders database", "add", "new in code"]], state: BASE.map(ok), aws: BASE.map(ok),
    plan: '<span class="p">+ aws_db_instance.orders will be created</span>\n\nPlan: 1 to add, 0 to change, 0 to destroy.',
    say: "The code has something the state doesn't. Terraform creates it in AWS, then writes it into state so it remembers.", tone: "",
  },
  drift: {
    label: "Someone changes AWS by hand",
    code: BASE.map(ok), state: BASE.map(ok), aws: [["VPC", ""], ["Load balancer", "chg", "edited in the console"], ["Orders API", ""]],
    plan: '<span class="c">~ aws_lb.main will be updated in-place</span>\n    <span class="c">~ idle_timeout = 300 -> 60</span>\n\nPlan: 0 to add, 1 to change, 0 to destroy.',
    say: "This is <b>drift</b>. The code wins: the next apply quietly changes it back. If the hand-made change was right, it belongs in the code.", tone: "",
  },
  lost: {
    label: "The state file is lost",
    code: BASE.map(ok), state: [], aws: BASE.map((n): Chip => [n, "lost", "not in state"]),
    plan: '<span class="p">+ aws_vpc.main will be created</span>\n<span class="p">+ aws_lb.main will be created</span>\n<span class="p">+ aws_ecs_service.orders will be created</span>\n\nPlan: <span class="m">3 to add</span>, 0 to change, 0 to destroy.',
    say: "Everything already exists in AWS, but with no state Terraform can't know that. It plans to build all of it again. This was Leo's first day.", tone: "bad",
  },
};

function col(title: string, sub: string, items: Chip[], animate: boolean) {
  const body = items.length
    ? items.map(([n, k, note]) => `<div class="chip ${k || ""}${animate && k ? " new" : ""}"><i></i>${n}${note ? `<span class="orphan">${note}</span>` : ""}</div>`).join("")
    : '<div class="empty">Empty — Terraform remembers nothing</div>';
  return `<div class="tw-col"><h3>${title}</h3><small>${sub}</small>${body}</div>`;
}

export function threeWayCols(s: ThreeWay, animate = false) {
  return col("Your code", "what you asked for", s.code, animate) +
    col("State file", "what Terraform remembers", s.state, animate) +
    col("AWS", "what really exists", s.aws, animate);
}
export const threeWayPlan = (s: ThreeWay) => '<span class="d">$ terraform plan</span>\n\n' + s.plan;
export const threeWaySay = (s: ThreeWay) => `<span class="step-l">What the plan does</span>${s.say}`;

/* ---------------- two engineers, one state file ---------------- */

interface Person { st: string; mem: number | null; blocked?: boolean }
export interface RaceStep {
  a: Person; f: Person; v: number; items: string[]; lock: string | null;
  aws: [string, string?][]; flash?: string[]; say: string; end?: "good" | "bad";
}

export const A = "Maya";
export const B = "Leo";

export function raceSteps(locking: boolean): RaceStep[] {
  const s: RaceStep[] = [];
  let c: RaceStep = {
    a: { st: "About to run terraform apply", mem: null }, f: { st: "About to run terraform apply", mem: null },
    v: 3, items: ["VPC", "Load balancer"], lock: null, aws: [["VPC"], ["Load balancer"]],
    say: `${A} and ${B} both press apply at the same moment. The state file is at <b>version 3</b>: a VPC and a load balancer.`,
  };
  const next = (ch: Partial<RaceStep>) => { c = { ...structuredClone(c), flash: [], end: undefined, ...ch }; s.push(c); };
  s.push(c);
  if (!locking) {
    next({ a: { st: "Reading the state", mem: 3 }, flash: ["state", "a"], say: `${A}'s Terraform reads the state: <b>version 3</b>.` });
    next({ f: { st: "Reading the state", mem: 3 }, flash: ["state", "f"], say: `${B}'s reads it too, the same instant: also <b>version 3</b>. Nothing stops it — there is no lock.` });
    next({ a: { st: "Creating the orders database", mem: 3 }, aws: [...c.aws, ["Orders database"]], flash: ["aws", "a"], say: `${A}'s apply creates the <b>orders database</b> in AWS.` });
    next({ f: { st: "Creating the payments queue", mem: 3 }, aws: [...c.aws, ["Payments queue"]], flash: ["aws", "f"], say: `${B}'s creates the <b>payments queue</b>.` });
    next({ a: { st: "Done — wrote version 4", mem: 3 }, v: 4, items: ["VPC", "Load balancer", "Orders database"], flash: ["state", "a"], say: `${A} writes <b>version 4</b>: VPC, load balancer, orders database. Correct so far.` });
    next({ f: { st: "Done — wrote version 4", mem: 3 }, v: 4, items: ["VPC", "Load balancer", "Payments queue"], flash: ["state", "f"], say: `${B}'s Terraform writes <b>its own</b> version 4. It was built from version 3, so it doesn't know about the orders database. <b>It overwrites ${A}'s.</b>` });
    next({ aws: [["VPC"], ["Load balancer"], ["Orders database", "orphan"], ["Payments queue"]], flash: ["aws", "state"], end: "bad",
      say: "Both applies <b>succeeded</b>. No error anywhere. But the orders database is running in AWS and missing from state. Nobody's code manages it, and the next plan will try to create it again." });
  } else {
    next({ a: { st: "Took the lock", mem: null }, lock: A, flash: ["state", "a"], say: `${A}'s Terraform <b>takes the lock</b> before doing anything else.` });
    next({ f: { st: "Error acquiring the state lock", mem: null, blocked: true }, flash: ["f"], say: `${B}'s tries to take it and is <b>refused</b>, with a message saying ${A} holds it. None of ${B}'s changes run.` });
    next({ a: { st: "Reading version 3, creating the orders database", mem: 3 }, aws: [...c.aws, ["Orders database"]], flash: ["aws", "a"], say: `${A} reads <b>version 3</b> and creates the orders database.` });
    next({ a: { st: "Done — wrote version 4, released the lock", mem: 4 }, v: 4, items: ["VPC", "Load balancer", "Orders database"], lock: null, flash: ["state", "a"], say: `${A} writes <b>version 4</b> and <b>releases the lock</b>.` });
    next({ f: { st: "Ran again: took the lock, reading version 4", mem: 4 }, lock: B, flash: ["state", "f"], say: `${B} runs apply again. This time it gets the lock and reads <b>version 4</b>, which already includes the orders database.` });
    next({ f: { st: "Done — wrote version 5, released the lock", mem: 5 }, v: 5, items: ["VPC", "Load balancer", "Orders database", "Payments queue"], lock: null, aws: [...c.aws, ["Payments queue"]], flash: ["state", "aws", "f"], say: `${B} creates the payments queue and writes <b>version 5</b>.` });
    next({ end: "good", say: `State matches AWS exactly: four resources, all remembered. ${B} waited a minute. That is the whole cost of locking.` });
  }
  return s;
}

function person(key: "a" | "f", name: string, track: string, p: Person) {
  const cls = "person" + (p.blocked ? " blocked" : p.st.startsWith("About") ? "" : " act");
  return `<div class="${cls}" data-track="${track}" data-box="${key}"><div class="nm"><span class="av" aria-hidden="true">${name[0]}</span>${name}</div>` +
    `<div class="st">${p.st}</div><div class="mem">${p.mem ? `Working from <b>version ${p.mem}</b>` : "Hasn't read the state yet"}</div></div>`;
}

export function raceHtml(s: RaceStep, locking: boolean) {
  const fl = s.flash || [];
  const lock = s.lock ? `Locked by ${s.lock}` : locking ? "Unlocked" : "No lock in use";
  return person("a", A, "cloud", s.a) +
    `<div class="center"><div class="box-card${fl.includes("state") ? " flash" : ""}"><div class="bh"><b>State file in S3</b><span class="ver">v${s.v}</span></div>` +
    `<span class="lock${s.lock ? " on" : ""}">${lock}</span>` +
    s.items.map((n) => `<div class="chip"><i></i>${n}</div>`).join("") + "</div>" +
    `<div class="box-card${fl.includes("aws") ? " flash" : ""}"><div class="bh"><b>What really exists in AWS</b></div>` +
    s.aws.map(([n, o]) => `<div class="chip${o ? " lost" : ""}"><i></i>${n}${o ? '<span class="orphan">not in state</span>' : ""}</div>`).join("") + "</div></div>" +
    person("f", B, "box", s.f);
}

export function raceSay(s: RaceStep, i: number, total: number) {
  const tail = s.end === "bad" ? ": the state is now wrong" : s.end === "good" ? ": the state is correct" : "";
  return `<span class="step-l">Step ${i} of ${total}${tail}</span>${s.say}`;
}
