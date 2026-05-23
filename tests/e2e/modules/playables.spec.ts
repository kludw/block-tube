import { test, expect } from "../fixtures";

const STUB_WITH_SHELVES = `<!doctype html>
<html><head><title>Stub YouTube</title></head>
<body>
  <div id="content">
    <ytd-rich-shelf-renderer data-shelf="playables">
      <span id="title">YouTube Playables</span>
      <p>contents</p>
    </ytd-rich-shelf-renderer>
    <ytd-rich-shelf-renderer data-shelf="recommended">
      <span id="title">Recommended</span>
      <p>other</p>
    </ytd-rich-shelf-renderer>
  </div>
</body></html>`;

const PLAIN_STUB = `<!doctype html>
<html><head><title>Stub YouTube</title></head>
<body><div id="content">stub</div></body></html>`;

test.describe("playables module", () => {
  test("redirects /playables away from the page when enabled", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        moduleSettings: { playables: { enabled: true } },
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: PLAIN_STUB,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/playables");

    await expect
      .poll(() => page.url(), { timeout: 5_000 })
      .not.toContain("/playables");
  });

  test("does not redirect when the module is disabled", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        moduleSettings: { playables: { enabled: false } },
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: PLAIN_STUB,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/playables");
    await page.waitForTimeout(1_000);
    expect(page.url()).toContain("/playables");
  });

  test("removes the YouTube Playables shelf and leaves others alone", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        moduleSettings: { playables: { enabled: true } },
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: STUB_WITH_SHELVES,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/");

    await expect
      .poll(() => page.locator("ytd-rich-shelf-renderer").count(), {
        timeout: 5_000,
      })
      .toBe(1);

    const remainingTitle = await page
      .locator("ytd-rich-shelf-renderer #title")
      .textContent();
    expect(remainingTitle).toBe("Recommended");
  });

  test("leaves the Playables shelf alone when the module is disabled", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        moduleSettings: { playables: { enabled: false } },
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: STUB_WITH_SHELVES,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/");
    await page.waitForTimeout(500);

    expect(await page.locator("ytd-rich-shelf-renderer").count()).toBe(2);
  });
});
