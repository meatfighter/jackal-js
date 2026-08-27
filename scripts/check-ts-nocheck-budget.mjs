import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { rootDir } from "./build-utils.mjs";

const maxTsNocheckFiles = 0;
const tsNocheckMarker = "@ts-" + "nocheck";
const scannedExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx", ".vue"]);
const skippedDirectoryNames = new Set([
    ".git",
    ".release-candidates",
    ".release-components",
    ".release-operation.lock",
    ".release-secrets",
    ".release-version-stamp.lock",
    ".release-work",
    "dist",
    "node_modules"
]);

function shouldSkipDirectory(name) {
    return skippedDirectoryNames.has(name) || name.startsWith(".dist-") || name.startsWith(".release-test-");
}

function collectTsNocheckFiles(dir, files = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!shouldSkipDirectory(entry.name)) {
                collectTsNocheckFiles(path, files);
            }
            continue;
        }

        if (!entry.isFile() || !scannedExtensions.has(extname(entry.name))) {
            continue;
        }

        if (readFileSync(path, "utf8").includes(tsNocheckMarker)) {
            files.push(relative(rootDir, path).replaceAll("\\", "/"));
        }
    }
    return files;
}

const tsNocheckFiles = collectTsNocheckFiles(rootDir).sort();

if (tsNocheckFiles.length > maxTsNocheckFiles) {
    console.error(`${tsNocheckMarker} budget exceeded: ${tsNocheckFiles.length}/${maxTsNocheckFiles}`);
    console.error(tsNocheckFiles.join("\n"));
    process.exitCode = 1;
} else {
    console.log(`${tsNocheckMarker} budget: ${tsNocheckFiles.length}/${maxTsNocheckFiles}`);
}
