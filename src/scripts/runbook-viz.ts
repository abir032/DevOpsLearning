/*
 * Data and rendering for the runbook dry run.
 * Teaches: a runbook is only as good as its last timed test. Running it
 * finds the gaps; fixing them is what makes it fast at 3am.
 */

export interface RStep { title: string; draft: { text: string; min: number; find: string; bad: boolean }; fixed: { text: string; min: number; find: string } }

export const STEPS: RStep[] = [
  {
    title: "Confirm the alarm is real",
    draft: { text: "Check the dashboard.", min: 6, bad: true, find: "Which dashboard? The link in the runbook went to one that was deleted months ago. Found the right one by searching." },
    fixed: { text: "Open the quickcart-checkout dashboard (link). Is the 5xx graph above 1%?", min: 2, find: "The link works. The graph shows 5xx at 14%. Real." },
  },
  {
    title: "Check target health",
    draft: { text: "Check the target group.", min: 5, bad: true, find: "There are four target groups. Had to work out which one serves checkout." },
    fixed: { text: "EC2 → Target groups → quickcart-checkout-tg → Targets. Healthy means every target says healthy.", min: 1, find: "Named target group. Two of two healthy, so the load balancer isn't the problem." },
  },
  {
    title: "Find the error in the logs",
    draft: { text: "Look in the logs.", min: 9, bad: true, find: "No query given. Spent nine minutes writing one from memory, under pressure." },
    fixed: { text: "Run the saved Logs Insights query checkout-errors-by-type over the last 30 minutes.", min: 2, find: "Saved query. Top error_type: OperationalError, all at about 3,000 ms." },
  },
  {
    title: "Check what changed",
    draft: { text: "See if anything was deployed.", min: 3, bad: false, find: "Found the deploy history. It worked, but only because the tester knew where to look." },
    fixed: { text: "Check the last two deploys in the pipeline, and CloudTrail for write events in the last hour.", min: 2, find: "A deploy went out 12 minutes before the alarm." },
  },
  {
    title: "Roll back",
    draft: { text: "Roll back the last deploy.", min: 10, bad: true, find: "The on-call role wasn't allowed to start the rollback job. Had to wake someone with more access." },
    fixed: { text: "Run the rollback job with the previous version number. The on-call role has permission — tested today.", min: 3, find: "Rollback job ran with the on-call role. Previous version live." },
  },
  {
    title: "Verify it's fixed",
    draft: { text: "Make sure it works.", min: 4, bad: true, find: "What counts as working? One good request? Guessed, and called it done too early." },
    fixed: { text: "Done when the 5xx alarm is back to OK and the 5xx rate stays under 1% for 5 minutes.", min: 5, find: "Alarm OK, 5xx under 1% for five minutes. Clear, measurable, finished." },
  },
];

export const TARGET = 15;
export type Ver = "draft" | "fixed";

export function total(v: Ver, upto = STEPS.length) {
  return STEPS.slice(0, upto).reduce((a, s) => a + (v === "draft" ? s.draft.min : s.fixed.min), 0);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function listHtml(v: Ver, done: number) {
  return STEPS.map((s, i) => {
    const d = v === "draft" ? s.draft : s.fixed;
    const state = i < done ? ((v === "draft" && s.draft.bad) ? "slow" : "ok") : i === done ? "next" : "todo";
    const mark = state === "slow" ? "Gap found" : state === "ok" ? "Done" : state === "next" ? "Next" : "Not yet";
    return `<li class="rb-s ${state}"><div class="rb-top"><b>${i + 1}. ${esc(s.title)}</b><span class="rb-mark">${mark}${i < done ? ` · ${d.min} min` : ""}</span></div>` +
      `<p class="rb-text">Runbook says: <em>${esc(d.text)}</em></p>` +
      (i < done ? `<p class="rb-find">${esc(d.find)}</p>` : "") + `</li>`;
  }).join("");
}

export function clockHtml(v: Ver, done: number) {
  const t = total(v, done);
  const over = t > TARGET;
  return `<span class="rb-clock${over ? " over" : ""}"><b>${t} min</b> elapsed</span><span class="rb-target">Target: fixed within ${TARGET} minutes of the alarm</span>`;
}

export function sayHtml(v: Ver, done: number): { html: string; tone: "" | "good" | "bad" } {
  const head = (t: string) => `<span class="step-l">${t}</span>`;
  if (done === 0) return { tone: "", html: head(v === "draft" ? "First draft, never tested" : "After the dry run") + (v === "draft" ? "This runbook was written from memory and never run. Press <b>Run next step</b> and time it, as if the alarm had just fired." : "Every gap the dry run found has been fixed. Run it again and compare the time.") };
  const s = STEPS[done - 1];
  const d = v === "draft" ? s.draft : s.fixed;
  if (done === STEPS.length) {
    const t = total(v);
    return t > TARGET
      ? { tone: "bad", html: head(`Finished in ${t} minutes — ${t - TARGET} over target`) + "Five of six steps had a gap: a dead link, a vague instruction, a missing permission. None of them was found until someone actually ran the runbook. Switch to <b>After the dry run</b>." }
      : { tone: "good", html: head(`Finished in ${t} minutes — within target`) + `The same six steps, ${total("draft") - t} minutes faster. Nothing clever changed: exact names, a saved query, a tested permission and a clear finish line. Write today's date in <b>Last tested</b>.` };
  }
  return { tone: v === "draft" && s.draft.bad ? "bad" : "", html: head(`Step ${done} of ${STEPS.length}: ${d.min} min`) + esc(d.find) };
}
