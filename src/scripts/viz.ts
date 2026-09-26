/* Shared helpers for the interactive visuals. */

export const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* Pause between narrated steps. Longer when motion is reduced, because the
   dot jumps instead of travelling and the reader needs time to read. */
export const beat = (ms: number) => sleep(reduced() ? Math.max(ms, 700) : ms);

/* Write the narration line. It sits in an aria-live region, so screen
   readers hear each step as it happens. */
export function tell(say: HTMLElement, step: string, html: string, tone: "" | "good" | "bad" = "") {
  say.className = "viz-say" + (tone ? " " + tone : "");
  say.innerHTML = `<span class="step-l">${step}</span>${html}`;
}

type Pt = [number, number];

/* Move an SVG circle along a path of points. With reduced motion it jumps
   straight to the end. */
export function moveDot(dot: SVGCircleElement, pts: Pt[], speed = 260): Promise<void> {
  dot.setAttribute("opacity", "1");
  if (reduced()) {
    const p = pts[pts.length - 1];
    dot.setAttribute("cx", String(p[0]));
    dot.setAttribute("cy", String(p[1]));
    return sleep(200);
  }
  const segs: [Pt, Pt, number][] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push([pts[i - 1], pts[i], d]);
    total += d;
  }
  const dur = (total / speed) * 1000;
  return new Promise((res) => {
    let t0: number | null = null;
    function frame(ts: number) {
      t0 ??= ts;
      const dist = Math.min(1, (ts - t0) / dur) * total;
      let acc = 0;
      for (let j = 0; j < segs.length; j++) {
        const [a, b, len] = segs[j];
        if (dist <= acc + len || j === segs.length - 1) {
          const k = len ? Math.min(1, (dist - acc) / len) : 1;
          dot.setAttribute("cx", String(a[0] + (b[0] - a[0]) * k));
          dot.setAttribute("cy", String(a[1] + (b[1] - a[1]) * k));
          break;
        }
        acc += len;
      }
      if (dist < total) requestAnimationFrame(frame); else res();
    }
    requestAnimationFrame(frame);
  });
}

/* Set aria-pressed on a segmented control. */
export function press(group: Iterable<HTMLElement>, on: (b: HTMLElement) => boolean) {
  for (const b of group) b.setAttribute("aria-pressed", String(on(b)));
}
