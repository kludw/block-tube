import { test, expect } from "../fixtures";

const YT_STUB = `<!doctype html>
<html><head><title>Stub YouTube</title></head>
<body>
  <div id="content">
    <ytd-reel-item-renderer>shorts item</ytd-reel-item-renderer>
    <ytd-ad-slot-renderer>ad</ytd-ad-slot-renderer>
  </div>
</body></html>`;

test.describe("shorts module", () => {
  test("redirects /shorts away from the page when enabled", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        moduleSettings: { shorts: { enabled: true } },
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: YT_STUB,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/shorts/abc");

    await expect
      .poll(() => page.url(), { timeout: 5_000 })
      .not.toContain("/shorts");
  });

  test("does not redirect when the module is disabled", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        moduleSettings: { shorts: { enabled: false } },
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: YT_STUB,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/shorts/abc");
    await page.waitForTimeout(1_000);
    expect(page.url()).toContain("/shorts/abc");
  });

  test("injects CSS that hides shorts renderers when enabled", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        moduleSettings: { shorts: { enabled: true } },
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: YT_STUB,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/");

    await expect
      .poll(
        () =>
          page
            .locator("ytd-reel-item-renderer")
            .evaluate((el) => getComputedStyle(el).display),
        { timeout: 5_000 },
      )
      .toBe("none");
  });

  test("does not hide shorts renderers when the module is disabled", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        moduleSettings: { shorts: { enabled: false } },
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: YT_STUB,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/");
    await page.waitForTimeout(500);

    const display = await page
      .locator("ytd-reel-item-renderer")
      .evaluate((el) => getComputedStyle(el).display);
    expect(display).not.toBe("none");
  });
});
