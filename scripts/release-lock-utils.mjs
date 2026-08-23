import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { lstatSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileAtomic } from "./atomic-file-utils.mjs";
import { releaseOperationLockDir } from "./build-utils.mjs";

export const lockPathEnv = "JACKAL_RELEASE_OPERATION_LOCK_PATH";
export const lockTokenEnv = "JACKAL_RELEASE_OPERATION_LOCK_TOKEN";

const ownerFileName = "owner.json";
const holdersDirName = "holders";
const ownerlessStaleMs = 10_000;
const holderRegistrations = new Map();

function ownerPath(lockDir) {
    return resolve(lockDir, ownerFileName);
}

function holdersDir(lockDir) {
    return resolve(lockDir, holdersDirName);
}

function holderPath(lockDir, token) {
    return join(holdersDir(lockDir), `${process.pid}-${token}.json`);
}

function assertRealLockDirectory(lockDir) {
    const stat = lstatSync(lockDir);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(`Release operation lock must be a real directory: ${lockDir}`);
    }
    return stat;
}

function metadataMtimeMs(path) {
    try {
        return lstatSync(path).mtimeMs;
    } catch {
        return 0;
    }
}

function readJsonMetadata(path, label) {
    let text;
    try {
        text = readFileSync(path, "utf8");
    } catch (error) {
        if (error?.code === "ENOENT") {
            return { status: "missing", path, mtimeMs: 0 };
        }
        throw error;
    }

    try {
        return { status: "valid", path, value: JSON.parse(text), mtimeMs: metadataMtimeMs(path) };
    } catch (error) {
        return { status: "malformed", path, label, error, mtimeMs: metadataMtimeMs(path) };
    }
}

function validateProcessMetadata(record, label) {
    if (
        record.status !== "valid" ||
        typeof record.value !== "object" ||
        record.value === null ||
        !Number.isInteger(record.value.pid) ||
        record.value.pid <= 0 ||
        typeof record.value.token !== "string" ||
        record.value.token.length === 0
    ) {
        return {
            status: record.status === "missing" ? "missing" : "malformed",
            path: record.path,
            label,
            mtimeMs: record.mtimeMs
        };
    }

    return {
        status: "valid",
        path: record.path,
        label,
        pid: record.value.pid,
        token: record.value.token,
        mtimeMs: record.mtimeMs
    };
}

function readOwner(lockDir) {
    return validateProcessMetadata(readJsonMetadata(ownerPath(lockDir), "owner"), "owner");
}

