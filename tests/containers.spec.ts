/*
 * Modules 07 and 08: containers and running containers.
 * Drives the main path of every visual in these lessons, and runs axe on
 * each lesson page in both themes.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function reduced(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

/* ---------------- images and containers: the VM vs container stack ---------------- */

test.describe("container stack", () => {
  test("fallback: with reduced motion the flat stack teaches it, and every control works", async ({ page }) => {
    await reduced(page);
    await page.goto("/lessons/images-and-containers/");
    const viz = page.locator('[data-viz="container-stack"]');
    await viz.scrollIntoViewIfNeeded();
    await expect(viz).toHaveAttribute("data-3d", "fallback");
    await expect(viz.locator("canvas")).toHaveCount(0);
    await expect(viz.locator(".cs-flat svg")).toBeVisible();
    await expect(viz.locator('[data-layer="guest"]')).toHaveCount(3);
    await expect(viz.locator('[data-layer="hyp"]')).toHaveCount(1);

    await viz.getByRole("button", { name: "Containers" }).click();
    await expect(viz.getByRole("button", { name: "Containers" })).toHaveAttribute("aria-pressed", "true");
    await expect(viz.locator('[data-layer="guest"]')).toHaveCount(0);
    await expect(viz.locator('[data-layer="rt"]')).toHaveCount(1);
    await expect(viz.locator('[data-f="oses"]')).toContainText("shares the host's kernel");
    await expect(viz.locator(".viz-say")).toContainText("guest operating systems are gone");
    await expect(viz.locator("title")).toContainText("no guest operating system");

    // keyboard: add a fourth app
    await viz.getByRole("button", { name: "Add an app" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.locator('[data-layer="lib"]')).toHaveCount(4);
    await expect(viz.getByRole("button", { name: "Add an app" })).toBeDisabled();

    // back to virtual machines: four apps means four guest operating systems
    await viz.getByRole("button", { name: "Virtual machines" }).press("Space");
    await expect(viz.locator('[data-layer="guest"]')).toHaveCount(4);
    await expect(viz.locator('[data-f="oses"]')).toContainText("5:");

    await viz.getByRole("button", { name: "Reset" }).click();
    await expect(viz.locator('[data-layer="guest"]')).toHaveCount(3);
    await expect(viz.getByRole("button", { name: "Add an app" })).toBeEnabled();
  });

  test("3D loads only when on screen, and the view can switch back to flat", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const threeRequests: string[] = [];
    page.on("request", (r) => { if (/three\.module/.test(r.url())) threeRequests.push(r.url()); });
    await page.goto("/lessons/images-and-containers/");
    const viz = page.locator('[data-viz="container-stack"]');
    // not on screen yet: Three.js has not been downloaded
    expect(threeRequests).toEqual([]);
    await viz.scrollIntoViewIfNeeded();
    await expect(viz).toHaveAttribute("data-3d", /^(on|fallback)$/, { timeout: 15_000 });
    if ((await viz.getAttribute("data-3d")) === "on") {
      expect(threeRequests.length).toBeGreaterThan(0);
      await expect(viz.locator("canvas")).toBeVisible();
      await expect(viz.getByRole("group", { name: "View" })).toBeVisible();
      await viz.getByRole("button", { name: "Containers" }).click();
      await expect(viz.locator('[data-f="start"]')).toContainText("about a second");
      await viz.getByRole("button", { name: "Flat" }).click();
      await expect(viz).toHaveAttribute("data-3d", "flat");
      await expect(viz.locator(".cs-flat svg")).toBeVisible();
      await expect(viz.locator('[data-layer="guest"]')).toHaveCount(0);
    } else {
      // no WebGL in this browser: the flat stack is the whole visual
      await expect(viz.locator(".cs-flat svg")).toBeVisible();
    }
  });

  test("on a phone it starts flat, so the labels stay readable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/lessons/images-and-containers/");
    const viz = page.locator('[data-viz="container-stack"]');
    await viz.scrollIntoViewIfNeeded();
    await expect(viz).toHaveAttribute("data-3d", /^(flat|fallback)$/, { timeout: 15_000 });
    await expect(viz.locator(".cs-flat svg")).toBeVisible();
  });
});

