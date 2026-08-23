import { randomUUID } from "node:crypto";
import { closeSync, copyFileSync, fsyncSync, lstatSync, mkdirSync, openSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function fsyncDirectory(path) {
    try {
        const fd = openSync(path, "r");
        try {
            fsyncSync(fd);
        } finally {
            closeSync(fd);
        }
    } catch {
        // Directory fsync is not portable on every filesystem. The file itself
        // is fsynced before the atomic rename.
    }
}

function assertAtomicWriteTarget(path) {
    try {
        const stat = lstatSync(path);
        if (stat.isSymbolicLink() || !stat.isFile()) {
            throw new Error(`Atomic write target must be a real file or absent: ${path}`);
        }
    } catch (error) {
        if (error?.code !== "ENOENT") {
            throw error;
        }
    }
}

export function writeFileAtomic(path, data, { afterCreate = null, afterWrite = null, afterFsync = null, beforeRename = null } = {}) {
    mkdirSync(dirname(path), { recursive: true });
    assertAtomicWriteTarget(path);

    const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
    let fd = null;
    try {
        fd = openSync(tempPath, "wx");
        afterCreate?.(tempPath);
        writeFileSync(fd, data);
        afterWrite?.(tempPath);
        fsyncSync(fd);
        afterFsync?.(tempPath);
        closeSync(fd);
        fd = null;
        beforeRename?.(tempPath);
        renameSync(tempPath, path);
        fsyncDirectory(dirname(path));
    } catch (error) {
        if (fd !== null) {
            try {
                closeSync(fd);
            } catch {
                // Best effort: keep the original error as the actionable one.
            }
        }
        rmSync(tempPath, { force: true });
        throw error;
    }
}

export function copyFileAtomic(sourcePath, destinationPath, { afterCopy = null, afterFsync = null, beforeRename = null } = {}) {
    mkdirSync(dirname(destinationPath), { recursive: true });
    assertAtomicWriteTarget(destinationPath);

    const tempPath = `${destinationPath}.${process.pid}.${randomUUID()}.tmp`;
    let fd = null;
    try {
        copyFileSync(sourcePath, tempPath);
        afterCopy?.(tempPath);
        fd = openSync(tempPath, "r+");
        fsyncSync(fd);
        afterFsync?.(tempPath);
        closeSync(fd);
        fd = null;
        beforeRename?.(tempPath);
        renameSync(tempPath, destinationPath);
        fsyncDirectory(dirname(destinationPath));
    } catch (error) {
        if (fd !== null) {
            try {
                closeSync(fd);
            } catch {
                // Best effort: keep the original error as the actionable one.
            }
        }
        rmSync(tempPath, { force: true });
        throw error;
    }
}
