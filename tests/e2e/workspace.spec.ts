import { test, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { extractText } from "unpdf";
const screenshotDir = "/tmp/vendor-risk-qa";
test("demo happy path: evidence, overrides, editable questions, copy and real exports", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page).toHaveTitle(/VendorRisk Triage/);
  await expect(
    page.getByRole("heading", { name: "Northwind Logistics Ltd", exact: true }),
  ).toBeVisible();
  const workspace = page.locator("#workspace-northwind-logistics");
  const score = workspace.getByTestId("overall-score");
  await expect(score).toHaveText("68");
  await expect(workspace.locator(".document-card")).toHaveCount(4);
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({
    caret: "initial",
    path: `${screenshotDir}/desktop.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Run triage", exact: true }).click();
  await expect(
    page.getByText("Turning evidence into a clear assessment."),
  ).toBeVisible();
  await expect(
    page.locator("main:visible").getByText(/Assessment completed · Demo mode/),
  ).toBeVisible();
  await expect(score).toHaveText("68");
  await page
    .getByRole("button", {
      name: "MFA not enforced for privileged accounts",
      exact: true,
    })
    .click();
  const drawer = page.getByRole("dialog", {
    name: "MFA not enforced for privileged accounts",
  });
  await expect(
    drawer.getByText("Verified in source", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    caret: "initial",
    path: `${screenshotDir}/evidence.png`,
    fullPage: false,
  });
  await drawer.getByRole("button", { name: "View in document" }).click();
  await expect(page.getByTestId("citation-highlight")).toContainText(
    "MFA is optional for legacy administrator accounts.",
  );
  await page.screenshot({
    caret: "initial",
    path: `${screenshotDir}/citation.png`,
    fullPage: false,
  });
  await page
    .getByRole("dialog", { name: "Security questionnaire" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await drawer.getByRole("combobox", { name: "Severity override" }).click();
  await page.getByRole("option", { name: "Medium", exact: true }).click();
  await drawer
    .getByLabel("Analyst note", { exact: true })
    .fill("Compensating controls reviewed. Request enforcement evidence.");
  await drawer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(score).toHaveText("64");
  await workspace.getByRole("combobox", { name: "Filter by severity" }).click();
  await page.getByRole("option", { name: "Medium", exact: true }).click();
  await expect(workspace.locator("tbody tr")).toHaveCount(2);
  await workspace.getByRole("combobox", { name: "Filter by severity" }).click();
  await page
    .getByRole("option", { name: "All severities", exact: true })
    .click();
  await workspace
    .getByRole("button", { name: "Sort by Score", exact: true })
    .click();
  await expect(workspace.locator("tbody tr").first()).toContainText("NW-02");
  await workspace
    .getByRole("button", { name: "Sort by Score", exact: true })
    .click();
  await expect(workspace.locator("tbody tr").first()).toContainText("NW-01");
  await workspace.getByRole("tab", { name: /Follow-up questions/ }).click();
  const question = page.getByLabel("Follow-up for NW-01", { exact: true });
  await question.fill(
    "Please share the administrator MFA enforcement report and completion date.",
  );
  await page.screenshot({
    caret: "initial",
    path: `${screenshotDir}/followups.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Copy as email", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("administrator MFA enforcement report");
  await page
    .getByRole("button", { name: "Export report", exact: true })
    .click();
  const mdPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Markdown", exact: true })
    .click();
  const md = await mdPromise;
  const mdText = await readFile((await md.path())!, "utf8");
  expect(mdText).toContain("64/100");
  expect(mdText).toContain("Compensating controls reviewed");
  expect(mdText).toContain("administrator MFA enforcement report");
  expect(mdText).toContain("Synthetic demo data");
  const pdfPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const pdf = await pdfPromise;
  const pdfPath = (await pdf.path())!;
  await pdf.saveAs(`${screenshotDir}/northwind-report.pdf`);
  const bytes = await readFile(pdfPath);
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  const pages = await extractText(new Uint8Array(bytes), { mergePages: false });
  expect(
    pages.text.every((p) =>
      /Not an audit or certification\./.test(p.replace(/\s+/g, " ")),
    ),
  ).toBe(true);
  const pdfText = { text: pages.text.join(" ") };
  expect(pdfText.text).toContain("64/100");
  expect(pdfText.text).toContain("Compensating controls reviewed");
  expect(pdfText.text).toContain("administrator MFA enforcement report");
  expect(pdfText.text).toContain("Synthetic demo data");
  await page
    .getByRole("dialog", { name: "Export assessment" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.reload();
  await expect(score).toHaveText("64");
  await workspace.getByRole("tab", { name: /Follow-up questions/ }).click();
  await expect(
    page.getByLabel("Follow-up for NW-01", { exact: true }),
  ).toHaveValue(/MFA enforcement report/);
  expect(errors).toEqual([]);
});
test("all sample vendors and PDF citation are reviewed end to end", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of ["Apex BioLabs Ltd", "Sterling FinTech Ltd"]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Run triage", exact: true }).click();
    await expect(
      page
        .locator("main:visible")
        .getByText(/Assessment completed · Demo mode/),
    ).toBeVisible();
    const active = page.locator("main:visible");
    expect(await active.locator("tbody tr").count()).toBeGreaterThan(0);
    if (name.startsWith("Apex")) {
      await page
        .getByRole("button", {
          name: "Penetration testing is overdue",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "View in document", exact: true })
        .click();
      await expect(page.getByTestId("citation-highlight")).toContainText(
        "18 months ago",
      );
      await page
        .getByRole("dialog", { name: "Security questionnaire", exact: true })
        .getByRole("button", { name: "Close", exact: true })
        .click();
      await page
        .getByRole("dialog", {
          name: "Penetration testing is overdue",
          exact: true,
        })
        .getByRole("button", { name: "Close", exact: true })
        .click();
    }
  }
});
test("new vendor accepts Markdown, TXT and a real PDF and keeps its session on navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New vendor", exact: true }).click();
  await page
    .getByLabel("Vendor name", { exact: true })
    .fill("Fictional Cloud Ltd");
  await page.getByLabel("Sector", { exact: true }).fill("Cloud software");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    page.getByText("No documents yet", { exact: true }),
  ).toBeVisible();
  await page.locator("main:visible input[type=file]").setInputFiles([
    {
      name: "policy.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# Access\nMFA is optional for administrators."),
    },
    {
      name: "recovery.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "The disaster recovery plan has never been tested. RPO is 24 hours.",
      ),
    },
    {
      name: "security-questionnaire.pdf",
      mimeType: "application/pdf",
      buffer: await readFile(
        "data/vendors/apex-biolabs/security-questionnaire.pdf",
      ),
    },
  ]);
  await page.getByRole("button", { name: /Northwind Logistics Ltd/ }).click();
  await page.getByRole("button", { name: /Fictional Cloud Ltd/ }).click();
  await expect(page.locator("main:visible .document-card")).toHaveCount(3);
  await page
    .locator("main:visible .header-actions")
    .getByRole("button", { name: "Run triage", exact: true })
    .click();
  await expect(
    page
      .locator(".topbar:visible")
      .getByText("Rule-based (demo mode)", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main:visible tbody tr")).toHaveCount(7);
  await page
    .getByRole("button", {
      name: "Privileged access controls need follow-up",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Verified in source", { exact: true }),
  ).toBeVisible();
});
test("typed API failure offers retry and demo fallback", async ({ page }) => {
  await page.route("**/api/triage", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: {
          message: "Provider temporarily unavailable.",
          canUseDemo: true,
        },
      }),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Run triage", exact: true }).click();
  await expect(page.locator("main:visible").getByRole("alert")).toContainText(
    "Provider temporarily unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Run in demo mode instead" }),
  ).toBeVisible();
  await page.unroute("**/api/triage");
  await page.getByRole("button", { name: "Run in demo mode instead" }).click();
  await expect(
    page.locator("main:visible").getByText(/Assessment completed · Demo mode/),
  ).toBeVisible();
});
test("responsive layouts and dark mode", async ({ page }) => {
  await page.goto("/");
  await mkdir(screenshotDir, { recursive: true });
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page.getByRole("heading", {
        name: "Northwind Logistics Ltd",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      caret: "initial",
      path: `${screenshotDir}/viewport-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Toggle dark mode", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    caret: "initial",
    path: `${screenshotDir}/dark-mobile.png`,
    fullPage: true,
  });
});
