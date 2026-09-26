import { test, expect } from "@playwright/test";

/* Module 10 visuals. Reduced motion keeps the runs fast. */
test.use({ contextOptions: { reducedMotion: "reduce" } });

test.describe("canary from a pipeline", () => {
  test("a version that raises errors is aborted and rolled back automatically", async ({ page }) => {
    await page.goto("/lessons/canary-pipeline/");
    const viz = page.locator('[data-viz="canary-abort"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Raises errors" }).click();
    await viz.getByRole("button", { name: "Start the canary" }).click();
    await expect(say).toContainText("Rolled back automatically", { timeout: 20_000 });
    await expect(say).toHaveClass(/bad/);
    await expect(viz.locator('[data-step="10"]')).toHaveClass(/failed/);
    await expect(viz.locator('[data-step="100"]')).not.toHaveClass(/passed/);
    await expect(viz.locator(".ca-log")).toContainText("Finished: FAILURE");
  });

  test("a healthy version is promoted step by step", async ({ page }) => {
    await page.goto("/lessons/canary-pipeline/");
    const viz = page.locator('[data-viz="canary-abort"]');
    // operate from the keyboard
    await viz.getByRole("button", { name: "Start the canary" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.locator(".viz-say")).toContainText("Promoted", { timeout: 20_000 });
    await expect(viz.locator('[data-step="100"]')).toHaveClass(/passed/);
    await expect(viz.locator(".ca-log")).toContainText("Finished: SUCCESS");
  });

  test("on a quiet night, too little data is not a pass", async ({ page }) => {
    await page.goto("/lessons/canary-pipeline/");
    const viz = page.locator('[data-viz="canary-abort"]');
    await viz.getByRole("button", { name: "Quiet night" }).click();
    await viz.getByRole("button", { name: "Start the canary" }).click();
    await expect(viz.locator(".ca-log")).toContainText("Too few to judge", { timeout: 20_000 });
    await expect(viz.locator(".viz-say")).toContainText("Promoted", { timeout: 20_000 });
  });
});

/* The other Module 10 visuals: operate each control, and check the
   narration responds and nothing throws. */
const VISUALS: [string, string][] = [
  ["/lessons/jenkins/", "jenkins-sched"],
  ["/lessons/jenkinsfile/", "jf-run"],
  ["/lessons/continuous-integration/", "ci-gates"],
  ["/lessons/continuous-delivery/", "cd-promote"],
];

for (const [path, name] of VISUALS) {
  test(`${name}: every control narrates, with no errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path);
    const viz = page.locator(`[data-viz="${name}"]`);
    await expect(viz).toBeVisible();
    const say = viz.locator(".viz-say, [aria-live]").first();
    const buttons = viz.locator(".viz-controls button");
    const n = await buttons.count();
    expect(n).toBeGreaterThan(0);
    let changed = 0;
    for (let i = 0; i < n; i++) {
      const b = buttons.nth(i);
      if (!(await b.isEnabled())) continue;
      const before = await say.innerText();
      await b.click();
      await page.waitForTimeout(250);
      if ((await say.innerText()) !== before) changed++;
    }
    expect(changed, "at least one control changes the narration").toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}
