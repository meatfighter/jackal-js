import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { rootDir } from "./build-utils.mjs";

const desktopDir = join(rootDir, "desktop");
const stableJar = join(desktopDir, "target", "jackal-desktop.jar");
const distributionJar = join(desktopDir, "target", "distribution", "jackal-desktop", "jackal-desktop.jar");

const jarPath = existsSync(stableJar) ? stableJar : distributionJar;
if (!existsSync(jarPath)) {
    console.error("Desktop jar is missing. Run npm run build:desktop first.");
    process.exit(1);
}

const script = process.platform === "win32"
    ? join(desktopDir, "run-windows.cmd")
    : process.platform === "darwin"
        ? join(desktopDir, "run-macos.sh")
        : join(desktopDir, "run-linux.sh");

const result = spawnSync(script, {
    cwd: desktopDir,
    stdio: "inherit",
    shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
