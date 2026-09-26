/*
 * Data and rendering for the module wiring visual. Used at build time (so the
 * first state is in the HTML) and in the browser.
 *
 * Every plan here was checked against Terraform 1.16 and AWS provider 6.x,
 * with the network module and root from the Modules lesson.
 */

type Kind = "" | "add" | "chg" | "lost";
type Row = [label: string, kind?: Kind, note?: string];

export interface Wiring {
  label: string;
  inputs: Row[];
  inside: Row[];
  outputs: Row[];
  plan: string;
  say: string;
  tone: "" | "good" | "bad";
  sealed?: boolean;
}

const IN: Row[] = [
  ['name = "quickcart-dev"'],
  ['cidr_block = "10.10.0.0/16"'],
  ["zone_count = 2"],
  ['tags = { Project = "quickcart" }'],
];
const INSIDE: Row[] = [
  ["VPC"],
  ["Internet gateway"],
  ["Subnet us-east-1a"],
  ["Subnet us-east-1b"],
  ["Route table"],
  ["Route table link 1a"],
  ["Route table link 1b"],
];
const OUT: Row[] = [
  ["vpc_id → security group web"],
  ["public_subnet_ids → a load balancer, later"],
  ["zones → printed by the root"],
];

const set = (rows: Row[], changes: Record<number, [Kind, string?]>, label?: Record<number, string>): Row[] =>
  rows.map((r, i) => [label?.[i] ?? r[0], changes[i]?.[0] ?? "", changes[i]?.[1]]);

const P = (s: string) => `<span class="p">${s}</span>`;
const C = (s: string) => `<span class="c">${s}</span>`;
const M = (s: string) => `<span class="m">${s}</span>`;
const D = (s: string) => `<span class="d">${s}</span>`;
const mn = "module.network.";

