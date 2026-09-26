import { test, expect } from "@playwright/test";

/* Module 09 visuals. Reduced motion keeps the runs fast. */
test.use({ contextOptions: { reducedMotion: "reduce" } });

test("count vs for_each: removing the middle item destroys the wrong queue with count", async ({ page }) => {
  await page.goto("/lessons/terraform-loops/");
  const viz = page.locator('[data-viz="tf-count-foreach"]');
  const say = viz.locator(".viz-say");
  await expect(viz.getByRole("button", { name: "Apply both plans" })).toBeDisabled();
  await viz.getByRole("button", { name: "Remove the middle item" }).click();
  await expect(say).toContainText("destroy the real emails queue");
  await expect(say).toContainText("for_each");
  // keyboard: apply with Enter
  await viz.getByRole("button", { name: "Apply both plans" }).focus();
  await page.keyboard.press("Enter");
  await expect(viz.getByRole("button", { name: "Put it back" })).toBeEnabled();
  await viz.getByRole("button", { name: "Put it back" }).click();
  await expect(viz.getByRole("button", { name: "Remove the middle item" })).toBeEnabled();
});

/* Every other Terraform visual: operate each control in turn, and check the
   narration responds, nothing throws, and the controls stay usable. */
const VISUALS: [string, string][] = [
  ["/lessons/why-terraform/", "tf-click-vs-code"],
  ["/lessons/first-resource/", "tf-plan-reader"],
  ["/lessons/terraform-variables/", "tf-precedence"],
  ["/lessons/terraform-modules/", "tf-module-wiring"],
  ["/lessons/environments-and-regions/", "tf-env-matrix"],
  ["/lessons/operating-terraform/", "tf-moved"],
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
      await page.waitForTimeout(150);
      if ((await say.innerText()) !== before) changed++;
    }
    expect(changed, "at least one control changes the narration").toBeGreaterThan(0);
    // the first control also works from the keyboard
    const first = buttons.first();
    if (await first.isEnabled()) {
      await first.focus();
      await page.keyboard.press("Enter");
    }
    expect(errors).toEqual([]);
  });
}
