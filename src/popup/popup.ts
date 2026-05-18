import { modules } from "@/modules/registry";
import {
  getSettings,
  updateModuleState,
  type SettingsMap,
} from "@/shared/settings";
import type { ExtensionModule } from "@/modules/types";

const COG_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
  '<path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94' +
  "l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94" +
  "l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94" +
  "l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94" +
  "s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94" +
  "l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96" +
  "c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6" +
  's1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';

const listEl = document.getElementById("module-list") as HTMLElement;
const overlayEl = document.getElementById("modal-overlay") as HTMLElement;
const modalTitleEl = document.getElementById("modal-title") as HTMLElement;
const modalBodyEl = document.getElementById("modal-body") as HTMLElement;
const modalCloseEl = document.getElementById(
  "modal-close",
) as HTMLButtonElement;

function openModal(mod: ExtensionModule): void {
  if (!mod.renderSettings) return;
  modalTitleEl.textContent = mod.name;
  modalBodyEl.replaceChildren();
  overlayEl.hidden = false;
  void mod.renderSettings(modalBodyEl);
}

function closeModal(): void {
  overlayEl.hidden = true;
  modalBodyEl.replaceChildren();
}

modalCloseEl.addEventListener("click", closeModal);
overlayEl.addEventListener("click", (event) => {
  if (event.target === overlayEl) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !overlayEl.hidden) closeModal();
});

function buildSwitch(
  mod: ExtensionModule,
  enabled: boolean,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "switch";
  button.type = "button";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", String(enabled));
  button.setAttribute("aria-label", `Enable or disable ${mod.name}`);
  button.innerHTML = '<span class="switch-knob"></span>';

  button.addEventListener("click", () => {
    const next = button.getAttribute("aria-checked") !== "true";
    button.setAttribute("aria-checked", String(next));
    void updateModuleState(mod.id, { enabled: next });
  });

  return button;
}

function buildCog(mod: ExtensionModule): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "cog";
  button.type = "button";
  button.setAttribute("aria-label", `${mod.name} settings`);
  button.innerHTML = COG_SVG;
  button.addEventListener("click", () => openModal(mod));
  return button;
}

function renderModule(
  mod: ExtensionModule,
  settings: SettingsMap,
): HTMLElement {
  const state = settings[mod.id];

  const row = document.createElement("div");
  row.className = "module";

  const header = document.createElement("div");
  header.className = "module-header";

  const info = document.createElement("div");
  info.className = "module-info";

  const name = document.createElement("span");
  name.className = "module-name";
  name.textContent = mod.name;
  info.appendChild(name);

  if (mod.description) {
    const desc = document.createElement("span");
    desc.className = "module-desc";
    desc.textContent = mod.description;
    info.appendChild(desc);
  }

  const controls = document.createElement("div");
  controls.className = "module-controls";
  if (mod.renderSettings) controls.appendChild(buildCog(mod));
  controls.appendChild(buildSwitch(mod, state.enabled));

  header.append(info, controls);
  row.appendChild(header);
  return row;
}

function wireLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>(".links a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const url = link.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });
}

async function init(): Promise<void> {
  const settings = await getSettings();
  listEl.replaceChildren(...modules.map((mod) => renderModule(mod, settings)));
  wireLinks();
}

void init();
