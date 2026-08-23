import { cleanProductionDistDirectory, distDir } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";

await withReleaseOperationLock(() => {
    cleanProductionDistDirectory(distDir);
    console.log("Cleaned dist");
});
