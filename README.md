# block-tube

A modular Chrome extension for trimming YouTube. Each feature is a self-contained
module; the popup lists every registered module and lets you toggle it (and
configure it, when applicable). Settings ride your Google account via Chrome
sync — toggle once, it follows you to every signed-in Chrome.

## Modules

| Module                | Behaviour                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| **Shorts Blocker**    | Hides Shorts shelves, chips, reels, and redirects `/shorts/*` URLs to the home page.                 |
| **Playables Blocker** | Removes the "YouTube Playables" rich shelf, sidebar entry, and chip; redirects `/playables` to home. |
| **Channel Blocker**   | Hides every video from blocked channels; adds a **Block channel** item to the video three-dots menu. |

All modules default to **off**. After signing in, open the popup and toggle on
what you want.

## Sign-in & sync

The popup gates all modules behind a Google sign-in (`chrome.identity.getAuthToken`).
Sign-in state is stored in `chrome.storage.local`; module toggles and the
blocked-channel list live in `chrome.storage.sync`, so Chrome replicates them to
every device signed into the same Google profile. There is no separate backend —
storage is keyed by extension ID + Google account, and Chrome handles the
upload.

**Live updates.** Any change to a module toggle, the blocked-channel list, or
the auth state triggers a reload of every open YouTube tab, so the new state
takes effect immediately instead of waiting for the next navigation.

## Channel Blocker

Channel filtering uses a vendored MAIN-world filter engine that intercepts every
YouTube JSON payload — `ytInitialData`, `ytInitialPlayerResponse`,
`ytInitialGuideData`, and the `/youtubei/v1/{search,guide,browse,next,player,
get_watch}` `fetch` responses — and removes blocked items **before** the page
renders. That gives the same coverage a dedicated blocker has, rather than the
gaps a DOM-hide approach leaves on newer YouTube layouts.

The blocked list is name-pattern based, compiled once per change:

- A plain channel name → a **case-insensitive whole-word** RegExp, bounded by
  whitespace and common punctuation. So `pewdiepie` matches "PewDiePie" or
  "PewDiePie - Topic", but not "ThePewDiePieFan".
- A line of the form `/pattern/flags` → raw RegExp.

A video is hidden iff `compiled.some(re => re.test(channelName))`.

The cog button next to the module's switch opens a modal where you can add a
pattern, see the blocked list, and unblock entries. The **Block channel** item
that gets injected into any video's three-dots menu adds the channel's display
name as a plain pattern.

## Module system

A module is an `ExtensionModule` (see `src/modules/types.ts`):

```ts
interface ExtensionModule {
  id: string;
  name: string;
  description?: string;
  defaultEnabled: boolean;
  /** URL path prefixes that redirect to "/" when this module is enabled. */
  redirectPaths?: string[];
  run?(state: ModuleState): void;
  renderSettings?(container: HTMLElement): void | Promise<void>;
}
```

- `run` runs in the content script on `youtube.com` when the module is enabled
  (at `document_end`).
- `redirectPaths` is consumed by a `document_start` content script that
  redirects matching URLs to `/` as early as possible — important for direct
  links like `https://www.youtube.com/shorts/<id>`, where waiting for
  `document_end` lets YouTube's app render before the redirect fires.
- `renderSettings`, when present, makes the popup show a cog button that opens
  a modal and hands the module a body element to populate.

Module on/off state lives under one `chrome.storage.sync` key (`moduleSettings`),
managed by `src/shared/settings.ts`. Modules with their own data manage their
own keys (e.g. the channel blocker's `blockedChannels`, also in sync).

To add a module: create `src/modules/<name>/<name>.module.ts` exporting an
`ExtensionModule`, then append it to the array in `src/modules/registry.ts`.

## Project structure

```shell
block-tube/
├── manifest.json          Manifest V3 (paths point at the dist/ layout)
├── package.json
├── tsconfig.json
├── build.mts              esbuild build script (run with tsx)
├── playwright.config.ts
├── vitest.config.ts
├── icons/
└── src/
    ├── background/background.ts        Service worker — seeds default settings
    ├── content/
    │   ├── content.ts                  Runs every enabled module's `run`; reloads on state changes
    │   └── redirect.ts                 document_start URL-prefix redirect (driven by module.redirectPaths)
    ├── popup/
    │   ├── popup.html
    │   ├── popup.css
    │   └── popup.ts                    Auth gate + module list (switch + optional cog)
    ├── main-world/
    │   ├── seed.ts                     Vendored — MAIN-world fetch / Polymer hooks
    │   ├── inject.ts                   Vendored — JSON filter pipeline + menu items
    │   └── bridge.ts                   chrome.storage ↔ MAIN-world adapter
    ├── modules/
    │   ├── types.ts
    │   ├── registry.ts
    │   ├── shorts/shorts.module.ts
    │   ├── playables/playables.module.ts
    │   └── channels/
    │       ├── channels.module.ts
    │       ├── channels.settings.ts
    │       └── blocked-channels.ts
    └── shared/
        ├── auth.ts                     chrome.identity wrapper
        └── settings.ts
```

## Build

```bash
npm install        # one-time
npm run build      # bundles src/ → dist/
npm run watch      # rebuild on change
npm run typecheck  # tsc --noEmit
```

`build.mts` bundles each entry point with esbuild (background as ESM; content,
popup, redirect, and bridge as IIFE) and copies static assets — including the
vendored MAIN-world scripts, which are kept verbatim — into `dist/`.

## Tests

```bash
npm run test:unit  # vitest (happy-dom) — fast DOM + storage tests
npm run test:e2e   # playwright — real Chrome with the unpacked extension
```

Test layout mirrors the source: cross-cutting tests (auth, settings, popup,
extension boot, content reload) live at the top of `tests/{unit,e2e}/`, while
per-module tests live under `tests/{unit,e2e}/modules/`.

## Loading it in Chrome

1. Run `npm install && npm run build` (or download the archive and unpack it)
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the **`dist/`** folder.
4. Open the popup and sign in with Google. Toggle on the modules you want.

`manifest.json` declares four content scripts:

| Script                                       | World    | When             |
| -------------------------------------------- | -------- | ---------------- |
| `main-world/seed.js`, `main-world/inject.js` | MAIN     | `document_start` |
| `main-world/bridge.js`                       | isolated | `document_start` |
| `redirect.js`                                | isolated | `document_start` |
| `content.js`                                 | isolated | `document_end`   |

`world: "MAIN"` static scripts require Chrome 111+, which the manifest pins as
the minimum.
