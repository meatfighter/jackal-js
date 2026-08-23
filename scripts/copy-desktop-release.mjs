import { copyFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { assertLocalGeneratedOutputPath, assertRealDirectory, assertRealFile, ensureDirectory, readVersion, rootDir } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";

await withReleaseOperationLock(() => {
    const version = readVersion();
    const releasesRoot = join(rootDir, "releases");
    const releasesDir = assertLocalGeneratedOutputPath("desktop releases directory", releasesRoot, releasesRoot);
    const distributionName = "jackal-desktop";
    const targetRoot = join(rootDir, "desktop", "target");
    const sourceZip = assertLocalGeneratedOutputPath("desktop release ZIP source", join(targetRoot, `${distributionName}.zip`), targetRoot);
    const releaseZip = assertLocalGeneratedOutputPath("desktop release ZIP", join(releasesDir, `${distributionName}-${version.version}.zip`), releasesDir);

    if (!existsSync(sourceZip)) {
        throw new Error(`Missing desktop release zip: ${sourceZip}`);
    }

    assertRealFile(sourceZip, "desktop release zip");
    if (existsSync(releasesDir)) {
        assertRealDirectory(releasesDir, "desktop releases directory");
    }
    if (existsSync(releaseZip)) {
        assertRealFile(releaseZip, "desktop release ZIP");
    }
    ensureDirectory(releasesDir);
    copyFileSync(sourceZip, releaseZip);
    console.log(`Copied ${relative(rootDir, releaseZip)}`);
});
