const { chromium } = require("../frontend/node_modules/playwright");
const { spawn } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "..");
const api = spawn(
  "python",
  [
    "-m",
    "uvicorn",
    "backend.app.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    "8000",
  ],
  { cwd: root, stdio: "ignore" },
);
const vite = spawn(
  "node",
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
  { cwd: root + "/frontend", stdio: "ignore" },
);
(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (let i = 0; i < 40; i++) {
      try {
        await page.goto("http://127.0.0.1:5173/");
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    await page.locator(".stats-strip").waitFor();
    await page.screenshot({
      path: root + "/qa/desktop-overview.png",
      fullPage: true,
      animations: "disabled",
    });
    const recordCount = await page.locator(".record-row").count();
    if (!recordCount) throw Error("No speech rows");
    await page
      .locator(".nav-item")
      .filter({ hasText: "Speech explorer" })
      .click();
    await page
      .getByRole("heading", { name: "Speech explorer", exact: true })
      .waitFor();
    await page.getByLabel("Search records").fill("zzzznothing");
    await page.getByText("No records found", { exact: true }).waitFor();
    await page.getByLabel("Clear search").click();
    await page.locator(".row-main").first().click();
    await page.getByRole("dialog").waitFor();
    await page.getByLabel("Transcript language").selectOption("ta");
    await page.screenshot({
      path: root + "/qa/speech-detail.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    if (
      !(await page.evaluate(() =>
        document.activeElement.classList.contains("row-main"),
      ))
    )
      throw Error("Dialog focus did not return");
    await page.getByLabel("Save record", { exact: true }).first().click();
    await page
      .locator(".nav-item")
      .filter({ hasText: "Saved records" })
      .click();
    await page
      .getByRole("heading", { name: "Saved records", exact: true })
      .waitFor();
    if ((await page.locator(".record-row").count()) !== 1)
      throw Error("Bookmark missing");
    await page.reload();
    await page.getByLabel("Unsave record").waitFor();
    await page
      .locator(".nav-item")
      .filter({ hasText: "Compare leaders" })
      .click();
    await page.locator(".choice").nth(0).click();
    await page.locator(".choice").nth(1).click();
    await page.locator(".comparison-table").waitFor();
    await page.locator(".nav-item").filter({ hasText: "Commitments" }).click();
    await page.locator(".commitment-card .text-button").first().click();
    await page.locator(".event-list .source-link").first().waitFor();
    await page.keyboard.press("Escape");
    await page
      .locator(".nav-item")
      .filter({ hasText: "Issue timelines" })
      .click();
    await page
      .getByRole("button", { name: "Explore timeline" })
      .first()
      .click();
    await page.locator(".event-list").waitFor();
    await page.keyboard.press("Escape");
    await page
      .locator(".nav-item")
      .filter({ hasText: "People & profiles" })
      .click();
    await page.locator(".person-card .text-button").first().click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByLabel("Switch to dark theme").click();
    await page.screenshot({
      path: root + "/qa/dark-profiles.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.getByLabel("Switch to light theme").click();
    await page
      .locator(".nav-item")
      .filter({ hasText: "Overview" })
      .first()
      .click();
    await page.locator(".stats-strip").waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: root + "/qa/mobile-overview.png",
      fullPage: true,
      animations: "disabled",
    });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Mobile horizontal overflow");
    await page.getByLabel("Open navigation").click();
    await page
      .locator(".nav-item")
      .filter({ hasText: "Speech explorer" })
      .click();
    await page
      .getByRole("heading", { name: "Speech explorer", exact: true })
      .waitFor();
    if (await page.locator(".sidebar.open").count())
      throw Error("Mobile menu stayed open");
    // API failure must be visible and require an explicit demo choice.
    await page.route("**/api/workspace", (r) =>
      r.fulfill({ status: 503, body: "{}" }),
    );
    await page.reload();
    await page.getByText("Data service unavailable", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Explore labelled sample data" })
      .click();
    await page.locator(".record-row").first().waitFor();
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      JSON.stringify({
        result: "PASS",
        checks: [
          "desktop views",
          "search empty/reset",
          "detail/dialog/focus/Escape",
          "Tamil transcript",
          "save and reload",
          "comparison",
          "commitment sources",
          "timelines",
          "profiles",
          "dark theme",
          "390px no overflow",
          "mobile menu",
          "API error and explicit demo",
        ],
        pageErrors: errors,
      }),
    );
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    api.kill();
    vite.kill();
  }
})();
