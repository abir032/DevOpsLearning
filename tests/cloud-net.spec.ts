/*
 * Behaviour tests for the cloud and networking visuals (modules 02 and 03),
 * plus axe checks on those lessons in light and dark.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/* ---------------- regions and zones: the globe ---------------- */

test.describe("regions globe", () => {
  test("2D fallback with reduced motion: one zone goes down with its zone, two zones survive", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/regions-and-zones/");
    const viz = page.locator('[data-viz="region-globe"]');
    const say = viz.locator(".viz-say");
    await viz.scrollIntoViewIfNeeded();
    await expect(viz).toHaveAttribute("data-mode", "2d");
    await expect(viz.locator(".rg-map")).toBeVisible();
    await expect(viz.locator("canvas")).toHaveCount(0);

    // everything in one zone, and that zone fails
    await viz.getByRole("button", { name: "us-east-1a" }).click();
    await expect(viz.getByRole("button", { name: "us-east-1a" })).toHaveAttribute("aria-pressed", "true");
    await expect(say).toContainText("every server is gone");
    await expect(viz.locator('[data-mz="a"]')).toHaveClass(/down/);
    await viz.getByRole("button", { name: "Send 6 orders" }).click();
    await expect(say).toContainText("0 of 6 orders placed", { timeout: 20_000 });
    await expect(say).toHaveClass(/bad/);

    // switch to two zones with the keyboard, and send again
    await viz.getByRole("button", { name: "Two zones" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "Two zones" })).toHaveAttribute("aria-pressed", "true");
    await expect(say).toContainText("the other server, in another zone, is still running", { ignoreCase: true });
    await viz.getByRole("button", { name: "Send 6 orders" }).press("Space");
    await expect(say).toContainText("6 of 6 orders placed", { timeout: 20_000 });
    await expect(say).toHaveClass(/good/);

    // lose both zones QuickCart uses: down again
    await viz.getByRole("button", { name: "us-east-1b" }).click();
    await viz.getByRole("button", { name: "Send 6 orders" }).click();
    await expect(say).toContainText("0 of 6 orders placed", { timeout: 20_000 });

    await viz.getByRole("button", { name: "Reset" }).click();
    await expect(viz.getByRole("button", { name: "One zone" })).toHaveAttribute("aria-pressed", "true");
    await expect(viz.locator('[data-zone].down')).toHaveCount(0);
  });

  test("without WebGL the flat map stays, and the controls still work", async ({ page }) => {
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      // @ts-expect-error: pretend this browser has no WebGL
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        if (String(type).startsWith("webgl")) return null;
        // @ts-expect-error: pass everything else through
        return real.call(this, type, ...rest);
      };
    });
    await page.goto("/lessons/regions-and-zones/");
    const viz = page.locator('[data-viz="region-globe"]');
    await viz.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await expect(viz).toHaveAttribute("data-mode", "2d");
    await expect(viz.locator(".rg-map")).toBeVisible();
    await viz.getByRole("button", { name: "us-east-1c" }).click();
    await expect(viz.locator(".viz-say")).toContainText("nothing changes");
  });

  test("with WebGL the 3D globe loads lazily and follows the controls", async ({ page }) => {
    const threeLoads: string[] = [];
    page.on("request", (r) => { if (/three\.module|region-globe-3d/.test(r.url())) threeLoads.push(r.url()); });
    await page.goto("/lessons/regions-and-zones/");
    const gl = await page.evaluate(() => { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); });
    test.skip(!gl, "this browser has no WebGL");
    // nothing 3D is fetched until the visual is on screen
    expect(threeLoads).toEqual([]);
    const viz = page.locator('[data-viz="region-globe"]');
    await viz.scrollIntoViewIfNeeded();
    await expect(viz).toHaveAttribute("data-mode", "3d", { timeout: 15_000 });
    await expect(viz.locator("canvas.rg-canvas")).toBeVisible();
    await expect(viz.locator(".rg-map")).toBeHidden();
    expect(threeLoads.length).toBeGreaterThan(0);
    await viz.getByRole("button", { name: "us-east-1a" }).click();
    await viz.getByRole("button", { name: "Send 6 orders" }).click();
    await expect(viz.locator(".viz-say")).toContainText("0 of 6 orders placed", { timeout: 20_000 });
  });

  test("pages without the globe never download Three.js", async ({ page }) => {
    const loads: string[] = [];
    page.on("request", (r) => { if (/three\.module/.test(r.url())) loads.push(r.url()); });
    await page.goto("/lessons/vpc/");
    await page.waitForLoadState("networkidle");
    expect(loads).toEqual([]);
  });
});

