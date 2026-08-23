import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "./build-utils.mjs";

function trackedSourcePaths() {
    const result = spawnSync("git", ["ls-files", "-z"], {
        cwd: rootDir,
        encoding: "buffer"
    });
    if (result.error !== undefined) {
        throw result.error;
    }
    if (result.status !== 0) {
        const stderr = result.stderr?.toString("utf8").trim();
        throw new Error(`Unable to list tracked source files.${stderr ? ` ${stderr}` : ""}`);
    }
    return result.stdout.toString("utf8").split("\0").filter(Boolean).sort();
}

function hashTrackedFile(path) {
    const absolutePath = join(rootDir, path);
    if (!existsSync(absolutePath)) {
        return null;
    }
    return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

export function captureTrackedSourceState() {
    const paths = trackedSourcePaths();
    return {
        paths,
        hashes: new Map(paths.map((path) => [path, hashTrackedFile(path)]))
    };
}

export function assertTrackedSourceStateUnchanged(snapshot) {
    const currentPaths = trackedSourcePaths();
    if (currentPaths.length !== snapshot.paths.length || currentPaths.some((path, index) => path !== snapshot.paths[index])) {
        throw new Error("Tracked source file set changed during release build before promotion.");
    }

    for (const path of currentPaths) {
        const expectedHash = snapshot.hashes.get(path);
        const currentHash = hashTrackedFile(path);
        if (currentHash !== expectedHash) {
            throw new Error(`Tracked source changed during release build before promotion: ${path}`);
        }
    }
}