/* ---------------- Dockerfile layer cache, and volumes ---------------- */

test.describe("containers: Dockerfile and volumes visuals", () => {
  test("layer cache: code edit reuses pip install in good order, reruns it in bad order", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/dockerfile/");
    const viz = page.locator('[data-viz="layer-cache"]');
    const say = viz.locator(".viz-say");
    const pip = viz.locator(".lc-row", { hasText: "RUN pip install" }).locator(".lc-st");
    await expect(viz.locator(".lc-row")).toHaveCount(9);
    await viz.getByRole("button", { name: "Rebuild" }).click();
    await expect(say).toContainText("1 step ran", { timeout: 10_000 });
    await expect(say).toHaveClass(/good/);
    await expect(pip).toHaveText("CACHED");
    await expect(viz.locator(".lc-secs")).toHaveText("0.5 s");
    // keyboard: switch to the bad order
    await viz.getByRole("button", { name: "Copy everything first" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "Copy everything first" })).toHaveAttribute("aria-pressed", "true");
    await viz.getByRole("button", { name: "Rebuild" }).press("Space");
    await expect(say).toContainText("every step below it runs again", { timeout: 10_000 });
    await expect(say).toHaveClass(/bad/);
    await expect(pip).toContainText("ran again");
    await expect(viz.locator(".lc-secs")).toHaveText("38.6 s");
    await expect(viz.locator(".lc-hist")).toContainText("Copy everything first");
    // nothing edited: all cached
    await viz.getByRole("button", { name: "Nothing" }).click();
    await viz.getByRole("button", { name: "Rebuild" }).click();
    await expect(say).toContainText("everything cached", { timeout: 10_000 });
  });

  test("volume life: orders vanish without a volume and survive with one", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/volumes-and-networking/");
    const viz = page.locator('[data-viz="volume-life"]');
    const say = viz.locator(".viz-say");
    const save = viz.getByRole("button", { name: "Save an order" });
    const remove = viz.getByRole("button", { name: "Remove the container" });
    const start = viz.getByRole("button", { name: "Start a new container" });
    await expect(start).toBeDisabled();
    await save.click();
    await save.click();
    await expect(say).toContainText("2 orders");
    await remove.click();
    await expect(say).toContainText("and its writable layer with it");
    await expect(save).toBeDisabled();
    await start.click();
    await expect(say).toContainText("The database is empty");
    await expect(say).toHaveClass(/bad/);
    // keyboard: switch to a named volume
    await viz.getByRole("button", { name: "In a named volume" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "In a named volume" })).toHaveAttribute("aria-pressed", "true");
    await save.click();
    await save.click();
    await save.click();
    await remove.click();
    await expect(say).toContainText("volume is untouched");
    await start.click();
    await expect(say).toContainText("3 orders are still there");
    await expect(say).toHaveClass(/good/);
    await expect(viz.locator("svg")).toContainText("quickcart-db-2");
  });
});

/* ---------------- ECR tags, and the ECS service ---------------- */

