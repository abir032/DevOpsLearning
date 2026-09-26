/*
 * Data and rendering for the "rename with and without a moved block" visual.
 * Used at build time (so the first state is in the HTML) and in the browser.
 * The plan text is what Terraform 1.16 really prints, trimmed.
 */

export type Change = "rename" | "module";
export interface MovedState { change: Change; moved: boolean; applied: boolean }

const OLD = "aws_ecr_repository.orders";
const NEW: Record<Change, string> = {
  rename: 'aws_ecr_repository.service["orders"]',
  module: "module.orders_repo.aws_ecr_repository.this",
};
export const CHANGE_LABEL: Record<Change, string> = {
  rename: "Rename it into a for_each",
  module: "Move it into a module",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function codeHtml(s: MovedState) {
  const to = NEW[s.change];
  const moved = s.moved
    ? `<div class="mv-file"><b>moved.tf</b><pre>moved {\n  from = ${esc(OLD)}\n  to   = ${esc(to)}\n}</pre></div>`
    : `<div class="mv-file mv-none"><b>moved.tf</b><p>No moved block. Terraform has no way to know the two addresses are the same repository.</p></div>`;
  return `<div class="mv-col"><h3>Your code</h3><small>the address changed</small>` +
    `<div class="chip"><i></i><span><s>${esc(OLD)}</s></span></div>` +
    `<div class="chip add"><i></i><span>${esc(to)}</span></div>${moved}</div>`;
}

function worldHtml(s: MovedState) {
  const to = NEW[s.change];
  let state: string;
  let aws: string;
  if (!s.applied) {
    state = `<div class="chip"><i></i><span>${esc(OLD)}</span></div>`;
    aws = `<div class="chip"><i></i><span>quickcart-orders</span><span class="orphan mv-ok">every image of the orders service</span></div>`;
  } else if (s.moved) {
    state = `<div class="chip chg new"><i></i><span>${esc(to)}</span><span class="orphan">address updated</span></div>`;
    aws = `<div class="chip"><i></i><span>quickcart-orders</span><span class="orphan mv-ok">untouched, images kept</span></div>`;
  } else {
    state = `<div class="chip add new"><i></i><span>${esc(to)}</span><span class="orphan mv-ok">new</span></div>`;
    aws = `<div class="chip lost new"><i></i><span><s>quickcart-orders</s></span><span class="orphan">deleted with every image</span></div>` +
      `<div class="chip add new"><i></i><span>quickcart-orders</span><span class="orphan mv-ok">new and empty</span></div>`;
  }
  return `<div class="mv-col"><h3>State file</h3><small>what Terraform remembers</small>${state}</div>` +
    `<div class="mv-col"><h3>AWS</h3><small>what really exists</small>${aws}</div>`;
}

export function movedStage(s: MovedState) {
  return codeHtml(s) + worldHtml(s);
}

export function movedPlan(s: MovedState) {
  if (s.applied) {
    return '<span class="d">$ terraform apply</span>\n\n' + (s.moved
      ? 'Apply complete! Resources: <span class="p">0 added, 0 changed, 0 destroyed.</span>'
      : '<span class="m">aws_ecr_repository.orders: Destroying... [id=quickcart-orders]</span>\n<span class="p">' + esc(NEW[s.change]) + ': Creating...</span>\n\nApply complete! Resources: <span class="p">1 added</span>, 0 changed, <span class="m">1 destroyed</span>.');
  }
  const to = esc(NEW[s.change]);
  const head = '<span class="d">$ terraform plan</span>\n\n';
  if (s.moved) {
    return head + `  # ${esc(OLD)} has moved to ${to}\n    resource "aws_ecr_repository" "${s.change === "rename" ? "service" : "this"}" {\n        id   = "quickcart-orders"\n        name = "quickcart-orders"\n        <span class="d"># (8 unchanged attributes hidden)\n\n        # (2 unchanged blocks hidden)</span>\n    }\n\nPlan: <span class="p">0 to add, 0 to change, 0 to destroy.</span>`;
  }
  return head + `<span class="m">  # ${esc(OLD)} will be destroyed\n  # (because ${esc(OLD)} is not in configuration)\n  - resource "aws_ecr_repository" "orders" {</span>\n\n<span class="p">  # ${to} will be created\n  + resource "aws_ecr_repository" "${s.change === "rename" ? "service" : "this"}" {</span>\n\nPlan: <span class="p">1 to add</span>, 0 to change, <span class="m">1 to destroy</span>.`;
}

export function movedSay(s: MovedState): { html: string; tone: "" | "good" | "bad" } {
  const what = s.change === "rename"
    ? "Maya changed the resource's address to fit a <code>for_each</code>. The repository in AWS is exactly the same one."
    : "Maya moved the resource into a module, so its address gained <code>module.orders_repo</code>. The repository in AWS is exactly the same one.";
  if (!s.applied && !s.moved) {
    return { html: `<span class="step-l">Plan, without a moved block</span>${what} But Terraform only compares addresses. The old one is gone from the code, so it plans to <b>destroy</b> it. The new one isn't in state, so it plans to <b>create</b> it.`, tone: "bad" };
  }
  if (!s.applied) {
    return { html: `<span class="step-l">Plan, with a moved block</span>${what} The <code>moved</code> block tells Terraform the old address and the new one are the same thing. The plan changes nothing in AWS.`, tone: "good" };
  }
  if (s.moved) {
    return { html: `<span class="step-l">After apply</span>Only the state changed: the record now sits under the new address. AWS was never touched, and every image is still there.`, tone: "good" };
  }
  return { html: `<span class="step-l">After apply</span>Terraform deleted the repository and every image in it, then made a new, empty one with the same name. A tidy-up in the code became data loss. For a database, this is the worst day of the year.`, tone: "bad" };
}
