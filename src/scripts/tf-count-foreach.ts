/*
 * Data and rendering for the count vs for_each visual. Used at build time
 * (so the first state is in the HTML) and in the browser.
 *
 * The plan text is real Terraform 1.16 output for aws_sqs_queue, trimmed to
 * the lines that matter.
 */

export type Phase = "start" | "removed" | "applied";

type Kind = "" | "chg" | "lost" | "add";
interface Row { addr: string; name: string; kind: Kind; note?: string }
interface Side { code: string; rows: Row[]; plan: string }

const LIST_ALL = '["orders", "payments", "emails"]';
const LIST_TWO = '["orders", "emails"]';

const SIDES: Record<Phase, { count: Side; each: Side; say: string; tone: "" | "good" | "bad" }> = {
  start: {
    count: {
      code: LIST_ALL,
      rows: [
        { addr: "[0]", name: "orders", kind: "" },
        { addr: "[1]", name: "payments", kind: "" },
        { addr: "[2]", name: "emails", kind: "" },
      ],
      plan: '<span class="d">No changes. Your infrastructure matches the configuration.</span>',
    },
    each: {
      code: LIST_ALL,
      rows: [
        { addr: '["orders"]', name: "orders", kind: "" },
        { addr: '["payments"]', name: "payments", kind: "" },
        { addr: '["emails"]', name: "emails", kind: "" },
      ],
      plan: '<span class="d">No changes. Your infrastructure matches the configuration.</span>',
    },
    say: "Three queues, built twice: once with <code>count</code>, once with <code>for_each</code>. Look at the addresses. <code>count</code> files each queue under a <b>position</b> — 0, 1, 2. <code>for_each</code> files it under its <b>name</b>.",
    tone: "",
  },
  removed: {
    count: {
      code: LIST_TWO,
      rows: [
        { addr: "[0]", name: "orders", kind: "" },
        { addr: "[1]", name: "payments → emails", kind: "chg", note: "replaced" },
        { addr: "[2]", name: "emails", kind: "lost", note: "destroyed" },
      ],
      plan:
        '<span class="c">  # aws_sqs_queue.by_position[1] must be replaced</span>\n' +
        '<span class="m">-/+</span> resource "aws_sqs_queue" "by_position" {\n' +
        '      <span class="c">~ name = "quickcart-payments" -> "quickcart-emails"</span> <span class="m"># forces replacement</span>\n' +
        "    }\n\n" +
        '<span class="m">  # aws_sqs_queue.by_position[2] will be destroyed</span>\n' +
        '<span class="d">  # (because index [2] is out of range for count)</span>\n\n' +
        'Plan: 1 to add, 0 to change, <span class="m">2 to destroy</span>.',
    },
    each: {
      code: LIST_TWO,
      rows: [
        { addr: '["orders"]', name: "orders", kind: "" },
        { addr: '["payments"]', name: "payments", kind: "lost", note: "destroyed" },
        { addr: '["emails"]', name: "emails", kind: "" },
      ],
      plan:
        '<span class="m">  # aws_sqs_queue.by_name["payments"] will be destroyed</span>\n' +
        '<span class="d">  # (because key ["payments"] is not in for_each map)</span>\n\n' +
        'Plan: 0 to add, 0 to change, <span class="m">1 to destroy</span>.',
    },
    say: "You removed <b>payments</b> from the middle of the list. <code>for_each</code> plans exactly that: destroy payments. <code>count</code> sees that position 1 now holds <b>emails</b> and position 2 is gone, so it plans to <b>destroy the real emails queue</b> and rebuild payments' slot as a new, empty emails queue.",
    tone: "bad",
  },
  applied: {
    count: {
      code: LIST_TWO,
      rows: [
        { addr: "[0]", name: "orders", kind: "" },
        { addr: "[1]", name: "emails", kind: "add", note: "brand new, empty" },
      ],
      plan: '<span class="d">Apply complete! Resources: 1 added, 0 changed, 2 destroyed.</span>',
    },
    each: {
      code: LIST_TWO,
      rows: [
        { addr: '["orders"]', name: "orders", kind: "" },
        { addr: '["emails"]', name: "emails", kind: "", note: "untouched" },
      ],
      plan: '<span class="d">Apply complete! Resources: 0 added, 0 changed, 1 destroyed.</span>',
    },
    say: "After apply, both sides list the same two queues. But on the <code>count</code> side, the emails queue is a <b>new</b> one: every email waiting in the old queue went with it. On the <code>for_each</code> side, nothing but payments was touched.",
    tone: "",
  },
};

function side(title: string, sub: string, s: Side, animate: boolean) {
  const rows = s.rows.map((r) =>
    `<div class="chip ${r.kind}${animate && r.kind ? " new" : ""}"><i></i><code class="cf-addr">${r.addr}</code>${r.name}` +
    `${r.note ? `<span class="orphan">${r.note}</span>` : ""}</div>`).join("");
  return `<div class="cf-side"><h3>${title}</h3><small>${sub}</small>` +
    `<div class="cf-code"><span class="d">queues =</span> ${s.code}</div>${rows}` +
    `<pre class="plan-out cf-plan" aria-label="Terraform output for ${title}">${s.plan}</pre></div>`;
}

export function cfHtml(p: Phase, animate = false) {
  const s = SIDES[p];
  return side("count", "tracked by position", s.count, animate) + side("for_each", "tracked by name", s.each, animate);
}

export function cfSay(p: Phase) {
  const label = p === "start" ? "Three queues" : p === "removed" ? "The plan, side by side" : "After apply";
  return `<span class="step-l">${label}</span>${SIDES[p].say}`;
}

export const cfTone = (p: Phase) => SIDES[p].tone;