function writeOwner(lockDir, token) {
    writeFileAtomic(
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

function writeHolder(lockDir, token) {
    assertRealLockDirectory(lockDir);
    const owner = readOwner(lockDir);
    if (owner.status !== "valid" || owner.token !== token) {
        throw new Error(`Cannot register release lock holder without a matching owner token: ${lockDir}`);
    }

    mkdirSync(holdersDir(lockDir), { recursive: true });
    writeFileAtomic(
        holderPath(lockDir, token),
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

function readHolderRecords(lockDir) {
    const dir = holdersDir(lockDir);
    let dirStat;
    try {
        dirStat = lstatSync(dir);
    } catch (error) {
        if (error?.code === "ENOENT") {
            return { live: [], malformed: [] };
        }
        throw error;
    }

    if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
        return {
            live: [],
            malformed: [
                {
                    status: "malformed",
                    path: dir,
                    label: "holders directory",
                    mtimeMs: dirStat.mtimeMs
                }
            ]
        };
    }

    const live = [];
    const malformed = [];
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        const stat = lstatSync(path);
        if (stat.isSymbolicLink() || !stat.isFile()) {
            malformed.push({ status: "malformed", path, label: "holder", mtimeMs: stat.mtimeMs });
            continue;
        }

        const holder = validateProcessMetadata(readJsonMetadata(path, "holder"), "holder");
        if (holder.status !== "valid") {
            malformed.push(holder);
            continue;
        }
        if (isProcessAlive(holder.pid)) {
            live.push(holder);
        }
    }

    return { live, malformed };
}

function malformedAgeMs(lockStat, records) {
    const newestMtimeMs = Math.max(lockStat.mtimeMs, ...records.map((record) => record.mtimeMs));
    return Date.now() - newestMtimeMs;
}

function removeStaleLock(lockDir, message = null) {
    if (message !== null) {
        console.warn(message);
    }
    rmSync(lockDir, { recursive: true, force: true });
    return true;
}

function tryRemoveStaleLock(lockDir, staleLockMs) {
    const lockStat = assertRealLockDirectory(lockDir);
    const owner = readOwner(lockDir);
    const holders = readHolderRecords(lockDir);
    const malformedRecords = [...holders.malformed];

    if (owner.status === "valid" && isProcessAlive(owner.pid)) {
        return false;
    }
    if (holders.live.length > 0) {
        return false;
    }
    if (owner.status === "malformed") {
        malformedRecords.push(owner);
    }
    if (malformedRecords.length > 0) {
        if (malformedAgeMs(lockStat, malformedRecords) < staleLockMs) {
            throw new Error(`Release operation lock contains malformed metadata and is too fresh to recover: ${lockDir}`);
        }
        return removeStaleLock(lockDir, `Recovering stale malformed release operation lock: ${lockDir}`);
    }
    if (owner.status === "missing") {
        if (Date.now() - lockStat.mtimeMs < staleLockMs) {
            return false;
        }
        return removeStaleLock(lockDir);
    }

    return removeStaleLock(lockDir);
}

function reentrantToken(lockDir) {
    const expectedPath = process.env[lockPathEnv];
    const expectedToken = process.env[lockTokenEnv];
    if (expectedPath === undefined || expectedToken === undefined || resolve(expectedPath) !== resolve(lockDir)) {
        return null;
    }

    const owner = readOwner(lockDir);
    if (owner.status === "valid" && owner.token === expectedToken) {
        return expectedToken;
    }
    return null;
}

async function withRegisteredLockHolder(lockDir, token, task) {
    const key = `${resolve(lockDir)}\0${token}`;
    const registration = holderRegistrations.get(key);
    if (registration !== undefined) {
        holderRegistrations.set(key, registration + 1);
        try {
            return await task();
        } finally {
            const current = holderRegistrations.get(key) ?? 1;
            if (current <= 1) {
                holderRegistrations.delete(key);
            } else {
                holderRegistrations.set(key, current - 1);
            }
        }
    }

    writeHolder(lockDir, token);
    holderRegistrations.set(key, 1);
    try {
        return await task();
    } finally {
        holderRegistrations.delete(key);
        rmSync(holderPath(lockDir, token), { force: true });
    }
}

export async function withReleaseOperationLock(task, { lockDir = releaseOperationLockDir, timeoutMs = 60_000, retryDelayMs = 100, staleLockMs = ownerlessStaleMs } = {}) {
    const resolvedLockDir = resolve(lockDir);
    const token = reentrantToken(resolvedLockDir);
    if (token !== null) {
        return withRegisteredLockHolder(resolvedLockDir, token, task);
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
            if (!tryRemoveStaleLock(resolvedLockDir, staleLockMs) && Date.now() - startedAt > timeoutMs) {
                throw new Error(`Timed out waiting for release operation lock: ${resolvedLockDir}`, { cause: error });
            }
            await delay(retryDelayMs);
        }
    }

    const previousPath = process.env[lockPathEnv];
    const previousToken = process.env[lockTokenEnv];
    const ownerToken = randomUUID();

    try {
        writeOwner(resolvedLockDir, ownerToken);
        process.env[lockPathEnv] = resolvedLockDir;
        process.env[lockTokenEnv] = ownerToken;
        return await withRegisteredLockHolder(resolvedLockDir, ownerToken, task);
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
