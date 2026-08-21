import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { distDir } from "./build-utils.mjs";

const pwaDistDir = join(distDir, "pwa");
const serviceWorkerPath = join(pwaDistDir, "sw.js");
const indexPath = join(pwaDistDir, "index.html");
const manifestPath = join(pwaDistDir, "manifest.webmanifest");
const deploymentRoots = [
    "https://example.invalid/jackal/pwa/",
    "https://example.invalid/jackal-staging/pwa/",
    "https://example.invalid/foo/bar/baz/pwa/"
];
const disallowedRuntimePathFragments = ["/pwa/", "/jackal/", "/jackal-staging/"];

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

function collectFiles(dir, baseDir = dir) {
    const files = [];
    for (const entry of readdirSync(dir).sort((a, b) => a.localeCompare(b))) {
        const path = join(dir, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            files.push(...collectFiles(path, baseDir));
            continue;
        }

        files.push({
            path,
            ref: `./${relative(baseDir, path).replaceAll("\\", "/")}`
        });
    }
    return files;
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

function assertInsidePwaRoot(label, value, baseUrl, pwaRoot) {
    const resolved = new URL(value, baseUrl);
    if (!resolved.href.startsWith(pwaRoot)) {
        throw new Error(`${label} resolves outside the PWA root ${pwaRoot}: ${value} -> ${resolved.href}`);
    }
    return resolved;
}

function htmlAttributeValues(html, tagName, attributeName) {
    const values = [];
    const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
    for (const tagMatch of html.matchAll(tagPattern)) {
        const attributePattern = new RegExp(`\\b${attributeName}="([^"]*)"`, "i");
        const attributeMatch = attributePattern.exec(tagMatch[0]);
        if (attributeMatch !== null && attributeMatch[1].length > 0) {
            values.push(attributeMatch[1]);
        }
    }
    return values;
}

function htmlLinkHref(html, rel) {
    const tagPattern = /<link\b[^>]*>/gi;
    for (const tagMatch of html.matchAll(tagPattern)) {
        const tag = tagMatch[0];
        if (!new RegExp(`\\brel="${rel}"`, "i").test(tag)) {
            continue;
        }
        const hrefMatch = /\bhref="([^"]+)"/i.exec(tag);
        if (hrefMatch !== null) {
            return hrefMatch[1];
        }
    }
    throw new Error(`Unable to find <link rel="${rel}"> in dist/pwa/index.html.`);
}

function runtimeTextFiles(files) {
    return files.filter(({ ref }) => {
        const extension = extname(ref);
        return ref === "./index.html" || ref === "./manifest.webmanifest" || ref === "./sw.js" || (ref.startsWith("./assets/") && [".css", ".js"].includes(extension));
    });
}

function verifyNoHardCodedRuntimePaths(files) {
    const offenders = [];
    for (const file of runtimeTextFiles(files)) {
        const text = readFileSync(file.path, "utf8");
        for (const fragment of disallowedRuntimePathFragments) {
            if (text.includes(fragment)) {
                offenders.push(`${file.ref}: ${fragment}`);
            }
        }
    }
    if (offenders.length > 0) {
        throw new Error(`Generated runtime output contains hard-coded deployment paths: ${summarize(offenders)}`);
    }
}

function verifyRelocatableUrls(indexHtml, manifest, listedResources) {
    const pageResourceRefs = [...htmlAttributeValues(indexHtml, "script", "src"), ...htmlAttributeValues(indexHtml, "link", "href")];
    const manifestHref = htmlLinkHref(indexHtml, "manifest");

    for (const pwaRoot of deploymentRoots) {
        for (const ref of pageResourceRefs) {
            assertInsidePwaRoot("index resource", ref, pwaRoot, pwaRoot);
        }

        const manifestUrl = assertInsidePwaRoot("manifest link", manifestHref, pwaRoot, pwaRoot);
        assertInsidePwaRoot("manifest id", manifest.id, manifestUrl.href, pwaRoot);
        assertInsidePwaRoot("manifest scope", manifest.scope, manifestUrl.href, pwaRoot);
        assertInsidePwaRoot("manifest start_url", manifest.start_url, manifestUrl.href, pwaRoot);
        for (const icon of manifest.icons ?? []) {
            assertInsidePwaRoot("manifest icon", icon.src, manifestUrl.href, pwaRoot);
        }

        assertInsidePwaRoot("service worker URL", "./sw.js?v=relocation-check", pwaRoot, pwaRoot);
        assertInsidePwaRoot("service worker scope", "./", pwaRoot, pwaRoot);
        for (const resource of listedResources) {
            assertInsidePwaRoot("precache resource", resource, pwaRoot, pwaRoot);
        }
    }
}

