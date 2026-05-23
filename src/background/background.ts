import { seedDefaults } from "@/shared/settings";

const SYNC_KEYS = ["moduleSettings", "blockedChannels"] as const;

async function migrateLocalToSync(): Promise<void> {
  const local = await chrome.storage.local.get([...SYNC_KEYS]);
  const sync = await chrome.storage.sync.get([...SYNC_KEYS]);

  const toWrite: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    if (local[key] !== undefined && sync[key] === undefined) {
      toWrite[key] = local[key];
    }
  }
  if (Object.keys(toWrite).length > 0) {
    await chrome.storage.sync.set(toWrite);
  }

  const localKeysToClear = SYNC_KEYS.filter((k) => local[k] !== undefined);
  if (localKeysToClear.length > 0) {
    await chrome.storage.local.remove([...localKeysToClear]);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void seedDefaults();
  } else {
    void migrateLocalToSync();
  }
});
