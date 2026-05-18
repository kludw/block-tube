import {
  addBlockedChannel,
  type BlockedChannel,
} from "@/modules/channels/blocked-channels";

const UNICODE_BOUNDARY =
  "[ \\n\\r\\t!@#$%^&*()_\\-=+\\[\\]\\\\\\|;:'\",\\.\\/<>\\?`~:]+";

function compileNamePattern(input: string): [string, string] | null {
  const v = input.trim();
  if (!v || v.startsWith("//")) return null;

  const raw = /^\/(.*)\/([gimsuy]*)$/.exec(v);
  if (raw) return [raw[1] ?? "", raw[2] ?? ""];

  const escaped = v.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
  return [
    "(^|" + UNICODE_BOUNDARY + ")(" + escaped + ")(" + UNICODE_BOUNDARY + "|$)",
    "i",
  ];
}

interface Storage {
  filterData: {
    videoId: [string, string][];
    channelId: [string, string][];
    channelName: [string, string][];
    comment: [string, string][];
    title: [string, string][];
    vidLength: [number | null, number | null];
    javascript: string;
    percentWatchedHide: number | null;
  };
  options: {
    trending: boolean;
    mixes: boolean;
    shorts: boolean;
    movies: boolean;
    suggestions_only: boolean;
    autoplay: boolean;
    enable_javascript: boolean;
    block_message: string;
    block_feedback: boolean;
    disable_db_normalize: boolean;
    disable_you_there: boolean;
    disable_on_history: boolean;
  };
}

function buildStorage(channels: BlockedChannel[]): Storage {
  const channelName: [string, string][] = [];
  for (const c of channels) {
    const compiled = compileNamePattern(c.pattern);
    if (compiled) channelName.push(compiled);
  }
  return {
    filterData: {
      videoId: [],
      channelId: [],
      channelName,
      comment: [],
      title: [],
      vidLength: [null, null],
      javascript: "",
      percentWatchedHide: null,
    },
    options: {
      trending: false,
      mixes: false,
      shorts: false,
      movies: false,
      suggestions_only: false,
      autoplay: false,
      enable_javascript: false,
      block_message: "",
      block_feedback: false,
      disable_db_normalize: false,
      disable_you_there: false,
      disable_on_history: false,
    },
  };
}

function postStorage(data: Storage | undefined): void {
  window.postMessage(
    { from: "BLOCKED_CONTENT", type: "storageData", data },
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
  const enabled = await getChannelsModuleEnabled();
  if (!enabled) {
    postStorage(undefined);
    return;
  }
  const list = await getBlockedChannelsRaw();
  postStorage(buildStorage(list));
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
      const payload = msg.data as
        | { type?: string; info?: { id?: string; text?: string } }
        | undefined;
      if (
        payload &&
        payload.type === "channelId" &&
        payload.info &&
        typeof payload.info.text === "string" &&
        payload.info.text.trim().length > 0
      ) {
        void addBlockedChannel({ pattern: payload.info.text });
      }
    }
  },
  true,
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes["blockedChannels"] || changes["moduleSettings"]) {
    void pushCurrentState();
  }
});
