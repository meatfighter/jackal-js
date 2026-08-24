import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rootDir } from "./build-utils.mjs";

export const allowDirtyReleaseEnv = "JACKAL_ALLOW_DIRTY_RELEASE";
export const releaseSourceCommitEnv = "JACKAL_RELEASE_SOURCE_COMMIT";
export const releaseSourceDirtyEnv = "JACKAL_RELEASE_SOURCE_DIRTY";
export const releaseSourceUrlEnv = "JACKAL_RELEASE_SOURCE_URL";

function runGit(args, { cwd = rootDir, encoding = "utf8" } = {}) {
    const result = spawnSync("git", args, {
        cwd,
        encoding
    });
    if (result.error !== undefined) {
        throw result.error;
    }
    if (result.status !== 0) {
        const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8").trim() : (result.stderr ?? "").trim();
        throw new Error(`Git command failed: git ${args.join(" ")}.${stderr ? ` ${stderr}` : ""}`);
    }
    return result.stdout;
}

function splitNullTerminated(value) {
    return value.toString("utf8").split("\0").filter(Boolean).sort();
}

function trackedSourcePaths({ cwd = rootDir } = {}) {
    return splitNullTerminated(runGit(["ls-files", "-z"], { cwd, encoding: "buffer" }));
}

function hashTrackedFile(path, { cwd = rootDir } = {}) {
    const absolutePath = join(cwd, path);
    if (!existsSync(absolutePath)) {
        return null;
    }
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
        throw new Error(`Tracked source must be a real file: ${path}`);
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

export function getSourceCommit({ cwd = rootDir } = {}) {
    return runGit(["rev-parse", "HEAD"], { cwd }).trim();
}

function normalizeRemoteUrl(remoteUrl) {
    const trimmed = remoteUrl.trim();
    const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
    if (sshMatch !== null) {
        return `https://${sshMatch[1]}/${sshMatch[2].replace(/\.git$/, "")}`;
    }

    return trimmed.replace(/\.git$/, "");
}

export function getSourceUrlForCommit(commit, { cwd = rootDir } = {}) {
    const remoteUrl = runGit(["config", "--get", "remote.origin.url"], { cwd }).trim();
    return `${normalizeRemoteUrl(remoteUrl)}/tree/${commit}`;
}

export function getSourceStatus({ cwd = rootDir } = {}) {
    return {
        unstaged: splitNullTerminated(runGit(["diff", "--name-only", "-z"], { cwd, encoding: "buffer" })),
        staged: splitNullTerminated(runGit(["diff", "--cached", "--name-only", "-z"], { cwd, encoding: "buffer" })),
        untracked: splitNullTerminated(runGit(["ls-files", "--others", "--exclude-standard", "-z"], { cwd, encoding: "buffer" }))
    };
}

function formatDirtySourceStatus(status) {
    return [
        ...status.unstaged.map((path) => `unstaged:${path}`),
        ...status.staged.map((path) => `staged:${path}`),
        ...status.untracked.map((path) => `untracked:${path}`)
    ];
}

export function captureSourceProvenance({ cwd = rootDir, allowDirty = process.env[allowDirtyReleaseEnv] === "1" } = {}) {
    const sourceCommit = getSourceCommit({ cwd });
    const sourceUrl = getSourceUrlForCommit(sourceCommit, { cwd });
    const status = getSourceStatus({ cwd });
    const dirtyFiles = formatDirtySourceStatus(status);
    const dirty = dirtyFiles.length > 0;

    if (dirty && !allowDirty) {
        throw new Error(
            `Production release requires a clean Git checkout. Commit, stash, or remove dirty files, or set ${allowDirtyReleaseEnv}=1 to record a dirty release. Dirty files: ${dirtyFiles.join(", ")}`
        );
    }

    return {
        sourceCommit,
        sourceUrl,
        dirty
    };
}

export function sourceProvenanceFromEnvironment() {
    const sourceCommit = process.env[releaseSourceCommitEnv];
    if (sourceCommit === undefined) {
        return null;
    }

    return {
        sourceCommit,
        sourceUrl: process.env[releaseSourceUrlEnv] ?? null,
        dirty: process.env[releaseSourceDirtyEnv] === "1"
    };
}

export function sourceProvenanceEnvironment(provenance) {
    return {
        [releaseSourceCommitEnv]: provenance.sourceCommit,
        [releaseSourceDirtyEnv]: provenance.dirty ? "1" : "0",
        ...(provenance.sourceUrl === null ? {} : { [releaseSourceUrlEnv]: provenance.sourceUrl })
    };
}
