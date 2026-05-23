import { test, expect } from "./fixtures";

test("the service worker boots and exposes an extension id", async ({
  serviceWorker,
  extensionId,
}) => {
  expect(serviceWorker.url()).toMatch(/^chrome-extension:\/\//);
  expect(extensionId).toMatch(/^[a-z]{32}$/);
});

test("seedDefaults runs on install and populates moduleSettings", async ({
  serviceWorker,
}) => {
  // The background service worker seeds defaults on `onInstalled`. Wait briefly
  // for that to land in storage, then read it back from the worker context.
  const settings = await serviceWorker.evaluate<unknown>(async () => {
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      const stored = await chrome.storage.sync.get("moduleSettings");
      if (stored["moduleSettings"]) return stored["moduleSettings"];
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  });

  expect(settings).toMatchObject({
    shorts: { enabled: false },
    channels: { enabled: false },
  });
});
