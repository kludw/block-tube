import { describe, it, expect, vi } from "vitest";
import {
  defaultSettings,
  getSettings,
  onSettingsChanged,
  seedDefaults,
  updateModuleState,
} from "@/shared/settings";
import { modules } from "@/modules/registry";

describe("defaultSettings", () => {
  it("includes an entry for every registered module", () => {
    const defaults = defaultSettings();
    for (const mod of modules) {
      expect(defaults[mod.id]).toEqual({ enabled: mod.defaultEnabled });
    }
  });
});

describe("getSettings", () => {
  it("returns defaults when storage is empty", async () => {
    const settings = await getSettings();
    expect(settings).toEqual(defaultSettings());
  });

  it("merges stored state over defaults", async () => {
    globalThis.__mockStorage.data["moduleSettings"] = {
      shorts: { enabled: false },
    };
    const settings = await getSettings();
    expect(settings.shorts.enabled).toBe(false);
    expect(settings.channels.enabled).toBe(true);
  });

  it("ignores unknown module ids in stored state", async () => {
    globalThis.__mockStorage.data["moduleSettings"] = {
      shorts: { enabled: false },
      ghostModule: { enabled: true },
    };
    const settings = await getSettings();
    expect(settings).not.toHaveProperty("ghostModule");
  });
});

describe("updateModuleState", () => {
  it("patches a single module without touching the others", async () => {
    await seedDefaults();
    await updateModuleState("shorts", { enabled: false });
    const settings = await getSettings();
    expect(settings.shorts.enabled).toBe(false);
    expect(settings.channels.enabled).toBe(true);
  });

  it("is a no-op for unknown module ids", async () => {
    await seedDefaults();
    await updateModuleState("ghostModule", { enabled: false });
    const settings = await getSettings();
    expect(settings).not.toHaveProperty("ghostModule");
  });
});

describe("seedDefaults", () => {
  it("persists default settings", async () => {
    await seedDefaults();
    expect(globalThis.__mockStorage.data["moduleSettings"]).toEqual(
      defaultSettings(),
    );
  });
});

describe("onSettingsChanged", () => {
  it("fires when moduleSettings changes", async () => {
    const cb = vi.fn();
    onSettingsChanged(cb);
    await updateModuleState("shorts", { enabled: false });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].shorts.enabled).toBe(false);
  });

  it("ignores unrelated storage changes", async () => {
    const cb = vi.fn();
    onSettingsChanged(cb);
    await chrome.storage.local.set({ unrelated: 1 });
    expect(cb).not.toHaveBeenCalled();
  });
});
