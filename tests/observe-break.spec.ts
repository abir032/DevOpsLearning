import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/* Visuals for module 06 (Watching it run) and module 11 (When things break). */

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test.describe("observe-break visuals", () => {
  test("Logs query: plain text can't split the errors; JSON finds two causes", async ({ page }) => {
    await page.goto("/lessons/logs-and-metrics/");
    const viz = page.locator('[data-viz="logs-query"]');
    const say = viz.locator(".viz-say");
    await expect(viz.locator(".lq-l")).toHaveCount(12);
    await viz.getByRole("button", { name: "Plain text" }).click();
    await viz.getByRole("button", { name: "OperationalError" }).click();
    await expect(say).toContainText("Plain text can't answer this");
    await expect(say).toHaveClass(/bad/);
    await expect(viz.locator(".lq-code")).toContainText("@message like /OperationalError/");
    // switch to JSON and count by error_type with the keyboard
    await viz.getByRole("button", { name: "Structured JSON" }).focus();
    await page.keyboard.press("Enter");
    await viz.getByRole("button", { name: "Any" }).nth(1).click();
    await viz.getByRole("button", { name: "ERROR", exact: true }).click();
    await viz.getByRole("button", { name: "Count by error_type" }).press("Space");
    await expect(viz.locator(".lq-tbl tbody tr")).toHaveCount(2);
    await expect(viz.locator(".lq-tbl")).toContainText("ProgrammingError");
    await expect(viz.locator(".lq-code")).toContainText('filter level = "ERROR"');
    await expect(say).toContainText("Two causes, one message");
    await expect(say).toHaveClass(/good/);
  });

  test("Alarm simulator: a blip fires 1 of 1 but not 2 of 3; quiet night needs missing = good", async ({ page }) => {
    await page.goto("/lessons/alarms/");
    const viz = page.locator('[data-viz="alarm-sim"]');
    const say = viz.locator(".viz-say");
    await expect(say).toContainText("Fired at 02:04");
    await viz.getByRole("button", { name: "One-minute blip" }).click();
    await expect(say).toContainText("False alarm");
    await expect(viz.locator(".as-cell.alarm")).toHaveCount(1);
    await viz.getByRole("button", { name: "2 of 3" }).click();
    await expect(say).toContainText("Stayed quiet");
    await expect(viz.locator(".as-cell.alarm")).toHaveCount(0);
    await viz.getByRole("button", { name: "Noisy but fine" }).click();
    await viz.getByRole("button", { name: "1 of 1" }).click();
    await expect(say).toContainText("Flapping");
    await viz.getByRole("button", { name: "Quiet night" }).click();
    await viz.getByRole("button", { name: "missing", exact: true }).click();
    await expect(say).toContainText("No data for");
    await expect(viz.locator(".as-cell.insuf")).not.toHaveCount(0);
    await viz.getByRole("button", { name: "good", exact: true }).click();
    await expect(say).toContainText("OK all night");
    await expect(viz.getByRole("button", { name: "good", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("Trail lookup: filter to the revoke and read who did it; data events aren't there", async ({ page }) => {
    await page.goto("/lessons/cloudtrail/");
    const viz = page.locator('[data-viz="trail-lookup"]');
    const say = viz.locator(".viz-say");
    await expect(viz.locator(".tl-tbl tbody tr")).toHaveCount(7);
    await viz.getByRole("button", { name: "Read-only: false" }).click();
    await expect(viz.locator(".tl-tbl tbody tr")).toHaveCount(3);
    await viz.getByRole("button", { name: "Event name: RevokeSecurityGroupIngress" }).click();
    await expect(viz.locator(".tl-tbl tbody tr")).toHaveCount(1);
    await viz.locator(".tl-ev", { hasText: "RevokeSecurityGroupIngress" }).press("Enter");
    await expect(viz.locator(".tl-rec")).toContainText('"userName": "noor"');
    await expect(say).toContainText("Found it");
    await viz.getByRole("button", { name: "Event name: DeleteObject" }).click();
    await expect(viz.locator(".tl-none")).toBeVisible();
    await expect(say).toContainText("data event");
  });

  test("Triage tree: timeout → database leads to the security group", async ({ page }) => {
    await page.goto("/lessons/where-to-look-first/");
    const viz = page.locator('[data-viz="triage-tree"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "It hangs, then times out" }).click();
    await expect(viz.locator(".tt-q")).toHaveText("Where does it time out?");
    await viz.getByRole("button", { name: "The app's call to the database times out" }).click();
    await expect(viz.locator(".tt-leaf")).toContainText("inbound 3306");
    await expect(viz.locator(".tt-trail li")).toHaveCount(2);
    await expect(say).toContainText("Where to look");
    await expect(viz.locator('.tt-lesson a[href$="/lessons/security-groups/"]')).toBeVisible();
    // back, then a different branch, using the keyboard
    await viz.getByRole("button", { name: "Back one step" }).click();
    await viz.getByRole("button", { name: "Start again" }).click();
    await expect(viz.locator(".tt-trail li")).toHaveCount(0);
    await viz.getByRole("button", { name: "An HTTP 5xx error" }).press("Enter");
    await viz.getByRole("button", { name: "503 from the load balancer" }).press("Enter");
    await expect(viz.locator(".tt-leaf")).toContainText("no healthy targets");
  });

  test("Runbook dry run: the first draft is over target; the fixed one is within it", async ({ page }) => {
    await page.goto("/lessons/runbooks/");
    const viz = page.locator('[data-viz="runbook-run"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Run next step" }).click();
    await expect(say).toContainText("Step 1 of 6");
    await expect(viz.locator(".rb-s.slow")).toHaveCount(1);
    await viz.getByRole("button", { name: "Run to the end" }).click();
    await expect(say).toContainText("over target");
    await expect(viz.locator(".rb-clock")).toContainText("37 min");
    await expect(viz.getByRole("button", { name: "Run next step" })).toBeDisabled();
    await viz.getByRole("button", { name: "After the dry run" }).click();
    await expect(viz.locator(".rb-clock")).toContainText("0 min");
    await viz.getByRole("button", { name: "Run to the end" }).press("Enter");
    await expect(say).toContainText("within target");
    await expect(say).toHaveClass(/good/);
    await expect(viz.locator(".rb-clock")).toContainText("15 min");
  });

  test("Incident replay: step through to the lesson, and switch incidents", async ({ page }) => {
    await page.goto("/lessons/real-incidents/");
    const viz = page.locator('[data-viz="incident-replay"]');
    const say = viz.locator(".viz-say");
    const next = viz.getByRole("button", { name: "Next event" });
    await next.click();
    await expect(viz.locator(".ir-ph.cur")).toHaveText("Detect");
    await next.click();
    await expect(say).toHaveClass(/bad/);
    while (await next.isEnabled()) await next.click();
    await expect(say).toContainText("end of the replay");
    await expect(viz.locator(".ir-ph.on")).toHaveCount(5);
    await viz.getByRole("button", { name: "One error, two causes" }).click();
    await expect(viz.locator(".ir-b.vis")).toHaveCount(0);
    await viz.getByRole("button", { name: "Play" }).click();
    await expect(viz.locator(".ir-b.vis")).toHaveCount(1);
    await viz.getByRole("button", { name: "Pause" }).click();
    await expect(viz.getByRole("button", { name: "Play" })).toBeVisible();
  });
});

test.describe("observe-break accessibility (axe)", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const slug of ["logs-and-metrics", "alarms", "cloudtrail", "where-to-look-first", "runbooks", "real-incidents"]) {
      test(`${slug} (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(`/lessons/${slug}/`);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        const summary = r.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
        expect(summary).toEqual([]);
      });
    }
  }

  test("no lesson in this group scrolls sideways at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const slug of ["logs-and-metrics", "alarms", "cloudtrail", "where-to-look-first", "runbooks", "real-incidents"]) {
      await page.goto(`/lessons/${slug}/`);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, slug).toBeLessThanOrEqual(0);
    }
  });
});
