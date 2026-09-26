/*
 * Data and rendering for the variable precedence visual. Used at build time
 * (so the first state is in the HTML) and in the browser.
 *
 * Terraform's order, lowest to highest: the default; TF_VAR_ environment
 * variables; terraform.tfvars; *.auto.tfvars (in name order); then -var and
 * -var-file on the command line, where the later one wins.
 */

export interface Source { id: string; name: string; how: string; value: number }

export const SOURCES: Source[] = [
  { id: "def", name: "Default in variables.tf", how: "default = 10", value: 10 },
  { id: "env", name: "Environment variable", how: "export TF_VAR_images_to_keep=15", value: 15 },
  { id: "tfv", name: "terraform.tfvars", how: "images_to_keep = 20", value: 20 },
  { id: "auto", name: "team.auto.tfvars", how: "images_to_keep = 25", value: 25 },
  { id: "file", name: "-var-file on the command line", how: "-var-file=stg.tfvars (images_to_keep = 30)", value: 30 },
  { id: "cli", name: "-var on the command line", how: "-var images_to_keep=50", value: 50 },
];

export interface PrecState { on: Record<string, boolean>; cliLast: boolean }

export const START: PrecState = { on: { def: true, env: false, tfv: false, auto: false, file: false, cli: false }, cliLast: true };

/* Lowest priority first. -var and -var-file swap depending on which comes later. */
function ordered(s: PrecState): Source[] {
  const base = SOURCES.slice(0, 4);
  const file = SOURCES[4], cli = SOURCES[5];
  return s.cliLast ? [...base, file, cli] : [...base, cli, file];
}

export function winner(s: PrecState): Source | null {
  const on = ordered(s).filter((x) => s.on[x.id]);
  return on.length ? on[on.length - 1] : null;
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function precStack(s: PrecState) {
  const w = winner(s);
  const rows = ordered(s).map((x, i) => ({ x, rank: i + 1 })).reverse();
  return rows.map(({ x, rank }) => {
    const on = s.on[x.id];
    const cls = !on ? "off" : x === w ? "win" : "lose";
    const tag = !on ? "not set" : x === w ? "wins" : "overridden";
    return `<li class="pr-row ${cls}" data-src="${x.id}"><span class="pr-rank" aria-hidden="true">${rank}</span>` +
      `<span class="pr-body"><b>${esc(x.name)}</b><code>${esc(x.how)}</code></span>` +
      `<span class="pr-tag">${tag}</span></li>`;
  }).join("");
}

export function precResult(s: PrecState) {
  const w = winner(s);
  return w
    ? `var.images_to_keep = <b>${w.value}</b>`
    : `var.images_to_keep = <b>no value</b>`;
}

export function precSay(s: PrecState) {
  const w = winner(s);
  const on = SOURCES.filter((x) => s.on[x.id]);
  let msg: string;
  if (!w) {
    msg = "Nothing sets the value and there's no default. Terraform stops and asks you to type one — or, with <code>-input=false</code> in a pipeline, fails with <b>No value for required variable</b>.";
  } else if (on.length === 1) {
    msg = `Only one place sets it, so <b>${esc(w.name)}</b> decides: <b>${w.value}</b>.`;
  } else {
    msg = `${on.length} places set it. Terraform reads them from the bottom of the list up, and each one overwrites the last. <b>${esc(w.name)}</b> is read last, so <b>${w.value}</b> wins.`;
    if (s.on.env && s.on.tfv && !["env"].includes(w.id)) {
      msg += " Notice the environment variable lost to <code>terraform.tfvars</code>. That surprises people: environment variables are near the <b>bottom</b>, not the top.";
    }
    if (s.on.cli && s.on.file) {
      msg += s.cliLast
        ? " <code>-var</code> comes after <code>-var-file</code> in the command, so it wins."
        : " <code>-var-file</code> comes after <code>-var</code> in the command, so this time the file wins. On the command line, the later one wins.";
    }
  }
  return `<span class="step-l">Which value wins</span>${msg}`;
}

export function precCommand(s: PrecState) {
  const parts = ["terraform plan"];
  const file = s.on.file ? "-var-file=stg.tfvars" : "";
  const cli = s.on.cli ? "-var images_to_keep=50" : "";
  if (s.cliLast) parts.push(file, cli); else parts.push(cli, file);
  const cmd = parts.filter(Boolean).join(" ");
  const env = s.on.env ? '<span class="d">$ export TF_VAR_images_to_keep=15</span>\n' : "";
  return `${env}<span class="d">$</span> ${cmd}`;
}
