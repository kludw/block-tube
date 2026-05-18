import { modules } from "@/modules/registry";
import { getSettings, onSettingsChanged } from "@/shared/settings";
import { getAuthState, onAuthChanged } from "@/shared/auth";

async function applyEnabledModules(): Promise<void> {
  const auth = await getAuthState();
  if (!auth.signedIn) return;

  const settings = await getSettings();

  for (const mod of modules) {
    if (!mod.run) continue;

    const state = settings[mod.id];
    if (!state?.enabled) continue;

    try {
      mod.run(state);
    } catch (err) {
      console.error(`[content] module "${mod.id}" failed:`, err);
    }
  }
}

void applyEnabledModules();

onSettingsChanged(() => window.location.reload());
onAuthChanged(() => window.location.reload());