test.describe("ECR and ECS visuals", () => {
  test("ECR tags: a mutable rollback brings back the bug; immutable refuses the overwrite", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/ecr/");
    const viz = page.locator('[data-viz="ecr-tags"]');
    const next = viz.getByRole("button", { name: "Next step" });
    const say = viz.locator(".viz-say");
    while (await next.isEnabled()) await next.click();
    await expect(say).toContainText("The rollback deployed the bug");
    await expect(say).toHaveClass(/bad/);
    await expect(viz.locator(".et-stage")).toContainText("untagged");
    // switch to immutable with the keyboard
    await viz.getByRole("button", { name: "Immutable" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "Immutable" })).toHaveAttribute("aria-pressed", "true");
    await next.press("Enter");
    await next.press("Enter");
    await next.press("Enter");
    await expect(viz.locator(".et-err")).toContainText("cannot be overwritten because the repository is immutable");
    while (await next.isEnabled()) await next.click();
    await expect(say).toContainText("The rollback is exact");
    await expect(say).toHaveClass(/good/);
    await viz.getByRole("button", { name: "Start again" }).click();
    await expect(say).toContainText("An empty repository");
  });

  test("ECS service: a stopped task is replaced; a broken execution role leaves a stopped reason", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/ecs-fargate/");
    const viz = page.locator('[data-viz="ecs-service"]');
    const say = viz.locator(".viz-say");
    const run = viz.locator('[data-n="run"]');
    await expect(run).toHaveText("2");
    await viz.getByRole("button", { name: "Stop a task" }).click();
    await expect(run).toHaveText("1");
    await expect(say).toContainText("Back to desired", { timeout: 15_000 });
    await expect(run).toHaveText("2");
    // raise the desired count with the keyboard
    await viz.getByRole("button", { name: "3", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(viz.locator('[data-n="want"]')).toHaveText("3");
    await expect(run).toHaveText("3", { timeout: 15_000 });
    // break the execution role and lose a task
    await viz.getByRole("button", { name: "No ECR permission" }).click();
    await viz.getByRole("button", { name: "Stop a task" }).click();
    await expect(say).toContainText("could not start", { timeout: 15_000 });
    await expect(viz.locator(".es-stopped")).toContainText("ResourceInitializationError");
    await expect(run).toHaveText("2");
    // fix it and the service recovers
    await viz.getByRole("button", { name: "Working" }).click();
    await expect(run).toHaveText("3", { timeout: 20_000 });
    await viz.getByRole("button", { name: "Reset" }).click();
    await expect(run).toHaveText("2");
  });
});

/* ---------------- rolling deploys, and the reconcile loop ---------------- */

test.describe("rolling deploy", () => {
  test("all three fixes on: zero failed; each fix off drops requests", async ({ page }) => {
    await reduced(page);
    await page.goto("/lessons/zero-downtime-releases/");
    const viz = page.locator('[data-viz="rolling-deploy"]');
    const next = viz.getByRole("button", { name: "Next step" });
    const failed = viz.locator('[data-n="failed"]');
    const run = async () => { while (await next.isEnabled()) await next.click(); };

    await run();
    await expect(viz.locator('[data-n="sent"]')).toHaveText("500");
    await expect(failed).toHaveText("0");
    await expect(viz.locator(".viz-say")).toHaveClass(/good/);
    await expect(viz.locator('[data-t="v1a"]')).toHaveClass(/st-gone/);
    await expect(viz.locator('[data-t="v2a"]')).toHaveClass(/st-ready/);

    // readiness off, switched with the keyboard
    const readyOff = viz.getByRole("group", { name: "Readiness check" }).getByRole("button", { name: "Off" });
    await readyOff.focus();
    await page.keyboard.press("Enter");
    await expect(readyOff).toHaveAttribute("aria-pressed", "true");
    await run();
    await expect(failed).toHaveText("6");
    await expect(viz.locator(".rd-log")).toContainText("HTTP 500");

    // everything off
    await viz.getByRole("group", { name: "Drain (deregistration delay)" }).getByRole("button", { name: "Off" }).click();
    await viz.getByRole("group", { name: "Graceful shutdown" }).getByRole("button", { name: "Off" }).click();
    await run();
    await expect(failed).toHaveText("13");
    await expect(viz.locator(".viz-say")).toHaveClass(/bad/);

    // only graceful off: the drain covers for it
    await viz.getByRole("group", { name: "Readiness check" }).getByRole("button", { name: "On" }).click();
    await viz.getByRole("group", { name: "Drain (deregistration delay)" }).getByRole("button", { name: "On" }).click();
    await run();
    await expect(failed).toHaveText("0");
    await expect(viz.locator(".viz-say")).toContainText("graceful shutdown is off");
  });

  test("Release v2 plays through by itself", async ({ page }) => {
    await reduced(page);
    await page.goto("/lessons/zero-downtime-releases/");
    const viz = page.locator('[data-viz="rolling-deploy"]');
    await viz.getByRole("button", { name: "Release v2" }).click();
    await expect(viz.locator(".viz-say")).toContainText("Step 6 of 6", { timeout: 30_000 });
    await expect(viz.locator('[data-n="failed"]')).toHaveText("0");
  });
});

