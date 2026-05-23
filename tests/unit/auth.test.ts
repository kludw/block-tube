import { describe, it, expect, vi } from "vitest";
import { getAuthState, onAuthChanged, signIn, signOut } from "@/shared/auth";

describe("getAuthState", () => {
  it("returns signed-out when nothing is stored", async () => {
    expect(await getAuthState()).toEqual({ signedIn: false });
  });

  it("returns the stored state when valid", async () => {
    globalThis.__mockStorage.local.data["authState"] = {
      signedIn: true,
      email: "a@b.com",
    };
    expect(await getAuthState()).toEqual({
      signedIn: true,
      email: "a@b.com",
    });
  });

  it("falls back to signed-out when stored value is malformed", async () => {
    globalThis.__mockStorage.local.data["authState"] = "not an object";
    expect(await getAuthState()).toEqual({ signedIn: false });
  });
});

describe("signIn", () => {
  it("requests an interactive token and persists signed-in state", async () => {
    const state = await signIn();
    expect(state.signedIn).toBe(true);
    expect(state.email).toBe("test@example.com");
    expect(globalThis.__mockStorage.local.data["authState"]).toEqual(state);

    expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
      { interactive: true },
      expect.any(Function),
    );
  });

  it("returns signed-out without persisting when the user cancels", async () => {
    globalThis.__mockIdentity.nextToken = undefined;
    const state = await signIn();
    expect(state).toEqual({ signedIn: false });
    expect(globalThis.__mockStorage.local.data["authState"]).toBeUndefined();
  });

  it("still signs in when userinfo lookup fails", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("{}", { status: 500 }),
    );
    const state = await signIn();
    expect(state.signedIn).toBe(true);
    expect(state.email).toBeUndefined();
  });
});

describe("signOut", () => {
  it("clears the cached token and the persisted state", async () => {
    await signIn();
    await signOut();
    expect(globalThis.__mockStorage.local.data["authState"]).toEqual({
      signedIn: false,
    });
    expect(globalThis.__mockIdentity.removed).toContain("test-token");
  });

  it("is safe to call when not signed in", async () => {
    globalThis.__mockIdentity.nextToken = undefined;
    await signOut();
    expect(globalThis.__mockStorage.local.data["authState"]).toEqual({
      signedIn: false,
    });
  });
});

describe("onAuthChanged", () => {
  it("fires when the auth state changes", async () => {
    const cb = vi.fn();
    onAuthChanged(cb);
    await signIn();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ signedIn: true }),
    );
  });

  it("ignores unrelated storage changes", async () => {
    const cb = vi.fn();
    onAuthChanged(cb);
    await chrome.storage.local.set({ unrelated: 1 });
    expect(cb).not.toHaveBeenCalled();
  });
});
