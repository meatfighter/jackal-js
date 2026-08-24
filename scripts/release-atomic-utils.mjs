import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fsyncDirectory, writeFileAtomic } from "./atomic-file-utils.mjs";
import {
    assertCanonicalProductionDist,
    assertGeneratedReleaseWorkPath,
    assertRealDirectory,
    assertReleaseFixtureOutputPath,
    assertReleasePathsDoNotOverlap,
    distDir,
    releaseWorkDir
} from "./build-utils.mjs";

function assertDirectory(path, label) {
    if (!existsSync(path)) {
        throw new Error(`Missing ${label}: ${path}`);
    }
    assertRealDirectory(path, label);
}

function resolvePromotionPath(label, path, fixtureRoot) {
    if (fixtureRoot !== null) {
        return assertReleaseFixtureOutputPath(label, path, fixtureRoot);
    }
    return assertGeneratedReleaseWorkPath(label, path);
}

export function promotionJournalPath(workDir = releaseWorkDir) {
    return join(workDir, "promotion-journal.json");
}

function writePromotionJournal(journalPath, journal) {
    mkdirSync(dirname(journalPath), { recursive: true });
    writeFileAtomic(journalPath, `${JSON.stringify(journal, null, 4)}\n`);
}

function removePromotionJournal(journalPath) {
    rmSync(journalPath, { force: true });
    fsyncDirectory(dirname(journalPath));
}

function readPromotionJournal(journalPath) {
    const journal = JSON.parse(readFileSync(journalPath, "utf8"));
    if (
        typeof journal !== "object" ||
        journal === null ||
        !["prepared", "target-backed-up", "candidate-promoted"].includes(journal.phase) ||
        typeof journal.candidate !== "string" ||
        typeof journal.target !== "string" ||
        typeof journal.backup !== "string" ||
        typeof journal.work !== "string"
    ) {
        throw new Error(`Invalid release promotion journal: ${journalPath}`);
    }
    return journal;
}

function resolvePromotionJournal(journal, work, fixtureRoot) {
    if (resolve(journal.work) !== resolve(work)) {
        throw new Error(`Release promotion journal work directory does not match ${work}: ${journal.work}`);
    }

    return {
        phase: journal.phase,
        candidate: resolvePromotionPath("release journal candidate", journal.candidate, fixtureRoot),
        target:
            fixtureRoot === null
                ? assertCanonicalProductionDist("release journal target", journal.target)
                : assertReleaseFixtureOutputPath("release journal target", journal.target, fixtureRoot),
        backup: resolvePromotionPath("release journal backup", journal.backup, fixtureRoot)
    };
}

function removeBackupOrKeepJournal(backup, journalPath) {
    if (!existsSync(backup)) {
        removePromotionJournal(journalPath);
        return;
    }

    rmSync(backup, { recursive: true, force: true });
    removePromotionJournal(journalPath);
}

function removeCandidateIfPresent(candidate) {
    if (existsSync(candidate)) {
        rmSync(candidate, { recursive: true, force: true });
    }
}

export function recoverInterruptedPromotion({ workDir = releaseWorkDir, fixtureRoot = null } = {}) {
    const work = assertGeneratedReleaseWorkPath("release work directory", workDir, { fixtureRoot });
    const journalPath = promotionJournalPath(work);
    if (!existsSync(journalPath)) {
        return false;
    }

    const journal = resolvePromotionJournal(readPromotionJournal(journalPath), work, fixtureRoot);
    const candidateExists = existsSync(journal.candidate);
    const targetExists = existsSync(journal.target);
    const backupExists = existsSync(journal.backup);

    if (journal.phase === "candidate-promoted") {
        if (targetExists) {
            removeBackupOrKeepJournal(journal.backup, journalPath);
        } else if (backupExists) {
            renameSync(journal.backup, journal.target);
            removePromotionJournal(journalPath);
        } else {
            throw new Error(`Unable to recover release promotion journal safely: ${journalPath}`);
        }
        return true;
    }

    if (journal.phase === "target-backed-up") {
        if (!targetExists && candidateExists) {
            renameSync(journal.candidate, journal.target);
            removeBackupOrKeepJournal(journal.backup, journalPath);
            return true;
        }
        if (!targetExists && backupExists) {
            renameSync(journal.backup, journal.target);
            removePromotionJournal(journalPath);
            return true;
        }
        if (targetExists && backupExists) {
            removeBackupOrKeepJournal(journal.backup, journalPath);
            return true;
        }
        if (targetExists) {
            removePromotionJournal(journalPath);
            return true;
        }
    }

    if (journal.phase === "prepared") {
        if (!targetExists && backupExists) {
            renameSync(journal.backup, journal.target);
            removeCandidateIfPresent(journal.candidate);
            removePromotionJournal(journalPath);
            return true;
        }
        if (!targetExists && candidateExists) {
            renameSync(journal.candidate, journal.target);
            removePromotionJournal(journalPath);
            return true;
        }
        if (targetExists) {
            if (backupExists) {
                rmSync(journal.backup, { recursive: true, force: true });
            }
            removePromotionJournal(journalPath);
            return true;
        }
    }

    throw new Error(`Unable to recover release promotion journal safely: ${journalPath}`);
}

export function promoteVerifiedCandidate(
    candidateDir,
    targetDir = distDir,
    { workDir = releaseWorkDir, beforeCandidatePromote = null, fixtureRoot = null } = {}
) {
    recoverInterruptedPromotion({ workDir, fixtureRoot });

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
    const journalPath = promotionJournalPath(work);
    writePromotionJournal(journalPath, {
        phase: "prepared",
        candidate,
        target,
        backup,
        work
    });

    try {
        if (existsSync(target)) {
            renameSync(target, backup);
            backupCreated = true;
            writePromotionJournal(journalPath, {
                phase: "target-backed-up",
                candidate,
                target,
                backup,
                work
            });
        }
        beforeCandidatePromote?.();
        renameSync(candidate, target);
        try {
            writePromotionJournal(journalPath, {
                phase: "candidate-promoted",
                candidate,
                target,
                backup,
                work
            });
        } catch (journalError) {
            console.warn(`Promoted release but could not update promotion journal: ${journalPath}`, journalError);
        }
        if (backupCreated) {
            try {
                rmSync(backup, { recursive: true, force: true });
                removePromotionJournal(journalPath);
            } catch (cleanupError) {
                console.warn(`Promoted release but could not clean previous dist backup: ${backup}`, cleanupError);
            }
        } else {
            removePromotionJournal(journalPath);
        }
    } catch (error) {
        if (backupCreated && !existsSync(target) && existsSync(backup)) {
            renameSync(backup, target);
        }
        removePromotionJournal(journalPath);
        throw error;
    }
}