test.describe("IAM and DNS visuals", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("IAM evaluator: implicit deny, a broad allow, and an explicit deny that wins", async ({ page }) => {
    await page.goto("/lessons/iam/");
    const viz = page.locator('[data-viz="iam-evaluator"]');
    const say = viz.locator(".viz-say");
    const verdict = viz.locator(".ie-verdict");
    const check = viz.getByRole("button", { name: "Check the request" });

    // only the least-privilege statement: reading a photo is allowed
    await check.click();
    await expect(verdict).toHaveText("Allowed", { timeout: 10_000 });
    await expect(say).toContainText("Check 3 of 3: allowed");

    // the state bucket: nothing allows it, so it's an implicit deny
    await viz.getByRole("button", { name: "Read the Terraform state" }).click();
    await check.click();
    await expect(say).toContainText("implicit deny", { timeout: 10_000 });
    await expect(verdict).toHaveText("Denied: nothing allowed it");

    // attach s3:* with the keyboard: now it's allowed, and flagged as too much
    const broad = viz.locator('[data-st="all"]');
    await broad.focus();
    await page.keyboard.press("Enter");
    await expect(broad).toHaveAttribute("aria-pressed", "true");
    await check.press("Space");
    await expect(say).toContainText("far too much", { timeout: 10_000 });
    await expect(say).toHaveClass(/bad/);

    // delete with s3:* and the Deny attached: the Deny wins
    await viz.getByRole("button", { name: "Delete a menu photo" }).click();
    await viz.locator('[data-st="deny"]').click();
    await check.click();
    await expect(say).toContainText("explicit Deny always wins", { timeout: 10_000 });
    await expect(verdict).toHaveText("Denied: explicit Deny");
  });

  test("DNS journey: Route 53 answers, until the registrar points elsewhere", async ({ page }) => {
    await page.goto("/lessons/dns-and-https/");
    const viz = page.locator('[data-viz="dns-journey"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Open example.com" }).click();
    await expect(say).toContainText("Step 6 of 6: connected", { timeout: 30_000 });
    await expect(say).toHaveClass(/good/);

    await viz.getByRole("button", { name: "Still the registrar's" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "Still the registrar's" })).toHaveAttribute("aria-pressed", "true");
    await viz.getByRole("button", { name: "Open example.com" }).press("Enter");
    await expect(say).toContainText("Step 6 of 6: never arrives", { timeout: 30_000 });
    await expect(say).toHaveClass(/bad/);
    await expect(viz.locator('[data-n="note"]')).toHaveText("example.com → parking page");

    await viz.getByRole("button", { name: "Reset" }).click();
    await expect(say).toContainText("Ready");
  });
});

