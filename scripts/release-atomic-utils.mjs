import { existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import {
    assertCanonicalProductionDist,
    assertGeneratedReleaseWorkPath,
    assertReleaseFixtureOutputPath,
    assertReleasePathsDoNotOverlap,
    distDir,
    releaseWorkDir
} from "./build-utils.mjs";

function assertDirectory(path, label) {
    if (!existsSync(path) || !statSync(path).isDirectory()) {
        throw new Error(`Missing ${label}: ${path}`);
    }
}

function resolvePromotionPath(label, path, fixtureRoot) {
    if (fixtureRoot !== null) {
        return assertReleaseFixtureOutputPath(label, path, fixtureRoot);
    }
    return assertGeneratedReleaseWorkPath(label, path);
}

export function promoteVerifiedCandidate(
    candidateDir,
    targetDir = distDir,
    { workDir = releaseWorkDir, beforeCandidatePromote = null, fixtureRoot = null } = {}
) {
    const candidate = resolvePromotionPath("release candidate", candidateDir, fixtureRoot);
    const target =
        fixtureRoot === null
            ? assertCanonicalProductionDist("release target", targetDir)
            : assertReleaseFixtureOutputPath("release target", targetDir, fixtureRoot);
    const work = assertGeneratedReleaseWorkPath("release work directory", workDir, { fixtureRoot });
    const backup = resolvePromotionPath("release backup", join(work, `previous-dist-${process.pid}-${Date.now()}`), fixtureRoot);
    let backupCreated = false;

    assertDirectory(candidate, "release candidate");
    assertReleasePathsDoNotOverlap("release candidate", candidate, "release target", target);
    assertReleasePathsDoNotOverlap("release candidate", candidate, "release backup", backup);
    assertReleasePathsDoNotOverlap("release target", target, "release work directory", work);
    assertReleasePathsDoNotOverlap("release target", target, "release backup", backup);
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
            try {
                rmSync(backup, { recursive: true, force: true });
            } catch (cleanupError) {
                console.warn(`Promoted release but could not clean previous dist backup: ${backup}`, cleanupError);
            }
        }
    } catch (error) {
        if (backupCreated && !existsSync(target) && existsSync(backup)) {
            renameSync(backup, target);
        }
        throw error;
    }
}
