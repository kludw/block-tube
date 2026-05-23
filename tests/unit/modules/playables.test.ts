import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { playablesModule } from "@/modules/playables/playables.module";

describe("playablesModule", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes the expected config", () => {
    expect(playablesModule.id).toBe("playables");
    expect(playablesModule.defaultEnabled).toBe(false);
    expect(playablesModule.redirectPaths).toEqual(["/playables"]);
    expect(typeof playablesModule.run).toBe("function");
  });

  it("run() injects CSS that hides the Playables chip", () => {
    playablesModule.run!({ enabled: true });
    const css = document.head.querySelector("style")?.textContent ?? "";
    expect(css).toContain('yt-chip-cloud-chip-renderer[title="Playables"]');
  });

  it("removes the rich shelf whose title is 'YouTube Playables' and leaves siblings alone", () => {
    document.body.innerHTML = `
      <ytd-rich-shelf-renderer id="playables-shelf">
        <span id="title">YouTube Playables</span>
      </ytd-rich-shelf-renderer>
      <ytd-rich-shelf-renderer id="recommended-shelf">
        <span id="title">Recommended</span>
      </ytd-rich-shelf-renderer>
    `;

    playablesModule.run!({ enabled: true });

    expect(document.getElementById("playables-shelf")).toBeNull();
    expect(document.getElementById("recommended-shelf")).not.toBeNull();
  });

  it("removes the Playables guide entry from the sidebar", () => {
    document.body.innerHTML = `
      <ytd-guide-entry-renderer id="playables-entry">
        <yt-formatted-string>Playables</yt-formatted-string>
      </ytd-guide-entry-renderer>
      <ytd-guide-entry-renderer id="home-entry">
        <yt-formatted-string>Home</yt-formatted-string>
      </ytd-guide-entry-renderer>
    `;

    playablesModule.run!({ enabled: true });

    expect(document.getElementById("playables-entry")).toBeNull();
    expect(document.getElementById("home-entry")).not.toBeNull();
  });

  it("removes the Playables chip from the chip cloud", () => {
    document.body.innerHTML = `
      <yt-chip-cloud-chip-renderer id="playables-chip">
        <div id="text">Playables</div>
      </yt-chip-cloud-chip-renderer>
      <yt-chip-cloud-chip-renderer id="music-chip">
        <div id="text">Music</div>
      </yt-chip-cloud-chip-renderer>
    `;

    playablesModule.run!({ enabled: true });

    expect(document.getElementById("playables-chip")).toBeNull();
    expect(document.getElementById("music-chip")).not.toBeNull();
  });
});
