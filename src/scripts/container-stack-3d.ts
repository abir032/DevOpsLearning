/*
 * The 3D version of the stack visual. Three.js is loaded here with a dynamic
 * import, only when the visual is on screen, WebGL works and reduced motion
 * is off. The flat SVG stays in the page as the fallback and for screen
 * readers.
 *
 * The scene only renders when something changes: after a toggle (a short
 * tween), while the learner drags to turn it, on resize and on a theme change.
 */
import type * as T from "three";
import { layers, stackHeight, stackWidth, type Kind, type Layer, type Mode } from "./container-stack";

export interface Stack3D {
  show(mode: Mode, apps: number): void;
  dispose(): void;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* ---------- colours, read from the page's tokens so both themes work ---------- */

function hex(v: string): [number, number, number] {
  const m = v.trim().replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const c = (x: number, y: number) => Math.round(x * t + y * (1 - t)).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
interface Palette { face: Record<Kind, string>; text: Record<Kind, string>; sub: string; edge: string }
function palette(root: HTMLElement): Palette {
  const cs = getComputedStyle(root);
  const v = (n: string) => cs.getPropertyValue(n).trim() || "#888888";
  const box = v("--box"), surface = v("--surface"), sunk = v("--sunk"), ink = v("--ink"), warn = v("--warn"), warnBg = v("--warn-bg");
  return {
    face: {
      hw: sunk, host: mix(ink, surface, 0.07), hyp: mix(box, surface, 0.28), rt: mix(box, surface, 0.28),
      guest: warnBg, lib: mix(box, surface, 0.14), app: box,
    },
    text: { hw: ink, host: ink, hyp: ink, rt: ink, guest: warn, lib: ink, app: v("--on-box") },
    sub: v("--ink-2"),
    edge: v("--ink-3"),
  };
}

/* ---------- the scene ---------- */

const DEPTH = 1.5;
const DUR = 650;

interface Item { layer: Layer; group: T.Group; mats: T.Material[]; from: Layer; alpha0: number; alpha1: number; leaving: boolean }

export async function createStack3D(host: HTMLElement, root: HTMLElement, mode: Mode, apps: number): Promise<Stack3D> {
  const THREE = await import("three");
  await document.fonts?.ready;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "cs-canvas";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(3, 8, 6);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const world = new THREE.Group();
  world.rotation.y = -0.42;
  world.rotation.x = 0.06;
  scene.add(world);

  let pal = palette(root);
  let items = new Map<string, Item>();
  let current = { mode, apps };
  let raf = 0;
  let tweenStart = 0;

  /* a text label drawn on a canvas, used as a texture on the front face */
  function label(l: Layer): T.Mesh {
    const scale = 4;
    const main = l.w < 3 ? 13 : 14;
    const font = getComputedStyle(root).fontFamily || "sans-serif";
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    ctx.font = `800 ${main * scale}px ${font}`;
    const w1 = ctx.measureText(l.label).width;
    ctx.font = `600 ${11 * scale}px ${font}`;
    const w2 = l.sub ? ctx.measureText(l.sub).width : 0;
    c.width = Math.ceil(Math.max(w1, w2) + 8 * scale);
    c.height = Math.ceil((l.sub ? 34 : 20) * scale);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = pal.text[l.kind];
    ctx.font = `800 ${main * scale}px ${font}`;
    ctx.fillText(l.label, c.width / 2, (l.sub ? 11 : 10.5) * scale);
    if (l.sub) {
      ctx.fillStyle = l.kind === "guest" ? pal.text.guest : pal.sub;
      ctx.font = `600 ${11 * scale}px ${font}`;
      ctx.fillText(l.sub, c.width / 2, 25 * scale);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    /* a little larger than the flat view, because the 3D stack is further away */
    const pw = c.width / scale / 60, ph = c.height / scale / 60;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
    return mesh;
  }

  function build(l: Layer): Item {
    const group = new THREE.Group();
    const faceMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.face[l.kind]), transparent: true });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), faceMat);
    box.name = "box";
    const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(pal.edge), transparent: true });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), edgeMat);
    edges.name = "edges";
    const text = label(l);
    text.name = "label";
    group.add(box, edges, text);
    return { layer: l, group, mats: [faceMat, edgeMat, text.material as T.Material], from: l, alpha0: 1, alpha1: 1, leaving: false };
  }

  /* place one item part-way between where it was and where it is going */
  function place(it: Item, k: number) {
    const a = it.from, b = it.layer;
    const lerp = (p: number, q: number) => p + (q - p) * k;
    const x = lerp(a.x, b.x), y = lerp(a.y, b.y), w = lerp(a.w, b.w), h = lerp(a.h, b.h);
    const box = it.group.getObjectByName("box")!, edges = it.group.getObjectByName("edges")!, text = it.group.getObjectByName("label")!;
    box.scale.set(w - 0.02, h - 0.02, DEPTH);
    edges.scale.set(w + 0.004, h + 0.004, DEPTH + 0.004);
    it.group.position.set(x + w / 2, y + h / 2, 0);
    text.position.set(0, 0, DEPTH / 2 + 0.005);
    const alpha = lerp(it.alpha0, it.alpha1);
    for (const m of it.mats) m.opacity = alpha;
    it.group.visible = alpha > 0.01;
  }

  /* the camera frames the stack as it is now, so a phone still shows it large */
  let fitFrom = { w: stackWidth(apps), h: stackHeight(mode) };
  let fitTo = { ...fitFrom };
  function fit(k: number) {
    const W = fitFrom.w + (fitTo.w - fitFrom.w) * k + 0.5;
    const H = fitFrom.h + (fitTo.h - fitFrom.h) * k + 0.7;
    const v = THREE.MathUtils.degToRad(camera.fov / 2);
    const hz = Math.atan(Math.tan(v) * camera.aspect);
    const dist = Math.max((W / 2) / Math.tan(hz), (H / 2) / Math.tan(v)) + DEPTH;
    camera.position.set(0, H / 2 + dist * 0.28, dist);
    camera.lookAt(0, H / 2 - 0.3, 0);
    camera.updateProjectionMatrix();
  }

  function frame() {
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    world.rotation.y = width < 560 ? -0.26 : world.rotation.y;
    fit(1);
  }

  const render = () => renderer.render(scene, camera);

  function tick(now: number) {
    const k0 = Math.min(1, (now - tweenStart) / DUR);
    const k = 1 - Math.pow(1 - k0, 3);
    for (const it of items.values()) place(it, k);
    fit(k);
    render();
    if (k0 < 1) raf = requestAnimationFrame(tick);
    else {
      raf = 0;
      for (const [key, it] of items) if (it.leaving) { world.remove(it.group); disposeItem(it); items.delete(key); }
    }
  }

  function show(m: Mode, n: number, animate = true) {
    current = { mode: m, apps: n };
    fitFrom = { ...fitTo };
    fitTo = { w: stackWidth(n), h: stackHeight(m) };
    const next = layers(m, n);
    const seen = new Set<string>();
    for (const l of next) {
      seen.add(l.key);
      const it = items.get(l.key);
      if (it) {
        it.from = { ...it.layer }; it.layer = l;
        it.alpha0 = it.leaving ? 0 : 1; it.alpha1 = 1; it.leaving = false;
      } else {
        const fresh = build(l);
        fresh.from = { ...l, y: l.y + 1.6 };
        fresh.alpha0 = 0; fresh.alpha1 = 1;
        items.set(l.key, fresh);
        world.add(fresh.group);
      }
    }
    for (const [key, it] of items) {
      if (seen.has(key)) continue;
      it.from = { ...it.layer }; it.layer = { ...it.layer, y: it.layer.y + 1.6 };
      it.alpha0 = 1; it.alpha1 = 0; it.leaving = true;
    }
    if (!animate) {
      for (const it of items.values()) { it.from = it.layer; it.alpha0 = it.alpha1; place(it, 1); }
      for (const [key, it] of items) if (it.leaving) { world.remove(it.group); disposeItem(it); items.delete(key); }
      fitFrom = { ...fitTo };
      fit(1);
      render();
      return;
    }
    tweenStart = performance.now();
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function disposeItem(it: Item) {
    it.group.traverse((o) => {
      const mesh = o as T.Mesh;
      mesh.geometry?.dispose();
    });
    for (const m of it.mats) {
      const map = (m as T.MeshBasicMaterial).map;
      if (map) map.dispose();
      m.dispose();
    }
  }

  /* rebuild every layer in the new theme's colours, without animating */
  function repaint() {
    pal = palette(root);
    for (const it of items.values()) { world.remove(it.group); disposeItem(it); }
    items = new Map();
    show(current.mode, current.apps, false);
  }

  /* drag to turn it: motion only while the learner is moving it */
  let drag: { x: number; y: number; ry: number; rx: number } | null = null;
  const el = renderer.domElement;
  const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY, ry: world.rotation.y, rx: world.rotation.x }; el.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    world.rotation.y = THREE.MathUtils.clamp(drag.ry + (e.clientX - drag.x) * 0.008, -1.1, 1.1);
    world.rotation.x = THREE.MathUtils.clamp(drag.rx + (e.clientY - drag.y) * 0.004, -0.1, 0.45);
    if (!raf) render();
  };
  const up = () => { drag = null; };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  const ro = new ResizeObserver(() => { frame(); render(); });
  ro.observe(host);
  const mo = new MutationObserver(repaint);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", repaint);

  frame();
  show(mode, apps, false);

  return {
    show: (m, n) => show(m, n, true),
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", repaint);
      for (const it of items.values()) disposeItem(it);
      renderer.dispose();
      el.remove();
    },
  };
}
