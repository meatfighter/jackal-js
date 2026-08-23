import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, parse, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const distDir = join(rootDir, "dist");
export const componentReleaseDir = join(rootDir, ".release-components");
export const releaseWorkDir = join(rootDir, ".release-work");
export const releaseCandidatesDir = join(rootDir, ".release-candidates");
export const releaseSecretsDir = join(rootDir, ".release-secrets");
export const releaseOperationLockDir = join(rootDir, ".release-operation.lock");
export const versionPath = join(rootDir, "version.json");

const trackedSourceDirectories = [
    [join(rootDir, ".git"), ".git"],
    [join(rootDir, "about"), "about"],
    [join(rootDir, "desktop"), "desktop"],
    [join(rootDir, "pwa"), "pwa"],
    [join(rootDir, "scripts"), "scripts"]
];

function isSameOrInside(parent, path) {
    const ref = relative(resolve(parent), resolve(path));
    return ref === "" || (!ref.startsWith("..") && !isAbsolute(ref));
}

function pathsOverlap(first, second) {
    return isSameOrInside(first, second) || isSameOrInside(second, first);
}

function displayPath(path) {
    return relative(rootDir, resolve(path)).replaceAll("\\", "/");
}

function isReleaseTestPath(path) {
    return /^\.release-test-[^/]+(?:\/|$)/.test(displayPath(path));
}

function findExistingPath(path) {
    let current = resolve(path);
    while (!existsSync(current)) {
        const parent = dirname(current);
        if (parent === current) {
            throw new Error(`Unable to find an existing ancestor for ${path}.`);
        }
        current = parent;
    }
    return current;
}

function existingPathsBetween(parent, child) {
    const resolvedParent = resolve(parent);
    const resolvedChild = findExistingPath(child);
    if (!isSameOrInside(resolvedParent, resolvedChild)) {
        return [];
    }

    const ref = relative(resolvedParent, resolvedChild);
    const paths = [resolvedParent];
    let current = resolvedParent;
    for (const part of ref.split(/[\\/]/).filter(Boolean)) {
        current = join(current, part);
        paths.push(current);
    }
    return paths;
}

function assertNoSymlinkInExistingPath(label, path) {
    for (const existingPath of existingPathsBetween(rootDir, path)) {
        const stat = lstatSync(existingPath);
        if (stat.isSymbolicLink()) {
            throw new Error(`${label} must not pass through a symlink or junction: ${existingPath}`);
        }
    }
}

function physicalPathFor(path) {
    const resolvedPath = resolve(path);
    const existingPath = findExistingPath(resolvedPath);
    assertNoSymlinkInExistingPath("release path", existingPath);
    return resolve(realpathSync.native(existingPath), relative(existingPath, resolvedPath));
}

function assertManagedReleaseRoot(label, root) {
    const resolvedRoot = assertInsideRoot(`${label} root`, root);
    if (existsSync(resolvedRoot)) {
        const stat = lstatSync(resolvedRoot);
        if (stat.isSymbolicLink()) {
            throw new Error(`${label} root must not be a symlink or junction: ${resolvedRoot}`);
        }

        const physicalRoot = realpathSync.native(resolvedRoot);
        if (relative(resolve(resolvedRoot), resolve(physicalRoot)) !== "") {
            throw new Error(`${label} root must resolve to its canonical repository path: ${resolvedRoot} -> ${physicalRoot}`);
        }
    }
    return resolvedRoot;
}

function assertPhysicalOutputPath(label, path, allowedRoot) {
    const physicalAllowedRoot = physicalPathFor(allowedRoot);
    const physicalPath = physicalPathFor(path);

    if (!isSameOrInside(physicalAllowedRoot, physicalPath)) {
        throw new Error(`${label} physical path escapes release output root ${allowedRoot}: ${physicalPath}`);
    }

    for (const [sourceDir, sourceLabel] of trackedSourceDirectories) {
        if (existsSync(sourceDir) && pathsOverlap(physicalPathFor(sourceDir), physicalPath)) {
            throw new Error(`${label} physical path overlaps tracked source directory ${sourceLabel}: ${physicalPath}`);
        }
    }
}

