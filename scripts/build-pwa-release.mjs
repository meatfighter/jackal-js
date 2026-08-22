import { join, resolve } from "node:path";
import { cleanDirectory, componentReleaseDir, rootDir } from "./build-utils.mjs";
import { displayPath, runNodeScript, runNpmScript } from "./run-utils.mjs";
import { withTemporaryBuildStamp } from "./version-stamp-utils.mjs";

const pwaOutDir = resolve(rootDir, process.argv[2] ?? join(componentReleaseDir, "pwa"));

await withTemporaryBuildStamp(() => {
    cleanDirectory(pwaOutDir);
    runNpmScript("_build:pwa:release", {
        env: {
            JACKAL_PWA_OUT_DIR: pwaOutDir
        }
    });
    runNodeScript("scripts/verify-pwa-precache.mjs", [pwaOutDir]);
});

console.log(`Built component PWA release in ${displayPath(pwaOutDir)}`);
