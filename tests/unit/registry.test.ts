import { describe, it, expect } from "vitest";
import { modules } from "@/modules/registry";

describe("modules registry", () => {
  it("registers the shorts and channels modules", () => {
    const ids = modules.map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(["shorts", "channels"]));
  });

  it("every module declares the required fields", () => {
    for (const mod of modules) {
      expect(typeof mod.id).toBe("string");
      expect(mod.id.length).toBeGreaterThan(0);
      expect(typeof mod.name).toBe("string");
      expect(typeof mod.defaultEnabled).toBe("boolean");
    }
  });

  it("has unique module ids", () => {
    const ids = modules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
