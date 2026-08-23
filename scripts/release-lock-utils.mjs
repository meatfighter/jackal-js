import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileAtomic } from "./atomic-file-utils.mjs";
import { releaseOperationLockDir } from "./build-utils.mjs";

export const lockPathEnv = "JACKAL_RELEASE_OPERATION_LOCK_PATH";
export const lockTokenEnv = "JACKAL_RELEASE_OPERATION_LOCK_TOKEN";

const ownerFileName = "owner.json";
const holdersDirName = "holders";
const ownerlessStaleMs = 10_000;
const registrationRetryCode = "JACKAL_RELEASE_LOCK_REGISTRATION_RETRY";
const holderRegistrations = new Map();

function isMissingPathError(error) {
    return error?.code === "ENOENT" || error?.code === "ENOTDIR";
}

function isTransientLockAccessError(error) {
    return error?.code === "EACCES" || error?.code === "EPERM" || error?.code === "EBUSY" || error?.code === "ENOTEMPTY";
}

function isRetryableLockRegistrationError(error) {
    return error?.code === registrationRetryCode;
}

function lockRegistrationRetryError(error, lockDir) {
    const retryError = new Error(`Release operation lock disappeared during holder registration: ${lockDir}`, { cause: error });
    retryError.code = registrationRetryCode;
    return retryError;
}

function ownerPath(lockDir) {
    return resolve(lockDir, ownerFileName);
}

function holdersDir(lockDir) {
    return resolve(lockDir, holdersDirName);
}

function holderPath(lockDir, token) {
    return join(holdersDir(lockDir), `${process.pid}-${token}.json`);
}

function pendingLockDir(lockDir, token) {
    return `${lockDir}.pending-${process.pid}-${token}`;
}

function detachedLockDir(lockDir, reason) {
    return `${lockDir}.${reason}-${process.pid}-${randomUUID()}`;
}

function recoveryGuardDir(lockDir) {
    return `${lockDir}.recovery`;
}

