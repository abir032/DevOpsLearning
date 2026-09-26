/*
 * The model behind the "virtual machines vs containers" stack visual.
 * The same layout feeds the flat SVG (built at build time and in the
 * browser) and the 3D scene, so both always show exactly the same thing.
 */

export type Mode = "vm" | "ctr";
export type Kind = "hw" | "host" | "hyp" | "rt" | "guest" | "lib" | "app";

export interface Layer {
  key: string;      // stable id, so the 3D scene can animate a layer that stays
  kind: Kind;
  label: string;
  sub?: string;     // a second, smaller line
  x: number;        // left edge, in stack units
  y: number;        // bottom edge, in stack units
  w: number;
  h: number;
}

export const MAX_APPS = 4;
const COL = 1.6;      // width of one app's column
const GAP = 0.2;
const H: Record<Kind, number> = { hw: 0.6, host: 0.6, hyp: 0.6, rt: 0.6, guest: 1.1, lib: 0.45, app: 0.45 };
const APP_NAMES = ["Orders", "Menu", "Payments", "Delivery"];

export const stackWidth = (apps: number) => apps * (COL + GAP) + GAP;
export const stackHeight = (mode: Mode) => mode === "vm" ? 3.8 : 2.7;

export function layers(mode: Mode, apps: number): Layer[] {
  const W = stackWidth(apps);
  const x0 = -W / 2;
  const out: Layer[] = [];
  let y = 0;
  const full = (key: string, kind: Kind, label: string, sub?: string) => {
    out.push({ key, kind, label, sub, x: x0, y, w: W, h: H[kind] });
    y += H[kind];
  };
  full("hw", "hw", "Hardware", "one physical server");
  full("host", "host", "Host operating system", mode === "ctr" ? "one kernel, shared by every container" : undefined);
  if (mode === "vm") full("hyp", "hyp", "Hypervisor", "splits the server into virtual machines");
  else full("rt", "rt", "Container runtime", "Docker, containerd");
  for (let i = 0; i < apps; i++) {
    const cx = x0 + GAP + i * (COL + GAP);
    let cy = y;
    const col = (kind: Kind, label: string, sub?: string) => {
      out.push({ key: `${kind}-${i}`, kind, label, sub, x: cx, y: cy, w: COL, h: H[kind] });
      cy += H[kind];
    };
    if (mode === "vm") col("guest", "Guest OS", "its own kernel");
    col("lib", "Libraries");
    col("app", APP_NAMES[i]);
  }
  return out;
}

export interface Facts { oses: string; carries: string; start: string; isolation: string }

export function facts(mode: Mode, apps: number): Facts {
  return mode === "vm"
    ? {
        oses: `${apps + 1}: the host, plus one guest OS per app`,
        carries: "a whole operating system: gigabytes",
        start: "about a minute: it boots an operating system",
        isolation: "strong: every VM has its own kernel",
      }
    : {
        oses: "1: every container shares the host's kernel",
        carries: "only its libraries and code: megabytes",
        start: "about a second: it starts a process",
        isolation: "good, but one kernel is shared",
      };
}

/* ---------------- the flat SVG ---------------- */

const S = 72;          // px per stack unit
const VW = 600, VH = 330, BASE = 312;
const DX = 12, DY = -9; // the top face, drawn as a slanted strip for depth

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function svgInner(mode: Mode, apps: number): string {
  const ls = layers(mode, apps);
  const px = (u: number) => VW / 2 + u * S;
  const py = (u: number) => BASE - u * S;
  let g = "";
  for (const l of ls) {
    const x = px(l.x), y = py(l.y + l.h), w = l.w * S, h = l.h * S;
    const top = `M${x} ${y} l${DX} ${DY} h${w} l${-DX} ${-DY} z`;
    const side = `M${x + w} ${y} l${DX} ${DY} v${h} l${-DX} ${-DY} z`;
    const cx = x + w / 2;
    const narrow = l.w < 3;
    const lsz = narrow ? 13 : 14;
    const text = l.sub
      ? `<text class="cs-t" x="${cx}" y="${y + h / 2 - 2}" text-anchor="middle" font-size="${lsz}">${esc(l.label)}</text>` +
        `<text class="cs-s" x="${cx}" y="${y + h / 2 + 14}" text-anchor="middle">${esc(l.sub)}</text>`
      : `<text class="cs-t" x="${cx}" y="${y + h / 2 + 5}" text-anchor="middle" font-size="${lsz}">${esc(l.label)}</text>`;
    g += `<g class="cs-l k-${l.kind}" data-layer="${l.kind}"><path class="cs-top" d="${top}"/><path class="cs-side" d="${side}"/>` +
      `<rect class="cs-front" x="${x}" y="${y}" width="${w}" height="${h}"/>${text}</g>`;
  }
  return g;
}

export const SVG_VIEWBOX = `0 0 ${VW} ${VH}`;
