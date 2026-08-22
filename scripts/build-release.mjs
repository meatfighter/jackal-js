import { join } from "node:path";
import { cleanDirectory, distDir, releaseWorkDir } from "./build-utils.mjs";
import { promoteVerifiedCandidate } from "./release-atomic-utils.mjs";
import { displayPath, runNodeScript, runNpmScript } from "./run-utils.mjs";
import { withTemporaryBuildStamp } from "./version-stamp-utils.mjs";

const candidateDir = join(releaseWorkDir, "candidate");
const pwaOutDir = join(candidateDir, "pwa");

cleanDirectory(releaseWorkDir);

await withTemporaryBuildStamp(() => {
    cleanDirectory(candidateDir);
    runNpmScript("_build:pwa:release", {
        env: {
            JACKAL_PWA_OUT_DIR: pwaOutDir
        }
    });
    runNodeScript("scripts/verify-pwa-precache.mjs", [pwaOutDir]);
    runNodeScript("scripts/build-about.mjs", [candidateDir]);
    runNpmScript("build:desktop");
    runNodeScript("scripts/assemble.mjs", [candidateDir]);
    runNodeScript("scripts/write-release-manifest.mjs", [candidateDir]);
    runNodeScript("scripts/verify-release-candidate.mjs", [candidateDir]);
});

promoteVerifiedCandidate(candidateDir, distDir);
console.log(`Promoted verified release candidate to ${displayPath(distDir)}`);
