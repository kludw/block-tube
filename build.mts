import esbuild from "esbuild";
import { rmSync, mkdirSync, copyFileSync } from "node:fs";

const OUT = "dist";
const watch = process.argv.includes("--watch");

function copyStaticAssets() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/popup`, { recursive: true });
  mkdirSync(`${OUT}/icons`, { recursive: true });
  mkdirSync(`${OUT}/main-world`, { recursive: true });
  copyFileSync("manifest.json", `${OUT}/manifest.json`);
  copyFileSync("icons/icon128.png", `${OUT}/icons/icon128.png`);
  copyFileSync("icons/icon128-light.png", `${OUT}/icons/icon128-light.png`);
  copyFileSync("src/popup/popup.html", `${OUT}/popup/popup.html`);
  copyFileSync("src/popup/popup.css", `${OUT}/popup/popup.css`);
  copyFileSync("src/main-world/seed.js", `${OUT}/main-world/seed.js`);
  copyFileSync("src/main-world/inject.js", `${OUT}/main-world/inject.js`);
}

const shared = {
  bundle: true,
  target: "chrome92" as const,
  logLevel: "info" as const,
  sourcemap: "inline" as const,
};

const entries = [
  {
    entryPoints: ["src/background/background.ts"],
    outfile: `${OUT}/background.js`,
    format: "esm" as const,
    ...shared,
  },
  {
    entryPoints: ["src/content/content.ts"],
    outfile: `${OUT}/content.js`,
    format: "iife" as const,
    ...shared,
  },
  {
    entryPoints: ["src/popup/popup.ts"],
    outfile: `${OUT}/popup/popup.js`,
    format: "iife" as const,
    ...shared,
  },
  {
    entryPoints: ["src/main-world/bridge.ts"],
    outfile: `${OUT}/main-world/bridge.js`,
    format: "iife" as const,
    ...shared,
  },
];

copyStaticAssets();

if (watch) {
  for (const entry of entries) {
    const ctx = await esbuild.context(entry);
    await ctx.watch();
  }
  console.log("esbuild is watching for changes…");
} else {
  await Promise.all(entries.map((entry) => esbuild.build(entry)));
  console.log("Build complete -> dist/");
}
