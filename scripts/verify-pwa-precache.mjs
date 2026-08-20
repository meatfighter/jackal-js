import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { distDir } from "./build-utils.mjs";

const pwaDistDir = join(distDir, "pwa");
const serviceWorkerPath = join(pwaDistDir, "sw.js");

function collectPrecacheResources(dir, baseDir = dir) {
    const resources = [];
    for (const entry of readdirSync(dir).sort((a, b) => a.localeCompare(b))) {
        const path = join(dir, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            resources.push(...collectPrecacheResources(path, baseDir));
            continue;
        }

        const ref = relative(baseDir, path).replaceAll("\\", "/");
        if (ref === "sw.js") {
            continue;
        }
        resources.push(`./${ref}`);
    }
    return resources;
}

function parseStaticResources(source) {
    const match = /const APP_STATIC_RESOURCES = (\[[\s\S]*?\]);/.exec(source);
    if (match === null) {
        throw new Error("Unable to find APP_STATIC_RESOURCES in dist/pwa/sw.js.");
    }
    const resources = JSON.parse(match[1]);
    if (!Array.isArray(resources) || resources.some((resource) => typeof resource !== "string")) {
        throw new Error("APP_STATIC_RESOURCES must be an array of strings.");
    }
    return resources;
}

function findDuplicates(values) {
    const seen = new Set();
    const duplicates = new Set();
    for (const value of values) {
        if (seen.has(value)) {
            duplicates.add(value);
        }
        seen.add(value);
    }
    return Array.from(duplicates);
}

function summarize(values) {
    if (values.length <= 12) {
        return values.join(", ");
    }
    return `${values.slice(0, 12).join(", ")} ... (${values.length} total)`;
}

if (!existsSync(serviceWorkerPath)) {
    throw new Error("Missing dist/pwa/sw.js. Run the PWA build before verifying the precache list.");
}

const listedResources = parseStaticResources(readFileSync(serviceWorkerPath, "utf8"));
const expectedResources = ["./", ...collectPrecacheResources(pwaDistDir)];
const duplicateResources = findDuplicates(listedResources);
const listedSet = new Set(listedResources);
const expectedSet = new Set(expectedResources);
const missingResources = expectedResources.filter((resource) => !listedSet.has(resource));
const extraResources = listedResources.filter((resource) => !expectedSet.has(resource));

if (duplicateResources.length > 0) {
    throw new Error(`APP_STATIC_RESOURCES contains duplicate entries: ${summarize(duplicateResources)}`);
}
if (missingResources.length > 0) {
    throw new Error(`APP_STATIC_RESOURCES is missing generated files: ${summarize(missingResources)}`);
}
if (extraResources.length > 0) {
    throw new Error(`APP_STATIC_RESOURCES contains entries not present in dist/pwa: ${summarize(extraResources)}`);
}

console.log(`Verified ${listedResources.length} PWA precache entries against dist/pwa.`);
