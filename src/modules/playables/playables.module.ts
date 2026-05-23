import type { ExtensionModule } from "@/modules/types";

const PLAYABLES_CSS = `
  yt-chip-cloud-chip-renderer[title="Playables"] { display: none !important; }
`;

const SHELF_TITLE = "YouTube Playables";
const GUIDE_LABEL = "Playables";

function injectCSS(css: string): void {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
}

function redirectPlayablesToHome(): void {
  if (window.location.pathname.startsWith("/playables")) {
    window.location.replace(window.location.origin + "/");
  }
}

function removePlayablesShelf(): void {
  document.querySelectorAll("ytd-rich-shelf-renderer").forEach((shelf) => {
    const title = shelf.querySelector<HTMLElement>("#title");
    if (title && title.innerText.trim() === SHELF_TITLE) {
      shelf.remove();
    }
  });
}

function removePlayablesChip(): void {
  document.querySelectorAll("yt-chip-cloud-chip-renderer").forEach((chip) => {
    const label = chip.querySelector<HTMLElement>("#text");
    if (label && label.innerText.trim() === GUIDE_LABEL) {
      chip.remove();
    }
  });
}

function removePlayablesGuideEntry(): void {
  document.querySelectorAll("ytd-guide-entry-renderer").forEach((entry) => {
    const title = entry.querySelector<HTMLElement>("yt-formatted-string");
    if (title && title.innerText.trim() === GUIDE_LABEL) {
      entry.remove();
    }
  });
}

function hidePlayablesElements(): void {
  redirectPlayablesToHome();
  removePlayablesShelf();
  removePlayablesChip();
  removePlayablesGuideEntry();
}

export const playablesModule: ExtensionModule = {
  id: "playables",
  name: "Playables Blocker",
  description: "Hides the Playables shelf and redirects /playables URLs.",
  defaultEnabled: false,
  redirectPaths: ["/playables"],
  run() {
    injectCSS(PLAYABLES_CSS);

    setInterval(redirectPlayablesToHome, 1000);

    new MutationObserver(hidePlayablesElements).observe(document.body, {
      childList: true,
      subtree: true,
    });

    hidePlayablesElements();
  },
};
