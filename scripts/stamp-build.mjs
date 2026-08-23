import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readVersion, writeVersion } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";

function pad(value) {
    return String(value).padStart(2, "0");
}

export function formatBuildStamp(date) {
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

function parseBuildStamp(value) {
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(String(value));
    if (match === null) {
        return null;
    }
    const [, year, month, day, hour, minute, second] = match;
    const time = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    return Number.isNaN(time) ? null : time;
}

export function nextBuildStamp(date, previousStamp) {
    const currentStamp = formatBuildStamp(date);
    const currentTime = parseBuildStamp(currentStamp);
    const previousTime = parseBuildStamp(previousStamp);
    if (currentTime === null || previousTime === null || currentTime > previousTime) {
        return currentStamp;
    }
    return formatBuildStamp(new Date(previousTime + 1000));
}

export function stampBuild(date = new Date()) {
    const version = readVersion();
    version.buildStamp = nextBuildStamp(date, version.buildStamp);
    writeVersion(version);
    return version;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await withReleaseOperationLock(() => {
        const version = stampBuild();
        console.log(`Stamped build ${version.version} as ${version.buildStamp}`);
    });
}
