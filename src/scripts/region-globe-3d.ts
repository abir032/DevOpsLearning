/*
 * The 3D globe for the regions-and-zones visual.
 *
 * Loaded only when the visual scrolls into view, WebGL works and reduced
 * motion is off. Three.js itself is imported inside mount(), so no page
 * downloads it unless this runs. It draws only when something changes:
 * after a drag, a resize, a theme change or a zone failing.
 */
import { LAND_2, landRuns, REGIONS, ZONES, ZONE_SPOTS, type Zone } from "./region-globe-data";

export interface GlobeState {
  used: Set<Zone>;
  failed: Set<Zone>;
}

export interface Globe {
  update(s: GlobeState, focus?: boolean): void;
  dispose(): void;
}

/* True when this browser can make a WebGL context at all. */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const HOME = REGIONS[0]; /* us-east-1 */
const RAD = Math.PI / 180;

export async function mount(host: HTMLElement, label: HTMLElement, first: GlobeState): Promise<Globe> {
  const THREE = await import("three");

  const token = (n: string) => getComputedStyle(host).getPropertyValue(n).trim() || "#888888";
  const toXYZ = (lat: number, lon: number, r = 1) =>
    new THREE.Vector3(r * Math.cos(lat * RAD) * Math.sin(lon * RAD), r * Math.sin(lat * RAD), r * Math.cos(lat * RAD) * Math.cos(lon * RAD));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "rg-canvas";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 0, 4.4);

  const globe = new THREE.Group();
  scene.add(globe);

  /* The sea: a plain sphere that also hides everything on the far side. */
  const seaMat = new THREE.MeshBasicMaterial();
  const sea = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), seaMat);
  globe.add(sea);

  /* The land: one dot per 2° cell of land. */
  const pts: number[] = [];
  for (const [r, s, n] of landRuns(LAND_2)) {
    const lat = 90 - LAND_2.step / 2 - r * LAND_2.step;
    for (let c = s; c < s + n; c++) {
      const v = toXYZ(lat, -180 + LAND_2.step / 2 + c * LAND_2.step, 1.004);
      pts.push(v.x, v.y, v.z);
    }
  }
  const landGeo = new THREE.BufferGeometry();
  landGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const landMat = new THREE.PointsMaterial({ size: 2.6 * dpr, sizeAttenuation: false, transparent: true, opacity: 0.6 });
  globe.add(new THREE.Points(landGeo, landMat));

  /* The regions. */
  const dotGeo = new THREE.SphereGeometry(0.024, 16, 12);
  const regionMat = new THREE.MeshBasicMaterial();
  for (const r of REGIONS.slice(1)) {
    const m = new THREE.Mesh(dotGeo, regionMat);
    m.position.copy(toXYZ(r.lat, r.lon, 1.01));
    globe.add(m);
  }

  /* us-east-1: a ring around it, and its three zones. */
  const ringMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.115, 48), ringMat);
  const home = toXYZ(HOME.lat, HOME.lon, 1.012);
  ring.position.copy(home);
  ring.lookAt(home.clone().multiplyScalar(2));
  globe.add(ring);

  const zoneGeo = new THREE.SphereGeometry(0.034, 20, 16);
  const zoneMats = {} as Record<Zone, InstanceType<typeof THREE.MeshBasicMaterial>>;
  const zoneMesh = {} as Record<Zone, InstanceType<typeof THREE.Mesh>>;
  for (const z of ZONES) {
    zoneMats[z] = new THREE.MeshBasicMaterial();
    zoneMesh[z] = new THREE.Mesh(zoneGeo, zoneMats[z]);
    zoneMesh[z].position.copy(toXYZ(ZONE_SPOTS[z].lat, ZONE_SPOTS[z].lon, 1.014));
    globe.add(zoneMesh[z]);
  }

  /* Face us-east-1 to start with, tipped a little so the north shows. */
  const faceYaw = -HOME.lon * RAD;
  const facePitch = HOME.lat * RAD * 0.8;
  let yaw = faceYaw;
  let pitch = facePitch;
  let state = first;

  function paint() {
    seaMat.color.set(token("--sunk"));
    landMat.color.set(token("--ink-3"));
    regionMat.color.set(token("--ink-3"));
    ringMat.color.set(token("--cloud"));
    for (const z of ZONES) {
      zoneMats[z].color.set(token(state.failed.has(z) ? "--bad" : state.used.has(z) ? "--ok" : "--cloud"));
    }
  }

  function draw() {
    globe.rotation.set(pitch, yaw, 0, "XYZ");
    renderer.render(scene, camera);
    /* Keep the HTML label next to us-east-1, and hide it round the back. */
    const p = home.clone().applyEuler(globe.rotation);
    const facing = p.z > 0.2;
    const s = p.clone().project(camera);
    const w = host.clientWidth, h = host.clientHeight;
    label.style.transform = `translate(${((s.x + 1) / 2) * w + 14}px, ${((1 - s.y) / 2) * h - 12}px)`;
    label.style.opacity = facing ? "1" : "0";
  }

  function size() {
    const w = host.clientWidth;
    const h = host.clientHeight || w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    draw();
  }

  /* Drag to turn the globe. */
  let drag: { x: number; y: number; yaw: number; pitch: number } | null = null;
  const el = renderer.domElement;
  const down = (e: PointerEvent) => {
    drag = { x: e.clientX, y: e.clientY, yaw, pitch };
    el.setPointerCapture(e.pointerId);
    el.classList.add("grabbing");
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    yaw = drag.yaw + (e.clientX - drag.x) * 0.008;
    pitch = Math.max(-1.2, Math.min(1.2, drag.pitch + (e.clientY - drag.y) * 0.008));
    draw();
  };
  const up = () => {
    drag = null;
    el.classList.remove("grabbing");
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  /* Short animations, only ever started by the learner's action. */
  let raf = 0;
  function turnHome(then?: () => void) {
    cancelAnimationFrame(raf);
    const y0 = yaw, p0 = pitch, t0 = performance.now();
    /* Take the short way round. */
    let dy = (faceYaw - y0) % (Math.PI * 2);
    if (dy > Math.PI) dy -= Math.PI * 2;
    if (dy < -Math.PI) dy += Math.PI * 2;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      yaw = y0 + dy * e;
      pitch = p0 + (facePitch - p0) * e;
      draw();
      if (k < 1) raf = requestAnimationFrame(step);
      else if (then) then();
    };
    raf = requestAnimationFrame(step);
  }
  function pulse(zones: Zone[]) {
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1200);
      const sc = 1 + Math.sin(k * Math.PI * 3) ** 2 * 0.9 * (1 - k);
      for (const z of zones) zoneMesh[z].scale.setScalar(sc);
      draw();
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  const ro = new ResizeObserver(size);
  ro.observe(host);

  /* Follow theme changes: the toggle sets data-theme; the system can change too. */
  const repaint = () => { paint(); draw(); };
  const mo = new MutationObserver(repaint);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", repaint);

  paint();
  size();

  return {
    update(s, focus = false) {
      const newlyFailed = ZONES.filter((z) => s.failed.has(z) && !state.failed.has(z));
      state = { used: new Set(s.used), failed: new Set(s.failed) };
      paint();
      if (focus && newlyFailed.length) turnHome(() => pulse(newlyFailed));
      else draw();
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", repaint);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      scene.traverse((o) => {
        const m = o as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void } };
        m.geometry?.dispose();
        m.material?.dispose();
      });
      renderer.dispose();
      el.remove();
    },
  };
}
