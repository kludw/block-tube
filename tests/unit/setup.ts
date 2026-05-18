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
};

declare global {
  // eslint-disable-next-line no-var
  var __mockStorage: MockStorage;
}

(globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;
globalThis.__mockStorage = mockStorage;

beforeEach(() => {
  mockStorage.reset();
  vi.clearAllMocks();
});
