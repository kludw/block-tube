import { beforeEach, vi } from "vitest";

type ChangeListener = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  area: string,
) => void;

interface MockStorageArea {
  data: Record<string, unknown>;
}

interface MockStorage {
  local: MockStorageArea;
  sync: MockStorageArea;
  listeners: ChangeListener[];
  reset(): void;
}

const mockStorage: MockStorage = {
  local: { data: {} },
  sync: { data: {} },
  listeners: [],
  reset() {
    this.local.data = {};
    this.sync.data = {};
    this.listeners = [];
  },
};

interface IdentityMock {
  nextToken: string | undefined;
  nextError: string | undefined;
  removed: string[];
  reset(): void;
}

const mockIdentity: IdentityMock = {
  nextToken: "test-token",
  nextError: undefined,
  removed: [],
  reset() {
    this.nextToken = "test-token";
    this.nextError = undefined;
    this.removed = [];
  },
};

let lastError: { message: string } | undefined;

function makeArea(area: MockStorageArea, name: "local" | "sync") {
  return {
    get: vi.fn(async (key?: string | string[]) => {
      if (key === undefined) return { ...area.data };
      if (typeof key === "string") {
        return key in area.data ? { [key]: area.data[key] } : {};
      }
      const out: Record<string, unknown> = {};
      for (const k of key) {
        if (k in area.data) out[k] = area.data[k];
      }
      return out;
    }),
    set: vi.fn(async (obj: Record<string, unknown>) => {
      const changes: Record<
        string,
        { newValue?: unknown; oldValue?: unknown }
      > = {};
      for (const k of Object.keys(obj)) {
        changes[k] = { newValue: obj[k], oldValue: area.data[k] };
        area.data[k] = obj[k];
      }
      for (const cb of mockStorage.listeners) cb(changes, name);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const list = typeof keys === "string" ? [keys] : keys;
      const changes: Record<
        string,
        { newValue?: unknown; oldValue?: unknown }
      > = {};
      for (const k of list) {
        if (k in area.data) {
          changes[k] = { newValue: undefined, oldValue: area.data[k] };
          delete area.data[k];
        }
      }
      if (Object.keys(changes).length === 0) return;
      for (const cb of mockStorage.listeners) cb(changes, name);
    }),
  };
}

const chromeMock = {
  storage: {
    local: makeArea(mockStorage.local, "local"),
    sync: makeArea(mockStorage.sync, "sync"),
    onChanged: {
      addListener: vi.fn((cb: ChangeListener) => {
        mockStorage.listeners.push(cb);
      }),
    },
  },
  identity: {
    getAuthToken: vi.fn(
      (
        _details: { interactive: boolean },
        cb: (token: string | undefined) => void,
      ) => {
        if (mockIdentity.nextError) {
          lastError = { message: mockIdentity.nextError };
          cb(undefined);
          lastError = undefined;
          return;
        }
        cb(mockIdentity.nextToken);
      },
    ),
    removeCachedAuthToken: vi.fn(
      (details: { token: string }, cb: () => void) => {
        mockIdentity.removed.push(details.token);
        cb();
      },
    ),
  },
  runtime: {
    get lastError(): { message: string } | undefined {
      return lastError;
    },
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __mockStorage: MockStorage;
  // eslint-disable-next-line no-var
  var __mockIdentity: IdentityMock;
}

(globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;
globalThis.__mockStorage = mockStorage;
globalThis.__mockIdentity = mockIdentity;

// userinfo lookup is best-effort; stub it so signIn() doesn't try real network.
globalThis.fetch = vi.fn(
  async () =>
    new Response(JSON.stringify({ email: "test@example.com" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
) as typeof fetch;

beforeEach(() => {
  mockStorage.reset();
  mockIdentity.reset();
  vi.clearAllMocks();
});
