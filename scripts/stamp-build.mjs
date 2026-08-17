import { readVersion, writeVersion } from "./build-utils.mjs";

function pad(value) {
    return String(value).padStart(2, "0");
}

function formatBuildStamp(date) {
    return [
        date.getUTCFullYear(),
        pad(date.getUTCMonth() + 1),
        pad(date.getUTCDate()),
        "T",
        pad(date.getUTCHours()),
        pad(date.getUTCMinutes()),
        pad(date.getUTCSeconds()),
        "Z"
    ].join("");
}

const version = readVersion();
version.buildStamp = formatBuildStamp(new Date());
writeVersion(version);
console.log(`Stamped build ${version.version} as ${version.buildStamp}`);
