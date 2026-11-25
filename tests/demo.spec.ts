import { expect, test } from "@playwright/test";

const DEMO = "/run/";
const TASKS = ["types", "lint", "tests", "build"] as const;

const task = (id: (typeof TASKS)[number]) =>
  `.task[data-task="${id}"]`;

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
});

test("Enter starts the run and every check finishes green", async ({ page }) => {
  await page.goto(DEMO);
  await expect(page.locator("#terminal-window")).toHaveAttribute(
    "data-phase",
    "idle",
  );

  await page.keyboard.press("Enter");

  await expect(page.locator("#terminal-window")).toHaveAttribute(
    "data-phase",
    "typing",
  );
  await expect(page.locator("#run-button")).toBeDisabled();
  await expect(page.locator(".task")).toHaveCount(TASKS.length);

  for (const id of TASKS) {
    await expect(page.locator(task(id))).toHaveAttribute("data-state", "fixed", {
      timeout: 15_000,
    });
  }

  await expect(page.locator("#terminal-window")).toHaveAttribute(
    "data-phase",
    "complete",
  );
  await expect(page.locator("#result")).toHaveAttribute(
    "data-state",
    "complete",
  );
  await expect(page.locator("#result-title")).toHaveText("All checks passed");
  await expect(page.locator("#result-sub")).toHaveText(
    "12 fixes · 2m 14s · 4 files changed",
  );
  await expect(page.locator("#checks-count")).toHaveText("4 / 4");
  await expect(page.locator("#fixes-count")).toHaveText("12");
  await expect(page.locator("#meter-track")).toHaveAttribute(
    "aria-valuenow",
    "4",
  );
  await expect(page.locator("#meter-track")).toHaveAttribute(
    "aria-valuetext",
    "4 of 4 checks complete",
  );
  await expect(page.locator("#typed")).toHaveText("run fix --all");
  await expect(page.locator("#run-label")).toHaveText("Run it again");
  await expect(page.locator("#replay")).toBeVisible();
});

test("Enter on a control or with a modifier does not start the run", async ({
  page,
}) => {
  await page.goto(DEMO);

  await page.locator("#sound").focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#terminal-window")).toHaveAttribute(
    "data-phase",
    "idle",
  );
  await expect(page.locator("#sound")).toHaveAttribute("aria-pressed", "true");

  await page.locator("#headline").click();
  await page.keyboard.press("Shift+Enter");

  await expect(page.locator("#terminal-window")).toHaveAttribute(
    "data-phase",
    "idle",
  );
  await expect(page.locator("#typed")).toHaveText("");
});

test("Replay resets the counts and starts a fresh run", async ({ page }) => {
  await page.goto(DEMO);
  await page.keyboard.press("Enter");
  await expect(page.locator("#result")).toHaveAttribute(
    "data-state",
    "complete",
    { timeout: 20_000 },
  );
  await expect(page.locator("#checks-count")).toHaveText("4 / 4");

  await page.locator("#replay").click();

  await expect(page.locator("#result")).toHaveAttribute(
    "data-state",
    "running",
  );
  await expect(page.locator("#checks-count")).toHaveText("0 / 4");
  await expect(page.locator("#fixes-count")).toHaveText("00");
  await expect(page.locator("#typed")).toHaveText("run fix --all", {
    timeout: 5_000,
  });
  await expect(page.locator(task("types"))).toHaveAttribute(
    "data-state",
    "working",
    { timeout: 5_000 },
  );
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("completes with the canvas hidden", async ({ page }) => {
    await page.goto(DEMO);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator("#robots")).toBeHidden();

    await page.keyboard.press("Enter");

    await expect(page.locator("#result")).toHaveAttribute(
      "data-state",
      "complete",
      { timeout: 20_000 },
    );
    for (const id of TASKS) {
      await expect(page.locator(task(id))).toHaveAttribute(
        "data-state",
        "fixed",
      );
    }
    await expect(page.locator("#checks-count")).toHaveText("4 / 4");
    await expect(page.locator("#result-sub")).toHaveText(
      "12 fixes · 2m 14s · 4 files changed",
    );
    await expect(page.locator("#live")).toContainText("All checks passed");
  });
});

test("hiding the tab pauses the run until it is visible again", async ({
  page,
}) => {
  await page.goto(DEMO);
  await page.locator("#run-button").click();

  const types = page.locator(task("types"));
  const detail = types.locator("[data-detail]");
  await expect(types).toHaveAttribute("data-state", "working", {
    timeout: 10_000,
  });

  const before = await detail.textContent();

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await page.waitForTimeout(1_500);
  await expect(types).toHaveAttribute("data-state", "working");
  expect(await detail.textContent()).toBe(before);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect(types).toHaveAttribute("data-state", "fixed", {
    timeout: 10_000,
  });
});