function recoveryGuardExists(lockDir) {
    try {
        const stat = lstatSync(recoveryGuardDir(lockDir));
        return stat.isDirectory();
    } catch (error) {
        if (isMissingPathError(error)) {
            return false;
        }
        if (isTransientLockAccessError(error)) {
            return true;
        }
        throw error;
    }
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

function pathAgeMs(mtimeMs) {
    return Math.max(0, Date.now() - mtimeMs);
}

function readJsonMetadata(path, label) {
    let text;
    try {
        text = readFileSync(path, "utf8");
    } catch (error) {
        if (isMissingPathError(error)) {
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
        throw lockRegistrationRetryError(new Error(`Cannot register release lock holder without a matching owner token: ${lockDir}`), lockDir);
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
        if (isMissingPathError(error)) {
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
    let entries;
    try {
        entries = readdirSync(dir);
    } catch (error) {
        if (isMissingPathError(error)) {
            return { live, malformed };
        }
        throw error;
    }

    for (const entry of entries) {
        const path = join(dir, entry);
        let stat;
        try {
            stat = lstatSync(path);
        } catch (error) {
            if (isMissingPathError(error)) {
                continue;
            }
            throw error;
        }
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
    return pathAgeMs(newestMtimeMs);
}

function removeDirectoryIfPresent(path) {
    try {
        rmSync(path, { recursive: true, force: true });
    } catch (error) {
        if (!isMissingPathError(error) && !isTransientLockAccessError(error)) {
            throw error;
        }
    }
}

function preparePendingLock(lockDir, token) {
    const pendingDir = pendingLockDir(lockDir, token);
    mkdirSync(holdersDir(pendingDir), { recursive: true });
    try {
        writeOwner(pendingDir, token);
        return pendingDir;
    } catch (error) {
        removeDirectoryIfPresent(pendingDir);
        throw error;
    }
}

function publishPendingLock(pendingDir, lockDir) {
    renameSync(pendingDir, lockDir);
}

function detachLockDirectory(lockDir, reason) {
    const detachedDir = detachedLockDir(lockDir, reason);
    try {
        renameSync(lockDir, detachedDir);
        return detachedDir;
    } catch (error) {
        if (isMissingPathError(error)) {
            return null;
        }
        if (isTransientLockAccessError(error) || error?.code === "EEXIST") {
            return false;
        }
        throw error;
    }
}

function removeStaleLock(lockDir, message = null) {
    const detachedDir = detachLockDirectory(lockDir, "stale");
    if (detachedDir === null) {
        return true;
    }
    if (detachedDir === false) {
        return false;
    }

    if (message !== null) {
        console.warn(message);
    }

    try {
        rmSync(detachedDir, { recursive: true, force: true });
    } catch (error) {
        if (isMissingPathError(error)) {
            return true;
        }
        if (isTransientLockAccessError(error)) {
            return true;
        }
        throw error;
    }
    return true;
}

function removeOwnedLock(lockDir, token) {
    let owner;
    try {
        assertRealLockDirectory(lockDir);
        owner = readOwner(lockDir);
    } catch (error) {
        if (isMissingPathError(error) || isTransientLockAccessError(error)) {
            return;
        }
        throw error;
    }
    if (owner.status !== "valid" || owner.token !== token) {
        return;
    }

    const detachedDir = detachLockDirectory(lockDir, "released");
    if (detachedDir === null || detachedDir === false) {
        return;
    }

    const detachedOwner = readOwner(detachedDir);
    if (detachedOwner.status !== "valid" || detachedOwner.token !== token) {
        throw new Error(`Detached release operation lock owner changed before cleanup: ${detachedDir}`);
    }
    rmSync(detachedDir, { recursive: true, force: true });
}

function hasLiveLockState(lockDir) {
    let owner;
    try {
        owner = readOwner(lockDir);
    } catch (error) {
        if (isTransientLockAccessError(error)) {
            return true;
        }
        if (isMissingPathError(error)) {
            return false;
        }
        throw error;
    }
    if (owner.status === "valid" && isProcessAlive(owner.pid)) {
        return true;
    }

    try {
        return readHolderRecords(lockDir).live.length > 0;
    } catch (error) {
        if (isTransientLockAccessError(error)) {
            return true;
        }
        if (isMissingPathError(error)) {
            return false;
        }
        throw error;
    }
}

function tryRemoveStaleLock(lockDir, staleLockMs) {
    let lockStat;
    try {
        lockStat = assertRealLockDirectory(lockDir);
    } catch (error) {
        if (isMissingPathError(error)) {
            return true;
        }
        throw error;
    }
    let owner;
    let holders;
    try {
        owner = readOwner(lockDir);
        holders = readHolderRecords(lockDir);
    } catch (error) {
        if (isTransientLockAccessError(error)) {
            return false;
        }
        if (isMissingPathError(error)) {
            return true;
        }
        throw error;
    }
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
        if (hasLiveLockState(lockDir)) {
            return false;
        }
        return removeStaleLock(lockDir, `Recovering stale malformed release operation lock: ${lockDir}`);
    }
    if (owner.status === "missing") {
        if (pathAgeMs(lockStat.mtimeMs) < staleLockMs) {
            return false;
        }
        if (hasLiveLockState(lockDir)) {
            return false;
        }
        return removeStaleLock(lockDir);
    }

    if (hasLiveLockState(lockDir)) {
        return false;
    }
    return removeStaleLock(lockDir);
}

function tryRemoveStaleLockSerialized(lockDir, staleLockMs) {
    const guardDir = recoveryGuardDir(lockDir);
    try {
        mkdirSync(guardDir);
    } catch (error) {
        if (error?.code === "EEXIST" || isTransientLockAccessError(error)) {
            return false;
        }
        throw error;
    }

    let staleRemoved;
    let staleError = null;
    try {
        staleRemoved = tryRemoveStaleLock(lockDir, staleLockMs);
    } catch (error) {
        staleError = error;
    }

    let guardReleaseError = null;
    try {
        rmdirSync(guardDir);
    } catch (error) {
        if (!isMissingPathError(error)) {
            guardReleaseError = error;
        }
    }

    if (staleError !== null) {
        throw staleError;
    }
    if (guardReleaseError !== null) {
        throw guardReleaseError;
    }
    return staleRemoved;
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

    try {
        writeHolder(lockDir, token);
    } catch (error) {
        if (isMissingPathError(error) || isTransientLockAccessError(error)) {
            throw lockRegistrationRetryError(error, lockDir);
        }
        throw error;
    }
    holderRegistrations.set(key, 1);
    try {
        return await task();
    } finally {
        holderRegistrations.delete(key);
        rmSync(holderPath(lockDir, token), { force: true });
    }
}

async function acquireReleaseOperationLock(resolvedLockDir, timeoutMs, retryDelayMs, staleLockMs) {
    const startedAt = Date.now();
    while (true) {
        const ownerToken = randomUUID();
        const pendingDir = preparePendingLock(resolvedLockDir, ownerToken);
        try {
            publishPendingLock(pendingDir, resolvedLockDir);
            return ownerToken;
        } catch (error) {
            removeDirectoryIfPresent(pendingDir);
            if (error?.code !== "EEXIST" && !isTransientLockAccessError(error)) {
                throw error;
            }

            if (!tryRemoveStaleLockSerialized(resolvedLockDir, staleLockMs) && Date.now() - startedAt > timeoutMs) {
                if (recoveryGuardExists(resolvedLockDir)) {
                    throw new Error(`Timed out waiting for release operation lock recovery guard: ${recoveryGuardDir(resolvedLockDir)}`, { cause: error });
                }
                throw new Error(`Timed out waiting for release operation lock: ${resolvedLockDir}`, { cause: error });
            }
            await delay(retryDelayMs);
        }
    }
}

export async function withReleaseOperationLock(
    task,
    { lockDir = releaseOperationLockDir, timeoutMs = 60_000, retryDelayMs = 100, staleLockMs = ownerlessStaleMs } = {}
) {
    const resolvedLockDir = resolve(lockDir);
    const token = reentrantToken(resolvedLockDir);
    if (token !== null) {
        return withRegisteredLockHolder(resolvedLockDir, token, task);
    }

    const previousPath = process.env[lockPathEnv];
    const previousToken = process.env[lockTokenEnv];
    const startedAt = Date.now();

    while (true) {
        const ownerToken = await acquireReleaseOperationLock(resolvedLockDir, timeoutMs, retryDelayMs, staleLockMs);
        try {
            process.env[lockPathEnv] = resolvedLockDir;
            process.env[lockTokenEnv] = ownerToken;
            return await withRegisteredLockHolder(resolvedLockDir, ownerToken, task);
        } catch (error) {
            if (!isRetryableLockRegistrationError(error)) {
                throw error;
            }
            if (Date.now() - startedAt > timeoutMs) {
                throw new Error(`Timed out registering release operation lock holder: ${resolvedLockDir}`, { cause: error });
            }
            await delay(retryDelayMs);
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

            removeOwnedLock(resolvedLockDir, ownerToken);
        }
    }
}
