import { readFileSync } from "node:fs";

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_MIN_LENGTH = 22;
const MAX_ZIP_COMMENT_LENGTH = 0xffff;

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
        const fileNameOffset = offset + 46;
        const fileNameEnd = fileNameOffset + fileNameLength;
        const encoding = (flags & 0x800) === 0x800 ? "utf8" : "latin1";
        const name = data.subarray(fileNameOffset, fileNameEnd).toString(encoding).replaceAll("\\", "/");

        entries.push({
            name,
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
