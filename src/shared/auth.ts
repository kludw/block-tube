const STORAGE_KEY = "authState";

export interface AuthState {
  signedIn: boolean;
  email?: string;
}

const SIGNED_OUT: AuthState = { signedIn: false };

export async function getAuthState(): Promise<AuthState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY];
  if (
    state &&
    typeof state === "object" &&
    "signedIn" in state &&
    typeof (state as AuthState).signedIn === "boolean"
  ) {
    return state as AuthState;
  }
  return SIGNED_OUT;
}

async function getAuthToken(interactive: boolean): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(typeof token === "string" ? token : undefined);
    });
  });
}

function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

export async function signIn(): Promise<AuthState> {
  const token = await getAuthToken(true);
  if (!token) return SIGNED_OUT;

  let email: string | undefined;
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { email?: string };
      email = data.email;
    }
  } catch {
    // userinfo lookup is best-effort
  }

  const state: AuthState = { signedIn: true, email };
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  return state;
}

export async function signOut(): Promise<void> {
  try {
    const token = await getAuthToken(false);
    if (token) await removeCachedToken(token);
  } catch {
    // already signed out, ignore
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: SIGNED_OUT });
}

export function onAuthChanged(callback: (state: AuthState) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!changes[STORAGE_KEY]) return;
    const next = changes[STORAGE_KEY].newValue ?? SIGNED_OUT;
    callback(next as AuthState);
  });
}
