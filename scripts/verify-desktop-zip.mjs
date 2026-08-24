import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertLocalGeneratedOutputPath, assertRealFile, rootDir } from "./build-utils.mjs";
import { displayPath } from "./run-utils.mjs";
import { verifyDesktopZipEntries } from "./verify-release-candidate.mjs";
import { listZipEntries } from "./zip-utils.mjs";

const distributionName = "jackal-desktop";
const desktopTargetDir = join(rootDir, "desktop", "target");
const zipPath = assertLocalGeneratedOutputPath(
    "desktop ZIP",
    resolve(rootDir, process.argv[2] ?? join(desktopTargetDir, `${distributionName}.zip`)),
    desktopTargetDir
);

export function verifyDesktopZipFile(path = zipPath) {
    assertRealFile(path, "desktop ZIP");
    verifyDesktopZipEntries(listZipEntries(path));
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    verifyDesktopZipFile(zipPath);
    console.log(`Verified desktop ZIP ${displayPath(zipPath)}.`);
}
