import { copyFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { assertRealFile, ensureDirectory, readVersion, rootDir } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";

await withReleaseOperationLock(() => {
    const version = readVersion();
    const releasesDir = join(rootDir, "releases");
    const distributionName = "jackal-desktop";
    const sourceZip = join(rootDir, "desktop", "target", `${distributionName}.zip`);
    const releaseZip = join(releasesDir, `${distributionName}-${version.version}.zip`);

    if (!existsSync(sourceZip)) {
        throw new Error(`Missing desktop release zip: ${sourceZip}`);
    }

    assertRealFile(sourceZip, "desktop release zip");
    ensureDirectory(releasesDir);
    copyFileSync(sourceZip, releaseZip);
    console.log(`Copied ${relative(rootDir, releaseZip)}`);
});
