export interface BlockedChannel {
  pattern: string;
  addedAt: number;
}

const STORAGE_KEY = "blockedChannels";

const UNICODE_BOUNDARY =
  "[ \\n\\r\\t!@#$%^&*()_\\-=+\\[\\]\\\\\\|;:'\",\\.\\/<>\\?`~:]+";

export function compilePattern(input: string): RegExp | null {
  const v = input.trim();
  if (!v || v.startsWith("//")) return null;

  const raw = /^\/(.*)\/([gimsuy]*)$/.exec(v);
  if (raw) {
    try {
      return new RegExp(raw[1] ?? "", (raw[2] ?? "").replace("g", ""));
    } catch (e) {
      console.error(`[channels] RegExp parsing error: /${raw[1]}/${raw[2]}`, e);
      return null;
    }
  }

  const escaped = v.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
  try {
    return new RegExp(
      "(^|" +
        UNICODE_BOUNDARY +
        ")(" +
        escaped +
        ")(" +
        UNICODE_BOUNDARY +
        "|$)",
      "i",
    );
  } catch (e) {
    console.error(`[channels] Failed to compile keyword pattern: ${v}`, e);
    return null;
  }
}

export function compileChannels(channels: BlockedChannel[]): RegExp[] {
  return channels
    .map((c) => compilePattern(c.pattern))
    .filter((re): re is RegExp => re !== null);
}

export function isChannelBlocked(
  name: string | null | undefined,
  compiled: RegExp[],
): boolean {
  if (!name) return false;
  return compiled.some((re) => re.test(name));
}

export async function getBlockedChannels(): Promise<BlockedChannel[]> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const list = stored[STORAGE_KEY];
  return Array.isArray(list) ? (list as BlockedChannel[]) : [];
}

export async function addBlockedChannel(input: {
  pattern: string;
}): Promise<void> {
  const pattern = input.pattern.trim();
  if (!pattern) return;

  const list = await getBlockedChannels();
  if (list.some((c) => c.pattern.trim() === pattern)) return;

  list.push({ pattern, addedAt: Date.now() });
  await chrome.storage.sync.set({ [STORAGE_KEY]: list });
}

export async function removeBlockedChannel(pattern: string): Promise<void> {
  const target = pattern.trim();
  const list = await getBlockedChannels();
  const next = list.filter((c) => c.pattern.trim() !== target);
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
}

export function onBlockedChannelsChanged(
  callback: (channels: BlockedChannel[]) => void,
): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[STORAGE_KEY]) {
      const next = changes[STORAGE_KEY].newValue;
      callback(Array.isArray(next) ? (next as BlockedChannel[]) : []);
    }
  });
}
