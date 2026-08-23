import { resolve } from "node:path";
import { assertReleaseTreePath, distDir, rootDir } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";
import { writeReleaseManifest } from "./release-manifest.mjs";
import { displayPath } from "./run-utils.mjs";

const releaseDir = assertReleaseTreePath("release manifest output directory", resolve(rootDir, process.argv[2] ?? distDir));

await withReleaseOperationLock(() => {
    const manifest = writeReleaseManifest(releaseDir);
    console.log(`Wrote ${manifest.files.length} release manifest entries to ${displayPath(releaseDir)}/release.json`);
});
