# block-tube

A modular Chrome extension for blocking YouTube shorts and channels. Each feature is
a self-contained module; the popup lists every registered module and lets you
toggle and configure it.

## Modules

| Module              | Behaviour                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| **Shorts Blocker**  | Hides Shorts shelves, chips, and reels.                                                              |
| **Channel Blocker** | Hides every video from blocked channels; adds a **Block channel** item to the video three-dots menu. |

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
  run?(state: ModuleState): void;
  renderSettings?(container: HTMLElement): void | Promise<void>;
}
```

- `run` runs in the content script on `youtube.com` when the module is enabled.
- `renderSettings`, when present, makes the popup show a cog button that opens
  a modal and hands the module a body element to populate.

Module on/off state lives under one `chrome.storage.local` key
(`moduleSettings`), managed by `src/shared/settings.ts`. Modules with their own
data manage their own keys (e.g. the channel blocker's `blockedChannels`).

To add a module: create `src/modules/<name>/<name>.module.ts` exporting an
`ExtensionModule`, then append it to the array in `src/modules/registry.ts`.

## Project structure

```
chrome-ext/
├── manifest.json          Manifest V3 (paths point at the dist/ layout)
├── package.json
├── tsconfig.json
├── build.mjs              esbuild build script
├── NOTICE-blocktube.md    Attribution for the vendored MAIN-world scripts
├── icons/
│   ├── icon.svg
│   └── icon128.png
└── src/
    ├── background/background.ts   Service worker — seeds default settings
    ├── content/content.ts         Runs every enabled module's `run`
    ├── popup/
    │   ├── popup.html
    │   ├── popup.css
    │   └── popup.ts               Renders the module list (switch + optional cog)
    ├── main-world/
    │   ├── seed.js                Vendored — MAIN-world fetch / Polymer hooks
    │   ├── inject.js              Vendored — JSON filter pipeline + menu items
    │   └── bridge.ts              chrome.storage ↔ MAIN-world adapter
    ├── modules/
    │   ├── types.ts
    │   ├── registry.ts
    │   ├── shorts/shorts.module.ts
    │   └── channels/
    │       ├── channels.module.ts
    │       ├── channels.settings.ts
    │       └── blocked-channels.ts
    └── shared/settings.ts
```

## Build

```bash
npm install        # one-time
npm run build      # bundles src/ → dist/
npm run watch      # rebuild on change
npm run typecheck  # tsc --noEmit
```

`build.mjs` bundles each entry point with esbuild (background as ESM; content,
popup, and bridge as IIFE) and copies the static assets — including the
vendored MAIN-world scripts, which are kept verbatim — into `dist/`.

## Loading it in Chrome

1. Run `npm install && npm run build` (or download the archive and unpack it)
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the **`dist/`** folder.

`manifest.json` declares three content scripts:

| Script                                       | World    | When             |
| -------------------------------------------- | -------- | ---------------- |
| `main-world/seed.js`, `main-world/inject.js` | MAIN     | `document_start` |
| `main-world/bridge.js`                       | isolated | `document_start` |
| `content.js`                                 | isolated | `document_end`   |

`world: "MAIN"` static scripts require Chrome 111+, which the manifest pins as
the minimum.
