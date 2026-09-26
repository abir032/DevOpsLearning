/*
 * Progress: which lessons the learner has marked done.
 * Stored in localStorage; if that is unavailable (private mode, blocked
 * storage), progress still works for the current visit.
 *
 * Markup hooks:
 *   [data-stop="slug"]                gets .done
 *   [data-progress="a,b,c"]           gets --p (percent) and .part / .full
 *   [data-progress-count]             text "3 of 45"
 *   [data-progress-meter]             width set to the percent done
 *   [data-done-toggle="slug"]         a button that marks the lesson done
 */
const KEY = "ltp-progress-v1";
let memory: Record<string, true> = {};

function read(): Record<string, true> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (v && typeof v.done === "object") memory = v.done;
    }
  } catch { /* fall back to memory */ }
  return memory;
}

function write(done: Record<string, true>) {
  memory = done;
  try { localStorage.setItem(KEY, JSON.stringify({ done })); } catch { /* memory only */ }
}

export function isDone(slug: string): boolean {
  return !!read()[slug];
}

export function setDone(slug: string, value: boolean) {
  const d = { ...read() };
  if (value) d[slug] = true; else delete d[slug];
  write(d);
  applyProgress();
}

export function applyProgress(root: ParentNode = document) {
  const done = read();
  root.querySelectorAll<HTMLElement>("[data-stop]").forEach((el) => {
    el.classList.toggle("done", !!done[el.dataset.stop!]);
  });
  root.querySelectorAll<HTMLElement>("[data-progress]").forEach((el) => {
    const slugs = el.dataset.progress!.split(",").filter(Boolean);
    const n = slugs.filter((s) => done[s]).length;
    const p = slugs.length ? Math.round((n / slugs.length) * 100) : 0;
    el.style.setProperty("--p", p + "%");
    el.classList.toggle("part", n > 0 && n < slugs.length);
    el.classList.toggle("full", slugs.length > 0 && n === slugs.length);
    const lbl = el.querySelector<HTMLElement>("[data-progress-label]");
    if (lbl) lbl.textContent = n ? `${n} of ${slugs.length} done` : "";
  });
  root.querySelectorAll<HTMLElement>("[data-progress-count]").forEach((el) => {
    const total = Number(el.dataset.total || 0);
    const all = (el.dataset.progressCount || "").split(",");
    const n = all.filter((s) => done[s]).length;
    el.textContent = `${n} of ${total}`;
    const meter = el.closest(".rail-foot")?.querySelector<HTMLElement>("[data-progress-meter]");
    if (meter) meter.style.width = (total ? (n / total) * 100 : 0) + "%";
  });
  root.querySelectorAll<HTMLButtonElement>("[data-done-toggle]").forEach((b) => {
    const on = !!done[b.dataset.doneToggle!];
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? "Marked as done" : "Mark as done";
    const msg = b.closest(".done-bar")?.querySelector("p");
    if (msg) msg.textContent = on
      ? "You've marked this lesson as done. Its stop on the route map is filled in. Press again to undo."
      : "Finished the build and the quiz? Mark it done to fill in its stop on the route map.";
  });
}

document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-done-toggle]");
  if (!b) return;
  const slug = b.dataset.doneToggle!;
  setDone(slug, !isDone(slug));
});
