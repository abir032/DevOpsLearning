/*
 * Page lifecycle under Astro's client-side router.
 *
 * With <ClientRouter />, bundled scripts run once for the whole visit, but
 * each click swaps in a new page. So page code registers with onPage(): it
 * runs on the first load and after every navigation. If it returns a
 * function, that runs just before the next swap (remove window listeners,
 * stop timers).
 */
export function onPage(init: () => void | (() => void)) {
  let cleanup: void | (() => void);
  document.addEventListener("astro:page-load", () => {
    cleanup = init();
  });
  document.addEventListener("astro:before-swap", () => {
    if (cleanup) cleanup();
    cleanup = undefined;
  });
}

/* Set up an element once, even if onPage runs again on the same page. */
export function once(el: HTMLElement, key = "ready"): boolean {
  if (el.dataset[key]) return false;
  el.dataset[key] = "1";
  return true;
}
