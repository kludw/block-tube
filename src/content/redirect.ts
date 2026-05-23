import { modules } from "@/modules/registry";
import { getAuthState } from "@/shared/auth";
import { getSettings } from "@/shared/settings";

async function maybeRedirect(): Promise<void> {
  const pathname = window.location.pathname;
  const match = modules.find((mod) =>
    mod.redirectPaths?.some((p) => pathname.startsWith(p)),
  );
  if (!match) return;

  const auth = await getAuthState();
  if (!auth.signedIn) return;

  const settings = await getSettings();
  if (!settings[match.id]?.enabled) return;

  window.location.replace(window.location.origin + "/");
}

void maybeRedirect();
