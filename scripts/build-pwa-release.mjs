import { join, resolve } from "node:path";
import { assertComponentReleaseOutputPath, cleanReleaseOutputDirectory, componentReleaseDir, rootDir } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";
import { displayPath, runNodeScript, runNpmScript } from "./run-utils.mjs";
import { withTemporaryBuildStamp } from "./version-stamp-utils.mjs";

const pwaOutDir = assertComponentReleaseOutputPath("PWA release output directory", resolve(rootDir, process.argv[2] ?? join(componentReleaseDir, "pwa")));

await withReleaseOperationLock(async () => {
    await withTemporaryBuildStamp(() => {
        cleanReleaseOutputDirectory(pwaOutDir, "PWA release output directory");
        runNpmScript("_build:pwa:release", {
            env: {
                JACKAL_PWA_OUT_DIR: pwaOutDir
            }
        });
        runNodeScript("scripts/verify-pwa-precache.mjs", [pwaOutDir]);
    });

    console.log(`Built component PWA release in ${displayPath(pwaOutDir)}`);
});
