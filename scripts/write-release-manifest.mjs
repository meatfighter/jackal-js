import { resolve } from "node:path";
import { distDir, rootDir } from "./build-utils.mjs";
import { writeReleaseManifest } from "./release-manifest.mjs";
import { displayPath } from "./run-utils.mjs";

const releaseDir = resolve(rootDir, process.argv[2] ?? distDir);
const manifest = writeReleaseManifest(releaseDir);

console.log(`Wrote ${manifest.files.length} release manifest entries to ${displayPath(releaseDir)}/release.json`);
