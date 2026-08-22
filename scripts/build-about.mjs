import { componentReleaseDir, copyDirectory, ensureDirectory, readVersion, renderTemplate, rootDir } from "./build-utils.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const version = readVersion();
const outputDir = resolve(rootDir, process.argv[2] ?? process.env.JACKAL_WEB_OUT_DIR ?? join(componentReleaseDir, "web"));
const encodedBuildStamp = encodeURIComponent(version.buildStamp);
const replacements = {
    __APP_VERSION__: version.version,
    __BUILD_STAMP__: version.buildStamp,
    __BUILD_STAMP_ENCODED__: encodedBuildStamp,
    __DESKTOP_ZIP__: `downloads/jackal-desktop.zip?v=${encodedBuildStamp}`,
    __PWA_URL__: `pwa/?v=${encodedBuildStamp}`
};

const aboutDir = join(rootDir, "about");

ensureDirectory(outputDir);
writeFileSync(join(outputDir, "index.html"), renderTemplate(readFileSync(join(aboutDir, "index.html"), "utf8"), replacements));
writeFileSync(join(outputDir, "styles.css"), renderTemplate(readFileSync(join(aboutDir, "styles.css"), "utf8"), replacements));
copyDirectory(join(aboutDir, "assets"), join(outputDir, "assets"));
console.log("Built about page");
