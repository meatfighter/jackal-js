import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { rootDir, versionPath } from "./build-utils.mjs";
import { stampBuild } from "./stamp-build.mjs";

const versionStampLockDir = join(rootDir, ".release-version-stamp.lock");

async function acquireVersionStampLock() {
    const timeoutMs = 60_000;
    const retryDelayMs = 100;
    const startedAt = Date.now();

    while (true) {
        try {
            mkdirSync(versionStampLockDir);
            return () => rmSync(versionStampLockDir, { recursive: true, force: true });
        } catch (error) {
            if (error?.code !== "EEXIST") {
                throw error;
            }
            if (Date.now() - startedAt > timeoutMs) {
                throw new Error(`Timed out waiting for release stamp lock: ${versionStampLockDir}`, { cause: error });
            }
            await delay(retryDelayMs);
        }
    }
}

export async function withRestoredFile(path, task) {
    const originalBytes = readFileSync(path);
    try {
        return await task();
    } finally {
        writeFileSync(path, originalBytes);
    }
}

export async function withTemporaryBuildStamp(task) {
    const releaseLock = await acquireVersionStampLock();
    try {
        return await withRestoredFile(versionPath, async () => {
            const version = stampBuild();
            return task(version);
        });
    } finally {
        releaseLock();
    }
}

export async function withVersionStampLock(task) {
    const releaseLock = await acquireVersionStampLock();
    try {
        return await task();
    } finally {
        releaseLock();
    }
}
