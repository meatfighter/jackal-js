import { join, resolve } from "node:path";
import { assertComponentReleaseOutputPath, cleanReleaseOutputDirectory, componentReleaseDir, rootDir } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";
import { displayPath, runNodeScript, runNpmScript } from "./run-utils.mjs";
import { withTemporaryBuildStamp } from "./version-stamp-utils.mjs";

const webOutDir = assertComponentReleaseOutputPath("web release output directory", resolve(rootDir, process.argv[2] ?? join(componentReleaseDir, "web")));
const pwaOutDir = join(webOutDir, "pwa");

await withReleaseOperationLock(async () => {
    await withTemporaryBuildStamp(() => {
        cleanReleaseOutputDirectory(webOutDir, "web release output directory");
        runNpmScript("_build:pwa:release", {
            env: {
                JACKAL_PWA_OUT_DIR: pwaOutDir
            }
        });
        runNodeScript("scripts/verify-pwa-precache.mjs", [pwaOutDir]);
        runNodeScript("scripts/build-about.mjs", [webOutDir]);
        runNpmScript("build:desktop");
        runNpmScript("verify:desktop");
        runNodeScript("scripts/assemble.mjs", [webOutDir]);
    });

    console.log(`Built component web release in ${displayPath(webOutDir)}`);
});
