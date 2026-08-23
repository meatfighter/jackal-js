import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { copyFileAtomic, writeFileAtomic } from "./atomic-file-utils.mjs";
import { assertLocalGeneratedOutputPath, distDir, releaseWorkDir, rootDir, versionPath } from "./build-utils.mjs";
import { promoteVerifiedCandidate, promotionJournalPath, recoverInterruptedPromotion } from "./release-atomic-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";
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

function tryCreateSymlink(target, path, type) {
    try {
        symlinkSync(target, path, type);
        return true;
    } catch {
        return false;
    }
}

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function waitForChildOutput(child, text, timeoutMs = 35_000) {
    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for child output ${text}. stdout=${stdout} stderr=${stderr}`));
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timeout);
            child.stdout.off("data", onStdout);
            child.stderr.off("data", onStderr);
            child.off("exit", onExit);
        }

        function onStdout(chunk) {
            stdout += chunk;
            if (stdout.includes(text)) {
                cleanup();
                resolve(stdout);
            }
        }

        function onStderr(chunk) {
            stderr += chunk;
        }

        function onExit(code, signal) {
            cleanup();
            reject(new Error(`Child exited before ${text}: code=${code} signal=${signal} stdout=${stdout} stderr=${stderr}`));
        }

        child.stdout.on("data", onStdout);
        child.stderr.on("data", onStderr);
        child.once("exit", onExit);
    });
}

function waitForChildExit(child, timeoutMs = 5_000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for child ${child.pid} to exit.`));
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timeout);
            child.off("exit", onExit);
        }

        function onExit(code, signal) {
            cleanup();
            resolve({ code, signal });
        }

        if (child.exitCode !== null || child.signalCode !== null) {
            cleanup();
            resolve({ code: child.exitCode, signal: child.signalCode });
            return;
        }
        child.once("exit", onExit);
    });
}

async function collectChildResult(child, timeoutMs = 10_000) {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
        stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
        stderr += chunk;
    });
    const result = await waitForChildExit(child, timeoutMs);
    return { ...result, pid: child.pid, stdout, stderr };
}

function readHolderPids(lockDir) {
    const holdersDir = join(lockDir, "holders");
    if (!existsSync(holdersDir)) {
        return [];
    }

    return readdirSync(holdersDir)
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => JSON.parse(readFileSync(join(holdersDir, entry), "utf8")).pid);
}

function readPidList(path) {
    if (!existsSync(path)) {
        return [];
    }
    return JSON.parse(readFileSync(path, "utf8"));
}

function killPid(pid) {
    if (pid === process.pid) {
        return;
    }
    try {
        process.kill(pid);
    } catch {
        // The process may already have exited.
    }
}

async function waitForPidsToExit(pids, timeoutMs = 5_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const live = pids.filter((pid) => {
            try {
                process.kill(pid, 0);
                return true;
            } catch (error) {
                return error?.code === "EPERM";
            }
        });
        if (live.length === 0) {
            return;
        }
        await wait(25);
    }
    throw new Error(`Timed out waiting for holder processes to exit: ${pids.join(", ")}`);
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

test("release operation lock is reentrant, registers holders, and protects live holders", async () => {
    await withTempDir(async (dir) => {
        const lockDir = join(dir, "release-operation.lock");
        const holdersDir = join(lockDir, "holders");
        const holderFiles = () => readdirSync(holdersDir).filter((entry) => entry.endsWith(".json"));
        let enteredReentrantLock = false;
        let outerHolderCount = 0;
        let innerHolderCount = 0;

        await withReleaseOperationLock(
            async () => {
                outerHolderCount = holderFiles().length;
                await withReleaseOperationLock(
                    () => {
                        enteredReentrantLock = true;
                        innerHolderCount = holderFiles().length;
                    },
                    { lockDir }
                );
            },
            { lockDir }
        );

        assert.equal(enteredReentrantLock, true);
        assert.equal(outerHolderCount, 1);
        assert.equal(innerHolderCount, 1);
        assert.equal(existsSync(lockDir), false);

        mkdirSync(holdersDir, { recursive: true });
        writeFileSync(join(lockDir, "owner.json"), JSON.stringify({ pid: 999_999_999, token: "stale" }));
        writeFileSync(join(holdersDir, "live-holder.json"), JSON.stringify({ pid: process.pid, token: "stale" }));

        await assert.rejects(
            withReleaseOperationLock(
                () => {
                    throw new Error("should not enter while a live holder remains");
                },
                { lockDir, retryDelayMs: 1, timeoutMs: 10 }
            ),
            /Timed out waiting for release operation lock/
        );

        rmSync(join(holdersDir, "live-holder.json"), { force: true });

        let recoveredStaleLock = false;
        await withReleaseOperationLock(
            () => {
                recoveredStaleLock = true;
            },
            { lockDir, retryDelayMs: 1, timeoutMs: 1_000 }
        );

        assert.equal(recoveredStaleLock, true);
        assert.equal(existsSync(lockDir), false);
    });
});

