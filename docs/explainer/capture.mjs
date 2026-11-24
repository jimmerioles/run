// Capture hook for Run. Grabs the page at the beats the film needs:
// idle, mid-run with a robot working, complete, and the phone layout.
export default async function capture({ page, config, out }) {
  await page.goto(config.capture.url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);

  const shot = async (selector, name) => {
    await page.locator(selector).screenshot({ path: `${out}/${name}` });
  };

  await shot("body", "page-idle.png");
  await shot("#terminal-window", "terminal-idle.png");

  await page.locator("#run-button").click();
  await page.waitForSelector('.task[data-task="types"][data-state="working"]', {
    timeout: 15000,
  });
  await page.waitForTimeout(750);
  await shot("#terminal-window", "terminal-working.png");

  await page.waitForSelector('.task[data-task="tests"][data-state="working"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(450);
  await shot("#terminal-window", "terminal-tests.png");

  await page.waitForSelector('#result[data-state="complete"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(650);
  await shot("#terminal-window", "terminal-complete.png");
  await shot("body", "page-complete.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await shot("body", "page-mobile.png");

  return [
    "page-idle.png",
    "terminal-idle.png",
    "terminal-working.png",
    "terminal-tests.png",
    "terminal-complete.png",
    "page-complete.png",
    "page-mobile.png",
  ];
}
