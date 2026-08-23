import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const distDir = join(rootDir, "dist");
export const componentReleaseDir = join(rootDir, ".release-components");
export const releaseWorkDir = join(rootDir, ".release-work");
export const versionPath = join(rootDir, "version.json");

const protectedReleasePathLabels = [
    [join(rootDir, ".git"), ".git"],
    [join(rootDir, "pwa"), "pwa"],
    [join(rootDir, "desktop"), "desktop"],
    [join(rootDir, "scripts"), "scripts"],
    [join(rootDir, ".release-secrets"), ".release-secrets"],
    [join(rootDir, ".release-candidates"), ".release-candidates"]
];

function isSameOrInside(parent, path) {
    const ref = relative(resolve(parent), resolve(path));
    return ref === "" || (!ref.startsWith("..") && !isAbsolute(ref));
}

function pathsOverlap(first, second) {
    return isSameOrInside(first, second) || isSameOrInside(second, first);
}

function relativeReleasePath(path) {
    return relative(rootDir, resolve(path)).replaceAll("\\", "/");
}

function isReleaseTestPath(path) {
    return /^\.release-test-[^/]+(?:\/|$)/.test(relativeReleasePath(path));
}

export function assertInsideRoot(label, path, allowedRoot = rootDir) {
    const resolvedPath = resolve(path);
    const resolvedRoot = resolve(allowedRoot);
    if (isSameOrInside(resolvedRoot, resolvedPath)) {
        return resolvedPath;
    }
    throw new Error(`${label} must be inside ${resolvedRoot}: ${resolvedPath}`);
}

export function assertNoProtectedReleasePathOverlap(label, path, { allowDist = false } = {}) {
    const resolvedPath = assertInsideRoot(label, path);
    if (resolvedPath === resolve(rootDir)) {
        throw new Error(`${label} cannot be the repository root: ${resolvedPath}`);
    }

    const protectedPaths = allowDist ? protectedReleasePathLabels : [...protectedReleasePathLabels, [distDir, "dist"]];

    for (const [protectedPath, protectedLabel] of protectedPaths) {
        if (pathsOverlap(protectedPath, resolvedPath)) {
            throw new Error(`${label} overlaps protected release path ${protectedLabel}: ${resolvedPath}`);
        }
    }

    return resolvedPath;
}

export function assertReleasePathsDoNotOverlap(firstLabel, firstPath, secondLabel, secondPath) {
    const resolvedFirst = resolve(firstPath);
    const resolvedSecond = resolve(secondPath);
    if (pathsOverlap(resolvedFirst, resolvedSecond)) {
        throw new Error(`${firstLabel} must not overlap ${secondLabel}: ${resolvedFirst} and ${resolvedSecond}`);
    }
}

export function assertCanonicalProductionDist(label, path) {
    const resolvedPath = assertInsideRoot(label, path);
    const resolvedDist = resolve(distDir);
    if (resolvedPath !== resolvedDist) {
        throw new Error(`${label} must be the canonical production dist directory ${resolvedDist}: ${resolvedPath}`);
    }
    return resolvedPath;
}

export function assertReleaseFixtureRoot(label, path) {
    const resolvedPath = assertNoProtectedReleasePathOverlap(label, path);
    const ref = relativeReleasePath(resolvedPath);
    if (!/^\.release-test-[^/]+$/.test(ref)) {
        throw new Error(`${label} must be an explicit .release-test-* fixture root: ${resolvedPath}`);
    }
    return resolvedPath;
}

export function assertReleaseFixtureOutputPath(label, path, fixtureRoot) {
    const fixture = assertReleaseFixtureRoot("release fixture root", fixtureRoot);
    const resolvedPath = assertInsideRoot(label, path, fixture);
    assertNoProtectedReleasePathOverlap(label, resolvedPath);
    return resolvedPath;
}

export function assertGeneratedReleaseOutputPath(label, path, { allowComponents = true, allowWork = true, allowTests = true } = {}) {
    const resolvedPath = assertNoProtectedReleasePathOverlap(label, path);
    const allowedPaths = [];

    if (allowComponents) {
        allowedPaths.push(componentReleaseDir);
    }
    if (allowWork) {
        allowedPaths.push(releaseWorkDir);
    }

    if (allowedPaths.some((allowedPath) => isSameOrInside(allowedPath, resolvedPath)) || (allowTests && isReleaseTestPath(resolvedPath))) {
        return resolvedPath;
    }

    const allowedLabels = allowedPaths.map((allowedPath) => relativeReleasePath(allowedPath));
    if (allowTests) {
        allowedLabels.push(".release-test-*");
    }
    throw new Error(`${label} must be generated release output under ${allowedLabels.join(", ")}: ${resolvedPath}`);
}

export function assertGeneratedReleaseWorkPath(label, path, { fixtureRoot = null } = {}) {
    if (fixtureRoot !== null) {
        return assertReleaseFixtureOutputPath(label, path, fixtureRoot);
    }
    return assertGeneratedReleaseOutputPath(label, path, {
        allowComponents: false,
        allowWork: true,
        allowTests: false
    });
}

export function assertComponentReleaseOutputPath(label, path) {
    return assertGeneratedReleaseOutputPath(label, path, {
        allowComponents: true,
        allowWork: true,
        allowTests: true
    });
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
    cpSync(source, target, { recursive: true });
}

export function renderTemplate(template, replacements) {
    let output = template;
    for (const [token, value] of Object.entries(replacements)) {
        output = output.replaceAll(token, String(value));
    }
    return output;
}