export const WIRING: Record<string, Wiring> = {
  none: {
    label: "Nothing",
    inputs: IN, inside: INSIDE, outputs: OUT,
    plan: D("No changes. Your infrastructure matches the configuration."),
    say: "Four inputs go in. Seven resources are built inside. Three outputs come out. The root module can only talk to the module through those inputs and outputs.",
    tone: "good",
  },
  name: {
    label: "name",
    inputs: set(IN, { 0: ["chg", "changed"] }, { 0: 'name = "quickcart-development"' }),
    inside: set(INSIDE, { 0: ["chg", "~ Name tag"], 1: ["chg", "~ Name tag"], 2: ["chg", "~ Name tag"], 3: ["chg", "~ Name tag"], 4: ["chg", "~ Name tag"] }),
    outputs: OUT,
    plan: [
      C(`~ ${mn}aws_internet_gateway.this will be updated in-place`),
      C(`~ ${mn}aws_route_table.public will be updated in-place`),
      C(`~ ${mn}aws_subnet.public["us-east-1a"] will be updated in-place`),
      C(`~ ${mn}aws_subnet.public["us-east-1b"] will be updated in-place`),
      C(`~ ${mn}aws_vpc.this will be updated in-place`),
      "",
      "Plan: 0 to add, 5 to change, 0 to destroy.",
    ].join("\n"),
    say: "Inside the module, <b>name</b> is only used in Name tags. So the five resources with a Name tag are updated in place, and nothing else moves. The outputs don't change, so the security group outside the module isn't touched.",
    tone: "good",
  },
  cidr: {
    label: "cidr_block",
    inputs: set(IN, { 1: ["chg", "changed"] }, { 1: 'cidr_block = "10.11.0.0/16"' }),
    inside: set(INSIDE, {
      0: ["lost", "-/+ replaced"], 1: ["chg", "~ moves to new VPC"], 2: ["lost", "-/+ replaced"], 3: ["lost", "-/+ replaced"],
      4: ["lost", "-/+ replaced"], 5: ["lost", "-/+ replaced"], 6: ["lost", "-/+ replaced"],
    }),
    outputs: set(OUT, { 0: ["lost", "new ID: security group replaced"], 1: ["chg", "new IDs"] }),
    plan: [
      M("-/+ aws_security_group.web must be replaced"),
      C(`  ~ ${mn}aws_internet_gateway.this will be updated in-place`),
      M(`-/+ ${mn}aws_route_table.public must be replaced`),
      M(`-/+ ${mn}aws_route_table_association.public["us-east-1a"] must be replaced`),
      M(`-/+ ${mn}aws_route_table_association.public["us-east-1b"] must be replaced`),
      M(`-/+ ${mn}aws_subnet.public["us-east-1a"] must be replaced`),
      M(`-/+ ${mn}aws_subnet.public["us-east-1b"] must be replaced`),
      M(`-/+ ${mn}aws_vpc.this must be replaced`),
      "",
      `Plan: 7 to add, 1 to change, <span class="m">7 to destroy</span>.`,
    ].join("\n"),
    say: "A VPC's address range can't change, so the VPC is <b>replaced</b>. Everything that sits in it follows. The new VPC has a new ID, so the <b>vpc_id</b> output changes, and that carries the change <b>out of the module</b>: the security group in the root is replaced too. One input, eight resources.",
    tone: "bad",
  },
  zones: {
    label: "zone_count",
    inputs: set(IN, { 2: ["chg", "changed"] }, { 2: "zone_count = 3" }),
    inside: [...INSIDE.slice(0, 4), ["Subnet us-east-1c", "add", "+ create"], ...INSIDE.slice(4), ["Route table link 1c", "add", "+ create"]],
    outputs: set(OUT, { 1: ["chg", "one more ID"], 2: ["chg", "one more zone"] }),
    plan: [
      P(`+ ${mn}aws_route_table_association.public["us-east-1c"] will be created`),
      P(`+ ${mn}aws_subnet.public["us-east-1c"] will be created`),
      "",
      "Plan: 2 to add, 0 to change, 0 to destroy.",
    ].join("\n"),
    say: "A third zone adds one subnet and one route table link. Nothing existing is touched, because the subnets are keyed by zone name. Two outputs now carry one more value each.",
    tone: "good",
  },
  tags: {
    label: "tags",
    inputs: set(IN, { 3: ["chg", "changed"] }, { 3: 'tags = { Project = "quickcart", Team = "platform" }' }),
    inside: set(INSIDE, { 0: ["chg", "~ tags"], 1: ["chg", "~ tags"], 2: ["chg", "~ tags"], 3: ["chg", "~ tags"], 4: ["chg", "~ tags"] }),
    outputs: OUT,
    plan: [
      C(`~ ${mn}aws_internet_gateway.this will be updated in-place`),
      C(`~ ${mn}aws_route_table.public will be updated in-place`),
      C(`~ ${mn}aws_subnet.public["us-east-1a"] will be updated in-place`),
      C(`~ ${mn}aws_subnet.public["us-east-1b"] will be updated in-place`),
      C(`~ ${mn}aws_vpc.this will be updated in-place`),
      "",
      "Plan: 0 to add, 5 to change, 0 to destroy.",
    ].join("\n"),
    say: "The module passes <b>tags</b> to every resource that can hold tags. Adding one tag updates five resources in place. Route table links can't hold tags, so they stay as they are.",
    tone: "good",
  },
  peek: {
    label: "Reach inside",
    sealed: true,
    inputs: IN, inside: INSIDE, outputs: OUT,
    plan: [
      M("Error: Unsupported attribute"),
      "",
      "  on network.tf line 50, in output \"vpc_id\":",
      "  50:   value = module.network.aws_vpc.this.id",
      "    ├────────────────",
      "    │ module.network is object with 3 attributes",
      "",
      'This object does not have an attribute named "aws_vpc".',
    ].join("\n"),
    say: "From the root, you tried to read <b>module.network.aws_vpc.this.id</b>. Terraform refuses. The module's resources are private. The only way out is an <b>output</b>, so you write <b>module.network.vpc_id</b> instead.",
    tone: "bad",
  },
};

function col(title: string, sub: string, rows: Row[], animate: boolean, extra = "") {
  const body = rows.map(([n, k, note]) =>
    `<div class="chip ${k || ""}${animate && k ? " new" : ""}"><i></i><code>${n}</code>${note ? `<span class="orphan">${note}</span>` : ""}</div>`).join("");
  return `<div class="mw-col${extra}"><h3>${title}</h3><small>${sub}</small>${body}</div>`;
}

export function wiringCols(s: Wiring, animate = false) {
  return col("Inputs", "variables the root passes in", s.inputs, animate) +
    `<div class="mw-arrow" aria-hidden="true"></div>` +
    col("Inside modules/network", s.sealed ? "private: the root can't see in here" : "resources the module builds", s.inside, animate, s.sealed ? " sealed" : "") +
    `<div class="mw-arrow" aria-hidden="true"></div>` +
    col("Outputs", "the only way values leave", s.outputs, animate);
}
export const wiringPlan = (s: Wiring) => '<span class="d">$ terraform plan</span>\n\n' + s.plan;
export const wiringSay = (s: Wiring) =>
  `<span class="step-l">${s.sealed ? "Reaching inside the module" : s.label === "Nothing" ? "The module's interface" : `You changed ${s.label}`}</span>${s.say}`;
