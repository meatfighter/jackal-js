import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { releaseOperationLockDir } from "./build-utils.mjs";

const lockPathEnv = "JACKAL_RELEASE_OPERATION_LOCK_PATH";
const lockTokenEnv = "JACKAL_RELEASE_OPERATION_LOCK_TOKEN";
const ownerFileName = "owner.json";
const ownerlessStaleMs = 10_000;

function ownerPath(lockDir) {
    return resolve(lockDir, ownerFileName);
}

function readOwner(lockDir) {
    try {
        return JSON.parse(readFileSync(ownerPath(lockDir), "utf8"));
    } catch {
        return null;
    }
}

function writeOwner(lockDir, token) {
    writeFileSync(
        ownerPath(lockDir),
        `${JSON.stringify(
            {
                pid: process.pid,
                hostname: hostname(),
                token,
                startedAt: new Date().toISOString()
            },
            null,
            4
        )}\n`
    );
}

function isProcessAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) {
        return false;
    }
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error?.code === "EPERM";
    }
}

function isReentrantLock(lockDir) {
    const expectedPath = process.env[lockPathEnv];
    const expectedToken = process.env[lockTokenEnv];
    if (expectedPath === undefined || expectedToken === undefined || resolve(expectedPath) !== resolve(lockDir)) {
        return false;
    }

    const owner = readOwner(lockDir);
    return owner?.token === expectedToken && isProcessAlive(owner.pid);
}

function tryRemoveStaleLock(lockDir) {
    const owner = readOwner(lockDir);
    if (owner === null) {
        const ageMs = Date.now() - lstatSync(lockDir).mtimeMs;
        if (ageMs < ownerlessStaleMs) {
            return false;
        }
        rmSync(lockDir, { recursive: true, force: true });
        return true;
    }
    if (owner !== null && isProcessAlive(owner.pid)) {
        return false;
    }
    rmSync(lockDir, { recursive: true, force: true });
    return true;
}

export async function withReleaseOperationLock(task, { lockDir = releaseOperationLockDir, timeoutMs = 60_000, retryDelayMs = 100 } = {}) {
    const resolvedLockDir = resolve(lockDir);
    if (isReentrantLock(resolvedLockDir)) {
        return task();
    }

    const startedAt = Date.now();
    while (true) {
        try {
            mkdirSync(resolvedLockDir);
            break;
        } catch (error) {
            if (error?.code !== "EEXIST") {
                throw error;
            }
            if (!tryRemoveStaleLock(resolvedLockDir) && Date.now() - startedAt > timeoutMs) {
                throw new Error(`Timed out waiting for release operation lock: ${resolvedLockDir}`, { cause: error });
            }
            await delay(retryDelayMs);
        }
    }

    const previousPath = process.env[lockPathEnv];
    const previousToken = process.env[lockTokenEnv];
    const token = randomUUID();
    writeOwner(resolvedLockDir, token);
    process.env[lockPathEnv] = resolvedLockDir;
    process.env[lockTokenEnv] = token;

    try {
        return await task();
    } finally {
        if (previousPath === undefined) {
            delete process.env[lockPathEnv];
        } else {
            process.env[lockPathEnv] = previousPath;
        }

        if (previousToken === undefined) {
            delete process.env[lockTokenEnv];
        } else {
            process.env[lockTokenEnv] = previousToken;
        }

        rmSync(resolvedLockDir, { recursive: true, force: true });
    }
}
