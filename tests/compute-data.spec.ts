import { test, expect } from "@playwright/test";

/* The compute and data lessons: each visual's main path, with reduced motion. */

test.describe("compute and data visuals", () => {
test("EC2 lifecycle: a hand fix survives reboot and stop, and is lost on replacement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lessons/ec2/");
  const viz = page.locator('[data-viz="ec2-life"]');
  const say = viz.locator(".viz-say");
  await viz.getByRole("button", { name: "Launch from the AMI" }).click();
  await expect(say).toContainText("user data", { timeout: 10_000 });
  await expect(viz.locator('[data-n="state"]')).toHaveText("running");
  await viz.getByRole("button", { name: "Fix something by hand" }).click();
  await expect(viz.locator('[data-n="disk"]')).toContainText("A config fix");
  await viz.getByRole("button", { name: "Reboot" }).click();
  await expect(say).toContainText("User data did not run again", { timeout: 10_000 });
  await viz.getByRole("button", { name: "Stop" }).click();
  await expect(viz.locator('[data-n="state"]')).toHaveText("stopped", { timeout: 10_000 });
  await expect(viz.locator('[data-n="ip"]')).toHaveText("none");
  // keyboard: start it again
  await viz.getByRole("button", { name: "Start" }).press("Enter");
  await expect(say).toContainText("public IP is different", { timeout: 10_000 });
  await expect(viz.locator('[data-n="disk"]')).toContainText("A config fix");
  await viz.getByRole("button", { name: "Terminate" }).click();
  await expect(say).toContainText("deleted with it", { timeout: 10_000 });
  await viz.getByRole("button", { name: "Launch from the AMI" }).click();
  await expect(say).toContainText("hand-made fix is not here", { timeout: 10_000 });
  await expect(viz.locator('[data-n="disk"]')).not.toContainText("A config fix");
  await expect(say).toHaveClass(/bad/);
});

test("Load balancer: health checks decide who gets traffic; a deep check empties the group", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lessons/load-balancers/");
  const viz = page.locator('[data-viz="lb-spread"]');
  const say = viz.locator(".viz-say");
  const send = viz.getByRole("button", { name: "Send 6 requests" });
  await send.click();
  await expect(say).toContainText("Done: 6 requests", { timeout: 20_000 });
  await expect(viz.locator('[data-n="n200"]')).toHaveText("6");
  // crash server B: after two failed checks it gets no traffic
  await viz.getByRole("button", { name: "Crash the app on Server B" }).click();
  await expect(say).toContainText("Traffic now goes only to A, C", { timeout: 10_000 });
  await expect(viz.locator('[data-n="st-b"]')).toHaveText("unhealthy: no traffic");
  await send.click();
  await expect(say).toContainText("Done: 6 requests", { timeout: 20_000 });
  await expect(say).not.toContainText("B took");
  // bring B back, break the database: shallow check keeps everyone in
  await viz.getByRole("button", { name: "Crash the app on Server B" }).click();
  await expect(say).toContainText("Every server is back in", { timeout: 10_000 });
  await viz.locator('[data-act="db"]').click();
  await expect(say).toContainText("doesn't touch it", { timeout: 10_000 });
  await send.click();
  await expect(say).toContainText("degraded, not down", { timeout: 20_000 });
  // keyboard: switch to a deep check
  await viz.getByRole("button", { name: "Deep" }).press("Enter");
  await expect(say).toContainText("total outage", { timeout: 10_000 });
  // with nothing healthy, the ALB fails open: requests still reach the servers, and fail with 500
  await send.click();
  await expect(say).toContainText("failed open", { timeout: 20_000 });
  await expect(viz.locator('[data-n="n500"]')).toHaveText("12");
  await expect(viz.locator('[data-n="n502"]')).toHaveText("0");
  await viz.getByRole("button", { name: "Reset" }).click();
  await expect(viz.locator('[data-n="n500"]')).toHaveText("0");
});

  test("Auto scaling: a rush scales out to the max, and a terminated server is replaced", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/auto-scaling/");
    const viz = page.locator('[data-viz="asg-load"]');
    const say = viz.locator(".viz-say");
    await expect(viz.locator("[data-live]")).toHaveText("2");
    // keyboard: pick the dinner rush
    await viz.getByRole("button", { name: "Dinner rush" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "Dinner rush" })).toHaveAttribute("aria-pressed", "true");
    await expect(say).toContainText("maximum of 4", { timeout: 20_000 });
    await expect(viz.locator("[data-live]")).toHaveText("4");
    await expect(viz.locator("[data-desired]")).toHaveText("4");
    // self-healing
    await viz.getByRole("button", { name: "Terminate a server" }).click();
    await expect(say).toContainText("You terminated");
    await expect(say).toContainText("replaced", { timeout: 20_000 });
    await expect(viz.locator("[data-live]")).toHaveText("4");
    // quiet again: scales back in to the minimum
    await viz.getByRole("button", { name: "Quiet" }).click();
    await expect(say).toContainText("Settled", { timeout: 20_000 });
    await expect(viz.locator("[data-live]")).toHaveText("2");
    await expect(say).toHaveClass(/good/);
  });

  test("RDS failover: Multi-AZ moves the endpoint to the standby; Single-AZ stays down", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/rds/");
    const viz = page.locator('[data-viz="rds-failover"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Fail zone a" }).click();
    await expect(say).toContainText("zone a fails");
    await expect(say).toContainText("Step 4: the API reconnects", { timeout: 20_000 });
    await expect(say).toHaveClass(/good/);
    await expect(viz.locator('[data-n="clock"]')).toHaveText("90 s");
    // keyboard: switch to Single-AZ and fail again
    await viz.getByRole("button", { name: "Single-AZ" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "Single-AZ" })).toHaveAttribute("aria-pressed", "true");
    await viz.getByRole("button", { name: "Fail zone a" }).press("Space");
    await expect(say).toContainText("still down", { timeout: 20_000 });
    await expect(say).toHaveClass(/bad/);
    await expect(viz.locator('[data-n="clock"]')).toHaveText("15 min and counting");
  });

