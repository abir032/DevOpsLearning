import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readdirSync } from "node:fs";

/* Every written lesson gets the template checks. */
const READY = readdirSync("src/content/lessons").filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
const PARTS = ["problem", "idea", "see", "doit", "quiz", "cheat"];

/* ---------------- navigation ---------------- */

test.describe("navigation", () => {
  test("home shows the route map with every station", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Learn DevOps by shipping one app");
    await expect(page.locator(".route .station")).toHaveCount(13);
  });

  test("rail, breadcrumbs and prev/next lead between lessons", async ({ page }) => {
    await page.goto("/modules/03-networking/");
    await page.locator(".lesson-list").getByRole("link", { name: "What is a VPC?" }).click();
    await expect(page).toHaveURL(/\/lessons\/vpc\/$/);
    await expect(page.locator(".crumbs")).toContainText("03 – Networking");
    await expect(page.locator('#rail a[aria-current="page"]')).toHaveText(/What is a VPC\?/);
    await page.locator(".pager .next").click();
    await expect(page).toHaveURL(/\/lessons\/subnets-and-cidr\/$/);
    await expect(page.locator("h1")).toHaveText("Subnets and IP ranges");
  });

  test("clicking a link swaps only the page: the rail stays put, scroll and all", async ({ page }) => {
    await page.goto("/lessons/vpc/");
    await page.evaluate(() => { (document.getElementById("rail") as any).__marker = 42; });
    // open another module in the rail and scroll the rail a little
    await page.locator('#rail details[data-module="09-infrastructure-as-code"] > summary').click();
    await page.locator('#rail a[href="/lessons/terraform-state/"]').evaluate((a) => a.scrollIntoView({ block: "center" }));
    const before = await page.locator("#rail").evaluate((r) => r.scrollTop);
    await page.locator('#rail a[href="/lessons/terraform-state/"]').click();
    await expect(page).toHaveURL(/\/lessons\/terraform-state\/$/);
    await expect(page.locator("h1")).toHaveText("Terraform state");
    expect(await page.evaluate(() => (document.getElementById("rail") as any).__marker)).toBe(42);
    expect(Math.abs((await page.locator("#rail").evaluate((r) => r.scrollTop)) - before)).toBeLessThan(1);
    await expect(page.locator('#rail a[aria-current="page"]')).toHaveText(/Terraform state/);
    await expect(page.locator('#rail [data-stop="vpc"] a')).not.toHaveAttribute("aria-current", "page");
    // the page's own scripts ran for the new page
    await page.locator('[data-viz="tf-threeway"]').getByRole("button", { name: "The state file is lost" }).click();
    await expect(page.locator('[data-viz="tf-threeway"] .plan-out')).toContainText("3 to add");
    // and going back works too, with the quiz live again
    await page.goBack();
    await expect(page.locator("h1")).toHaveText("What is a VPC?");
    await page.locator("#quiz .q").first().locator(".opt").first().click();
    await expect(page.locator("#quiz .q").first().locator(".q-fb")).not.toBeEmpty();
  });

  test("theme choice survives client-side navigation", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await page.locator("#rail .rail-foot a", { hasText: "Glossary" }).click();
    await expect(page.locator("h1")).toHaveText("Glossary");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('.topnav a[aria-current="page"]')).toHaveText("Glossary");
  });

  test("the rail is a drawer on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/lessons/vpc/");
    const rail = page.locator("#rail");
    await expect(rail).toBeHidden();
    await page.getByRole("button", { name: "Open the course menu" }).click();
    await expect(rail).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(rail).toBeHidden();
  });

  test("no page scrolls sideways at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const path of ["/", "/lessons/vpc/", "/lessons/terraform-state/", "/glossary/", "/which-lesson/", "/projects/"]) {
      await page.goto(path);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, path).toBeLessThanOrEqual(0);
    }
  });
});

/* ---------------- lesson structure ---------------- */

