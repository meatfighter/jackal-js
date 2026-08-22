import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";
import { promoteVerifiedCandidate } from "./release-atomic-utils.mjs";
import { verifyReleaseManifest, writeReleaseManifest } from "./release-manifest.mjs";
import { requiredDesktopZipEntries, verifyDesktopZipEntries } from "./verify-release-candidate.mjs";
import { withRestoredFile } from "./version-stamp-utils.mjs";

async function withTempDir(task) {
    const dir = mkdtempSync(join(rootDir, ".release-test-"));
    try {
        return await task(dir);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

test("temporary file restoration preserves exact original bytes on success and failure", async () => {
    await withTempDir(async (dir) => {
        const path = join(dir, "version.json");
        const original = '{\r\n    "buildStamp": "original"\r\n}\r\n';
        writeFileSync(path, original);

        await withRestoredFile(path, async () => {
            writeFileSync(path, '{"buildStamp":"changed"}\n');
        });
        assert.equal(readFileSync(path, "utf8"), original);

        await assert.rejects(
            withRestoredFile(path, async () => {
                writeFileSync(path, '{"buildStamp":"failed"}\n');
                throw new Error("late build failure");
            }),
            /late build failure/
        );
        assert.equal(readFileSync(path, "utf8"), original);
    });
});

test("atomic candidate promotion restores the previous target when promotion fails", async () => {
    await withTempDir((dir) => {
        const candidateDir = join(dir, "candidate");
        const targetDir = join(dir, "dist");
        const workDir = join(dir, "work");
        mkdirSync(candidateDir, { recursive: true });
        mkdirSync(targetDir, { recursive: true });
        writeFileSync(join(candidateDir, "index.html"), "new");
        writeFileSync(join(targetDir, "index.html"), "old");

        assert.throws(
            () =>
                promoteVerifiedCandidate(candidateDir, targetDir, {
                    workDir,
                    beforeCandidatePromote() {
                        throw new Error("simulated promote failure");
                    }
                }),
            /simulated promote failure/
        );
        assert.equal(readFileSync(join(targetDir, "index.html"), "utf8"), "old");
        assert.equal(readFileSync(join(candidateDir, "index.html"), "utf8"), "new");

        promoteVerifiedCandidate(candidateDir, targetDir, { workDir });
        assert.equal(readFileSync(join(targetDir, "index.html"), "utf8"), "new");
        assert.equal(existsSync(candidateDir), false);
    });
});

test("release manifest verification detects mutated candidate files", async () => {
    await withTempDir((dir) => {
        const releaseDir = join(dir, "candidate");
        mkdirSync(join(releaseDir, "pwa"), { recursive: true });
        writeFileSync(join(releaseDir, "index.html"), "about");
        writeFileSync(join(releaseDir, "pwa", "index.html"), "pwa");

        writeReleaseManifest(releaseDir, {
            version: "1.0.0",
            buildStamp: "20260822T000000Z"
        });
        assert.doesNotThrow(() => verifyReleaseManifest(releaseDir));

        writeFileSync(join(releaseDir, "pwa", "index.html"), "PWA");
        assert.throws(() => verifyReleaseManifest(releaseDir), /SHA-256 mismatch/);
    });
});

test("desktop ZIP verifier requires runtime jars, natives, and notices", () => {
    const entries = requiredDesktopZipEntries();

    assert.doesNotThrow(() => verifyDesktopZipEntries(entries));
    assert.throws(() => verifyDesktopZipEntries(entries.filter((entry) => entry !== "jackal-desktop/lib/jorbis.jar")), /jorbis\.jar/);
    assert.throws(() => verifyDesktopZipEntries(entries.filter((entry) => entry !== "jackal-desktop/THIRD_PARTY_NOTICES.md")), /THIRD_PARTY_NOTICES\.md/);
});
