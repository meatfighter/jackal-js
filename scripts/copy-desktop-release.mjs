import { copyFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { ensureDirectory, readVersion, rootDir } from "./build-utils.mjs";

const version = readVersion();
const releasesDir = join(rootDir, "releases");
const distributionName = "jackal-desktop";
const sourceZip = join(rootDir, "desktop", "target", `${distributionName}-${version.version}.zip`);
const releaseZip = join(releasesDir, `${distributionName}-${version.version}.zip`);

if (!existsSync(sourceZip)) {
    throw new Error(`Missing desktop release zip: ${sourceZip}`);
}

ensureDirectory(releasesDir);
copyFileSync(sourceZip, releaseZip);
console.log(`Copied ${relative(rootDir, releaseZip)}`);
