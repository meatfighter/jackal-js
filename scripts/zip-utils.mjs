import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { writeFileAtomic } from "./atomic-file-utils.mjs";
import { assertRealDirectory, assertRealFileOrDirectory } from "./build-utils.mjs";

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_MIN_LENGTH = 22;
const MAX_ZIP_COMMENT_LENGTH = 0xffff;
const ZIP_VERSION_NEEDED = 20;
const ZIP_VERSION_MADE_BY_UNIX = (3 << 8) | ZIP_VERSION_NEEDED;
const UTF8_FILE_NAME_FLAG = 0x0800;
const STORE_COMPRESSION_METHOD = 0;
const DIRECTORY_DOS_ATTRIBUTE = 0x10;
const UNIX_REGULAR_FILE = 0o100000;
const UNIX_DIRECTORY = 0o040000;
const DEFAULT_DIRECTORY_MODE = 0o755;
const DEFAULT_FILE_MODE = 0o644;

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
        value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crcTable[index] = value >>> 0;
}

function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
    const year = Math.max(1980, Math.min(2107, date.getFullYear()));
    return {
        date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
    };
}

function normalizeZipPath(path) {
    return path.replaceAll("\\", "/");
}

function unixModeForEntry(name, isDirectory, executableEntries) {
    if (isDirectory) {
        return DEFAULT_DIRECTORY_MODE;
    }
    return executableEntries.has(name) ? 0o755 : DEFAULT_FILE_MODE;
}

function collectZipSourceEntries(sourceDir, rootName, executableEntries) {
    assertRealDirectory(sourceDir, "ZIP source directory");
    const entries = [];

    function addEntry(path, name) {
        const stat = assertRealFileOrDirectory(path, "ZIP source entry");
        if (stat.isDirectory()) {
            const directoryName = name.endsWith("/") ? name : `${name}/`;
            entries.push({
                data: Buffer.alloc(0),
                isDirectory: true,
                mode: unixModeForEntry(directoryName, true, executableEntries),
                mtime: stat.mtime,
                name: directoryName
            });
            for (const entry of readdirSync(path).sort((a, b) => a.localeCompare(b))) {
                addEntry(join(path, entry), `${directoryName}${entry}`);
            }
            return;
        }

        const normalizedName = normalizeZipPath(name);
        entries.push({
            data: readFileSync(path),
            isDirectory: false,
            mode: unixModeForEntry(normalizedName, false, executableEntries),
            mtime: stat.mtime,
            name: normalizedName
        });
    }

    addEntry(sourceDir, rootName);
    return entries;
}

function writeUInt32(buffer, value, offset) {
    buffer.writeUInt32LE(value >>> 0, offset);
}

function createLocalHeader(entry) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const { date, time } = dosDateTime(entry.mtime);
    const header = Buffer.alloc(30);
    writeUInt32(header, LOCAL_FILE_HEADER_SIGNATURE, 0);
    header.writeUInt16LE(ZIP_VERSION_NEEDED, 4);
    header.writeUInt16LE(UTF8_FILE_NAME_FLAG, 6);
    header.writeUInt16LE(STORE_COMPRESSION_METHOD, 8);
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(date, 12);
    writeUInt32(header, entry.crc, 14);
    writeUInt32(header, entry.data.length, 18);
    writeUInt32(header, entry.data.length, 22);
    header.writeUInt16LE(nameBuffer.length, 26);
    header.writeUInt16LE(0, 28);
    return [header, nameBuffer];
}

function createCentralDirectoryHeader(entry) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const { date, time } = dosDateTime(entry.mtime);
    const header = Buffer.alloc(46);
    const unixType = entry.isDirectory ? UNIX_DIRECTORY : UNIX_REGULAR_FILE;
    const externalAttributes = (((unixType | entry.mode) << 16) | (entry.isDirectory ? DIRECTORY_DOS_ATTRIBUTE : 0)) >>> 0;

    writeUInt32(header, CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE, 0);
    header.writeUInt16LE(ZIP_VERSION_MADE_BY_UNIX, 4);
    header.writeUInt16LE(ZIP_VERSION_NEEDED, 6);
    header.writeUInt16LE(UTF8_FILE_NAME_FLAG, 8);
    header.writeUInt16LE(STORE_COMPRESSION_METHOD, 10);
    header.writeUInt16LE(time, 12);
    header.writeUInt16LE(date, 14);
    writeUInt32(header, entry.crc, 16);
    writeUInt32(header, entry.data.length, 20);
    writeUInt32(header, entry.data.length, 24);
    header.writeUInt16LE(nameBuffer.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    writeUInt32(header, externalAttributes, 38);
    writeUInt32(header, entry.localHeaderOffset, 42);
    return [header, nameBuffer];
}

