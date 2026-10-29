import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("demo import, evidence, investigation, action, scenario, analyst and export", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Business overview", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Your investigation queue", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Data workspace", exact: true })
    .click();
  await page.getByLabel("Dataset type").selectOption("clients");
  const sourceId = `BROWSER-${Date.now()}`;
  await page.getByLabel("Upload CSV or XLSX").setInputFiles({
    name: "browser-client.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `Customer ID,Customer Name,Currency\n${sourceId},Browser Fictional Client,USD\n`,
    ),
  });
  await expect(
    page.getByText("Map source columns", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Map source_id").selectOption("Customer ID");
  await page.getByLabel("Map name").selectOption("Customer Name");
  await page.getByLabel("Map currency").selectOption("Currency");
  await page.getByRole("button", { name: "Validate mapping" }).click();
  await page
    .getByRole("button", { name: "Import 1 valid records", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Imported 1 records");
  const all = await (await request.get("/api/v1/datasets")).json();
  const imported = all.find(
    (d: any) => d.name === "browser-client.csv" && d.status === "active",
  );
  expect(imported).toBeTruthy();
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Analysis complete");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Investigations/ })
    .click();
  await page
    .getByRole("button", { name: /Overdue invoice/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Finding evidence" });
  await expect(
    dialog.getByRole("heading", { name: "Supporting source evidence" }),
  ).toBeVisible();
  const findingId = await dialog.locator("code").textContent();
  const before = await (
    await request.get(`/api/v1/evidence/${findingId}`)
  ).json();
  await dialog.getByLabel("Investigation status").selectOption("Investigating");
  await expect(page.getByRole("status")).toContainText(
    "Investigation status saved",
  );
  await dialog.getByLabel("Assigned owner").fill("Demo analyst");
  await dialog
    .getByLabel("Investigation note")
    .fill("Browser test reviewed the linked source evidence.");
  await dialog.getByRole("button", { name: "Save owner & note" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Investigation notes saved",
  );
  await dialog.getByRole("button", { name: "Close evidence" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Actions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create action", exact: true })
    .click();
  await page.getByLabel("Action title").fill("Review fictional invoice");
  await page.getByLabel("Owner", { exact: true }).fill("Demo analyst");
  await page.getByLabel("Due date", { exact: true }).fill("2026-11-01");
  await page.getByLabel("Related finding ID").fill(findingId!);
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Check supporting payment allocations.");
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(
    page
      .getByRole("cell", { name: "Review fictional invoice", exact: true })
      .last(),
  ).toBeVisible();
  await page
    .getByLabel("Status for Review fictional invoice")
    .last()
    .selectOption("Done");
  await expect(page.getByRole("status")).toContainText("Action updated");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Scenarios", exact: true })
    .click();
  await page.getByRole("button", { name: "Calculate scenario" }).click();
  await expect(
    page.getByRole("heading", { name: "Assumptions & limitations" }),
  ).toBeVisible();
  await expect(
    page.getByText("Working capital release", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "AI Analyst", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Which clients have the highest overdue balances?",
    })
    .click();
  await expect(page.locator(".answer")).toContainText(
    "Outstanding receivables",
  );
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Reports", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "PDF", exact: true }).first().click();
  expect((await download).suggestedFilename()).toBe("marginproof-business.pdf");
  await request.patch(`/api/v1/findings/${findingId}`, {
    data: {
      status: before.finding.status,
      owner: before.finding.owner,
      note: "Browser workflow restored original state.",
    },
  });
  expect(
    (await request.delete(`/api/v1/datasets/${imported.id}`)).ok(),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("filters, empty currency, offline recovery, keyboard and responsive layouts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Your investigation queue", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Reporting currency").selectOption("EUR");
  await expect(page.locator(".metric-value").first()).toContainText("€0");
  await expect(
    page.getByText("No records in this view.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Reporting currency").selectOption("USD");
  await page.getByLabel("Start date").fill("2026-10-01");
  await expect(page.locator(".metric-value").first()).toContainText("201,250");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Revenue", exact: true })
    .click();
  await expect(page.getByLabel("Start date")).toHaveValue("2026-10-01");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    // Wait for responsive layout and chart ResizeObservers, not a fixed delay.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(
      page.getByRole("heading", { name: "Business overview", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    if (width === 320) {
      await page.screenshot({
        path: "../docs/overview-mobile.png",
        fullPage: true,
        animations: "disabled",
      });
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation")
        .getByRole("button", { name: "Scenarios", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "What would change?" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation")
        .getByRole("button", { name: "Overview", exact: true })
        .click();
    }
  }
  await page.route("**/api/v1/dashboard*", (route) => route.abort());
  await page.getByLabel("Start date").fill("2026-09-01");
  await expect(page.getByText("We couldn’t connect to your data")).toBeVisible({
    timeout: 30000,
  });
  await page.unroute("**/api/v1/dashboard*");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText("Your investigation queue", { exact: true }),
  ).toBeVisible();
});

test("WCAG automated audit on dashboard and import screen", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Your investigation queue", { exact: true }),
  ).toBeVisible();
  const overview = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    overview.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Data workspace", exact: true })
    .click();
  const imports = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    imports.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
