/*
 * Data and rendering for the environments visual: one module, three folders.
 * Used at build time (so the first state is in the HTML) and in the browser.
 * The outputs were checked with Terraform 1.16 and the Environments lab's code.
 */

export type EnvKey = "dev" | "stg" | "eu";
export type Zones = "lookup" | "fixed";

interface Env { folder: string; key: string; region: string; cidr: string; count: number; zones: string[]; add: number }

export const ENVS: Record<EnvKey, Env> = {
  dev: { folder: "envs/dev", key: "dev/network/terraform.tfstate", region: "us-east-1", cidr: "10.10.0.0/16", count: 2, zones: ["us-east-1a", "us-east-1b"], add: 7 },
  stg: { folder: "envs/stg", key: "stg/network/terraform.tfstate", region: "us-east-1", cidr: "10.20.0.0/16", count: 3, zones: ["us-east-1a", "us-east-1b", "us-east-1c"], add: 9 },
  eu: { folder: "envs/dev-eu", key: "dev-eu/network/terraform.tfstate", region: "eu-west-1", cidr: "10.30.0.0/16", count: 2, zones: ["eu-west-1a", "eu-west-1b"], add: 7 },
};
export const LABEL: Record<EnvKey, string> = { dev: "dev", stg: "stg", eu: "dev in eu-west-1" };

const ROWS: [string, string, (e: Env) => string][] = [
  ["Folder", "where you run terraform", (e) => e.folder],
  ["key", "backend.tf: the state file", (e) => e.key],
  ["region", "terraform.tfvars", (e) => e.region],
  ["vpc_cidr", "terraform.tfvars", (e) => e.cidr],
  ["zone_count", "terraform.tfvars", (e) => String(e.count)],
];

export function matrixHtml(sel: EnvKey) {
  const keys = Object.keys(ENVS) as EnvKey[];
  const head = `<tr><th scope="col">Setting</th>${keys.map((k) => `<th scope="col"${k === sel ? ' class="on"' : ""}>${LABEL[k]}</th>`).join("")}</tr>`;
  const body = ROWS.map(([name, where, get]) => {
    const vals = keys.map((k) => get(ENVS[k]));
    const cells = keys.map((k, i) => {
      const cls = [k === sel ? "on" : "", k === sel && sel !== "dev" && vals[i] !== vals[0] ? "diff" : ""].filter(Boolean).join(" ");
      return `<td${cls ? ` class="${cls}"` : ""}><code>${vals[i]}</code></td>`;
    }).join("");
    return `<tr><th scope="row"><code>${name}</code><small>${where}</small></th>${cells}</tr>`;
  }).join("");
  return `<table class="em-table"><caption>What differs between the three folders</caption><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

export function codeHtml(z: Zones) {
  const zones = z === "lookup"
    ? `<span class="em-hl">zones = slice(data.aws_availability_zones.available.names, 0, var.zone_count)</span>`
    : `<span class="em-bad">zones = slice(["us-east-1a", "us-east-1b", "us-east-1c"], 0, var.zone_count)</span>`;
  return `<span class="d"># envs/*/main.tf: the same file in every folder</span>
module "network" {
  source = "../../modules/network"

  name       = "quickcart-\${var.environment}"
  cidr_block = var.vpc_cidr
  zone_count = var.zone_count
}

<span class="d"># modules/network/main.tf: how the module picks its zones</span>
${zones}`;
}

export function runHtml(sel: EnvKey, z: Zones) {
  const e = ENVS[sel];
  const head = `<span class="d">$ cd ${e.folder}</span>\n<span class="d">$ terraform apply</span>\n\n`;
  if (z === "fixed" && e.region !== "us-east-1") {
    return head + `module.network.aws_vpc.this: Creation complete after 2s
module.network.aws_subnet.public["us-east-1a"]: Creating...

<span class="m">Error: creating EC2 Subnet: InvalidParameterValue: Value (us-east-1a)
for parameter availabilityZone is invalid. Subnets can currently only be
created in the following availability zones: eu-west-1a, eu-west-1b, eu-west-1c.</span>`;
  }
  return head + `Plan: ${e.add} to add, 0 to change, 0 to destroy.
<span class="p">Apply complete! Resources: ${e.add} added, 0 changed, 0 destroyed.</span>

Outputs:

zones = tolist([
${e.zones.map((n) => `  "${n}",`).join("\n")}
])`;
}

export function envSay(sel: EnvKey, z: Zones): { html: string; tone: "" | "good" | "bad" } {
  const e = ENVS[sel];
  if (z === "fixed" && e.region !== "us-east-1") {
    return { tone: "bad", html: `<span class="step-l">The second region fails</span>The zone names were typed into the module, and <b>us-east-1a</b> doesn't exist in eu-west-1. The VPC was created, then the first subnet failed, so the apply stopped half-way. dev and stg never showed the bug, because they're in us-east-1.` };
  }
  if (z === "fixed") {
    return { tone: "", html: `<span class="step-l">It works, for now</span>${LABEL[sel]} is in us-east-1, so the typed-in zone names happen to exist. The bug is hidden until someone points this code at another region. Try <b>dev in eu-west-1</b>.` };
  }
  if (sel === "dev") {
    return { tone: "good", html: `<span class="step-l">dev</span>The module and <b>main.tf</b> are the same in every folder. Only the highlighted column's values are dev's own. Pick another environment to see what changes.` };
  }
  if (sel === "stg") {
    return { tone: "good", html: `<span class="step-l">stg</span>Same code. Three things differ: its own <b>state key</b>, its own <b>address range</b>, and <b>three zones</b> instead of two. That's why the plan has 9 resources instead of 7. Because the state key differs, nothing stg does can touch dev's state.` };
  }
  return { tone: "good", html: `<span class="step-l">A second region</span>Same code again. The region is just a variable, and the module <b>looks up</b> the zone names, so it finds eu-west-1a and eu-west-1b by itself. The state still lives in the one bucket in us-east-1, under its own key.` };
}
