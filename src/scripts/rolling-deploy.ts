/*
 * The model behind the "rolling deploy under load" visual. Deterministic:
 * the same three switches always give the same failed-request count, so the
 * lesson and the tests can rely on it.
 */

export type TaskId = "v1a" | "v1b" | "v2a" | "v2b";
export type TaskState = "off" | "start" | "warm" | "ready" | "drain" | "stop" | "gone";
export type Wire = "on" | "bad" | "off";

export interface Fixes { ready: boolean; drain: boolean; graceful: boolean }

export interface Step {
  label: string;
  tasks: Record<TaskId, TaskState>;
  wires: Record<TaskId, Wire>;
  sent: number;      // requests sent during this step
  failed: number;    // of which failed
  log?: string;      // what load.py would print
  say: string;
  tone: "" | "good" | "bad";
}

export const STATE_TEXT: Record<TaskState, string> = {
  off: "not started",
  start: "starting",
  warm: "app still loading",
  ready: "healthy, in service",
  drain: "draining",
  stop: "stopping",
  gone: "stopped",
};

const T = (v1: TaskState, v2: TaskState): Record<TaskId, TaskState> => ({ v1a: v1, v1b: v1, v2a: v2, v2b: v2 });
const W = (v1: Wire, v2: Wire): Record<TaskId, Wire> => ({ v1a: v1, v1b: v1, v2a: v2, v2b: v2 });

export function steps(f: Fixes): Step[] {
  const out: Step[] = [];
  out.push({
    label: "Before the release", tasks: T("ready", "off"), wires: W("on", "off"), sent: 0, failed: 0, tone: "",
    say: "Two <b>v1</b> tasks share about ten requests a second. Set the three fixes, then choose <b>Release v2</b>.",
  });
  out.push({
    label: "Step 1 of 6: two v2 tasks start", tasks: T("ready", "start"), wires: W("on", "off"), sent: 50, failed: 0, tone: "",
    say: "ECS starts two <b>new</b> tasks before touching the old ones. <b>Min running tasks 100%</b> forbids removing a v1 task yet; <b>max 200%</b> allows four at once.",
  });
  out.push(f.ready
    ? {
        label: "Step 2 of 6: the new tasks boot", tasks: T("ready", "warm"), wires: W("on", "off"), sent: 100, failed: 0, tone: "",
        say: "The health check calls <code>/health</code>, which only answers once the app can really serve orders. Until it passes twice in a row, the load balancer sends the new tasks <b>nothing</b>.",
      }
    : {
        label: "Step 2 of 6: the new tasks boot", tasks: T("ready", "warm"), wires: W("on", "bad"), sent: 100, failed: 6, tone: "bad",
        log: "FAILED with HTTP 500 (6 times)",
        say: "The health check only asks whether the web server answers, and it does, while the app is <b>still loading</b>. The load balancer counts the tasks healthy and sends them real orders. <b>6 requests fail.</b>",
      });
  out.push({
    label: "Step 3 of 6: the new tasks join", tasks: T("ready", "ready"), wires: W("on", "on"), sent: 100, failed: 0, tone: "",
    say: "Both v2 tasks pass their health checks and join the target group. For a moment, all four tasks share the traffic.",
  });
  out.push(f.drain
    ? {
        label: "Step 4 of 6: the old tasks leave the load balancer", tasks: T("drain", "ready"), wires: W("off", "on"), sent: 100, failed: 0, tone: "",
        say: "ECS takes the v1 tasks out of the target group. The load balancer sends them no <b>new</b> requests, and gives the ones already running up to <b>30 seconds</b> to finish: the deregistration delay.",
      }
    : {
        label: "Step 4 of 6: the old tasks leave the load balancer", tasks: T("stop", "ready"), wires: W("bad", "on"), sent: 100, failed: 4, tone: "bad",
        log: "FAILED with HTTP 502 (4 times)",
        say: "With a deregistration delay of 0, ECS moves straight on to stopping the v1 tasks. But the load balancer takes a few seconds to stop routing to them, so requests still arrive at tasks that are shutting down. <b>4 requests fail.</b>",
      });
  let stop: Step;
  if (f.graceful) {
    stop = {
      label: "Step 5 of 6: the old tasks get SIGTERM", tasks: T("stop", "ready"), wires: W("off", "on"), sent: 100, failed: 0, tone: "",
      say: f.drain
        ? "ECS sends <b>SIGTERM</b>. gunicorn hears it, finishes anything in progress, and exits in under a second."
        : "ECS sends <b>SIGTERM</b>. gunicorn hears it and <b>finishes the requests it's in the middle of</b> before exiting, so none of those are lost.",
    };
  } else if (!f.drain) {
    stop = {
      label: "Step 5 of 6: the old tasks get SIGTERM", tasks: T("stop", "ready"), wires: W("bad", "on"), sent: 100, failed: 3, tone: "bad",
      log: "FAILED with HTTP 502 (3 times)",
      say: "The app doesn't shut down cleanly: it dies the moment it's told to stop, with requests <b>half answered</b>. Nothing drained them first. <b>3 requests fail.</b>",
    };
  } else {
    stop = {
      label: "Step 5 of 6: the old tasks get SIGTERM", tasks: T("stop", "ready"), wires: W("off", "on"), sent: 100, failed: 0, tone: "",
      say: "The app doesn't shut down cleanly, but <b>nothing failed this time</b>: the drain had already emptied it. You got away with it. A request slower than the drain, or a platform that stops and removes at the same moment, like Kubernetes, would fail right here.",
    };
  }
  out.push(stop);
  out.push({
    label: "Step 6 of 6: release finished", tasks: T("gone", "ready"), wires: W("off", "on"), sent: 50, failed: 0, tone: "",
    say: "",
  });
  const total = out.reduce((s, x) => s + x.sent, 0);
  const failed = out.reduce((s, x) => s + x.failed, 0);
  const last = out[out.length - 1];
  const off = [!f.ready && "the readiness check", !f.drain && "the drain", !f.graceful && "graceful shutdown"].filter(Boolean);
  last.tone = failed ? "bad" : "good";
  last.say = failed
    ? `Two v2 tasks, but <b>${failed} of ${total} requests failed</b>. Switched off: ${off.join(", ")}. Turn ${off.length > 1 ? "them" : "it"} back on and release again.`
    : off.length
      ? `Two v2 tasks and <b>0 failed requests</b>, but ${off.join(" and ")} ${off.length > 1 ? "are" : "is"} off. That worked here only because another fix covered for it.`
      : `Two v2 tasks, all ${total} requests answered, <b>0 failed</b>. Each fix closed one of the three moments where a release drops requests.`;
  return out;
}

export function totals(list: Step[], upTo: number) {
  let sent = 0, failed = 0;
  for (let i = 0; i <= upTo; i++) { sent += list[i].sent; failed += list[i].failed; }
  return { sent, ok: sent - failed, failed };
}
