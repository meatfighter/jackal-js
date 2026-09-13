/* global document, navigator, HTMLElement */
import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = resolve(process.env.PWA_ROOT ?? "dist/pwa");
assert(existsSync(resolve(root, "index.html")), `Missing production PWA: ${root}`);

const mime = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ogg": "audio/ogg",
    ".txt": "text/plain",
    ".xml": "application/xml"
};

const server = createServer((request, response) => {
    const requestUrl = new URL(request.url, "http://localhost");
    const file = resolve(root, "." + decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname));
    if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(file).pipe(response);
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const url = `http://127.0.0.1:${server.address().port}/`;

let browser = null;
try {
    browser = await chromium.launch({ headless: false, args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
    const context = await browser.newContext();
    context.setDefaultTimeout(60_000);
    await installHungFullscreenHarness(context);

    const errors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);

    const fullscreenSwitch = page.locator("#fullscreen-switch-button").first();
    await fullscreenSwitch.waitFor({ state: "visible" });
    assert.equal(await fullscreenSwitch.isEnabled(), true);
    assert.equal(await fullscreenSwitch.getAttribute("aria-pressed"), "true");

    await page.locator("#new-game-button").click({ noWaitAfter: true });
    await page.waitForFunction(() => globalThis.__hungFullscreenHarness.requestCount() === 1);
    await waitForWindowedRunning(page);
    const retainedCanvas = await page.locator("canvas").elementHandle();
    assert.ok(retainedCanvas, "missing game canvas before hung-request menu transition");

    const menuStartedAt = Date.now();
    await page.locator("#hamburger-button").click();
    await page.locator("#continue-button").waitFor({ state: "visible", timeout: 5_000 });
    const menuDelay = Date.now() - menuStartedAt;
    assert.ok(menuDelay >= 1_000, `hung request was not actually bounded by the timeout path (${menuDelay} ms)`);
    assert.ok(menuDelay < 5_000, `hung request blocked MENU too long (${menuDelay} ms)`);
    assert.equal(await page.locator("canvas").count(), 1, "hung request should retain the live game");
    assert.equal(await fullscreenSwitchState(page), "true", "timeout changed the stored Fullscreen preference");

    // The old native request is still unresolved. Continuing the same live shell must
    // remain windowed and must not stack a second browser request on top of it.
    await page.locator("#continue-button").click();
    await waitForWindowedRunning(page);
    assert.equal(await retainedCanvas.evaluate((canvas) => canvas.isConnected), true, "hung-request Continue replaced the retained canvas");
    assert.equal(
        await page.evaluate(() => globalThis.__hungFullscreenHarness.requestCount()),
        1,
        "suppressed live Continue stacked another fullscreen request"
    );

    // Now let the first browser request succeed absurdly late. It must be hidden and
    // exited as stale/unauthorized presentation work without returning gameplay to MENU.
    await page.evaluate(() => globalThis.__hungFullscreenHarness.resolvePending());
    await page.waitForFunction(() => document.fullscreenElement === null && document.querySelector("#app")?.style.visibility !== "hidden", undefined, {
        timeout: 5_000
    });
    await waitForWindowedRunning(page);
    assert.equal(await retainedCanvas.evaluate((canvas) => canvas.isConnected), true, "late fullscreen success replaced or destroyed the retained canvas");
    assert.equal(await page.locator("#continue-button").count(), 0, "late fullscreen success incorrectly returned the resumed game to MENU");

    // Once that abandoned native request has actually settled, suppression is lifted.
    // The next explicit Continue may try fullscreen again on the same retained shell.
    await page.locator("#hamburger-button").click();
    await page.locator("#continue-button").waitFor({ state: "visible" });
    await page.locator("#continue-button").click({ noWaitAfter: true });
    await page.waitForFunction(() => globalThis.__hungFullscreenHarness.requestCount() === 2);
    await page.evaluate(() => globalThis.__hungFullscreenHarness.resolvePending());
    await page.waitForFunction(() => document.fullscreenElement?.id === "game-shell");
    assert.equal(await retainedCanvas.evaluate((canvas) => canvas.isConnected), true, "post-timeout retry replaced the retained canvas");

    // Browser-driven exit still returns to the windowed menu and the human preference remains ON.
    await page.evaluate(() => document.exitFullscreen());
    await page.locator("#continue-button").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.fullscreenElement === null);
    assert.equal(await fullscreenSwitchState(page), "true", "post-timeout retry or browser exit changed the Fullscreen preference");

    assert.deepEqual(errors, [], "hung fullscreen qualification produced uncaught browser errors");
    console.log(
        "Hung fullscreen qualification passed: bounded MENU transition, temporary request suppression, very-late success retirement, and later retry are safe."
    );
    await context.close();
} finally {
    if (browser !== null) {
        await browser.close();
    }
    await new Promise((resolveClose) => server.close(resolveClose));
}

async function waitForWindowedRunning(page) {
    await page.locator("canvas").waitFor({ state: "visible" });
    await page.locator("#hamburger-button:not([hidden])").waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => document.fullscreenElement), null);
}

async function fullscreenSwitchState(page) {
    return page.locator("#fullscreen-switch-button").first().getAttribute("aria-pressed");
}

async function installHungFullscreenHarness(context) {
    await context.addInitScript(() => {
        let fullscreenElement = null;
        const setSyntheticFullscreenElement = (element) => {
            fullscreenElement = element;
        };
        let requestCount = 0;
        let pendingResolve = null;

        Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
        Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
        Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreenElement });
        Object.defineProperty(document, "exitFullscreen", {
            configurable: true,
            value: async () => {
                if (fullscreenElement !== null) {
                    fullscreenElement = null;
                    document.dispatchEvent(new Event("fullscreenchange"));
                }
            }
        });
        Object.defineProperty(HTMLElement.prototype, "webkitRequestFullscreen", { configurable: true, value: undefined });
        Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
            configurable: true,
            value: function () {
                requestCount++;
                return new Promise((resolve) => {
                    pendingResolve = () => {
                        setSyntheticFullscreenElement(this);
                        document.dispatchEvent(new Event("fullscreenchange"));
                        resolve();
                        pendingResolve = null;
                    };
                });
            }
        });

        Object.defineProperty(globalThis, "__hungFullscreenHarness", {
            configurable: true,
            value: {
                requestCount: () => requestCount,
                resolvePending: () => pendingResolve?.()
            }
        });
    });
}
