import { copyFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
    assertComponentReleaseOutputPath,
    assertLocalGeneratedOutputPath,
    assertRealDirectory,
    assertRealFile,
    componentReleaseDir,
    ensureDirectory,
    readVersion,
    rootDir
} from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";

const releaseDir = assertComponentReleaseOutputPath(
    "assembled release output directory",
    resolve(rootDir, process.argv[2] ?? join(componentReleaseDir, "web"))
);

await withReleaseOperationLock(() => {
    const version = readVersion();
    const desktopTargetDir = join(rootDir, "desktop", "target");
    const distributionName = "jackal-desktop";
    const downloadsDir = assertComponentReleaseOutputPath("desktop downloads output directory", join(releaseDir, "downloads"));
    const sourceZip = assertLocalGeneratedOutputPath("desktop ZIP source", join(desktopTargetDir, `${distributionName}.zip`), desktopTargetDir);
    const stableZip = assertComponentReleaseOutputPath("stable desktop ZIP output", join(downloadsDir, `${distributionName}.zip`));
    const versionedZip = assertComponentReleaseOutputPath("versioned desktop ZIP output", join(downloadsDir, `${distributionName}-${version.version}.zip`));

    assertRealFile(sourceZip, "desktop ZIP");
    if (existsSync(downloadsDir)) {
        assertRealDirectory(downloadsDir, "desktop downloads output directory");
    }
    if (existsSync(stableZip)) {
        assertRealFile(stableZip, "stable desktop ZIP output");
    }
    if (existsSync(versionedZip)) {
        assertRealFile(versionedZip, "versioned desktop ZIP output");
    }
    ensureDirectory(downloadsDir);
    copyFileSync(sourceZip, stableZip);
    copyFileSync(sourceZip, versionedZip);
    console.log(`Copied desktop downloads to ${downloadsDir}`);
});
