/*
 * Auto scaling: servers under load. The model and the markup, shared by the
 * server render and the browser, so the first paint matches the first state.
 *
 * One "tick" is one step of simulated time. Target tracking aims to keep the
 * average CPU of in-service servers near 50%, within min 2 and max 4.
 */

export type SrvState = "boot" | "grace" | "live" | "gone";
export interface Srv { id: number; zone: "a" | "b"; state: SrvState; age: number }
export type Traffic = "quiet" | "busy" | "rush";

export const MIN = 2;
export const MAX = 4;
export const TARGET = 50;
/* Total CPU the traffic needs, in "percent of one server". */
export const LOAD: Record<Traffic, number> = { quiet: 60, busy: 150, rush: 300 };
export const BOOT_TICKS = 2;
export const GRACE_TICKS = 3;
export const OUT_TICKS = 2; /* how long CPU must stay high before scaling out */
export const IN_TICKS = 4;  /* scaling in is deliberately slower */

export interface Sim {
  traffic: Traffic;
  desired: number;
  servers: Srv[];
  next: number;
  high: number; /* ticks in a row above target */
  low: number;  /* ticks in a row well below target */
}

export function fresh(): Sim {
  return {
    traffic: "quiet", desired: 2, next: 3, high: 0, low: 0,
    servers: [{ id: 1, zone: "a", state: "live", age: 0 }, { id: 2, zone: "b", state: "live", age: 0 }],
  };
}

export const live = (s: Sim) => s.servers.filter((x) => x.state === "live");
export const running = (s: Sim) => s.servers.filter((x) => x.state !== "gone");

export function cpuEach(s: Sim): number {
  const n = live(s).length;
  if (!n) return 100;
  return Math.min(100, Math.round(LOAD[s.traffic] / n));
}

/* The desired capacity target tracking would ask for, clamped to min and max. */
export const wanted = (s: Sim) => Math.max(MIN, Math.min(MAX, Math.ceil(LOAD[s.traffic] / TARGET)));

const label: Record<SrvState, string> = { boot: "Launching", grace: "Grace period", live: "In service", gone: "Terminated" };

export function simHtml(s: Sim): string {
  const cpu = cpuEach(s);
  const zone = (z: "a" | "b") => {
    const list = s.servers.filter((x) => x.zone === z);
    const cards = list.length
      ? list.map((x) => {
          const c = x.state === "live" ? cpu : x.state === "gone" ? 0 : 5;
          const tone = x.state === "live" ? (c > 80 ? "hot" : c > 55 ? "warm" : "ok") : x.state;
          return `<li class="srv ${x.state} ${tone}" data-id="${x.id}">
            <span class="nm">web ${x.id}</span>
            <span class="stt">${label[x.state]}</span>
            <span class="bar" aria-hidden="true"><i style="width:${c}%"></i></span>
            <span class="cpu">${x.state === "live" ? `CPU ${c}%` : x.state === "gone" ? "no longer running" : "no traffic yet"}</span>
          </li>`;
        }).join("")
      : `<li class="none">No servers</li>`;
    return `<div class="zone"><p class="zh">Zone ${z}</p><ul aria-label="Servers in zone ${z}">${cards}</ul></div>`;
  };
  const avg = live(s).length ? cpu : 100;
  return `<dl class="asg-stats">
      <div><dt>Average CPU</dt><dd class="${avg > 60 ? "hi" : ""}">${avg}%</dd></div>
      <div><dt>Target</dt><dd>${TARGET}%</dd></div>
      <div><dt>Desired</dt><dd data-desired>${s.desired}</dd></div>
      <div><dt>In service</dt><dd data-live>${live(s).length}</dd></div>
      <div><dt>Min / max</dt><dd>${MIN} / ${MAX}</dd></div>
    </dl>
    <div class="zones">${zone("a")}${zone("b")}</div>`;
}

/* Which zone gets the next server: the one with fewer running. */
export function pickZone(s: Sim): "a" | "b" {
  const n = (z: string) => running(s).filter((x) => x.zone === z).length;
  return n("a") <= n("b") ? "a" : "b";
}

/* Which server goes when scaling in: from the zone with more, newest first. */
export function pickVictim(s: Sim): Srv | undefined {
  const l = live(s);
  const n = (z: string) => l.filter((x) => x.zone === z).length;
  const z = n("a") > n("b") ? "a" : "b";
  return [...l].filter((x) => x.zone === z).sort((p, q) => q.id - p.id)[0] ?? l[l.length - 1];
}

/* Is anything still moving? When not, the ticking stops. */
export function settled(s: Sim): boolean {
  if (s.servers.some((x) => x.state !== "live")) return false;
  if (running(s).length !== s.desired) return false;
  return wanted(s) === s.desired;
}
