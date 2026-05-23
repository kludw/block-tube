import { describe, it, expect, vi } from "vitest";
import {
  addBlockedChannel,
  compileChannels,
  compilePattern,
  getBlockedChannels,
  isChannelBlocked,
  onBlockedChannelsChanged,
  removeBlockedChannel,
} from "@/modules/channels/blocked-channels";

describe("compilePattern", () => {
  it("returns null for empty input", () => {
    expect(compilePattern("")).toBeNull();
    expect(compilePattern("   ")).toBeNull();
  });

  it("returns null for comment lines starting with //", () => {
    expect(compilePattern("// commented out")).toBeNull();
  });

  it("returns null for invalid regex notation", () => {
    expect(compilePattern("/[invalid(/")).toBeNull();
  });

  it("compiles plain text into a case-insensitive boundary regex", () => {
    const re = compilePattern("MrBeast");
    expect(re).not.toBeNull();
    expect(re!.flags).toContain("i");
    expect(re!.test("MrBeast")).toBe(true);
    expect(re!.test("mrbeast")).toBe(true);
  });

  it("matches the keyword on a word boundary", () => {
    const re = compilePattern("foo")!;
    expect(re.test("foo")).toBe(true);
    expect(re.test("foo bar")).toBe(true);
    expect(re.test("bar foo")).toBe(true);
    expect(re.test("foobar")).toBe(false);
  });

  it("escapes regex metacharacters in keywords", () => {
    const re = compilePattern("a.b")!;
    expect(re.test("a.b")).toBe(true);
    expect(re.test("aXb")).toBe(false);
  });

  it("accepts /regex/ notation", () => {
    const re = compilePattern("/^Channel\\d+$/")!;
    expect(re.test("Channel42")).toBe(true);
    expect(re.test("xxChannel42")).toBe(false);
  });

  it("accepts flags in /regex/i notation", () => {
    const re = compilePattern("/cat/i")!;
    expect(re.flags).toContain("i");
    expect(re.test("CAT")).toBe(true);
  });

  it("strips the g flag (stateful matching breaks .test reuse)", () => {
    const re = compilePattern("/cat/g")!;
    expect(re.flags).not.toContain("g");
  });
});

describe("compileChannels", () => {
  it("compiles a list of patterns and drops invalid ones", () => {
    const compiled = compileChannels([
      { pattern: "foo", addedAt: 1 },
      { pattern: "", addedAt: 2 },
      { pattern: "// skipped", addedAt: 3 },
      { pattern: "/bar/", addedAt: 4 },
    ]);
    expect(compiled).toHaveLength(2);
  });
});

describe("isChannelBlocked", () => {
  it("returns false for null/undefined channel names", () => {
    const patterns = [compilePattern("foo")!];
    expect(isChannelBlocked(null, patterns)).toBe(false);
    expect(isChannelBlocked(undefined, patterns)).toBe(false);
    expect(isChannelBlocked("", patterns)).toBe(false);
  });

  it("returns false when no patterns match", () => {
    const patterns = [compilePattern("foo")!];
    expect(isChannelBlocked("bar", patterns)).toBe(false);
  });

  it("returns true on any matching pattern", () => {
    const patterns = [compilePattern("foo")!, compilePattern("bar")!];
    expect(isChannelBlocked("foo channel", patterns)).toBe(true);
    expect(isChannelBlocked("bar channel", patterns)).toBe(true);
  });

  it("returns false when there are no patterns", () => {
    expect(isChannelBlocked("any name", [])).toBe(false);
  });
});

describe("getBlockedChannels", () => {
  it("returns [] when storage is empty", async () => {
    expect(await getBlockedChannels()).toEqual([]);
  });

  it("returns the stored list", async () => {
    globalThis.__mockStorage.sync.data["blockedChannels"] = [
      { pattern: "foo", addedAt: 1 },
    ];
    expect(await getBlockedChannels()).toEqual([
      { pattern: "foo", addedAt: 1 },
    ]);
  });

  it("returns [] when the stored value is not an array", async () => {
    globalThis.__mockStorage.sync.data["blockedChannels"] = "not an array";
    expect(await getBlockedChannels()).toEqual([]);
  });
});

describe("addBlockedChannel", () => {
  it("persists the channel with a timestamp", async () => {
    const before = Date.now();
    await addBlockedChannel({ pattern: "foo" });
    const list = await getBlockedChannels();
    expect(list).toHaveLength(1);
    expect(list[0].pattern).toBe("foo");
    expect(list[0].addedAt).toBeGreaterThanOrEqual(before);
  });

  it("trims surrounding whitespace", async () => {
    await addBlockedChannel({ pattern: "  foo  " });
    const list = await getBlockedChannels();
    expect(list[0].pattern).toBe("foo");
  });

  it("ignores empty patterns", async () => {
    await addBlockedChannel({ pattern: "" });
    await addBlockedChannel({ pattern: "   " });
    expect(await getBlockedChannels()).toEqual([]);
  });

  it("does not duplicate existing patterns", async () => {
    await addBlockedChannel({ pattern: "foo" });
    await addBlockedChannel({ pattern: "foo" });
    await addBlockedChannel({ pattern: "  foo  " });
    expect(await getBlockedChannels()).toHaveLength(1);
  });
});

describe("removeBlockedChannel", () => {
  it("removes the matching pattern", async () => {
    await addBlockedChannel({ pattern: "foo" });
    await addBlockedChannel({ pattern: "bar" });
    await removeBlockedChannel("foo");
    const remaining = await getBlockedChannels();
    expect(remaining.map((c) => c.pattern)).toEqual(["bar"]);
  });

  it("is a no-op when the pattern does not exist", async () => {
    await addBlockedChannel({ pattern: "foo" });
    await removeBlockedChannel("missing");
    expect(await getBlockedChannels()).toHaveLength(1);
  });

  it("matches the pattern after trimming whitespace", async () => {
    await addBlockedChannel({ pattern: "foo" });
    await removeBlockedChannel("  foo  ");
    expect(await getBlockedChannels()).toEqual([]);
  });
});

describe("onBlockedChannelsChanged", () => {
  it("fires when the blocklist changes", async () => {
    const cb = vi.fn();
    onBlockedChannelsChanged(cb);
    await addBlockedChannel({ pattern: "foo" });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith([
      expect.objectContaining({ pattern: "foo" }),
    ]);
  });

  it("ignores unrelated storage changes", async () => {
    const cb = vi.fn();
    onBlockedChannelsChanged(cb);
    await chrome.storage.sync.set({ otherKey: "value" });
    expect(cb).not.toHaveBeenCalled();
  });

  it("returns [] when the new value is not an array", async () => {
    const cb = vi.fn();
    onBlockedChannelsChanged(cb);
    await chrome.storage.sync.set({ blockedChannels: null });
    expect(cb).toHaveBeenCalledWith([]);
  });
});
