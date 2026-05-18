import { modules } from "@/modules/registry";
import {
  getSettings,
  updateModuleState,
  type SettingsMap,
} from "@/shared/settings";
import type { ExtensionModule } from "@/modules/types";
import {
  getAuthState,
  onAuthChanged,
  signIn,
  signOut,
  type AuthState,
} from "@/shared/auth";

const listEl = document.getElementById("module-list") as HTMLElement;
const overlayEl = document.getElementById("modal-overlay") as HTMLElement;
const modalTitleEl = document.getElementById("modal-title") as HTMLElement;
const modalBodyEl = document.getElementById("modal-body") as HTMLElement;
const modalCloseEl = document.getElementById(
  "modal-close",
) as HTMLButtonElement;
const authGateEl = document.getElementById("auth-gate") as HTMLElement;
const authFooterEl = document.getElementById("auth-footer") as HTMLElement;
const authEmailEl = document.getElementById("auth-email") as HTMLElement;
const signInBtn = document.getElementById("auth-signin") as HTMLButtonElement;
const signOutBtn = document.getElementById("auth-signout") as HTMLButtonElement;

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
  const img = document.createElement("img");
  img.src = "../icons/cog.svg";
  img.width = 16;
  img.height = 16;
  img.alt = "";
  button.appendChild(img);
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

async function renderModules(): Promise<void> {
  const settings = await getSettings();
  listEl.replaceChildren(...modules.map((mod) => renderModule(mod, settings)));
  wireLinks();
}

function applyAuthState(state: AuthState): void {
  const signedIn = state.signedIn;
  authGateEl.hidden = signedIn;
  listEl.hidden = !signedIn;
  authFooterEl.hidden = !signedIn;
  if (signedIn) {
    authEmailEl.textContent = state.email ?? "";
    void renderModules();
  } else {
    listEl.replaceChildren();
  }
}

signInBtn.addEventListener("click", () => {
  signInBtn.disabled = true;
  signIn()
    .then(applyAuthState)
    .finally(() => {
      signInBtn.disabled = false;
    });
});

signOutBtn.addEventListener("click", () => {
  signOutBtn.disabled = true;
  void signOut().finally(() => {
    signOutBtn.disabled = false;
  });
});

onAuthChanged(applyAuthState);

void getAuthState().then(applyAuthState);
