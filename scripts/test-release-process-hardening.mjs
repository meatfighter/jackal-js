import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { distDir, releaseWorkDir, rootDir, versionPath } from "./build-utils.mjs";
import { promoteVerifiedCandidate } from "./release-atomic-utils.mjs";
import { verifyReleaseManifest, writeReleaseManifest } from "./release-manifest.mjs";
import { assertTrackedSourceStateUnchanged, captureTrackedSourceState } from "./source-state-utils.mjs";
import { listZipEntries, writeZipFromDirectory } from "./zip-utils.mjs";
import { requiredDesktopZipEntries, requiredDesktopZipEntryModes, verifyDesktopZipEntries } from "./verify-release-candidate.mjs";
import { withRestoredFile } from "./version-stamp-utils.mjs";

async function withTempDir(task) {
    const dir = mkdtempSync(join(rootDir, ".release-test-"));
    try {
        return await task(dir);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

async function withReleaseWorkTestDir(task) {
    mkdirSync(releaseWorkDir, { recursive: true });
    const dir = mkdtempSync(join(releaseWorkDir, "promotion-safety-test-"));
    try {
        return await task(dir);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

function createFile(path, content = "x") {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
}

function modeAwareRequiredEntries(overrides = {}) {
    const modes = requiredDesktopZipEntryModes();
    return requiredDesktopZipEntries().map((name) => ({
        name,
        unixMode: overrides[name] ?? modes.get(name)
    }));
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
                    fixtureRoot: dir,
                    beforeCandidatePromote() {
                        throw new Error("simulated promote failure");
                    }
                }),
            /simulated promote failure/
        );
        assert.equal(readFileSync(join(targetDir, "index.html"), "utf8"), "old");
        assert.equal(readFileSync(join(candidateDir, "index.html"), "utf8"), "new");

        promoteVerifiedCandidate(candidateDir, targetDir, { workDir, fixtureRoot: dir });
        assert.equal(readFileSync(join(targetDir, "index.html"), "utf8"), "new");
        assert.equal(existsSync(candidateDir), false);
    });
});

test("production promotion only accepts generated candidates and canonical dist targets", async () => {
    await withTempDir((dir) => {
        const fixtureCandidateDir = join(dir, "candidate");
        mkdirSync(fixtureCandidateDir, { recursive: true });

        assert.throws(
            () => promoteVerifiedCandidate(fixtureCandidateDir, distDir, { workDir: releaseWorkDir }),
            /release candidate must be generated release output/
        );
    });

    assert.throws(
        () => promoteVerifiedCandidate(join(releaseWorkDir, "candidate"), join(rootDir, ".release-components", "web"), { workDir: releaseWorkDir }),
        /release target must be the canonical production dist directory/
    );
});

test("final tracked source check rejects before canonical dist promotion", async () => {
    await withReleaseWorkTestDir(async (dir) => {
        const candidateDir = join(dir, "candidate");
        const sentinelName = `promotion-safety-sentinel-${process.pid}-${Date.now()}.txt`;
        const sentinelPath = join(distDir, sentinelName);
        const hadDist = existsSync(distDir);
        let promotionReached = false;

        mkdirSync(candidateDir, { recursive: true });
        writeFileSync(join(candidateDir, "index.html"), "new release");
        mkdirSync(distDir, { recursive: true });
        writeFileSync(sentinelPath, "old release");

        const sourceState = captureTrackedSourceState();
        try {
            await withRestoredFile(versionPath, async () => {
                const version = JSON.parse(readFileSync(versionPath, "utf8").replace(/^\uFEFF/, ""));
                version.promotionSafetyTest = String(Date.now());
                writeFileSync(versionPath, `${JSON.stringify(version, null, 4)}\n`);

                assert.throws(() => {
                    assertTrackedSourceStateUnchanged(sourceState);
                    promotionReached = true;
                }, /Tracked source changed during release build before promotion/);
            });

            assert.equal(promotionReached, false);
            assert.equal(readFileSync(sentinelPath, "utf8"), "old release");
            assert.equal(existsSync(candidateDir), true);
        } finally {
            rmSync(sentinelPath, { force: true });
            if (!hadDist) {
                rmSync(distDir, { recursive: true, force: true });
            }
        }
    });
});

