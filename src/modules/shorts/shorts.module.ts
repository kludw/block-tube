import type { ExtensionModule } from "../types";

const SHORTS_CSS = `
  .ytd-reel-shelf-renderer { display: none !important; }
  a[title="Shorts"] { display: none !important; }
  #shorts-container { overflow: hidden !important; }
  .reel-video-in-sequence { height: 87vh !important; }
  .navigation-container { display: none !important; }
  yt-chip-cloud-chip-renderer[title="Shorts"] { display: none !important; }
  ytd-ad-slot-renderer { display: none !important; }
  ytd-reel-shelf-renderer.ytd-item-section-renderer { display: none !important; }
  ytm-rich-section-renderer { display: none !important; }
  ytm-reel-shelf-renderer { display: none !important; }
  ytm-promoted-sparkles-web-renderer { display: none !important; }
  ytd-reel-item-renderer { display: none !important; }
  ytd-rich-shelf-renderer[is-shorts] { display: none !important; }
  grid-shelf-view-model { display: none !important; }

  /* Styling for Shorts links that are disabled rather than removed (mobile) */
  .blocked-message {
    position: absolute;
    top: 50%;
    left: 50%;
    background-color: black;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    text-align: center;
    z-index: 1000;
    pointer-events: none;
    width: fit-content;
    height: fit-content;
    transform: translate(-210.5%, -50%);
    font-size: 0.99rem;
    color: yellow;
  }
  .blocked-parent {
    position: relative;
    pointer-events: none;
    opacity: 0.4;
  }
`;

function injectCSS(css: string): void {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
}

function redirectShortsToHome(): void {
  if (window.location.pathname.startsWith("/shorts")) {
    window.location.replace(window.location.origin + "/");
  }
}

function removeShortsChip(): void {
  document.querySelectorAll("yt-chip-cloud-chip-renderer").forEach((chip) => {
    const label = chip.querySelector<HTMLElement>("#text");
    if (label && label.innerText.trim() === "Shorts") {
      chip.remove();
    }
  });
}

function removeShortsFromSearch(): void {
  document
    .querySelectorAll('ytd-video-renderer:has([href*="/shorts/"])')
    .forEach((el) => el.parentNode?.removeChild(el));
}

function disableMobileShortsLinks(): void {
  if (!window.location.href.includes("m.youtube.com")) return;

  document
    .querySelectorAll<HTMLAnchorElement>('a[href*="/shorts"]')
    .forEach((anchor) => {
      const parent = anchor.parentElement;
      if (!parent) return;
      if (parent.parentElement) parent.parentElement.style.opacity = "0.2";
      parent.style.pointerEvents = "none";
      parent.setAttribute("title", "Blocked by Remove YouTube Shorts");
    });
}

function removeMobileShortsTab(): void {
  const pivot = document.querySelector(".pivot-shorts");
  if (pivot && pivot.parentElement) {
    pivot.parentElement.remove();
  }
}

function hideShortsElements(): void {
  redirectShortsToHome();
  removeShortsChip();
  removeShortsFromSearch();
  disableMobileShortsLinks();
  removeMobileShortsTab();
}

export const shortsModule: ExtensionModule = {
  id: "shorts",
  name: "Shorts Blocker",
  description: "Removes YouTube Shorts and redirects /shorts URLs.",
  defaultEnabled: true,
  run() {
    injectCSS(SHORTS_CSS);

    setInterval(redirectShortsToHome, 1000);

    new MutationObserver(hideShortsElements).observe(document.body, {
      childList: true,
      subtree: true,
    });

    hideShortsElements();
  },
};
