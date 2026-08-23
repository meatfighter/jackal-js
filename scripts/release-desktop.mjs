import { withReleaseOperationLock } from "./release-lock-utils.mjs";
import { runNodeScript, runNpmScript } from "./run-utils.mjs";

await withReleaseOperationLock(() => {
    runNpmScript("verify");
    runNpmScript("build:desktop");
    runNodeScript("scripts/copy-desktop-release.mjs");
});
