import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PROJECTS = ["01-network-by-hand", "02-self-healing-environment"];
const FIRST = ["What you'll have at the end", "Before you start", "Cost"];
const LAST = ["Prove it", "Troubleshooting", "Clean up"];

async function h2s(page: Page) {
  return page.locator("article .prose > h2").evaluateAll((els) => els.map((e) => (e.textContent || "").trim().replace(/\u2019/g, "'")));
}

test.describe("project guides", () => {
  for (const slug of PROJECTS) {
    test(`${slug}: sections in order, cost badge, checkpoints, troubleshooting and clean-up`, async ({ page }) => {
      await page.goto(`/projects/${slug}/`);
      const heads = await h2s(page);
      expect(heads.slice(0, 3)).toEqual(FIRST);
      expect(heads.slice(-3)).toEqual(LAST);
      const stages = heads.slice(3, -3);
      expect(stages.length).toBeGreaterThanOrEqual(5);
      for (const s of stages) expect(s).toMatch(/^Stage \d+: /);

      // the first section has a visual
      await expect(page.locator("article .viz").first()).toBeVisible();

      // one paid cost badge, in the Cost section
      await expect(page.locator("article .cost.paid")).toHaveCount(1);

      // every build stage has at least one checkpoint: a "You should see" box or expected output
      const counts = await page.locator("article .prose").evaluate((prose, names) => {
        const out: Record<string, number> = {};
        let current = "";
        for (const el of Array.from(prose.children)) {
          if (el.tagName === "H2") { current = (el.textContent || "").trim(); continue; }
          if (!names.includes(current)) continue;
          out[current] = (out[current] || 0) + el.querySelectorAll(".see, .out").length + (el.matches(".see, .out") ? 1 : 0);
        }
        return out;
      }, stages);
      for (const s of stages) expect(counts[s] || 0, s).toBeGreaterThan(0);

      // troubleshooting is made of mistake boxes
      const trouble = await page.locator("article .prose").evaluate((prose) => {
        let on = false; let n = 0;
        for (const el of Array.from(prose.children)) {
          if (el.tagName === "H2") on = (el.textContent || "").trim() === "Troubleshooting";
          else if (on) n += el.matches(".mistake") ? 1 : el.querySelectorAll(".mistake").length;
        }
        return n;
      });
      expect(trouble).toBeGreaterThanOrEqual(4);

      // the clean-up ends with a clean-up step
      await expect(page.locator("article .step.cleanup")).toHaveCount(1);
      await expect(page.locator("article .steps").last().locator(".step").last()).toHaveClass(/cleanup/);

      // headings never skip a level
      const levels = await page.locator("main h1, main h2, main h3, main h4").evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
      for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1);

      // every code block has a copy button; the time is shown
      await expect(page.locator(".codewrap:not(:has(.copy))")).toHaveCount(0);
      await expect(page.locator(".lesson-meta")).toContainText("Time");
    });
  }

  test("the projects list marks both guides as ready", async ({ page }) => {
    await page.goto("/projects/");
    for (const t of ["Project 1: A network by hand", "Project 2: A self-healing environment"]) {
      await expect(page.locator(".lesson-list li", { hasText: t }).locator(".tag")).toHaveText("Ready");
    }
  });

  test("no project page scrolls sideways at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const slug of PROJECTS) {
      await page.goto(`/projects/${slug}/`);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, slug).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("project visuals", () => {
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

  test("network map: each trace narrates the route it uses, and the attack is blocked", async ({ page }) => {
    await page.goto("/projects/01-network-by-hand/");
    const viz = page.locator('[data-viz="network-by-hand"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Server downloads an update" }).click();
    await expect(say).toContainText("Step 4 of 4: done", { timeout: 15_000 });
    await viz.getByRole("button", { name: "Server reads a secret" }).click();
    await expect(say).toContainText("never touched the NAT gateway", { timeout: 15_000 });
    await viz.getByRole("button", { name: "Server reads from S3" }).click();
    await expect(say).toContainText("gateway endpoint is only a route", { timeout: 15_000 });
    await viz.getByRole("button", { name: "Zone b downloads an update" }).click();
    await expect(say).toContainText("a trade-off", { timeout: 15_000 });
    // keyboard
    await viz.getByRole("button", { name: "The internet tries the data subnet" }).press("Enter");
    await expect(say).toContainText("blocked", { timeout: 15_000 });
    await expect(say).toHaveClass(/good/);
    await viz.getByRole("button", { name: "Reset" }).click();
    await expect(say).toContainText("Ready");
  });

  test("self-healing map: a lost server heals; a lost zone depends on the database", async ({ page }) => {
    await page.goto("/projects/02-self-healing-environment/");
    const viz = page.locator('[data-viz="self-healing"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Lose a server" }).click();
    await expect(say).toContainText("back to full strength", { timeout: 20_000 });
    await expect(viz.locator('[data-n="count"]')).toHaveText("Healthy targets: 4 of 4");
    await viz.getByRole("button", { name: "Lose zone a" }).click();
    await expect(say).toContainText("the database was in zone a", { timeout: 20_000 });
    await expect(say).toHaveClass(/bad/);
    await viz.getByRole("button", { name: "Multi-AZ" }).press("Enter");
    await expect(viz.getByRole("button", { name: "Multi-AZ" })).toHaveAttribute("aria-pressed", "true");
    await viz.getByRole("button", { name: "Lose zone a" }).click();
    await expect(say).toContainText("fully working again", { timeout: 20_000 });
    await expect(say).toHaveClass(/good/);
  });
});

test.describe("project accessibility (axe)", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const slug of PROJECTS) {
      test(`/projects/${slug}/ (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(`/projects/${slug}/`);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        const summary = r.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
        expect(summary).toEqual([]);
      });
    }
  }
});
