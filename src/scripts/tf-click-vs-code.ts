/*
 * Data and rendering for "clicking vs code" (Why Terraform).
 * Teaches: the first build costs about the same either way; the second copy
 * is where clicking falls behind and quietly misses a step.
 */

export const PIECES = [
  "VPC",
  "4 subnets across 2 zones",
  "Internet gateway",
  "NAT gateway",
  "Route tables",
  "Security groups",
  "Load balancer",
  "Database",
];
/* the piece the clicker forgets in the second region */
export const MISSED = 4;

export type Stage = 0 | 1 | 2;

export interface Side {
  time: string;
  written: string;
}

export const CLICK: Record<Stage, Side> = {
  0: { time: "0 hours", written: "Nothing yet" },
  1: { time: "About 3 hours of forms", written: "Nothing. The steps are in one person's head" },
  2: { time: "About 6 hours, and a day of debugging", written: "Still nothing. Two regions that differ, and nobody knows how" },
};
export const CODE: Record<Stage, Side> = {
  0: { time: "0 hours", written: "Nothing yet" },
  1: { time: "About 4 hours writing code, then one apply", written: "Every setting, in git, reviewed before it ran" },
  2: { time: "One changed variable, one apply: minutes", written: "The same files. The only difference is region = \"eu-west-1\"" },
};

export const SAY: Record<Stage, { t: string; tone: "" | "good" | "bad" }> = {
  0: { t: "QuickCart needs its environment: a network, a load balancer and a database. Build it once each way.", tone: "" },
  1: { t: "The first build takes about as long either way. Writing code is even a little slower. <b>If you only ever build once, clicking looks fine.</b>", tone: "" },
  2: { t: "The second copy is where they split. Clicking means doing every form again, from memory, and <b>the private route table misses its route to the NAT gateway</b>. Servers in eu-west-1 can't download anything, and nothing says why. Code builds an identical copy from the same files.", tone: "bad" },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function region(name: string, n: number, missed: number | null) {
  const chips = PIECES.slice(0, n).map((p, i) =>
    i === missed
      ? `<div class="chip lost"><i></i>${p}<span class="orphan">route to NAT missing</span></div>`
      : `<div class="chip add"><i></i>${p}</div>`).join("");
  return `<div class="cvc-region"><div class="cvc-rn">${name}</div>${chips || '<div class="cvc-empty">Nothing built</div>'}</div>`;
}

/* n1 / n2: how many pieces are built so far in each region (for the build-up animation) */
export function sideHtml(kind: "click" | "code", stage: Stage, n1 = stage >= 1 ? PIECES.length : 0, n2 = stage >= 2 ? PIECES.length : 0) {
  const s = kind === "click" ? CLICK[stage] : CODE[stage];
  const title = kind === "click" ? "By clicking in the console" : "By code, with Terraform";
  const sub = kind === "click" ? "one form at a time" : "files in git, then terraform apply";
  const regions = region("us-east-1", n1, null) + (stage >= 2 ? region("eu-west-1", n2, kind === "click" ? MISSED : null) : "");
  return `<h3>${title}</h3><small>${sub}</small><div class="cvc-regions">${regions}</div>` +
    `<dl class="cvc-facts"><dt>Time</dt><dd>${esc(s.time)}</dd><dt>Written down</dt><dd>${esc(s.written)}</dd></dl>`;
}

export const sayHtml = (stage: Stage) => {
  const step = ["Before anything is built", "One environment, built twice", "A second copy, in eu-west-1"][stage];
  return `<span class="step-l">${step}</span>${SAY[stage].t}`;
};
