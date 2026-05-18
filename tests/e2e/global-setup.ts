import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export default function globalSetup(): void {
  const distExists = existsSync(path.join(repoRoot, "dist", "manifest.json"));
  if (distExists && process.env.E2E_SKIP_BUILD === "1") return;

  const result = spawnSync("npx", ["tsx", "build.mts"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Extension build failed");
  }
}