function verifyBuiltServiceWorkerRegistration(files) {
    const javascript = runtimeTextFiles(files)
        .filter(({ ref }) => ref.endsWith(".js"))
        .map(({ path }) => readFileSync(path, "utf8"))
        .join("\n");
    if (!javascript.includes("./sw.js?v=")) {
        throw new Error("Built JavaScript does not register the service worker with a page-relative ./sw.js URL.");
    }
    if (!javascript.includes('scope:"./"')) {
        throw new Error('Built JavaScript does not register the service worker with scope "./".');
    }
}

function responseContentType(path) {
    switch (extname(path)) {
        case ".css":
            return "text/css; charset=utf-8";
        case ".html":
            return "text/html; charset=utf-8";
        case ".js":
            return "text/javascript; charset=utf-8";
        case ".png":
            return "image/png";
        case ".webmanifest":
            return "application/manifest+json; charset=utf-8";
        default:
            return "application/octet-stream";
    }
}

async function verifySameBytesRelocationPreview(indexHtml) {
    const prefixes = ["/stage/pwa/", "/production/pwa/"];
    const assetRefs = [...htmlAttributeValues(indexHtml, "script", "src"), ...htmlAttributeValues(indexHtml, "link", "href")];
    const server = createServer((request, response) => {
        const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
        const prefix = prefixes.find((candidate) => requestUrl.pathname.startsWith(candidate));
        if (prefix === undefined) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        const relativePath = decodeURIComponent(requestUrl.pathname.slice(prefix.length));
        const filePath = resolve(pwaDistDir, relativePath.length === 0 ? "index.html" : relativePath);
        if (!filePath.startsWith(resolve(pwaDistDir)) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        response.writeHead(200, { "Content-Type": responseContentType(filePath) });
        response.end(readFileSync(filePath));
    });

    await new Promise((resolveListen) => {
        server.listen(0, "127.0.0.1", resolveListen);
    });

    try {
        const address = server.address();
        const port = typeof address === "object" && address !== null ? address.port : 0;
        const roots = prefixes.map((prefix) => `http://127.0.0.1:${port}${prefix}`);
        const indexResponses = await Promise.all(roots.map((root) => fetch(root).then((response) => response.text())));
        if (indexResponses[0] !== indexHtml || indexResponses[1] !== indexHtml) {
            throw new Error("Relocation preview did not serve identical index.html bytes under both mount prefixes.");
        }

        for (const root of roots) {
            for (const ref of assetRefs) {
                const response = await fetch(new URL(ref, root));
                if (!response.ok) {
                    throw new Error(`Relocation preview failed to serve ${ref} under ${root}: HTTP ${response.status}`);
                }
            }
        }
    } finally {
        await new Promise((resolveClose, rejectClose) => {
            server.close((error) => (error === undefined ? resolveClose() : rejectClose(error)));
        });
    }
}

if (!existsSync(serviceWorkerPath) || !existsSync(indexPath) || !existsSync(manifestPath)) {
    throw new Error("Missing dist/pwa release output. Run the PWA build before verifying the precache list.");
}

const listedResources = parseStaticResources(readFileSync(serviceWorkerPath, "utf8"));
const generatedFiles = collectFiles(pwaDistDir);
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

const indexHtml = readFileSync(indexPath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
verifyNoHardCodedRuntimePaths(generatedFiles);
verifyRelocatableUrls(indexHtml, manifest, listedResources);
verifyBuiltServiceWorkerRegistration(generatedFiles);
await verifySameBytesRelocationPreview(indexHtml);

console.log(`Verified ${listedResources.length} PWA precache entries and relocatable PWA output against dist/pwa.`);
