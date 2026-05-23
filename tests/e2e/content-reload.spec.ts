import { test, expect } from "./fixtures";

const YT_STUB = `<!doctype html>
<html><head><title>Stub YouTube</title></head>
<body><div id="content">stub</div></body></html>`;

async function trackLoads(context: import("@playwright/test").BrowserContext) {
  await context.addInitScript(() => {
    if (window.location.origin !== "https://www.youtube.com") return;
    const prev = parseInt(sessionStorage.getItem("__loadCount") ?? "0", 10);
    sessionStorage.setItem("__loadCount", String(prev + 1));
  });
}

async function readLoadCount(
  page: import("@playwright/test").Page,
): Promise<number> {
  try {
    return await page.evaluate(() =>
      parseInt(sessionStorage.getItem("__loadCount") ?? "0", 10),
    );
  } catch {
    // Navigation in progress — let the poller retry once the page settles.
    return -1;
  }
}

test.describe("youtube tab reloads on extension state changes", () => {
  test("reloads when a module switch toggles in storage", async ({
    context,
    serviceWorker,
  }) => {
    await trackLoads(context);
    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: YT_STUB,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/");
    expect(await readLoadCount(page)).toBe(1);

    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        moduleSettings: { shorts: { enabled: true } },
      });
    });

    await expect.poll(() => readLoadCount(page), { timeout: 5_000 }).toBe(2);
  });

  test("reloads when the blocked channels list changes", async ({
    context,
    serviceWorker,
  }) => {
    await trackLoads(context);
    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: YT_STUB,
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/");
    expect(await readLoadCount(page)).toBe(1);

    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        blockedChannels: [{ pattern: "TestChannel", addedAt: Date.now() }],
      });
    });

    await expect.poll(() => readLoadCount(page), { timeout: 5_000 }).toBe(2);
  });
});
