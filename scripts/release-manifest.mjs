import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { assertRealFile, assertRealFileOrDirectory, assertReleaseTreePath, readVersion } from "./build-utils.mjs";

export const RELEASE_MANIFEST_NAME = "release.json";

function normalizeRef(ref) {
    return ref.replaceAll("\\", "/");
}

function collectFiles(dir, baseDir = dir) {
    const files = [];
    for (const entry of readdirSync(dir).sort((a, b) => a.localeCompare(b))) {
        const path = join(dir, entry);
        const stat = assertRealFileOrDirectory(path, "release manifest entry");
        if (stat.isDirectory()) {
            files.push(...collectFiles(path, baseDir));
            continue;
        }

        const ref = normalizeRef(relative(baseDir, path));
        if (ref !== RELEASE_MANIFEST_NAME) {
            files.push({ path, ref, bytes: stat.size });
        }
    }
    return files;
}

export function sha256File(path) {
    assertRealFile(path, "release file");
    return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function createReleaseManifest(releaseDir, version = readVersion()) {
    const root = assertReleaseTreePath("release manifest directory", resolve(releaseDir));
    return {
        version: version.version,
        buildStamp: version.buildStamp,
        files: collectFiles(root).map((file) => ({
            path: file.ref,
            bytes: file.bytes,
            sha256: sha256File(file.path)
        }))
    };
}

export function writeReleaseManifest(releaseDir, version = readVersion()) {
    const root = assertReleaseTreePath("release manifest directory", resolve(releaseDir));
    const manifest = createReleaseManifest(root, version);
    writeFileSync(join(root, RELEASE_MANIFEST_NAME), `${JSON.stringify(manifest, null, 4)}\n`);
    return manifest;
}

export function readReleaseManifest(releaseDir) {
    const root = assertReleaseTreePath("release manifest directory", resolve(releaseDir));
    const manifestPath = join(root, RELEASE_MANIFEST_NAME);
    if (!existsSync(manifestPath)) {
        throw new Error(`Missing release manifest: ${manifestPath}`);
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (
        typeof manifest !== "object" ||
        manifest === null ||
        typeof manifest.version !== "string" ||
        typeof manifest.buildStamp !== "string" ||
        !Array.isArray(manifest.files)
    ) {
        throw new Error(`Invalid release manifest: ${manifestPath}`);
    }
    return manifest;
}

export function verifyReleaseManifest(releaseDir) {
    const root = assertReleaseTreePath("release manifest directory", resolve(releaseDir));
    const manifest = readReleaseManifest(root);
    const actualFiles = new Map(collectFiles(root).map((file) => [file.ref, file]));
    const expectedFiles = new Set();

    for (const file of manifest.files) {
        if (typeof file?.path !== "string" || typeof file.bytes !== "number" || typeof file.sha256 !== "string") {
            throw new Error("Release manifest contains an invalid file entry.");
        }
        if (expectedFiles.has(file.path)) {
            throw new Error(`Release manifest contains a duplicate file entry: ${file.path}`);
        }
        expectedFiles.add(file.path);

        const actual = actualFiles.get(file.path);
        if (actual === undefined) {
            throw new Error(`Release manifest references a missing file: ${file.path}`);
        }
        if (actual.bytes !== file.bytes) {
            throw new Error(`Release manifest byte count mismatch for ${file.path}: expected ${file.bytes}, got ${actual.bytes}`);
        }
        const actualHash = sha256File(actual.path);
        if (actualHash !== file.sha256) {
            throw new Error(`Release manifest SHA-256 mismatch for ${file.path}: expected ${file.sha256}, got ${actualHash}`);
        }
    }

    for (const file of actualFiles.keys()) {
        if (!expectedFiles.has(file)) {
            throw new Error(`Release manifest is missing generated file: ${file}`);
        }
    }

    return manifest;
}
