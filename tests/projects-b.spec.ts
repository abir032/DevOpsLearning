import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/* Projects 3, 4 and 5: structure, visuals and accessibility. */
const PROJECTS = [
  { slug: "03-one-service-two-runtimes", viz: "two-runtimes" },
  { slug: "04-everything-as-code", viz: "three-stacks" },
  { slug: "05-the-pipeline", viz: "pipeline-map" },
];
const FIRST = ["What you’ll have at the end", "Before you start", "Cost"];
const LAST = ["Prove it", "Troubleshooting", "Clean up"];

test.describe("project template", () => {
  for (const p of PROJECTS) {
    test(`${p.slug} has the required sections in order`, async ({ page }) => {
      await page.goto(`/projects/${p.slug}/`);
      const h2 = (await page.locator(".prose h2").allTextContents()).map((t) => t.trim());
      expect(h2.slice(0, 3)).toEqual(FIRST);
      expect(h2.slice(-3)).toEqual(LAST);
      expect(h2.length, "at least one build stage between Cost and Prove it").toBeGreaterThan(6);

      // a cost badge that says it costs money, inside the Cost section
      await expect(page.locator(".prose .cost.paid")).toHaveCount(1);
      // the diagram comes first
      await expect(page.locator(`.prose [data-viz="${p.viz}"]`)).toBeVisible();
      // every build stage ends with a checkpoint
      const stages = h2.length - FIRST.length - LAST.length;
      expect(await page.locator(".see", { hasText: "Checkpoint:" }).count()).toBeGreaterThanOrEqual(stages);
      // troubleshooting is built from mistakes
      expect(await page.locator(".mistake").count()).toBeGreaterThanOrEqual(4);
      // a final clean-up step, in the Clean up section
      await expect(page.locator(".step.cleanup")).toHaveCount(1);
      const cleanupAfter = await page.evaluate(() => {
        const h = [...document.querySelectorAll(".prose h2")].find((e) => e.textContent?.trim() === "Clean up")!;
        const step = document.querySelector(".step.cleanup")!;
        return !!(h.compareDocumentPosition(step) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(cleanupAfter).toBe(true);
      // the page's "On this page" list matches the sections
      await expect(page.locator(".toc li")).toHaveCount(h2.length);
      // headings never skip a level
      const levels = await page.locator("main h1, main h2, main h3, main h4").evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
      for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1);
      // every code block can be copied
      await expect(page.locator(".codewrap:not(:has(.copy))")).toHaveCount(0);
    });
  }
});

test.describe("project visuals", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("two runtimes: show each path, then release v2 on both", async ({ page }) => {
    await page.goto("/projects/03-one-service-two-runtimes/");
    const viz = page.locator('[data-viz="two-runtimes"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "EKS", exact: true }).click();
    await expect(viz.locator('[data-lane="ecs"]')).toHaveClass(/dim/);
    await expect(say).toContainText("controller inside the cluster");
    await viz.getByRole("button", { name: "Both" }).click();
    await viz.getByRole("button", { name: "Release v2" }).click();
    await expect(say).toContainText("Released", { timeout: 30_000 });
    await expect(viz.locator('[data-slot="e2"]')).toHaveAttribute("data-state", "v2");
    await expect(viz.locator('[data-slot="e0"]')).toHaveAttribute("data-state", "empty");
    await expect(viz.locator('[data-slot="b1"]')).toHaveAttribute("data-state", "v2");
    await viz.getByRole("button", { name: "Reset" }).click();
    await expect(viz.locator('[data-slot="e0"]')).toHaveAttribute("data-state", "v1");
  });

  test("three stacks: only the values change between environments", async ({ page }) => {
    await page.goto("/projects/04-everything-as-code/");
    const viz = page.locator('[data-viz="three-stacks"]');
    await expect(viz.locator(".ts-vals div.chg")).toHaveCount(0);
    await viz.getByRole("button", { name: "prod, us-east-1" }).click();
    await expect(viz.locator('[data-k="single_nat_gateway"] dd')).toHaveText("false");
    await expect(viz.locator('[data-k="single_nat_gateway"]')).toHaveClass(/chg/);
    await expect(viz.locator('[data-f="key"]')).toHaveText("prod/terraform.tfstate");
    await expect(viz.locator(".viz-say")).toContainText("6 values");
    await viz.getByRole("button", { name: "dev, us-west-2" }).click();
    await expect(viz.locator('[data-k="region"]')).toHaveClass(/chg/);
    await expect(viz.locator('[data-k="single_nat_gateway"]')).not.toHaveClass(/chg/);
    await expect(viz.locator(".ts-same")).toHaveText("Same code");
  });

  test("pipeline map: a pull request stops early, a bad canary rolls back", async ({ page }) => {
    await page.goto("/projects/05-the-pipeline/");
    const viz = page.locator('[data-viz="pipeline-map"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Run the pipeline" }).click();
    await expect(say).toContainText("Pull request checked", { timeout: 30_000 });
    await expect(viz.locator('[data-stage="plan"]')).toHaveAttribute("data-state", "pass");
    await expect(viz.locator('[data-stage="push"]')).toHaveAttribute("data-state", "skip");

    await viz.getByRole("button", { name: "Merge to main" }).click();
    await viz.getByRole("button", { name: "Raises errors" }).click();
    await viz.getByRole("button", { name: "Run the pipeline" }).click();
    await expect(say).toContainText("Aborted and rolled back", { timeout: 30_000 });
    await expect(viz.locator('[data-stage="c10"]')).toHaveAttribute("data-state", "fail");
    await expect(viz.locator('[data-stage="promote"]')).toHaveAttribute("data-state", "skip");
    await expect(viz.locator('[data-stage="plan"]')).toHaveAttribute("data-state", "skip");

    await viz.getByRole("button", { name: "Healthy" }).click();
    await viz.getByRole("button", { name: "Run the pipeline" }).click();
    await expect(say).toContainText("In production", { timeout: 40_000 });
    await expect(viz.locator('[data-stage="promote"]')).toHaveAttribute("data-state", "pass");
  });

  test("visuals work from the keyboard", async ({ page }) => {
    await page.goto("/projects/04-everything-as-code/");
    const btn = page.locator('[data-viz="three-stacks"]').getByRole("button", { name: "prod, us-east-1" });
    await btn.focus();
    await page.keyboard.press("Enter");
    await expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  test("no project page scrolls sideways at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of PROJECTS) {
      await page.goto(`/projects/${p.slug}/`);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, p.slug).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("project accessibility (axe)", () => {
  for (const p of PROJECTS) {
    for (const scheme of ["light", "dark"] as const) {
      test(`${p.slug} in ${scheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(`/projects/${p.slug}/`);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes[0]?.target}`)).toEqual([]);
      });
    }
  }
});
