import { existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { distDir, releaseWorkDir, rootDir } from "./build-utils.mjs";

export function assertInsideRoot(label, path, allowedRoot = rootDir) {
    const resolvedPath = resolve(path);
    const resolvedRoot = resolve(allowedRoot);
    const ref = relative(resolvedRoot, resolvedPath);
    if (ref === "" || (!ref.startsWith("..") && !isAbsolute(ref))) {
        return resolvedPath;
    }
    throw new Error(`${label} must be inside ${resolvedRoot}: ${resolvedPath}`);
}

function assertDirectory(path, label) {
    if (!existsSync(path) || !statSync(path).isDirectory()) {
        throw new Error(`Missing ${label}: ${path}`);
    }
}

export function promoteVerifiedCandidate(candidateDir, targetDir = distDir, { workDir = releaseWorkDir, beforeCandidatePromote = null } = {}) {
    const candidate = assertInsideRoot("release candidate", candidateDir);
    const target = assertInsideRoot("release target", targetDir);
    const work = assertInsideRoot("release work directory", workDir);
    const backup = join(work, `previous-dist-${process.pid}-${Date.now()}`);
    let backupCreated = false;

    assertDirectory(candidate, "release candidate");
    mkdirSync(work, { recursive: true });
    rmSync(backup, { recursive: true, force: true });

    try {
        if (existsSync(target)) {
            renameSync(target, backup);
            backupCreated = true;
        }
        beforeCandidatePromote?.();
        renameSync(candidate, target);
        if (backupCreated) {
            rmSync(backup, { recursive: true, force: true });
        }
    } catch (error) {
        if (backupCreated && !existsSync(target) && existsSync(backup)) {
            renameSync(backup, target);
        }
        throw error;
    }
}