function assertAllowedReleaseOutputPath(label, path, allowedRoots, { allowTests = false, fixtureRoot = null } = {}) {
    const resolvedPath = assertInsideRoot(label, path);
    if (resolvedPath === resolve(rootDir)) {
        throw new Error(`${label} cannot be the repository root: ${resolvedPath}`);
    }

    if (fixtureRoot !== null) {
        return assertReleaseFixtureOutputPath(label, resolvedPath, fixtureRoot);
    }

    for (const [root, rootLabel] of allowedRoots) {
        const resolvedRoot = assertManagedReleaseRoot(rootLabel, root);
        if (isSameOrInside(resolvedRoot, resolvedPath)) {
            assertPhysicalOutputPath(label, resolvedPath, resolvedRoot);
            return resolvedPath;
        }
    }

    if (allowTests && isReleaseTestPath(resolvedPath)) {
        const fixtureRoot = join(rootDir, displayPath(resolvedPath).split("/").at(0));
        return assertReleaseFixtureOutputPath(label, resolvedPath, fixtureRoot);
    }

    throw new Error(`${label} must be under one of these release output roots: ${allowedRoots.map(([, rootLabel]) => rootLabel).join(", ")}`);
}

export function assertInsideRoot(label, path, allowedRoot = rootDir) {
    const resolvedPath = resolve(path);
    const resolvedRoot = resolve(allowedRoot);
    if (isSameOrInside(resolvedRoot, resolvedPath)) {
        return resolvedPath;
    }
    throw new Error(`${label} must be inside ${resolvedRoot}: ${resolvedPath}`);
}

export function assertReleasePathsDoNotOverlap(firstLabel, firstPath, secondLabel, secondPath) {
    const resolvedFirst = resolve(firstPath);
    const resolvedSecond = resolve(secondPath);
    if (pathsOverlap(resolvedFirst, resolvedSecond)) {
        throw new Error(`${firstLabel} must not overlap ${secondLabel}: ${resolvedFirst} and ${resolvedSecond}`);
    }

    const physicalFirst = physicalPathFor(resolvedFirst);
    const physicalSecond = physicalPathFor(resolvedSecond);
    if (pathsOverlap(physicalFirst, physicalSecond)) {
        throw new Error(`${firstLabel} physical path must not overlap ${secondLabel}: ${physicalFirst} and ${physicalSecond}`);
    }
}

export function assertCanonicalProductionDist(label, path) {
    const resolvedPath = assertInsideRoot(label, path);
    const resolvedDist = resolve(distDir);
    if (resolvedPath !== resolvedDist) {
        throw new Error(`${label} must be the canonical production dist directory ${resolvedDist}: ${resolvedPath}`);
    }
    assertManagedReleaseRoot("dist", distDir);
    assertPhysicalOutputPath(label, resolvedPath, resolvedDist);
    return resolvedPath;
}

export function assertReleaseFixtureRoot(label, path) {
    const resolvedPath = assertInsideRoot(label, path);
    const ref = displayPath(resolvedPath);
    if (!/^\.release-test-[^/]+$/.test(ref)) {
        throw new Error(`${label} must be an explicit .release-test-* fixture root: ${resolvedPath}`);
    }
    assertManagedReleaseRoot(label, resolvedPath);
    assertPhysicalOutputPath(label, resolvedPath, resolvedPath);
    return resolvedPath;
}

export function assertReleaseFixtureOutputPath(label, path, fixtureRoot) {
    const fixture = assertReleaseFixtureRoot("release fixture root", fixtureRoot);
    const resolvedPath = assertInsideRoot(label, path, fixture);
    assertPhysicalOutputPath(label, resolvedPath, fixture);
    return resolvedPath;
}

