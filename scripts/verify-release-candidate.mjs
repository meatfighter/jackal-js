import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertRealFile, assertReleaseTreePath, distDir, rootDir } from "./build-utils.mjs";
import { sha256File, verifyReleaseManifest } from "./release-manifest.mjs";
import { displayPath } from "./run-utils.mjs";
import { listZipEntries, readZipTextEntry } from "./zip-utils.mjs";

const distributionName = "jackal-desktop";
const runtimeJars = ["slick.jar", "lwjgl.jar", "lwjgl_util.jar", "jinput.jar", "jorbis.jar"];
const requiredNativeEntries = [
    "natives/windows/lwjgl64.dll",
    "natives/windows/OpenAL64.dll",
    "natives/windows/jinput-dx8_64.dll",
    "natives/windows/jinput-raw_64.dll",
    "natives/linux/liblwjgl64.so",
    "natives/linux/libopenal64.so",
    "natives/linux/libjinput-linux64.so",
    "natives/macosx/liblwjgl.jnilib",
    "natives/macosx/openal.dylib",
    "natives/macosx/libjinput-osx.jnilib"
];
const allowedNativeEntries = new Set(requiredNativeEntries.map((entry) => `${distributionName}/${entry}`));
const requiredLicenseEntries = ["licenses/SLICK2D.txt", "licenses/LWJGL-2.txt", "licenses/JINPUT.txt", "licenses/LGPL-2.0.txt", "licenses/JORBIS-NOTICE.txt"];
const requiredSourceEntries = ["sources/jorbis-0.0.17-sources.jar"];
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
const executableZipEntries = new Set([`${distributionName}/run-linux.sh`, `${distributionName}/run-macos.sh`]);
const forbiddenOuterManifestEntries = new Set(["META-INF/MANIFEST.MF", `${distributionName}/META-INF/MANIFEST.MF`]);
const requiredLauncherTokens = new Map([
    ["run-windows.cmd", ["--enable-native-access=ALL-UNNAMED", "--sun-misc-unsafe-memory-access=allow"]],
    ["run-windows.ps1", ["--enable-native-access=ALL-UNNAMED", "--sun-misc-unsafe-memory-access=allow"]],
    ["run-linux.sh", ["--enable-native-access=ALL-UNNAMED", "--sun-misc-unsafe-memory-access=allow"]],
    ["run-macos.sh", ["-XstartOnFirstThread", "--enable-native-access=ALL-UNNAMED", "--sun-misc-unsafe-memory-access=allow"]]
]);

function assertFile(path, label) {
    assertRealFile(path, label);
}

export function requiredDesktopZipEntries() {
    const root = `${distributionName}/`;
    return [
        ...requiredRootEntries.map((entry) => `${root}${entry}`),
        ...runtimeJars.map((jar) => `${root}lib/${jar}`),
        ...requiredNativeEntries.map((entry) => `${root}${entry}`),
        ...requiredLicenseEntries.map((entry) => `${root}${entry}`),
        ...requiredSourceEntries.map((entry) => `${root}${entry}`)
    ];
}

export function requiredDesktopZipEntryModes() {
    return new Map(requiredDesktopZipEntries().map((entry) => [entry, executableZipEntries.has(entry) ? 0o755 : 0o644]));
}

function normalizeZipEntry(entry) {
    if (typeof entry === "string") {
        return {
            name: entry.replaceAll("\\", "/"),
            unixMode: null
        };
    }
    return {
        name: entry.name.replaceAll("\\", "/"),
        unixMode: entry.unixMode
    };
}

function formatMode(mode) {
    return `0${(mode & 0o777).toString(8)}`;
}

export function verifyDesktopZipEntries(entries) {
    const normalizedEntries = entries.map(normalizeZipEntry);
    const entrySet = new Set(normalizedEntries.map((entry) => entry.name));
    const entryMap = new Map(normalizedEntries.map((entry) => [entry.name, entry]));
    const missing = requiredDesktopZipEntries().filter((entry) => !entrySet.has(entry));
    if (missing.length > 0) {
        throw new Error(`Desktop ZIP is missing required entries: ${missing.join(", ")}`);
    }

    const unexpectedNatives = normalizedEntries
        .filter((entry) => entry.name.startsWith(`${distributionName}/natives/`) && !entry.name.endsWith("/") && !allowedNativeEntries.has(entry.name))
        .map((entry) => entry.name);
    if (unexpectedNatives.length > 0) {
        throw new Error(`Desktop ZIP contains unsupported native files: ${unexpectedNatives.join(", ")}`);
    }

    const outerManifests = normalizedEntries.filter((entry) => forbiddenOuterManifestEntries.has(entry.name)).map((entry) => entry.name);
    if (outerManifests.length > 0) {
        throw new Error(`Desktop ZIP contains outer manifest entries: ${outerManifests.join(", ")}`);
    }

    for (const [entryName, expectedMode] of requiredDesktopZipEntryModes()) {
        const entry = entryMap.get(entryName);
        if (entry?.unixMode === null || entry?.unixMode === undefined) {
            throw new Error(`Desktop ZIP entry mode is unavailable for ${entryName}.`);
        }
        const actualMode = entry.unixMode & 0o777;
        if (actualMode !== expectedMode) {
            throw new Error(`Desktop ZIP entry ${entryName} has mode ${formatMode(actualMode)}; expected ${formatMode(expectedMode)}.`);
        }
    }
}

export function verifyDesktopZipArchive(zipPath) {
    verifyDesktopZipEntries(listZipEntries(zipPath));

    for (const [launcher, tokens] of requiredLauncherTokens) {
        const entryName = `${distributionName}/${launcher}`;
        const text = readZipTextEntry(zipPath, entryName);
        for (const token of tokens) {
            if (!text.includes(token)) {
                throw new Error(`Desktop ZIP launcher ${entryName} is missing compatibility token: ${token}`);
            }
        }
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

    verifyDesktopZipArchive(stableZip);
}

export function verifyReleaseCandidate(releaseDir = distDir) {
    const root = assertReleaseTreePath("release candidate directory", releaseDir);
    const manifest = verifyReleaseManifest(root);
    if (!/^[0-9a-f]{40}$/i.test(manifest.sourceCommit ?? "")) {
        throw new Error("Release manifest must record a 40-character sourceCommit.");
    }
    if (typeof manifest.sourceUrl !== "string" || manifest.sourceUrl.length === 0) {
        throw new Error("Release manifest must record sourceUrl.");
    }
    assertFile(join(root, "index.html"), "about page");
    assertFile(join(root, "pwa", "index.html"), "PWA index");
    assertFile(join(root, "pwa", "sw.js"), "PWA service worker");
    verifyDesktopZip(root, manifest.version);
    return manifest;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const releaseDir = assertReleaseTreePath("release candidate directory", resolve(rootDir, process.argv[2] ?? distDir));
    const manifest = verifyReleaseCandidate(releaseDir);
    console.log(`Verified release candidate ${displayPath(releaseDir)} with ${manifest.files.length} manifest entries.`);
}