test("component release commands reject canonical dist output before touching it", () => {
    const commands = ["scripts/build-pwa-release.mjs", "scripts/build-web-release.mjs", "scripts/build-about.mjs", "scripts/assemble.mjs"];
    const sentinelName = `component-output-sentinel-${process.pid}-${Date.now()}.txt`;
    const sentinelPath = join(distDir, sentinelName);
    const hadDist = existsSync(distDir);

    mkdirSync(distDir, { recursive: true });
    writeFileSync(sentinelPath, "keep");
    try {
        for (const script of commands) {
            const result = spawnSync(process.execPath, [script, distDir], {
                cwd: rootDir,
                encoding: "utf8"
            });

            assert.notEqual(result.status, 0, `${script} should reject canonical dist output.`);
            assert.match(`${result.stdout}\n${result.stderr}`, /protected release path dist/);
            assert.equal(readFileSync(sentinelPath, "utf8"), "keep");
        }
    } finally {
        rmSync(sentinelPath, { force: true });
        if (!hadDist) {
            rmSync(distDir, { recursive: true, force: true });
        }
    }
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
    const entries = modeAwareRequiredEntries();

    assert.doesNotThrow(() => verifyDesktopZipEntries(entries));
    assert.throws(() => verifyDesktopZipEntries(entries.filter((entry) => entry.name !== "jackal-desktop/lib/jorbis.jar")), /jorbis\.jar/);
    assert.throws(() => verifyDesktopZipEntries(entries.filter((entry) => entry.name !== "jackal-desktop/THIRD_PARTY_NOTICES.md")), /THIRD_PARTY_NOTICES\.md/);
});

test("desktop ZIP verifier checks launch script modes and rejects outer manifests", () => {
    const entries = modeAwareRequiredEntries();

    assert.doesNotThrow(() => verifyDesktopZipEntries(entries));
    assert.throws(() => verifyDesktopZipEntries(modeAwareRequiredEntries({ "jackal-desktop/run-linux.sh": 0o644 })), /run-linux\.sh.*0755/);
    assert.throws(() => verifyDesktopZipEntries([...entries, { name: "jackal-desktop/META-INF/MANIFEST.MF", unixMode: 0o644 }]), /outer manifest/);
    assert.doesNotThrow(() => verifyDesktopZipEntries([...entries, { name: "jackal-desktop/natives/windows/META-INF/MANIFEST.MF", unixMode: 0o644 }]));
});

test("mode-aware desktop ZIP writer preserves script modes without an outer manifest", async () => {
    await withTempDir((dir) => {
        const distributionDir = join(dir, "jackal-desktop");
        const zipPath = join(dir, "jackal-desktop.zip");

        for (const entry of requiredDesktopZipEntries()) {
            createFile(join(distributionDir, entry.replace(/^jackal-desktop\//, "")), entry);
        }

        writeZipFromDirectory(distributionDir, zipPath, {
            executableEntries: ["jackal-desktop/run-linux.sh", "jackal-desktop/run-macos.sh"],
            rootName: "jackal-desktop"
        });

        const entries = listZipEntries(zipPath);
        assert.doesNotThrow(() => verifyDesktopZipEntries(entries));
        assert.equal(entries.find((entry) => entry.name === "jackal-desktop/run-linux.sh")?.unixMode & 0o777, 0o755);
        assert.equal(entries.find((entry) => entry.name === "jackal-desktop/run-macos.sh")?.unixMode & 0o777, 0o755);
        assert.equal(entries.find((entry) => entry.name === "jackal-desktop/run-windows.cmd")?.unixMode & 0o777, 0o644);
        assert.equal(
            entries.some((entry) => entry.name === "META-INF/MANIFEST.MF" || entry.name === "jackal-desktop/META-INF/MANIFEST.MF"),
            false
        );
    });
});

test("transient release-state paths are ignored and not tracked", () => {
    const ignoredPatterns = [
        /^\.release-components\//,
        /^\.release-work\//,
        /^\.release-test-/,
        /^\.release-version-stamp\.lock\//,
        /^\.release-secrets\//,
        /^\.release-candidates\//,
        /^\.dist-pending-/,
        /^\.dist-previous-/,
        /^\.dist-active-before-/,
        /^releases\/.*\.(?:zip|tmp|log)$/
    ];
    const result = spawnSync("git", ["ls-files"], {
        cwd: rootDir,
        encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    const trackedReleaseState = result.stdout
        .split(/\r?\n/)
        .filter(Boolean)
        .map((file) => file.replaceAll("\\", "/"))
        .filter((file) => ignoredPatterns.some((pattern) => pattern.test(file)));
    assert.deepEqual(trackedReleaseState, []);
});