test.describe("lesson template", () => {
  for (const slug of READY) {
    test(`${slug} has the six parts in order, a cost badge and a clean-up`, async ({ page }) => {
      await page.goto(`/lessons/${slug}/`);
      const ids = await page.locator("[data-part]").evaluateAll((els) => els.map((e) => e.id));
      expect(ids).toEqual(PARTS);
      await expect(page.locator("#doit .cost")).toHaveCount(1);
      await expect(page.locator("#doit .step.cleanup")).toHaveCount(1);
      const q = await page.locator("#quiz .q").count();
      expect(q).toBeGreaterThanOrEqual(4);
      expect(q).toBeLessThanOrEqual(6);
      await expect(page.locator("#see .viz").first()).toBeVisible();
      await expect(page.locator("#cheat .cheat")).toBeVisible();
      await expect(page.locator(".lesson-meta")).toContainText("Time");
      // headings never skip a level
      const levels = await page.locator("main h1, main h2, main h3, main h4").evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
      for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1);
      // every code block has a copy button
      await expect(page.locator(".codewrap:not(:has(.copy))")).toHaveCount(0);
    });
  }

  test("copy button copies the code", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/lessons/terraform-state/");
    const block = page.locator(".codewrap", { hasText: "use_lockfile" }).first();
    await block.locator(".copy").click();
    await expect(block.locator(".copy")).toHaveText("Copied");
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain('backend "s3"');
    expect(text).not.toContain("Copy");
  });
});

/* ---------------- search ---------------- */

test.describe("search", () => {
  test("slash opens search; titles match as you type; Enter goes there", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("/");
    const input = page.getByRole("combobox", { name: "Search lessons and terms" });
    await expect(input).toBeFocused();
    await input.fill("subnet");
    await expect(page.locator("#results")).toContainText("Subnets and IP ranges");
    await input.fill("terraform state");
    await expect(page.locator('#results [role="option"]').first()).toContainText("Terraform state");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/lessons\/terraform-state\/$/);
  });

  test("Ctrl+K opens search and full-text results come from Pagefind", async ({ page }) => {
    await page.goto("/lessons/vpc/");
    await page.keyboard.press("Control+k");
    const input = page.getByRole("combobox", { name: "Search lessons and terms" });
    await input.fill("ransom");
    await expect(page.locator("#results")).toContainText("In the lessons", { timeout: 10_000 });
    await expect(page.locator("#results")).toContainText("What is a VPC?");
    await page.keyboard.press("Escape");
    await expect(page.locator("#searchDlg")).toBeHidden();
  });

  test("glossary terms are searchable", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("/");
    const input = page.getByRole("combobox", { name: "Search lessons and terms" });
    await expect(input).toBeFocused();
    await input.fill("NAT gateway");
    await expect(page.locator('#results [role="option"]').first()).toContainText("Glossary.");
  });
});

/* ---------------- progress ---------------- */

test.describe("progress", () => {
  test("marking a lesson done fills its stop and the module station, and survives a reload", async ({ page }) => {
    await page.goto("/lessons/vpc/");
    const btn = page.locator(".done-bar [data-done-toggle]");
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('#rail [data-stop="vpc"]')).toHaveClass(/done/);
    await expect(page.locator(".rail-foot b")).toHaveText("1 of 50");
    await page.goto("/");
    await expect(page.locator('.station[data-track="cloud"] .station-dot.part').first()).toBeVisible();
    await page.reload();
    await expect(page.locator('#rail [data-stop="vpc"]')).toHaveClass(/done/);
    await page.goto("/lessons/vpc/");
    await page.locator(".done-bar [data-done-toggle]").click();
    await expect(page.locator('#rail [data-stop="vpc"]')).not.toHaveClass(/done/);
  });

  test("progress works when storage is blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    });
    await page.goto("/lessons/vpc/");
    const btn = page.locator(".done-bar [data-done-toggle]");
    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});

/* ---------------- theme ---------------- */

test.describe("theme", () => {
  test("follows the system, toggles and persists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await bg()).toBe("rgb(17, 21, 29)");
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    expect(await bg()).toBe("rgb(246, 247, 249)");
    await page.reload();
    expect(await bg()).toBe("rgb(246, 247, 249)");
    await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
  });
});

