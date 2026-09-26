/*
 * Screenshots for human review: the home page, a lesson, and every visual,
 * at 1440px, 390px and in dark mode. Saved to test-results/screens/.
 */
import { test } from "@playwright/test";

const SIZES = [
  { name: "1440", width: 1440, height: 900, scheme: "light" as const },
  { name: "390", width: 390, height: 844, scheme: "light" as const },
  { name: "1440-dark", width: 1440, height: 900, scheme: "dark" as const },
];
const VISUALS = [
  { path: "/lessons/vpc/", sel: '[data-viz="vpc-journey"]', name: "viz-vpc-journey" },
  { path: "/lessons/terraform-state/", sel: '[data-viz="tf-threeway"]', name: "viz-tf-threeway" },
  { path: "/lessons/terraform-state/", sel: '[data-viz="tf-race"]', name: "viz-tf-race" },
];

for (const s of SIZES) {
  test.describe(`screens ${s.name}`, () => {
    test.use({ viewport: { width: s.width, height: s.height }, colorScheme: s.scheme });

    test("home", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await page.screenshot({ path: `test-results/screens/home-${s.name}.png`, fullPage: true });
    });

    test("lesson", async ({ page }) => {
      await page.goto("/lessons/vpc/");
      await page.screenshot({ path: `test-results/screens/lesson-top-${s.name}.png` });
    });

    for (const v of VISUALS) {
      test(v.name, async ({ page }) => {
        await page.goto(v.path);
        await page.locator(v.sel).scrollIntoViewIfNeeded();
        await page.locator(v.sel).screenshot({ path: `test-results/screens/${v.name}-${s.name}.png` });
      });
    }
  });
}
