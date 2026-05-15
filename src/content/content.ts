import { modules } from "../modules/registry";
import { getSettings, onSettingsChanged } from "../shared/settings";

async function applyEnabledModules(): Promise<void> {
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
