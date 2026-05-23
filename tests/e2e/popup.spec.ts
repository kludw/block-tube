import { test, expect } from "./fixtures";

test.describe("popup UI", () => {
  test("renders the registered modules", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    await expect(page.getByText("Shorts Blocker")).toBeVisible();
    await expect(page.getByText("Channel Blocker")).toBeVisible();
  });

  test("toggling a module persists the new state to storage", async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    const shortsSwitch = page.getByRole("switch", {
      name: /Enable or disable Shorts Blocker/i,
    });
    await expect(shortsSwitch).toHaveAttribute("aria-checked", "false");
    await shortsSwitch.click();
    await expect(shortsSwitch).toHaveAttribute("aria-checked", "true");

    const stored = await serviceWorker.evaluate(async () => {
      const r = await chrome.storage.sync.get("moduleSettings");
      return r["moduleSettings"] as Record<string, { enabled: boolean }>;
    });
    expect(stored.shorts.enabled).toBe(true);
    expect(stored.channels.enabled).toBe(false);
  });

  test("cog opens the Channel Blocker settings modal", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    await page
      .getByRole("button", { name: /Channel Blocker settings/i })
      .click();
    await expect(page.locator("#modal-title")).toHaveText("Channel Blocker");
    await expect(page.getByPlaceholder("Channel name")).toBeVisible();
  });

  test("the Shorts Blocker does not expose a settings cog", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await expect(
      page.getByRole("button", { name: /Shorts Blocker settings/i }),
    ).toHaveCount(0);
  });

  test("Escape closes the settings modal", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page
      .getByRole("button", { name: /Channel Blocker settings/i })
      .click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#modal-overlay")).toBeHidden();
  });
});
