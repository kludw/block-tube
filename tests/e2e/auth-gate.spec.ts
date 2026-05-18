import { test, expect } from "./fixtures";

test.describe("auth gate", () => {
  test("shows the sign-in screen when signed out", async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({ authState: { signedIn: false } });
    });

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    await expect(
      page.getByRole("button", { name: "Sign in with Google" }),
    ).toBeVisible();
    await expect(page.locator("#module-list")).toBeHidden();
    await expect(page.locator("#auth-footer")).toBeHidden();
  });

  test("reveals the module list once signed in", async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({ authState: { signedIn: false } });
    });

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await expect(page.locator("#auth-gate")).toBeVisible();

    // Simulate a successful sign-in by writing the state directly; we can't
    // drive the real Google OAuth flow in a test runner.
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        authState: { signedIn: true, email: "user@example.com" },
      });
    });

    await expect(page.locator("#auth-gate")).toBeHidden();
    await expect(page.locator("#module-list")).toBeVisible();
    await expect(page.getByText("Shorts Blocker")).toBeVisible();
    await expect(page.locator("#auth-email")).toHaveText("user@example.com");
  });

  test("signing out hides the modules again", async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await expect(page.locator("#module-list")).toBeVisible();

    // Wipe the cached token to keep signOut() from waiting on chrome.identity.
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({ authState: { signedIn: false } });
    });

    await expect(page.locator("#auth-gate")).toBeVisible();
    await expect(page.locator("#module-list")).toBeHidden();
  });

  test("bridge.ts withholds channel patterns when signed out", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        authState: { signedIn: false },
        moduleSettings: {
          shorts: { enabled: true },
          channels: { enabled: true },
        },
        blockedChannels: [{ pattern: "foo", addedAt: Date.now() }],
      });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body></body></html>",
      });
    });

    await context.addInitScript(() => {
      (window as unknown as { __captured: unknown[] }).__captured = [];
      window.addEventListener("message", (event) => {
        const data = event.data as
          | { from?: string; type?: string; data?: unknown }
          | undefined;
        if (data?.from === "BLOCKED_CONTENT") {
          (window as unknown as { __captured: unknown[] }).__captured.push(
            data,
          );
        }
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/");

    await page.waitForFunction(
      () =>
        (window as unknown as { __captured: unknown[] }).__captured.length > 0,
      null,
      { timeout: 5_000 },
    );

    const captured = await page.evaluate(
      () =>
        (
          window as unknown as {
            __captured: { type?: string; data?: unknown }[];
          }
        ).__captured,
    );
    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].type).toBe("channelPatterns");
    expect(captured[0].data).toBeUndefined();
  });

  test("Shorts redirect does not fire when signed out", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({ authState: { signedIn: false } });
    });

    await context.route("https://www.youtube.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body></body></html>",
      });
    });

    const page = await context.newPage();
    await page.goto("https://www.youtube.com/shorts/abc");
    await page.waitForTimeout(1_000);
    expect(page.url()).toContain("/shorts/abc");
  });
});