test("release operation lock rejects fresh malformed metadata and warns before stale recovery", async () => {
    await withTempDir(async (dir) => {
        const lockDir = join(dir, "release-operation.lock");
        mkdirSync(lockDir, { recursive: true });
        writeFileSync(join(lockDir, "owner.json"), "{");

        await assert.rejects(
            withReleaseOperationLock(
                () => {
                    throw new Error("should not enter a fresh malformed lock");
                },
                { lockDir, retryDelayMs: 1, timeoutMs: 10, staleLockMs: 60_000 }
            ),
            /malformed metadata/
        );
        assert.equal(existsSync(lockDir), true);

        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => {
            warnings.push(args.join(" "));
        };

        try {
            let recoveredStaleMalformedLock = false;
            await withReleaseOperationLock(
                () => {
                    recoveredStaleMalformedLock = true;
                },
                { lockDir, retryDelayMs: 1, timeoutMs: 1_000, staleLockMs: -1 }
            );
            assert.equal(recoveredStaleMalformedLock, true);
        } finally {
            console.warn = originalWarn;
        }

        assert.match(warnings.join("\n"), /Recovering stale malformed release operation lock/);
        assert.equal(existsSync(lockDir), false);
    });
});

test("concurrent stale release lock recovery tolerates disappearing lock directories", async () => {
    await withTempDir(async (dir) => {
        const lockDir = join(dir, "release-operation.lock");
        const startFile = join(dir, "start-workers");
        const workerCount = 20;
        const workerSource = `
            import { existsSync } from "node:fs";
            import { setTimeout as delay } from "node:timers/promises";
            import { withReleaseOperationLock } from "./scripts/release-lock-utils.mjs";

            const lockDir = process.env.JACKAL_TEST_LOCK_DIR;
            const startFile = process.env.JACKAL_TEST_START_FILE;
            while (!existsSync(startFile)) {
                await delay(5);
            }

            await withReleaseOperationLock(() => {
                console.log("acquired");
            }, { lockDir, retryDelayMs: 1, timeoutMs: 5_000, staleLockMs: -1 });
        `;
        mkdirSync(lockDir, { recursive: true });
        writeFileSync(join(lockDir, "owner.json"), JSON.stringify({ pid: 999_999_999, token: "stale" }));

        const workers = Array.from({ length: workerCount }, () =>
            spawn(process.execPath, ["--input-type=module", "-e", workerSource], {
                cwd: rootDir,
                env: {
                    ...process.env,
                    JACKAL_TEST_LOCK_DIR: lockDir,
                    JACKAL_TEST_START_FILE: startFile
                },
                stdio: ["ignore", "pipe", "pipe"]
            })
        );

        try {
            writeFileSync(startFile, "go");
            const results = await Promise.all(workers.map((worker) => collectChildResult(worker)));
            for (const result of results) {
                assert.equal(result.code, 0, `worker ${result.pid} failed with stderr:\n${result.stderr}`);
                assert.equal(result.signal, null);
                assert.match(result.stdout, /acquired/);
            }
        } finally {
            for (const worker of workers) {
                if (worker.exitCode === null && worker.signalCode === null) {
                    worker.kill();
                }
            }
            rmSync(lockDir, { recursive: true, force: true });
        }
    });
});

