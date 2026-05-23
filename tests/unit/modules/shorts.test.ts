import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { shortsModule } from "@/modules/shorts/shorts.module";

describe("shortsModule", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes the expected config", () => {
    expect(shortsModule.id).toBe("shorts");
    expect(shortsModule.defaultEnabled).toBe(false);
    expect(shortsModule.redirectPaths).toEqual(["/shorts"]);
    expect(typeof shortsModule.run).toBe("function");
  });

  it("run() injects a <style> tag with shorts-hiding rules", () => {
    shortsModule.run!({ enabled: true });

    const style = document.head.querySelector("style");
    expect(style).not.toBeNull();
    const css = style!.textContent ?? "";
    expect(css).toContain('a[title="Shorts"]');
    expect(css).toContain("ytd-reel-item-renderer");
  });

  it("run() removes the mobile pivot-shorts tab", () => {
    document.body.innerHTML = `
      <div class="pivot-shorts-wrapper">
        <div class="pivot-shorts"></div>
      </div>
      <div class="pivot-home-wrapper">
        <div class="pivot-home"></div>
      </div>
    `;

    shortsModule.run!({ enabled: true });

    expect(document.querySelector(".pivot-shorts-wrapper")).toBeNull();
    expect(document.querySelector(".pivot-home-wrapper")).not.toBeNull();
  });

  it("run() removes the Shorts chip from the chip cloud", () => {
    document.body.innerHTML = `
      <yt-chip-cloud-chip-renderer id="shorts-chip">
        <div id="text">Shorts</div>
      </yt-chip-cloud-chip-renderer>
      <yt-chip-cloud-chip-renderer id="music-chip">
        <div id="text">Music</div>
      </yt-chip-cloud-chip-renderer>
    `;

    shortsModule.run!({ enabled: true });

    expect(document.getElementById("shorts-chip")).toBeNull();
    expect(document.getElementById("music-chip")).not.toBeNull();
  });

  it("run() removes search results that link to /shorts/", () => {
    document.body.innerHTML = `
      <ytd-video-renderer id="shorts-result">
        <a href="/shorts/abc"></a>
      </ytd-video-renderer>
      <ytd-video-renderer id="video-result">
        <a href="/watch?v=xyz"></a>
      </ytd-video-renderer>
    `;

    shortsModule.run!({ enabled: true });

    expect(document.getElementById("shorts-result")).toBeNull();
    expect(document.getElementById("video-result")).not.toBeNull();
  });
});
