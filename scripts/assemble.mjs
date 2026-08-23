import { copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assertComponentReleaseOutputPath, assertRealFile, componentReleaseDir, ensureDirectory, readVersion, rootDir } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";

const releaseDir = assertComponentReleaseOutputPath(
    "assembled release output directory",
    resolve(rootDir, process.argv[2] ?? join(componentReleaseDir, "web"))
);

await withReleaseOperationLock(() => {
    const version = readVersion();
    const downloadsDir = join(releaseDir, "downloads");
    const desktopTargetDir = join(rootDir, "desktop", "target");
    const distributionName = "jackal-desktop";
    const sourceZip = join(desktopTargetDir, `${distributionName}.zip`);
    const stableZip = join(downloadsDir, `${distributionName}.zip`);
    const versionedZip = join(downloadsDir, `${distributionName}-${version.version}.zip`);

    assertRealFile(sourceZip, "desktop ZIP");
    ensureDirectory(downloadsDir);
    copyFileSync(sourceZip, stableZip);
    copyFileSync(sourceZip, versionedZip);
    console.log(`Copied desktop downloads to ${downloadsDir}`);
});