test("atomic file writes clean pre-rename temps on injected failures", async () => {
    await withTempDir((dir) => {
        for (const hook of ["afterCreate", "afterWrite", "afterFsync", "beforeRename"]) {
            const target = join(dir, `${hook}.json`);
            assert.throws(
                () =>
                    writeFileAtomic(target, "sensitive metadata", {
                        [hook]() {
                            throw new Error(`simulated ${hook} failure`);
                        }
                    }),
                new RegExp(`simulated ${hook} failure`)
            );
            assert.equal(existsSync(target), false);
            assert.deepEqual(
                readdirSync(dir).filter((entry) => entry.startsWith(`${hook}.json.`) && entry.endsWith(".tmp")),
                []
            );
        }
    });
});

test("desktop release copy rejects linked destination files when supported", async () => {
    await withTempDir((dir) => {
        const releasesDir = join(dir, "releases");
        const sourceZip = join(dir, "source.zip");
        const releaseZip = join(releasesDir, "jackal-desktop-1.0.0.zip");
        const sentinel = join(dir, "external-sentinel.zip");

        mkdirSync(releasesDir, { recursive: true });
        writeFileSync(sourceZip, "new desktop zip");
        writeFileSync(sentinel, "external sentinel");
        if (!tryCreateSymlink(sentinel, releaseZip, "file")) {
            return;
        }

        assert.throws(
            () => {
                const destination = assertLocalGeneratedOutputPath("desktop release ZIP", releaseZip, releasesDir);
                copyFileAtomic(sourceZip, destination);
            },
            /symlink|junction/
        );
        assert.equal(readFileSync(sentinel, "utf8"), "external sentinel");
    });
});

test("desktop release copy is atomic and leaves no temp files", async () => {
    await withTempDir((dir) => {
        const sourceZip = join(dir, "source.zip");
        const releaseZip = join(dir, "jackal-desktop-1.0.0.zip");
        writeFileSync(sourceZip, "new desktop zip");
        writeFileSync(releaseZip, "old desktop zip");

        assert.throws(
            () =>
                copyFileAtomic(sourceZip, releaseZip, {
                    beforeRename() {
                        throw new Error("simulated desktop copy failure");
                    }
                }),
            /simulated desktop copy failure/
        );
        assert.equal(readFileSync(releaseZip, "utf8"), "old desktop zip");
        assert.deepEqual(
            readdirSync(dir).filter((entry) => entry.startsWith("jackal-desktop-1.0.0.zip.") && entry.endsWith(".tmp")),
            []
        );

        copyFileAtomic(sourceZip, releaseZip);
        assert.equal(readFileSync(releaseZip, "utf8"), "new desktop zip");
    });
});

