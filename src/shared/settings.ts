import { modules } from "../modules/registry";
import type { ExtensionModule, ModuleState } from "../modules/types";

export type SettingsMap = Record<string, ModuleState>;

const STORAGE_KEY = "moduleSettings";

function defaultsFor(mod: ExtensionModule): ModuleState {
  return { enabled: mod.defaultEnabled };
}

export function defaultSettings(): SettingsMap {
  const map: SettingsMap = {};
  for (const mod of modules) {
    map[mod.id] = defaultsFor(mod);
  }
  return map;
}

export async function getSettings(): Promise<SettingsMap> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const saved = (stored[STORAGE_KEY] ?? {}) as Partial<SettingsMap>;

  const merged = defaultSettings();
  for (const mod of modules) {
    const savedState = saved[mod.id];
    if (savedState) {
      merged[mod.id] = { ...merged[mod.id], ...savedState };
    }
  }
  return merged;
}

export async function updateModuleState(
  id: string,
  patch: Partial<ModuleState>,
): Promise<void> {
  const settings = await getSettings();
  if (!settings[id]) return;
  settings[id] = { ...settings[id], ...patch };
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

export async function seedDefaults(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: defaultSettings() });
}

export function onSettingsChanged(
  callback: (settings: SettingsMap) => void,
): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY]) {
      const next = (changes[STORAGE_KEY].newValue ??
        defaultSettings()) as SettingsMap;
      callback(next);
    }
  });
}
