/* Light and dark theme. Follows the system until the learner picks one. */
const KEY = "ltp-theme";

export function isDark(): boolean {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function toggleTheme(): void {
  const next = isDark() ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem(KEY, next); } catch { /* private mode: lasts this visit */ }
}

/* Re-apply the saved theme, e.g. after the router swaps in a new page. */
export function applySavedTheme(e?: Event) {
  const doc = (e as any)?.newDocument as Document | undefined;
  let t: string | null = null;
  try { t = localStorage.getItem(KEY); } catch { /* none saved */ }
  if (!t) t = document.documentElement.getAttribute("data-theme");
  const root = (doc ?? document).documentElement;
  if (t === "dark" || t === "light") root.setAttribute("data-theme", t);
}
