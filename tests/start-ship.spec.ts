import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/* Main path of each visual in modules 00 and 01. Reduced motion for speed. */

async function open(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
}

test.describe("start and ship visuals", () => {
  test("roadmap growth stepper: grows stage by stage, jumps, and links each stage to its module", async ({ page }) => {
    await open(page, "/lessons/roadmap/");
    const viz = page.locator('[data-viz="growth"]');
    const say = viz.locator(".viz-say");
    const grow = viz.getByRole("button", { name: "Grow QuickCart" });
    await expect(viz.getByRole("button", { name: "Back" })).toBeDisabled();
    for (let i = 0; i < 4; i++) await grow.click();
    await expect(say).toContainText("Stage 5 of 12: Launch day");
    await expect(say).toContainText("04 Running code");
    await expect(viz.locator(".gs-panel:not([hidden]) .gs-mod")).toHaveAttribute("href", /\/modules\/04-running-code\/$/);
    // keyboard: jump straight to the last stage
    await viz.getByRole("button", { name: /^Stage 12: 3am/ }).focus();
    await page.keyboard.press("Enter");
    await expect(say).toContainText("Stage 12 of 12");
    await expect(say).toHaveClass(/good/);
    await expect(grow).toBeDisabled();
    await viz.getByRole("button", { name: "Start again" }).click();
    await expect(say).toContainText("Stage 1 of 12");
  });

  test("bill meter: resources charge daily, budget alerts fire, clean-up stops the bill", async ({ page }) => {
    await open(page, "/lessons/how-this-course-works/");
    const viz = page.locator('[data-viz="bill"]');
    const total = viz.locator('[data-n="total"]');
    await viz.getByRole("button", { name: "Let a day pass" }).click();
    await expect(total).toHaveText("$0.00");
    await viz.getByRole("button", { name: "NAT gateway" }).click();
    await expect(viz.getByRole("button", { name: "NAT gateway" })).toHaveAttribute("aria-pressed", "true");
    await viz.getByRole("button", { name: "EKS cluster" }).click();
    await viz.getByRole("button", { name: "Let a day pass" }).click();
    await expect(total).toHaveText("$5.50");
    await viz.getByRole("button", { name: "Let a week pass" }).click();
    await expect(viz.locator(".bm-alerts")).toContainText("85%");
    await expect(viz.locator(".bm-alerts")).toContainText("100%");
    await expect(viz.locator(".viz-say")).toHaveClass(/bad/);
    await viz.getByRole("button", { name: "Clean up everything" }).click();
    const after = await total.textContent();
    await viz.getByRole("button", { name: "Let a week pass" }).click();
    await expect(total).toHaveText(after!);
    await expect(viz.locator('[data-n="rate"]')).toHaveText("$0.00");
  });

  test("credential chain: the first source found wins", async ({ page }) => {
    await open(page, "/lessons/mac-setup/");
    const viz = page.locator('[data-viz="cred-chain"]');
    const out = viz.locator(".cc-out");
    const say = viz.locator(".viz-say");
    await expect(out).toContainText("AWSReservedSSO_AdministratorAccess");
    await viz.getByRole("button", { name: "Old keys in environment variables" }).click();
    await expect(out).toContainText("123456789012");
    await expect(say).toContainText("Old environment keys win");
    await expect(say).toHaveClass(/bad/);
    // --profile beats the environment keys
    await viz.getByRole("button", { name: "Add --profile quickcart to the command" }).press("Enter");
    await expect(out).toContainText("--profile quickcart");
    await expect(out).toContainText("111122223333");
    await expect(say).toHaveClass(/good/);
    // turn everything off: nothing found
    await viz.getByRole("button", { name: "Add --profile quickcart to the command" }).click();
    await viz.getByRole("button", { name: "Old keys in environment variables" }).click();
    await viz.getByRole("button", { name: "AWS_PROFILE=quickcart" }).click();
    await expect(out).toContainText("Unable to locate credentials");
  });

  test("lifecycle loop: small batches take hours, big batches take weeks", async ({ page }) => {
    test.setTimeout(90_000);
    await open(page, "/lessons/devops-lifecycle/");
    const viz = page.locator('[data-viz="lifecycle"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Send a change round" }).click();
    await expect(say).toContainText("Round trip: 4 hours", { timeout: 30_000 });
    await expect(say).toHaveClass(/good/);
    await viz.getByRole("button", { name: "Big batches" }).click();
    await viz.getByRole("button", { name: "Send a change round" }).click();
    await expect(viz.locator(".vz-node.stuck").first()).toBeVisible({ timeout: 10_000 });
    await expect(say).toContainText("Round trip: 35 days", { timeout: 40_000 });
    await expect(say).toHaveClass(/bad/);
    await expect(viz.locator('[data-n="clock"]')).toHaveText("35 days");
  });

  test("batch slider: bigger batches make all four metrics worse", async ({ page }) => {
    await open(page, "/lessons/dora-metrics/");
    const viz = page.locator('[data-viz="batch"]');
    await expect(viz.locator('[data-v="2"]')).toHaveText("3%");
    await viz.getByRole("button", { name: "60", exact: true }).click();
    await expect(viz.locator('[data-v="2"]')).toHaveText("84%");
    await expect(viz.locator('[data-v="1"]')).toHaveText("About a month");
    await expect(viz.locator(".bs-batch i")).toHaveCount(60);
    await expect(viz.locator(".bs-batch i.bad")).toHaveCount(2);
    await expect(viz.locator(".viz-say")).toHaveClass(/bad/);
    await viz.getByRole("button", { name: "5", exact: true }).press("Enter");
    await expect(viz.locator('[data-v="2"]')).toHaveText("14%");
  });

  test("error budget: the same outage costs more at a higher SLO", async ({ page }) => {
    await open(page, "/lessons/slos/");
    const viz = page.locator('[data-viz="budget"]');
    const left = viz.locator('[data-n="left"]');
    await expect(left).toHaveText("43.2");
    await viz.getByRole("button", { name: "A bad deploy: 20 minutes down" }).click();
    await expect(left).toHaveText("23.2");
    await expect(viz.locator('[data-n="policy"]')).toHaveText("Ship freely");
    await viz.getByRole("button", { name: "A network blip: 2 minutes down" }).click();
    await expect(left).toHaveText("21.2");
    await expect(viz.locator('[data-n="policy"]')).toHaveText("Ship carefully");
    await viz.getByRole("button", { name: "99.99%" }).click();
    await expect(left).toHaveText("0");
    await expect(viz.locator('[data-n="policy"]')).toHaveText("Freeze: reliability work only");
    await expect(viz.locator(".eb-log")).toContainText("Over budget by");
    await viz.getByRole("button", { name: "99%", exact: true }).click();
    await expect(left).toHaveText("410");
    await viz.getByRole("button", { name: "Start a new month" }).click();
    await expect(left).toHaveText("432");
    await expect(viz.locator(".eb-log")).toContainText("Nothing has gone wrong");
  });

  test("release race: a bad version reaches 50%, 100% and 10% of customers", async ({ page }) => {
    await open(page, "/lessons/release-strategies/");
    const viz = page.locator('[data-viz="release"]');
    const next = viz.getByRole("button", { name: "Next step" });
    const say = viz.locator(".viz-say");
    await expect(viz.locator(".rr-col")).toHaveCount(3);
    while (await next.isEnabled()) await next.click();
    await expect(say).toContainText("everyone is on version 2");
    await viz.getByRole("button", { name: "Bad", exact: true }).click();
    await expect(say).toContainText("Ready");
    while (await next.isEnabled()) await next.click();
    await expect(say).toContainText("the bad version was stopped");
    await expect(say).toContainText("rolling 50%");
    await expect(say).toContainText("blue/green 100%");
    await expect(say).toContainText("canary 10%");
    await expect(viz.locator(".rr-col").nth(2).locator(".rr-peak")).toContainText("10%");
    // Release it plays through on its own
    await viz.getByRole("button", { name: "Start again" }).click();
    await viz.getByRole("button", { name: "Release it" }).click();
    await expect(viz.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(say).toContainText("Step 1 of 5");
  });

  test("flag panel: rollout keeps customers in, kill switch turns everyone off", async ({ page }) => {
    await open(page, "/lessons/feature-flags/");
    const viz = page.locator('[data-viz="flags"]');
    const seeing = viz.locator('[data-n="seeing"]');
    await viz.getByRole("button", { name: "10%" }).click();
    await expect(seeing).toHaveText("4");
    const inAt10 = await viz.locator(".ff-users li.on").evaluateAll((els) => els.map((e) => e.textContent));
    await viz.getByRole("button", { name: "50%" }).click();
    await expect(seeing).toHaveText("21");
    const inAt50 = await viz.locator(".ff-users li.on").evaluateAll((els) => els.map((e) => e.textContent));
    for (const u of inAt10) expect(inAt50).toContain(u);
    await viz.getByRole("button", { name: "Has a bug" }).click();
    await expect(viz.locator('[data-n="errors"]')).toHaveText("21");
    await expect(viz.locator(".viz-say")).toHaveClass(/bad/);
    await viz.locator('[data-act="kill"]').press("Enter");
    await expect(viz.locator('[data-act="kill"]')).toHaveAttribute("aria-pressed", "true");
    await expect(seeing).toHaveText("0");
    await expect(viz.locator('[data-n="errors"]')).toHaveText("0");
    await expect(viz.locator(".viz-say")).toContainText("off for everyone");
  });
});

/* Accessibility of every lesson in modules 00 and 01, in both themes. */
const SLUGS = ["roadmap", "how-this-course-works", "mac-setup", "devops-lifecycle", "dora-metrics", "slos", "release-strategies", "feature-flags"];

test.describe("start and ship accessibility (axe)", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const slug of SLUGS) {
      test(`${slug} (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(`/lessons/${slug}/`);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        const summary = r.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
        expect(summary).toEqual([]);
      });
    }
  }

  test("no lesson scrolls sideways at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const slug of SLUGS) {
      await page.goto(`/lessons/${slug}/`);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, slug).toBeLessThanOrEqual(0);
    }
  });
});
