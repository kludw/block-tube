import { beforeEach, vi } from "vitest";

type ChangeListener = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  area: string,
) => void;

interface MockStorage {
  data: Record<string, unknown>;
  listeners: ChangeListener[];
  reset(): void;
}

const mockStorage: MockStorage = {
  data: {},
  listeners: [],
  reset() {
    this.data = {};
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

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (key?: string | string[]) => {
        if (key === undefined) return { ...mockStorage.data };
        if (typeof key === "string") {
          return key in mockStorage.data
            ? { [key]: mockStorage.data[key] }
            : {};
        }
        const out: Record<string, unknown> = {};
        for (const k of key) {
          if (k in mockStorage.data) out[k] = mockStorage.data[k];
        }
        return out;
      }),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        const changes: Record<
          string,
          { newValue?: unknown; oldValue?: unknown }
        > = {};
        for (const k of Object.keys(obj)) {
          changes[k] = { newValue: obj[k], oldValue: mockStorage.data[k] };
          mockStorage.data[k] = obj[k];
        }
        for (const cb of mockStorage.listeners) cb(changes, "local");
      }),
    },
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