test.describe("subnets: CIDR planner", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/subnets-and-cidr/");
  });

  test("shows bits and sizes, rejects a block off its boundary, flags an overlap", async ({ page }) => {
    const viz = page.locator('[data-viz="cidr-planner"]');
    const say = viz.locator(".viz-say");
    const list = viz.locator(".cp-list li");
    await expect(list).toHaveCount(3);
    await expect(viz.locator(".cp-bits .b.fix")).toHaveCount(24);
    await expect(viz.locator(".cp-facts")).toContainText("256 − 5 = 251");

    // a /20 at 10.0.1.0 is not on its boundary
    await viz.getByRole("button", { name: "/20" }).click();
    await expect(say).toContainText("4,096");
    const start = viz.getByRole("textbox");
    await start.fill("10.0.1.0");
    await viz.getByRole("button", { name: "Add subnet" }).click();
    await expect(say).toContainText("Not on a boundary");
    await expect(say).toContainText("10.0.0.0");
    await expect(list).toHaveCount(3);

    // on the boundary it is accepted, but it overlaps 10.0.1.0/24 and 10.0.11.0/24
    await start.fill("10.0.0.0");
    await start.press("Enter");
    await expect(list).toHaveCount(4);
    await expect(say).toContainText("Overlap");
    await expect(say).toHaveClass(/bad/);
    await expect(viz.locator(".cp-list li.bad")).toHaveCount(3);
    await expect(viz.locator(".cp-grid .c.bad")).toHaveCount(2);

    // remove it with the keyboard; the overlap goes away
    await viz.getByRole("button", { name: "Remove 10.0.0.0/20" }).focus();
    await page.keyboard.press("Enter");
    await expect(list).toHaveCount(3);
    await expect(viz.locator(".cp-list li.bad")).toHaveCount(0);
    await expect(say).toContainText("Nothing in the plan overlaps");

    // next free /28: 16 addresses, 11 usable
    await viz.getByRole("button", { name: "/28" }).click();
    await viz.getByRole("button", { name: "Add the next free block" }).click();
    await expect(say).toContainText("Added 10.0.0.0/28");
    await expect(viz.locator(".cp-facts")).toContainText("16 − 5 = 11");
    await expect(viz.locator(".cp-bits .b.fix")).toHaveCount(28);
  });
});

test.describe("routing: route table editor", () => {
  test("routes decide isolated, public and private, and S3 takes the endpoint", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/routing/");
    const viz = page.locator('[data-viz="route-editor"]');
    const say = viz.locator(".viz-say");
    const badge = viz.locator('[data-n="badgeT"]');
    const rows = viz.locator("tbody tr");
    await expect(badge).toHaveText("Isolated");
    await expect(rows).toHaveCount(1);

    // isolated: the update times out
    await viz.getByRole("button", { name: "Server downloads an update" }).click();
    await expect(say).toContainText("timed out", { timeout: 15_000 });

    // local can't be removed
    await viz.getByRole("button", { name: "Remove the local route" }).click();
    await expect(say).toContainText("Can't remove local");
    await expect(rows).toHaveCount(1);

    // public: the internet gets in
    await viz.getByRole("button", { name: "0.0.0.0/0 → internet gateway" }).click();
    await expect(badge).toHaveText("Public");
    await viz.getByRole("button", { name: "A visitor connects in" }).click();
    await expect(say).toContainText("it got in", { timeout: 15_000 });
    await expect(say).toHaveClass(/bad/);

    // a second 0.0.0.0/0 is refused
    await viz.getByRole("button", { name: "0.0.0.0/0 → NAT gateway" }).click();
    await expect(say).toContainText("Route already exists");

    // swap to NAT with the keyboard: private
    await viz.getByRole("button", { name: "Remove 0.0.0.0/0 → internet gateway" }).focus();
    await page.keyboard.press("Enter");
    await expect(badge).toHaveText("Isolated");
    await viz.getByRole("button", { name: "0.0.0.0/0 → NAT gateway" }).press("Space");
    await expect(badge).toHaveText("Private");
    await viz.getByRole("button", { name: "A visitor connects in" }).click();
    await expect(say).toContainText("no way in", { timeout: 15_000 });
    await viz.getByRole("button", { name: "Server downloads an update" }).click();
    await expect(say).toContainText("The update came back", { timeout: 20_000 });

    // S3: the long way, then through the endpoint
    await viz.getByRole("button", { name: "Server reads from S3" }).click();
    await expect(say).toContainText("the long way", { timeout: 15_000 });
    await viz.getByRole("button", { name: "S3 → gateway endpoint" }).click();
    await expect(rows).toHaveCount(3);
    await viz.getByRole("button", { name: "Server reads from S3" }).click();
    await expect(say).toContainText("private path", { timeout: 15_000 });
  });
});

