import {
  addBlockedChannel,
  compilePattern,
  type BlockedChannel,
} from "@/modules/channels/blocked-channels";
import { getAuthState } from "@/shared/auth";

type CompiledPattern = [string, string];

function buildPatterns(channels: BlockedChannel[]): CompiledPattern[] {
  const out: CompiledPattern[] = [];
  for (const c of channels) {
    const re = compilePattern(c.pattern);
    if (re) out.push([re.source, re.flags]);
  }
  return out;
}

function postPatterns(patterns: CompiledPattern[] | undefined): void {
  window.postMessage(
    { from: "BLOCKED_CONTENT", type: "channelPatterns", data: patterns },
    document.location.origin,
  );
}

async function getChannelsModuleEnabled(): Promise<boolean> {
  const stored = await chrome.storage.local.get("moduleSettings");
  const settings = stored["moduleSettings"] as
    | Record<string, { enabled?: boolean }>
    | undefined;
  return settings?.["channels"]?.enabled ?? true;
}

async function getBlockedChannelsRaw(): Promise<BlockedChannel[]> {
  const stored = await chrome.storage.local.get("blockedChannels");
  const list = stored["blockedChannels"];
  return Array.isArray(list) ? (list as BlockedChannel[]) : [];
}

async function pushCurrentState(): Promise<void> {
  const auth = await getAuthState();
  if (!auth.signedIn) {
    postPatterns(undefined);
    return;
  }
  const enabled = await getChannelsModuleEnabled();
  if (!enabled) {
    postPatterns(undefined);
    return;
  }
  const list = await getBlockedChannelsRaw();
  postPatterns(buildPatterns(list));
}

void pushCurrentState();

interface PageMessage {
  from?: string;
  type?: string;
  data?: unknown;
}

window.addEventListener(
  "message",
  (event: MessageEvent<PageMessage>) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.from !== "BLOCKED_PAGE") return;

    if (msg.type === "ready") {
      void pushCurrentState();
      return;
    }

    if (msg.type === "contextBlockData") {
      const payload = msg.data as { text?: string } | undefined;
      if (
        payload &&
        typeof payload.text === "string" &&
        payload.text.trim().length > 0
      ) {
        void addBlockedChannel({ pattern: payload.text });
      }
    }
  },
  true,
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (
    changes["blockedChannels"] ||
    changes["moduleSettings"] ||
    changes["authState"]
  ) {
    void pushCurrentState();
  }
});