test("concurrent nested release operations preserve all live holder registrations", async () => {
    await withTempDir(async (dir) => {
        const lockDir = join(dir, "release-operation.lock");
        const childPidPath = join(lockDir, "child-pids.json");
        const holderCount = 20;
        const childSource = `
            import { withReleaseOperationLock } from "./scripts/release-lock-utils.mjs";
            const lockDir = process.env.JACKAL_RELEASE_OPERATION_LOCK_PATH;
            await withReleaseOperationLock(async () => {
                setInterval(() => {}, 1_000);
                await new Promise(() => {});
            }, { lockDir });
        `;
        const parentSource = `
            import { spawn } from "node:child_process";
            import { readFileSync, readdirSync, writeFileSync } from "node:fs";
            import { join } from "node:path";
            import { setTimeout as delay } from "node:timers/promises";
            import { withReleaseOperationLock } from "./scripts/release-lock-utils.mjs";

            const lockDir = process.env.JACKAL_TEST_LOCK_DIR;
            const childPidPath = process.env.JACKAL_TEST_CHILD_PID_PATH;
            const holderCount = Number(process.env.JACKAL_TEST_HOLDER_COUNT);
            const childSource = process.env.JACKAL_TEST_CHILD_SOURCE;

            await withReleaseOperationLock(async () => {
                const childPids = [];
                for (let index = 0; index < holderCount; index++) {
                    const child = spawn(process.execPath, ["--input-type=module", "-e", childSource], {
                        cwd: process.cwd(),
                        env: process.env,
                        detached: true,
                        stdio: "ignore"
                    });
                    childPids.push(child.pid);
                    child.unref();
                }
                writeFileSync(childPidPath, JSON.stringify(childPids));

                const holdersDir = join(lockDir, "holders");
                const deadline = Date.now() + 30_000;
                let ready = false;
                while (Date.now() < deadline) {
                    const pids = readdirSync(holdersDir)
                        .filter((entry) => entry.endsWith(".json"))
                        .map((entry) => JSON.parse(readFileSync(join(holdersDir, entry), "utf8")).pid);
                    if (pids.filter((pid) => pid !== process.pid).length === holderCount) {
                        console.log("children-ready");
                        ready = true;
                        break;
                    }
                    await delay(25);
                }
                if (!ready) {
                    throw new Error("Timed out waiting for nested child holders.");
                }

                setInterval(() => {}, 1_000);
                await new Promise(() => {});
            }, { lockDir });
        `;
        const parent = spawn(process.execPath, ["--input-type=module", "-e", parentSource], {
            cwd: rootDir,
            env: {
                ...process.env,
                JACKAL_TEST_LOCK_DIR: lockDir,
                JACKAL_TEST_CHILD_PID_PATH: childPidPath,
                JACKAL_TEST_HOLDER_COUNT: String(holderCount),
                JACKAL_TEST_CHILD_SOURCE: childSource
            },
            stdio: ["ignore", "pipe", "pipe"]
        });
        const holderPids = new Set();

        try {
            await waitForChildOutput(parent, "children-ready");
            const liveHolderPids = readHolderPids(lockDir);
            const childHolderPids = liveHolderPids.filter((pid) => pid !== parent.pid);
            for (const pid of childHolderPids) {
                holderPids.add(pid);
            }

            assert.equal(childHolderPids.length, holderCount);
            parent.kill();
            await waitForChildExit(parent);

            await assert.rejects(
                withReleaseOperationLock(
                    () => {
                        throw new Error("should not enter while child holders remain");
                    },
                    { lockDir, retryDelayMs: 1, timeoutMs: 25, staleLockMs: -1 }
                ),
                /Timed out waiting for release operation lock/
            );

            for (const pid of holderPids) {
                killPid(pid);
            }
            await waitForPidsToExit(Array.from(holderPids));

            let recoveredAfterChildrenExited = false;
            await withReleaseOperationLock(
                () => {
                    recoveredAfterChildrenExited = true;
                },
                { lockDir, retryDelayMs: 1, timeoutMs: 1_000, staleLockMs: -1 }
            );
            assert.equal(recoveredAfterChildrenExited, true);
        } finally {
            parent.kill();
            for (const pid of new Set([...holderPids, ...readHolderPids(lockDir), ...readPidList(childPidPath)])) {
                killPid(pid);
            }
            rmSync(lockDir, { recursive: true, force: true });
        }
    });
});

test("release promotion recovery completes interrupted target backup journal", async () => {
    await withTempDir((dir) => {
        const candidateDir = join(dir, "candidate");
        const targetDir = join(dir, "dist");
        const workDir = join(dir, "work");
        const backupDir = join(workDir, "previous-dist-test");
        mkdirSync(candidateDir, { recursive: true });
        mkdirSync(backupDir, { recursive: true });
        writeFileSync(join(candidateDir, "index.html"), "new");
        writeFileSync(join(backupDir, "index.html"), "old");
        mkdirSync(workDir, { recursive: true });
        writeFileSync(
            promotionJournalPath(workDir),
            `${JSON.stringify(
                {
                    phase: "target-backed-up",
                    candidate: candidateDir,
                    target: targetDir,
                    backup: backupDir,
                    work: workDir
                },
                null,
                4
            )}\n`
        );

        assert.equal(recoverInterruptedPromotion({ workDir, fixtureRoot: dir }), true);
        assert.equal(readFileSync(join(targetDir, "index.html"), "utf8"), "new");
        assert.equal(existsSync(candidateDir), false);
        assert.equal(existsSync(backupDir), false);
        assert.equal(existsSync(promotionJournalPath(workDir)), false);
    });
});