export function assertGeneratedReleaseOutputPath(
    label,
    path,
    { allowComponents = true, allowWork = true, allowCandidates = false, allowSecrets = false, allowTests = true } = {}
) {
    const allowedPaths = [];

    if (allowComponents) {
        allowedPaths.push([componentReleaseDir, ".release-components"]);
    }
    if (allowWork) {
        allowedPaths.push([releaseWorkDir, ".release-work"]);
    }
    if (allowCandidates) {
        allowedPaths.push([releaseCandidatesDir, ".release-candidates"]);
    }
    if (allowSecrets) {
        allowedPaths.push([releaseSecretsDir, ".release-secrets"]);
    }

    return assertAllowedReleaseOutputPath(label, path, allowedPaths, { allowTests });
}

export function assertGeneratedReleaseWorkPath(label, path, { fixtureRoot = null } = {}) {
    if (fixtureRoot !== null) {
        return assertReleaseFixtureOutputPath(label, path, fixtureRoot);
    }
    return assertGeneratedReleaseOutputPath(label, path, {
        allowComponents: false,
        allowWork: true,
        allowCandidates: false,
        allowSecrets: false,
        allowTests: false
    });
}

export function assertComponentReleaseOutputPath(label, path) {
    return assertGeneratedReleaseOutputPath(label, path, {
        allowComponents: true,
        allowWork: true,
        allowCandidates: false,
        allowSecrets: false,
        allowTests: true
    });
}

export function assertReleaseTreePath(label, path) {
    if (resolve(path) === resolve(distDir)) {
        return assertCanonicalProductionDist(label, path);
    }

    return assertGeneratedReleaseOutputPath(label, path, {
        allowComponents: true,
        allowWork: true,
        allowCandidates: true,
        allowSecrets: false,
        allowTests: true
    });
}

export function assertRealDirectory(path, label = "directory") {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(`${label} must be a real directory: ${path}`);
    }
    return stat;
}

export function assertRealFile(path, label = "file") {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
        throw new Error(`${label} must be a real file: ${path}`);
    }
    return stat;
}

export function assertRealFileOrDirectory(path, label = "release entry") {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
        throw new Error(`${label} must not be a symlink or junction: ${path}`);
    }
    if (!stat.isFile() && !stat.isDirectory()) {
        throw new Error(`${label} must be a regular file or directory: ${path}`);
    }
    return stat;
}

export function readVersion() {
    return JSON.parse(readFileSync(versionPath, "utf8").replace(/^\uFEFF/, ""));
}

export function writeVersion(version) {
    writeFileSync(versionPath, `${JSON.stringify(version, null, 4)}\n`);
}

export function ensureDirectory(path) {
    mkdirSync(path, { recursive: true });
}

export function cleanDirectory(path) {
    rmSync(path, { recursive: true, force: true });
    ensureDirectory(path);
}

export function cleanReleaseOutputDirectory(path, label = "release output directory") {
    const resolvedPath = assertComponentReleaseOutputPath(label, path);
    cleanDirectory(resolvedPath);
    return resolvedPath;
}

export function cleanReleaseWorkDirectory(path, label = "release work directory") {
    const resolvedPath = assertGeneratedReleaseWorkPath(label, path);
    cleanDirectory(resolvedPath);
    return resolvedPath;
}

export function cleanProductionDistDirectory(path = distDir, label = "production dist directory") {
    const resolvedPath = assertCanonicalProductionDist(label, path);
    cleanDirectory(resolvedPath);
    return resolvedPath;
}

export function copyDirectory(source, target) {
    if (!existsSync(source)) {
        return;
    }
    assertRealDirectory(source, "copy source directory");
    ensureDirectory(target);
    for (const entry of readdirSync(source).sort((a, b) => a.localeCompare(b))) {
        const sourcePath = join(source, entry);
        const targetPath = join(target, entry);
        const stat = assertRealFileOrDirectory(sourcePath, "copy source entry");
        if (stat.isDirectory()) {
            copyDirectory(sourcePath, targetPath);
        } else {
            ensureDirectory(dirname(targetPath));
            copyFileSync(sourcePath, targetPath);
        }
    }
}

export function renderTemplate(template, replacements) {
    let output = template;
    for (const [token, value] of Object.entries(replacements)) {
        output = output.replaceAll(token, String(value));
    }
    return output;
}
