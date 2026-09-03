import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { cleanupBrowser, launchBrowser, waitForExpression } from "./browser-test-utils.mjs";
import { distDir } from "./build-utils.mjs";

const root = resolve(join(distDir, "pwa"));
if (!existsSync(join(root, "index.html"))) {
    throw new Error("Built Jackal PWA is missing. Run npm run build before verify:browser.");
}

const port = 5198;
const baseUrl = `http://127.0.0.1:${port}/`;
const mime = {
    ".css": "text/css",
    ".dat": "application/octet-stream",
    ".html": "text/html",
    ".ico": "image/x-icon",
    ".js": "text/javascript",
    ".json": "application/json",
    ".ogg": "audio/ogg",
    ".png": "image/png",
    ".txt": "text/plain",
    ".webmanifest": "application/manifest+json",
    ".xml": "application/xml"
};

const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", baseUrl);
    const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const path = resolve(root, normalize(requested));
    if (path !== root && !path.startsWith(`${root}/`) && !path.startsWith(`${root}\\`)) {
        response.writeHead(403).end();
        return;
    }
    if (!existsSync(path) || !statSync(path).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.writeHead(200, {
        "Content-Type": mime[extname(path)] ?? "application/octet-stream",
        "Cache-Control": "no-store"
    });
    createReadStream(path).pipe(response);
});

await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", resolveListen);
});

let browser = null;
try {
    browser = await launchBrowser(baseUrl, process.cwd(), "jackal-offline-");
    await waitForExpression(
        browser.page,
        'window.__jackalBooted === true && navigator.serviceWorker?.controller !== null && document.querySelector("#new-game-button") !== null',
        30_000
    );
    await browser.page.call("Network.enable");
    await browser.page.call("Network.emulateNetworkConditions", {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0
    });
    await browser.page.call("Page.enable");
    await browser.page.call("Page.reload", { ignoreCache: true });
    await waitForExpression(browser.page, 'window.__jackalBooted === true && document.querySelector("#new-game-button") !== null', 30_000);
    console.log("Jackal production PWA booted successfully while offline.");
} finally {
    if (browser !== null) {
        try {
            await browser.page.call("Network.emulateNetworkConditions", {
                offline: false,
                latency: 0,
                downloadThroughput: -1,
                uploadThroughput: -1
            });
        } catch {
            // Browser may already be shutting down.
        }
    }
    await cleanupBrowser(browser);
    await new Promise((resolveClose) => server.close(resolveClose));
}
