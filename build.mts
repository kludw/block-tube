import esbuild from "esbuild";
import { rmSync, mkdirSync, copyFileSync } from "node:fs";

const OUT = "dist";
const watch = process.argv.includes("--watch");
const dev = watch || process.argv.includes("--dev");

function copyStaticAssets() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/popup`, { recursive: true });
  mkdirSync(`${OUT}/icons`, { recursive: true });
  copyFileSync("manifest.json", `${OUT}/manifest.json`);
  copyFileSync("icons/icon128.png", `${OUT}/icons/icon128.png`);
  copyFileSync("icons/icon128-light.png", `${OUT}/icons/icon128-light.png`);
  copyFileSync("icons/cog.svg", `${OUT}/icons/cog.svg`);
  copyFileSync("src/popup/popup.html", `${OUT}/popup/popup.html`);
  copyFileSync("src/popup/popup.css", `${OUT}/popup/popup.css`);
}

const shared = {
  bundle: true,
  target: "chrome92" as const,
  logLevel: "info" as const,
  sourcemap: dev ? ("inline" as const) : false,
  minify: !dev,
  drop: dev ? [] : (["console", "debugger"] as ("console" | "debugger")[]),
  legalComments: "none" as const,
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
    entryPoints: ["src/content/redirect.ts"],
    outfile: `${OUT}/redirect.js`,
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
  {
    entryPoints: ["src/main-world/seed.ts"],
    outfile: `${OUT}/main-world/seed.js`,
    format: "iife" as const,
    ...shared,
  },
  {
    entryPoints: ["src/main-world/inject.ts"],
    outfile: `${OUT}/main-world/inject.js`,
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
