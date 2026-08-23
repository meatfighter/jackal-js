import { readFileSync, writeFileSync } from "node:fs";
import { versionPath } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";
import { stampBuild } from "./stamp-build.mjs";

export async function withRestoredFile(path, task) {
    const originalBytes = readFileSync(path);
    try {
        return await task();
    } finally {
        writeFileSync(path, originalBytes);
    }
}

export async function withTemporaryBuildStamp(task) {
    return withReleaseOperationLock(() =>
        withRestoredFile(versionPath, async () => {
            const version = stampBuild();
            return task(version);
        })
    );
}

export async function withVersionStampLock(task) {
    return withReleaseOperationLock(task);
}