test.describe("security groups chain", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/security-groups/");
  });

  test("with every rule right, the order is confirmed fast", async ({ page }) => {
    const viz = page.locator('[data-viz="sg-chain"]');
    await viz.getByRole("button", { name: "Send a request" }).click();
    await expect(viz.locator(".viz-say")).toContainText("Order confirmed", { timeout: 20_000 });
    await expect(viz.locator(".viz-say")).toHaveClass(/good/);
    await expect(viz.locator('[data-n="result"]')).toHaveText("200 OK: order confirmed");
  });

  test("a wrong port times out with a 504; a code bug fails fast with a 500", async ({ page }) => {
    const viz = page.locator('[data-viz="sg-chain"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "App rule allows port 80, not 8080" }).click();
    await expect(viz.locator('[data-n="r-app"]')).toHaveText("in: 80 from alb-sg");
    await viz.getByRole("button", { name: "Send a request" }).click();
    await expect(say).toContainText("timed out", { timeout: 20_000 });
    await expect(viz.locator('[data-n="result"]')).toHaveText("504 Gateway Timeout");
    await expect(viz.locator('[data-n="clock"]')).toHaveText("10.00 s");

    await viz.getByRole("button", { name: "A bug in the code" }).click();
    await viz.getByRole("button", { name: "Send a request" }).click();
    await expect(say).toContainText("failed fast", { timeout: 20_000 });
    await expect(viz.locator('[data-n="result"]')).toHaveText("500 Internal Server Error");
    await expect(viz.locator('[data-n="clock"]')).toHaveText("0.05 s");
  });

  test("keyboard: deleting the app's outbound rule times out at the database hop", async ({ page }) => {
    const viz = page.locator('[data-viz="sg-chain"]');
    await viz.getByRole("button", { name: "App outbound rule deleted" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "App outbound rule deleted" })).toHaveAttribute("aria-pressed", "true");
    await viz.getByRole("button", { name: "Send a request" }).press("Space");
    await expect(viz.locator(".viz-say")).toContainText("Step 5: timed out", { timeout: 20_000 });
    await expect(viz.locator('[data-n="clock"]')).toHaveText("30.00 s");
    await viz.getByRole("button", { name: "Reset" }).click();
    await expect(viz.getByRole("button", { name: "Nothing: every rule is right" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("own vs rent", () => {
  test("owning too few turns orders away; playing the day narrates the result", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/what-the-cloud-is/");
    const viz = page.locator('[data-viz="own-vs-rent"]');
    await expect(viz.locator('[data-n="own-cost"]')).toHaveText("$230 a month");
    await expect(viz.locator('[data-n="rent-cost"]')).toHaveText("$216 a month");
    await viz.getByRole("button", { name: "Lunch and dinner rush" }).click();
    await expect(viz.locator('[data-n="own-drop"]')).toHaveText("1,600 orders turned away a day");
    await expect(viz.locator('[data-n="rent-cost"]')).toHaveText("$234 a month");
    await viz.getByRole("button", { name: "8", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.locator('[data-n="own-drop"]')).toHaveText("0 orders turned away a day");
    await expect(viz.locator('[data-n="own-cost"]')).toHaveText("$461 a month");
    await expect(viz.locator('[data-n="col-rent"]')).toHaveClass(/win/);
    await viz.getByRole("button", { name: "Play the day" }).click();
    await expect(viz.locator(".viz-say")).toContainText("idle server-hours every day");
  });
});

/* ---------------- accessibility ---------------- */

test.describe("cloud and networking lessons: accessibility (axe)", () => {
  const PATHS = ["what-the-cloud-is", "iam", "regions-and-zones", "subnets-and-cidr", "routing", "security-groups", "dns-and-https"].map((s) => `/lessons/${s}/`);
  for (const scheme of ["light", "dark"] as const) {
    for (const path of PATHS) {
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

test.describe("cloud and networking lessons: no sideways scroll at 360px", () => {
  test("every lesson fits", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const slug of ["what-the-cloud-is", "iam", "regions-and-zones", "subnets-and-cidr", "routing", "security-groups", "dns-and-https"]) {
      await page.goto(`/lessons/${slug}/`);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, slug).toBeLessThanOrEqual(0);
    }
  });
});
