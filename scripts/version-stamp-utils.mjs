import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-file-utils.mjs";
import { assertGeneratedReleaseOutputPath, buildVersionEnv, readTrackedVersion, releaseCandidatesDir } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";
import { nextBuildStamp, parseBuildStamp } from "./stamp-build.mjs";

const buildStampStatePath = join(releaseCandidatesDir, "build-stamp-state.json");

export async function withRestoredFile(path, task) {
    const originalBytes = readFileSync(path);
    try {
        return await task();
    } finally {
        writeFileSync(path, originalBytes);
    }
}

function buildStampStateFile() {
    return assertGeneratedReleaseOutputPath("release build-stamp state file", buildStampStatePath, {
        allowComponents: false,
        allowWork: false,
        allowCandidates: true,
        allowSecrets: false,
        allowTests: false
    });
}

function readBuildStampState() {
    const path = buildStampStateFile();
    if (!existsSync(path)) {
        return null;
    }

    try {
        const state = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
        return typeof state?.buildStamp === "string" ? state.buildStamp : null;
    } catch {
        return null;
    }
}

function latestBuildStamp(stamps) {
    const validStamps = stamps.filter((stamp) => parseBuildStamp(stamp) !== null);
    if (validStamps.length === 0) {
        return null;
    }
    return validStamps.sort((a, b) => parseBuildStamp(a) - parseBuildStamp(b)).at(-1);
}

function writeBuildStampState(version) {
    writeFileAtomic(
        buildStampStateFile(),
        `${JSON.stringify(
            {
                version: version.version,
                buildStamp: version.buildStamp,
                updatedAt: new Date().toISOString()
            },
            null,
            4
        )}\n`
    );
}

async function withBuildVersionOverride(version, task) {
    const previous = process.env[buildVersionEnv];
    process.env[buildVersionEnv] = JSON.stringify(version);
    try {
        return await task(version);
    } finally {
        if (previous === undefined) {
            delete process.env[buildVersionEnv];
        } else {
            process.env[buildVersionEnv] = previous;
        }
    }
}

export async function withTemporaryBuildStamp(task) {
    return withReleaseOperationLock(async () => {
        const version = readTrackedVersion();
        const previousStamp = latestBuildStamp([version.buildStamp, readBuildStampState()]);
        const stampedVersion = {
            ...version,
            buildStamp: nextBuildStamp(new Date(), previousStamp ?? version.buildStamp)
        };

        writeBuildStampState(stampedVersion);
        return withBuildVersionOverride(stampedVersion, task);
    });
}

export async function withVersionStampLock(task) {
    return withReleaseOperationLock(task);
}
