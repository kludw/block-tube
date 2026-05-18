import { test, expect } from "./fixtures";

const YT_STUB = `<!doctype html>
<html><head><title>Stub YouTube</title></head>
<body><div id="content">stub</div></body></html>`;

test.describe("content script", () => {
  test("Shorts Blocker redirects /shorts away from the page", async ({
    context,
    serviceWorker: _sw,
  }) => {
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

  test("Shorts redirect is skipped when the module is disabled", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        moduleSettings: {
          shorts: { enabled: false },
          channels: { enabled: true },
        },
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
    // Give the content script a moment to (not) redirect.
    await page.waitForTimeout(1_000);
    expect(page.url()).toContain("/shorts/abc");
  });

  test("bridge.ts forwards channel patterns to the page world", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        moduleSettings: {
          shorts: { enabled: false },
          channels: { enabled: true },
        },
        blockedChannels: [{ pattern: "MrBeast", addedAt: Date.now() }],
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: YT_STUB,
      });
    });

    // bridge.ts posts at document_start, so install the capture before any
    // page script runs.
    await context.addInitScript(() => {
      (window as unknown as { __captured: unknown[] }).__captured = [];
      window.addEventListener("message", (event) => {
        const data = event.data as { from?: string } | undefined;
        if (data?.from === "BLOCKED_CONTENT") {
          (window as unknown as { __captured: unknown[] }).__captured.push(
            event.data,
          );
        }
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/");

    const captured = await page
      .waitForFunction(
        () =>
          (window as unknown as { __captured: unknown[] }).__captured.length >
          0,
        null,
        { timeout: 5_000 },
      )
      .then(() =>
        page.evaluate(
          () => (window as unknown as { __captured: unknown[] }).__captured,
        ),
      );

    expect(captured.length).toBeGreaterThan(0);
    const msg = captured[0] as { type?: string; data?: unknown };
    expect(msg.type).toBe("channelPatterns");
    expect(Array.isArray(msg.data)).toBe(true);
    expect((msg.data as unknown[]).length).toBe(1);
  });
});