test.describe("reconcile loop", () => {
  test("a deleted pod is replaced, scaling and a lost node are reconciled", async ({ page }) => {
    await reduced(page);
    await page.goto("/lessons/kubernetes-and-eks/");
    const viz = page.locator('[data-viz="reconcile-loop"]');
    const say = viz.locator(".viz-say");
    const ready = viz.locator(".rl-pod.ph-ready");
    await expect(ready).toHaveCount(2);

    await viz.getByRole("button", { name: "Delete a pod" }).click();
    await expect(say).toContainText("You deleted");
    await expect(say).toContainText("Back to 2 of 2", { timeout: 20_000 });
    await expect(ready).toHaveCount(2);
    await expect(viz.locator(".rl-pod")).toHaveCount(2);
    // the replacement has a new name
    await expect(viz.locator(".rl-pn", { hasText: "c4vnd" })).toHaveCount(1);

    // keyboard: ask for 3 replicas
    await viz.getByRole("button", { name: "3", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(say).toContainText("Back to 3 of 3", { timeout: 20_000 });
    await expect(ready).toHaveCount(3);

    // lose node B: its pods come back on node A
    await viz.getByRole("button", { name: "Stop node B" }).click();
    await expect(say).toContainText("Back to 3 of 3", { timeout: 20_000 });
    await expect(viz.locator('[data-pods="a"] .rl-pod.ph-ready')).toHaveCount(3);
    await expect(viz.locator('[data-node="b"]')).toHaveClass(/down/);

    await viz.getByRole("button", { name: "Reset" }).click();
    await expect(ready).toHaveCount(2);
    await expect(viz.getByRole("button", { name: "Stop node B" })).toBeVisible();
  });
});

/* ---------------- ECS or EKS: the decision helper ---------------- */

test.describe("ECS or EKS decision helper", () => {
  test("answers add up to a recommendation with reasons, and one answer can flip it", async ({ page }) => {
    await reduced(page);
    await page.goto("/lessons/ecs-or-eks/");
    const viz = page.locator('[data-viz="ecs-eks"]');
    const title = viz.locator('[data-n="title"]');
    await expect(title).toHaveText("Answer the questions");

    await viz.getByRole("button", { name: "Fill in QuickCart's answers" }).click();
    await expect(title).toHaveText("ECS on Fargate");
    await expect(viz.locator(".ed-why li")).toHaveCount(6);
    await expect(viz.locator('[data-n="change"]')).toContainText("What would change this");
    await expect(viz.locator(".viz-say")).toContainText("Recommendation: ECS on Fargate");

    // a platform team, a real plan to leave AWS, a named tool and Kubernetes skills flip it
    const q = (name: string) => viz.getByRole("group", { name });
    await q("Who will run the platform day to day?").getByRole("button", { name: "A dedicated platform team" }).click();
    await q("Is running outside AWS a real plan?").getByRole("button", { name: "Yes, with a date" }).click();
    await expect(title).toHaveText("Too close to call");
    await q("Does the app need a tool only Kubernetes has?").getByRole("button", { name: "Yes, and we can name it" }).click();
    // keyboard
    await q("What does the team know today?").getByRole("button", { name: "Kubernetes, well" }).press("Enter");
    await expect(title).toHaveText("EKS");
    await expect(q("What does the team know today?").getByRole("button", { name: "Kubernetes, well" })).toHaveAttribute("aria-pressed", "true");

    await viz.getByRole("button", { name: "Clear" }).click();
    await expect(title).toHaveText("Answer the questions");
    await expect(viz.locator(".ed-why li")).toHaveCount(0);
  });
});

/* ---------------- accessibility ---------------- */

const PAGES = [
  "/lessons/images-and-containers/",
  "/lessons/dockerfile/",
  "/lessons/volumes-and-networking/",
  "/lessons/ecr/",
  "/lessons/ecs-fargate/",
  "/lessons/zero-downtime-releases/",
  "/lessons/kubernetes-and-eks/",
  "/lessons/ecs-or-eks/",
];

test.describe("containers accessibility (axe)", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const path of PAGES) {
      test(`${path} (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(path);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        const summary = r.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
        expect(summary).toEqual([]);
      });
    }
  }
});

test("no container lesson scrolls sideways at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of PAGES) {
    await page.goto(path);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, path).toBeLessThanOrEqual(0);
  }
});
