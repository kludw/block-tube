import { test, expect } from "./fixtures";

test.describe("channel block list", () => {
  test("adding a channel persists it and renders it in the list", async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    await page
      .getByRole("button", { name: /Channel Blocker settings/i })
      .click();
    const input = page.getByPlaceholder("Channel name");
    await input.fill("MrBeast");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(page.locator(".channel-item-name")).toHaveText("MrBeast");

    const stored = await serviceWorker.evaluate(async () => {
      const r = await chrome.storage.local.get("blockedChannels");
      return r["blockedChannels"] as
        | { pattern: string; addedAt: number }[]
        | undefined;
    });
    expect(stored).toEqual([expect.objectContaining({ pattern: "MrBeast" })]);
  });

  test("duplicate adds are ignored", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page
      .getByRole("button", { name: /Channel Blocker settings/i })
      .click();

    const input = page.getByPlaceholder("Channel name");
    const addBtn = page.getByRole("button", { name: "Add", exact: true });

    await input.fill("foo");
    await addBtn.click();
    await input.fill("foo");
    await addBtn.click();

    await expect(page.locator(".channel-item")).toHaveCount(1);
  });

  test("removing a channel updates the list and storage", async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page
      .getByRole("button", { name: /Channel Blocker settings/i })
      .click();

    const input = page.getByPlaceholder("Channel name");
    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    await input.fill("foo");
    await addBtn.click();
    await input.fill("bar");
    await addBtn.click();

    await expect(page.locator(".channel-item")).toHaveCount(2);

    await page.getByRole("button", { name: "Unblock foo" }).click();
    await expect(page.locator(".channel-item")).toHaveCount(1);
    await expect(page.locator(".channel-item-name")).toHaveText("bar");

    const stored = await serviceWorker.evaluate(async () => {
      const r = await chrome.storage.local.get("blockedChannels");
      return r["blockedChannels"];
    });
    expect(stored).toEqual([expect.objectContaining({ pattern: "bar" })]);
  });

  test("empty input does not create an entry", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page
      .getByRole("button", { name: /Channel Blocker settings/i })
      .click();

    await page.getByPlaceholder("Channel name").fill("   ");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("No channels blocked yet.")).toBeVisible();
  });

  test("re-opening the popup shows previously added channels", async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        blockedChannels: [{ pattern: "preset", addedAt: Date.now() }],
      });
    });

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page
      .getByRole("button", { name: /Channel Blocker settings/i })
      .click();
    await expect(page.locator(".channel-item-name")).toHaveText("preset");
  });
});