test("production promotion only accepts generated candidates and canonical dist targets", async () => {
    await withTempDir((dir) => {
        const fixtureCandidateDir = join(dir, "candidate");
        mkdirSync(fixtureCandidateDir, { recursive: true });

        assert.throws(
            () => promoteVerifiedCandidate(fixtureCandidateDir, distDir, { workDir: releaseWorkDir }),
            /release candidate must be under one of these release output roots/
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
            assert.match(`${result.stdout}\n${result.stderr}`, /release output roots|canonical production dist|dist/);
            assert.equal(readFileSync(sentinelPath, "utf8"), "keep");
        }
    } finally {
        rmSync(sentinelPath, { force: true });
        if (!hadDist) {
            rmSync(distDir, { recursive: true, force: true });
        }
    }
});

test("component release commands reject arbitrary source output roots", () => {
    for (const script of ["scripts/build-pwa-release.mjs", "scripts/build-web-release.mjs", "scripts/build-about.mjs", "scripts/assemble.mjs"]) {
        const result = spawnSync(process.execPath, [script, join(rootDir, "about")], {
            cwd: rootDir,
            encoding: "utf8"
        });

        assert.notEqual(result.status, 0, `${script} should reject arbitrary source output.`);
        assert.match(`${result.stdout}\n${result.stderr}`, /release output roots|tracked source directory|about/);
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

test("release artifact walkers reject symlinks when the filesystem supports them", async () => {
    await withTempDir((dir) => {
        const releaseDir = join(dir, "candidate");
        const zipDir = join(dir, "zip-source");
        mkdirSync(releaseDir, { recursive: true });
        mkdirSync(zipDir, { recursive: true });
        writeFileSync(join(releaseDir, "index.html"), "about");
        writeFileSync(join(zipDir, "file.txt"), "zip");

        const releaseLink = join(releaseDir, "linked.html");
        const zipLink = join(zipDir, "linked.txt");
        if (!tryCreateSymlink(join(releaseDir, "index.html"), releaseLink, "file") || !tryCreateSymlink(join(zipDir, "file.txt"), zipLink, "file")) {
            return;
        }

        assert.throws(() => writeReleaseManifest(releaseDir, { version: "1.0.0", buildStamp: "20260823T000000Z" }), /symlink|junction/);
        assert.throws(() => writeZipFromDirectory(zipDir, join(dir, "archive.zip")), /symlink|junction/);
    });
});

test("release artifact walkers reject linked or broken roots when the filesystem supports them", async () => {
    await withTempDir((dir) => {
        const realReleaseDir = join(dir, "real-candidate");
        const linkedReleaseDir = join(dir, "linked-candidate");
        const brokenReleaseDir = join(dir, "broken-candidate");
        mkdirSync(realReleaseDir, { recursive: true });
        writeFileSync(join(realReleaseDir, "index.html"), "about");

        const linkType = process.platform === "win32" ? "junction" : "dir";
        if (tryCreateSymlink(realReleaseDir, linkedReleaseDir, linkType)) {
            assert.throws(() => writeReleaseManifest(linkedReleaseDir, { version: "1.0.0", buildStamp: "20260823T000000Z" }), /symlink|junction/);
        }
        if (tryCreateSymlink(join(dir, "missing-candidate"), brokenReleaseDir, linkType)) {
            assert.throws(() => writeReleaseManifest(brokenReleaseDir, { version: "1.0.0", buildStamp: "20260823T000000Z" }), /symlink|junction/);
        }
    });
});

test("release output path validation rejects physical symlink escapes when supported", async () => {
    await withTempDir((dir) => {
        const linkDir = join(dir, "linked-pwa");
        if (!tryCreateSymlink(join(rootDir, "pwa"), linkDir, process.platform === "win32" ? "junction" : "dir")) {
            return;
        }

        assert.throws(
            () =>
                promoteVerifiedCandidate(join(linkDir, "candidate"), join(dir, "dist"), {
                    workDir: join(dir, "work"),
                    fixtureRoot: dir
                }),
            /symlink|junction|tracked source directory|physical path/
        );
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
        /^\.release-operation\.lock\//,
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