test("SQL sandbox: an UPDATE with no WHERE is permanent under autocommit, and undoable inside a transaction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lessons/sql-safely/");
  const viz = page.locator('[data-viz="sql-sandbox"]');
  const say = viz.locator(".viz-say");
  const others = viz.locator(".sq-pane.other");
  // no transaction: the mistake is permanent at once
  await viz.getByRole("button", { name: "UPDATE with no WHERE" }).click();
  await expect(viz.locator(".sq-out")).toContainText("8 rows affected");
  await expect(say).toContainText("already permanent");
  await expect(others).not.toContainText("pending");
  await viz.getByRole("button", { name: "ROLLBACK" }).click();
  await expect(say).toContainText("nothing to undo");
  await expect(say).toHaveClass(/bad/);
  // start again, inside a transaction this time, using the keyboard
  await viz.getByRole("button", { name: "Start again" }).click();
  await viz.getByRole("button", { name: "START TRANSACTION" }).press("Enter");
  await expect(viz.locator(".sq-chip.on")).toHaveText("In a transaction");
  await viz.getByRole("button", { name: "SELECT the pending orders" }).click();
  await expect(viz.locator(".sq-out")).toContainText("3 rows in set");
  await viz.getByRole("button", { name: "UPDATE with no WHERE" }).click();
  await expect(say).toContainText("You expected 3");
  await expect(others.locator("td", { hasText: "pending" })).toHaveCount(3);
  await viz.getByRole("button", { name: "ROLLBACK" }).click();
  await expect(say).toContainText("Rolled back");
  await expect(viz.locator(".sq-pane.me td", { hasText: "pending" })).toHaveCount(3);
  // the right change, committed
  await viz.getByRole("button", { name: "START TRANSACTION" }).click();
  await viz.getByRole("button", { name: "UPDATE with the WHERE" }).click();
  await expect(viz.locator(".sq-out")).toContainText("Rows matched: 3");
  await viz.getByRole("button", { name: "COMMIT" }).click();
  await expect(say).toHaveClass(/good/);
  await expect(others.locator("td", { hasText: "cancelled" })).toHaveCount(3);
});

test("S3 versioning: a delete adds a marker that can be removed; without versioning it's gone", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lessons/s3/");
  const viz = page.locator('[data-viz="s3-versioning"]');
  const say = viz.locator(".viz-say");
  const get = viz.locator(".s3-get");
  const upload = viz.getByRole("button", { name: "Upload a menu photo" });
  await upload.click();
  await upload.click();
  await expect(viz.locator(".s3v")).toHaveCount(2);
  await expect(get).toContainText("photo 2");
  await viz.getByRole("button", { name: "Delete menu.jpg" }).click();
  await expect(viz.locator(".s3v.marker")).toHaveCount(1);
  await expect(get).toContainText("404");
  await viz.getByRole("button", { name: "Delete the delete marker" }).press("Enter");
  await expect(say).toContainText("photo 2 is current again");
  await expect(get).toContainText("200 OK");
  await viz.getByRole("button", { name: "Restore an older version" }).click();
  await expect(get).toContainText("photo 1");
  // versioning off: the overwrite and the delete are final
  await viz.getByRole("button", { name: "Off", exact: true }).click();
  await expect(viz.getByRole("button", { name: "Off", exact: true })).toHaveAttribute("aria-pressed", "true");
  await upload.click();
  await upload.click();
  await expect(say).toContainText("gone for good");
  await expect(viz.locator(".s3v")).toHaveCount(1);
  await viz.getByRole("button", { name: "Delete menu.jpg" }).click();
  await expect(say).toContainText("Gone for good");
  await viz.getByRole("button", { name: "Delete the delete marker" }).click();
  await expect(say).toHaveClass(/bad/);
  await expect(get).toContainText("404");
});

  test("Secret trail: a password in the code leaks four ways; in Secrets Manager it changes in one place", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lessons/secrets/");
    const viz = page.locator('[data-viz="secret-trail"]');
    const say = viz.locator(".viz-say");
    await viz.getByRole("button", { name: "Follow the password" }).click();
    await expect(say).toContainText("4 risky copies", { timeout: 20_000 });
    await expect(viz.locator('[data-n="copies"]')).toHaveText("4");
    await viz.getByRole("button", { name: "Change the password" }).click();
    await expect(say).toContainText("Changing it: 4 places");
    await expect(say).toHaveClass(/bad/);
    // keyboard: choose Secrets Manager
    await viz.getByRole("button", { name: "In Secrets Manager" }).focus();
    await page.keyboard.press("Enter");
    await expect(viz.getByRole("button", { name: "In Secrets Manager" })).toHaveAttribute("aria-pressed", "true");
    await viz.getByRole("button", { name: "Follow the password" }).press("Space");
    await expect(say).toContainText("No risky copies", { timeout: 20_000 });
    await expect(viz.locator(".st-stop.bad")).toHaveCount(0);
    await viz.getByRole("button", { name: "Change the password" }).click();
    await expect(say).toContainText("Changing it: 1 place");
    await expect(say).toHaveClass(/good/);
  });
});