export function writeZipFromDirectory(sourceDir, zipPath, { rootName = basename(sourceDir), executableEntries = [] } = {}) {
    const executableEntrySet = new Set(Array.from(executableEntries, normalizeZipPath));
    const sourceEntries = collectZipSourceEntries(sourceDir, normalizeZipPath(rootName), executableEntrySet).map((entry) => ({
        ...entry,
        crc: crc32(entry.data)
    }));
    const outputParts = [];
    let offset = 0;

    for (const entry of sourceEntries) {
        entry.localHeaderOffset = offset;
        const parts = createLocalHeader(entry);
        outputParts.push(...parts, entry.data);
        offset += parts.reduce((sum, part) => sum + part.length, 0) + entry.data.length;
    }

    const centralDirectoryOffset = offset;
    for (const entry of sourceEntries) {
        const parts = createCentralDirectoryHeader(entry);
        outputParts.push(...parts);
        offset += parts.reduce((sum, part) => sum + part.length, 0);
    }

    const centralDirectorySize = offset - centralDirectoryOffset;
    const end = Buffer.alloc(END_OF_CENTRAL_DIRECTORY_MIN_LENGTH);
    writeUInt32(end, END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(sourceEntries.length, 8);
    end.writeUInt16LE(sourceEntries.length, 10);
    writeUInt32(end, centralDirectorySize, 12);
    writeUInt32(end, centralDirectoryOffset, 16);
    end.writeUInt16LE(0, 20);
    outputParts.push(end);

    writeFileAtomic(zipPath, Buffer.concat(outputParts));
}

function findEndOfCentralDirectory(data) {
    const minimumOffset = Math.max(0, data.length - END_OF_CENTRAL_DIRECTORY_MIN_LENGTH - MAX_ZIP_COMMENT_LENGTH);
    for (let offset = data.length - END_OF_CENTRAL_DIRECTORY_MIN_LENGTH; offset >= minimumOffset; offset--) {
        if (data.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
            return offset;
        }
    }
    throw new Error("Unable to find ZIP end-of-central-directory record.");
}

export function listZipEntries(zipPath) {
    const data = readFileSync(zipPath);
    const endOffset = findEndOfCentralDirectory(data);
    const entryCount = data.readUInt16LE(endOffset + 10);
    const centralDirectorySize = data.readUInt32LE(endOffset + 12);
    const centralDirectoryOffset = data.readUInt32LE(endOffset + 16);
    const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
    const entries = [];
    let offset = centralDirectoryOffset;

    for (let index = 0; index < entryCount; index++) {
        if (offset + 46 > data.length || data.readUInt32LE(offset) !== CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE) {
            throw new Error(`Invalid ZIP central-directory header at offset ${offset}.`);
        }

        const flags = data.readUInt16LE(offset + 8);
        const compressedSize = data.readUInt32LE(offset + 20);
        const uncompressedSize = data.readUInt32LE(offset + 24);
        const fileNameLength = data.readUInt16LE(offset + 28);
        const extraFieldLength = data.readUInt16LE(offset + 30);
        const fileCommentLength = data.readUInt16LE(offset + 32);
        const externalAttributes = data.readUInt32LE(offset + 38);
        const fileNameOffset = offset + 46;
        const fileNameEnd = fileNameOffset + fileNameLength;
        const encoding = (flags & 0x800) === 0x800 ? "utf8" : "latin1";
        const name = normalizeZipPath(data.subarray(fileNameOffset, fileNameEnd).toString(encoding));

        entries.push({
            compressionMethod: data.readUInt16LE(offset + 10),
            name,
            externalAttributes,
            unixMode: externalAttributes >>> 16,
            compressedSize,
            uncompressedSize
        });
        offset = fileNameEnd + extraFieldLength + fileCommentLength;
    }

    if (offset !== centralDirectoryEnd) {
        throw new Error("ZIP central-directory length did not match the end-of-central-directory record.");
    }

    return entries;
}
