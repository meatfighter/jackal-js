import { writeFileAtomic } from "./atomic-file-utils.mjs";
import { assertComponentReleaseOutputPath, componentReleaseDir, copyDirectory, ensureDirectory, readVersion, renderTemplate, rootDir } from "./build-utils.mjs";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";
import { releaseSourceUrlEnv } from "./source-state-utils.mjs";

const outputDir = assertComponentReleaseOutputPath("about release output directory", resolve(rootDir, process.argv[2] ?? join(componentReleaseDir, "web")));

await withReleaseOperationLock(() => {
    const version = readVersion();
    const encodedBuildStamp = encodeURIComponent(version.buildStamp);
    const replacements = {
        __APP_VERSION__: version.version,
        __BUILD_STAMP__: version.buildStamp,
        __BUILD_STAMP_ENCODED__: encodedBuildStamp,
        __DESKTOP_ZIP__: `downloads/jackal-desktop.zip?v=${encodedBuildStamp}`,
        __PWA_URL__: `pwa/?v=${encodedBuildStamp}`,
        __SOURCE_URL__: process.env[releaseSourceUrlEnv] ?? "https://github.com/meatfighter/jackal-js"
    };

    const aboutDir = join(rootDir, "about");
    const indexPath = assertComponentReleaseOutputPath("about index output file", join(outputDir, "index.html"));
    const stylesPath = assertComponentReleaseOutputPath("about styles output file", join(outputDir, "styles.css"));

    ensureDirectory(outputDir);
    writeFileAtomic(indexPath, renderTemplate(readFileSync(join(aboutDir, "index.html"), "utf8"), replacements));
    writeFileAtomic(stylesPath, renderTemplate(readFileSync(join(aboutDir, "styles.css"), "utf8"), replacements));
    copyDirectory(join(aboutDir, "assets"), join(outputDir, "assets"), { assertTargetPath: assertComponentReleaseOutputPath });
    console.log("Built about page");
});