/* ---------------- quiz ---------------- */

test.describe("quiz", () => {
  test("instant feedback with explanations, a score, and a retry", async ({ page }) => {
    await page.goto("/lessons/vpc/");
    const qs = page.locator("#quiz .q");
    const n = await qs.count();
    // first question: pick a wrong answer
    await qs.nth(0).locator(".opt").nth(0).click();
    await expect(qs.nth(0).locator(".q-fb")).toContainText("Not quite.");
    await expect(qs.nth(0).locator(".opt.right")).toHaveCount(1);
    await expect(qs.nth(0).locator(".opt.wrong")).toHaveCount(1);
    await expect(qs.nth(0).locator(".why").first()).toBeVisible();
    // the rest: pick the right answer
    for (let i = 1; i < n; i++) {
      const right = Number(await qs.nth(i).getAttribute("data-answer"));
      await qs.nth(i).locator(".opt").nth(right).click();
      await expect(qs.nth(i).locator(".q-fb")).toContainText("Right.");
    }
    await expect(page.locator("#quiz .score")).toHaveText(new RegExp(`You got ${n - 1} of ${n}`));
    await page.getByRole("button", { name: "Try the questions again" }).click();
    await expect(page.locator("#quiz .answered")).toHaveCount(0);
  });
});

/* ---------------- visuals ---------------- */

async function reduced(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

test.describe("visuals", () => {
  test("VPC journey: an order gets through, an attack is blocked until the subnet is public", async ({ page }) => {
    await reduced(page);
    await page.goto("/lessons/vpc/");
    const viz = page.locator('[data-viz="vpc-journey"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Send an order" }).click();
    await expect(say).toContainText("Step 6 of 6", { timeout: 20_000 });
    await expect(say).toContainText("Order confirmed");
    await viz.getByRole("button", { name: "Attack the database" }).click();
    await expect(say).toContainText("blocked", { timeout: 15_000 });
    // keyboard: switch to public with the keyboard
    await viz.getByRole("button", { name: "Public" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "Public" })).toHaveAttribute("aria-pressed", "true");
    await expect(say).toContainText("0.0.0.0/0 to the internet gateway");
    await viz.getByRole("button", { name: "Attack the database" }).press("Space");
    await expect(say).toContainText("it got through", { timeout: 15_000 });
    await expect(say).toHaveClass(/bad/);
  });

  test("Terraform three-way: a lost state plans duplicates", async ({ page }) => {
    await page.goto("/lessons/terraform-state/");
    const viz = page.locator('[data-viz="tf-threeway"]');
    await expect(viz.locator(".plan-out")).toContainText("No changes");
    await viz.getByRole("button", { name: "The state file is lost" }).click();
    await expect(viz.locator(".plan-out")).toContainText("3 to add");
    await expect(viz.locator(".tw-col").nth(1)).toContainText("Terraform remembers nothing");
    await viz.getByRole("button", { name: "Someone changes AWS by hand" }).click();
    await expect(viz.locator(".plan-out")).toContainText("updated in-place");
  });

  test("Terraform race: without a lock the state is wrong; with one it is right", async ({ page }) => {
    await page.goto("/lessons/terraform-state/");
    const viz = page.locator('[data-viz="tf-race"]');
    const next = viz.getByRole("button", { name: "Next step" });
    while (await next.isEnabled()) await next.click();
    await expect(viz.locator(".viz-say")).toContainText("the state is now wrong");
    await expect(viz.locator(".race")).toContainText("not in state");
    await viz.getByRole("button", { name: "On", exact: true }).click();
    while (await next.isEnabled()) await next.click();
    await expect(viz.locator(".viz-say")).toContainText("the state is correct");
    await expect(viz.locator(".ver")).toHaveText("v5");
  });
});

/* ---------------- accessibility ---------------- */

test.describe("accessibility (axe)", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const path of ["/", "/lessons/vpc/", "/lessons/terraform-state/", "/modules/09-infrastructure-as-code/", "/glossary/", "/which-lesson/", "/cheat-sheets/"]) {
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
