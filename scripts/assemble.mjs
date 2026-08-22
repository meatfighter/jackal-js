import { copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { distDir, ensureDirectory, readVersion, rootDir } from "./build-utils.mjs";

const version = readVersion();
const releaseDir = resolve(rootDir, process.argv[2] ?? process.env.JACKAL_WEB_OUT_DIR ?? distDir);
const downloadsDir = join(releaseDir, "downloads");
const desktopTargetDir = join(rootDir, "desktop", "target");
const distributionName = "jackal-desktop";
const sourceZip = join(desktopTargetDir, `${distributionName}.zip`);
const stableZip = join(downloadsDir, `${distributionName}.zip`);
const versionedZip = join(downloadsDir, `${distributionName}-${version.version}.zip`);

ensureDirectory(downloadsDir);
copyFileSync(sourceZip, stableZip);
copyFileSync(sourceZip, versionedZip);
console.log(`Copied desktop downloads to ${downloadsDir}`);
