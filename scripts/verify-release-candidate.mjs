import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { distDir, rootDir } from "./build-utils.mjs";
import { sha256File, verifyReleaseManifest } from "./release-manifest.mjs";
import { displayPath } from "./run-utils.mjs";
import { listZipEntries } from "./zip-utils.mjs";

const distributionName = "jackal-desktop";
const runtimeJars = ["slick.jar", "lwjgl.jar", "lwjgl_util.jar", "jinput.jar", "jorbis.jar"];
const requiredNativeEntries = [
    "natives/windows/lwjgl64.dll",
    "natives/windows/OpenAL64.dll",
    "natives/windows/jinput-dx8_64.dll",
    "natives/windows/jinput-raw_64.dll",
    "natives/linux/liblwjgl64.so",
    "natives/linux/libopenal64.so",
    "natives/macosx/liblwjgl.jnilib",
    "natives/macosx/openal.dylib"
];
const requiredRootEntries = [
    `${distributionName}.jar`,
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "RUNTIME_DEPENDENCIES.md",
    "README.md",
    "run-windows.cmd",
    "run-windows.ps1",
    "run-linux.sh",
    "run-macos.sh"
];

function assertFile(path, label) {
    if (!existsSync(path)) {
        throw new Error(`Missing ${label}: ${path}`);
    }
}

export function requiredDesktopZipEntries() {
    const root = `${distributionName}/`;
    return [
        ...requiredRootEntries.map((entry) => `${root}${entry}`),
        ...runtimeJars.map((jar) => `${root}lib/${jar}`),
        ...requiredNativeEntries.map((entry) => `${root}${entry}`)
    ];
}

export function verifyDesktopZipEntries(entries) {
    const entrySet = new Set(entries.map((entry) => entry.replaceAll("\\", "/")));
    const missing = requiredDesktopZipEntries().filter((entry) => !entrySet.has(entry));
    if (missing.length > 0) {
        throw new Error(`Desktop ZIP is missing required entries: ${missing.join(", ")}`);
    }
}

export function verifyDesktopZip(releaseDir, version) {
    const downloadsDir = join(releaseDir, "downloads");
    const stableZip = join(downloadsDir, `${distributionName}.zip`);
    const versionedZip = join(downloadsDir, `${distributionName}-${version}.zip`);

    assertFile(stableZip, "stable desktop ZIP");
    assertFile(versionedZip, "versioned desktop ZIP");
    if (sha256File(stableZip) !== sha256File(versionedZip)) {
        throw new Error("Stable and versioned desktop ZIP downloads differ.");
    }

    verifyDesktopZipEntries(listZipEntries(stableZip).map((entry) => entry.name));
}

export function verifyReleaseCandidate(releaseDir = distDir) {
    const manifest = verifyReleaseManifest(releaseDir);
    assertFile(join(releaseDir, "index.html"), "about page");
    assertFile(join(releaseDir, "pwa", "index.html"), "PWA index");
    assertFile(join(releaseDir, "pwa", "sw.js"), "PWA service worker");
    verifyDesktopZip(releaseDir, manifest.version);
    return manifest;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const releaseDir = resolve(rootDir, process.argv[2] ?? distDir);
    const manifest = verifyReleaseCandidate(releaseDir);
    console.log(`Verified release candidate ${displayPath(releaseDir)} with ${manifest.files.length} manifest entries.`);
}
