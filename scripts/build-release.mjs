import { join } from "node:path";
import { cleanReleaseOutputDirectory, cleanReleaseWorkDirectory, distDir, releaseWorkDir } from "./build-utils.mjs";
import { promoteVerifiedCandidate, recoverInterruptedPromotion } from "./release-atomic-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";
import { displayPath, runNodeScript, runNpmScript } from "./run-utils.mjs";
import { assertTrackedSourceStateUnchanged, captureSourceProvenance, captureTrackedSourceState, sourceProvenanceEnvironment } from "./source-state-utils.mjs";
import { withTemporaryBuildStamp } from "./version-stamp-utils.mjs";

const candidateDir = join(releaseWorkDir, "candidate");
const pwaOutDir = join(candidateDir, "pwa");

await withReleaseOperationLock(async () => {
    recoverInterruptedPromotion();
    const sourceProvenance = captureSourceProvenance();
    const sourceEnv = sourceProvenanceEnvironment(sourceProvenance);
    const sourceState = captureTrackedSourceState();

    cleanReleaseWorkDirectory(releaseWorkDir);

    await withTemporaryBuildStamp(() => {
        cleanReleaseOutputDirectory(candidateDir, "release candidate directory");
        runNpmScript("_build:pwa:release", {
            env: {
                JACKAL_PWA_OUT_DIR: pwaOutDir
            }
        });
        runNodeScript("scripts/verify-pwa-precache.mjs", [pwaOutDir]);
        runNodeScript("scripts/build-about.mjs", [candidateDir], { env: sourceEnv });
        runNpmScript("build:desktop");
        runNodeScript("scripts/assemble.mjs", [candidateDir]);
        runNodeScript("scripts/write-release-manifest.mjs", [candidateDir], { env: sourceEnv });
        runNodeScript("scripts/verify-release-candidate.mjs", [candidateDir]);
    });

    assertTrackedSourceStateUnchanged(sourceState);
    promoteVerifiedCandidate(candidateDir, distDir);
    console.log(`Promoted verified release candidate to ${displayPath(distDir)}`);
});
