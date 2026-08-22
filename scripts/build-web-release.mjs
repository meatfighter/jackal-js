import { join, resolve } from "node:path";
import { cleanDirectory, componentReleaseDir, rootDir } from "./build-utils.mjs";
import { displayPath, runNodeScript, runNpmScript } from "./run-utils.mjs";
import { withTemporaryBuildStamp } from "./version-stamp-utils.mjs";

const webOutDir = resolve(rootDir, process.argv[2] ?? join(componentReleaseDir, "web"));
const pwaOutDir = join(webOutDir, "pwa");

await withTemporaryBuildStamp(() => {
    cleanDirectory(webOutDir);
    runNpmScript("_build:pwa:release", {
        env: {
            JACKAL_PWA_OUT_DIR: pwaOutDir
        }
    });
    runNodeScript("scripts/verify-pwa-precache.mjs", [pwaOutDir]);
    runNodeScript("scripts/build-about.mjs", [webOutDir]);
});

console.log(`Built component web release in ${displayPath(webOutDir)}`);
