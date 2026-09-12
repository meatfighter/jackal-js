/* global document, navigator, window, HTMLElement */
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

    await qualifySupportedTouchFullscreen(browser, url);
    await qualifyRejectedFullscreen(browser, url);
    await qualifyUnsupportedFullscreen(browser, url);
    await qualifyPendingFullscreenDeparture(browser, url);

    console.log("Fullscreen qualification passed: success, rejection, unsupported capability, and pending-request departure are fenced correctly.");
} finally {
    if (browser !== null) {
        await browser.close();
    }
    await new Promise((resolveClose) => server.close(resolveClose));
}

async function qualifySupportedTouchFullscreen(browser, url) {
    const context = await browser.newContext();
    context.setDefaultTimeout(60_000);
    await installFullscreenHarness(context, "success", true);
    const errors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    try {
        await page.goto(url);
        const fullscreenSwitch = await waitForMenu(page);
        assert.equal(await fullscreenSwitch.isEnabled(), true, "supported fullscreen switch is disabled");
        assert.equal(await fullscreenSwitch.getAttribute("aria-pressed"), "true", "fullscreen preference does not default on");
        await page.locator("#new-game-button").click();
        await page.locator("canvas").waitFor({ state: "visible" });
        await page.waitForFunction(() => document.fullscreenElement?.id === "game-shell");
        await page.locator("#hamburger-button:not([hidden])").waitFor({ state: "visible" });
        assert.equal(await page.evaluate(() => document.fullscreenElement?.id), "game-shell", "wrong fullscreen target");
        assert.equal(await page.locator("#game-shell .menu-screen").count(), 0, "PWA menu is inside the fullscreen shell");

        await page.locator("#hamburger-button").click();
        await page.locator("#continue-button").waitFor({ state: "visible" });
        await page.waitForFunction(() => document.fullscreenElement === null);
        assert.equal(await page.locator("#fullscreen-switch-button").getAttribute("aria-pressed"), "true", "menu exit changed fullscreen preference");
        assert.equal(await page.evaluate(() => globalThis.__fullscreenHarness.requestCount()), 1, "New Game did not issue exactly one fullscreen request");
        assert.deepEqual(errors, [], "supported fullscreen qualification produced uncaught browser errors");
    } finally {
        await context.close();
    }
}

async function qualifyRejectedFullscreen(browser, url) {
    const context = await browser.newContext();
    context.setDefaultTimeout(60_000);
    await installFullscreenHarness(context, "reject", false);
    const errors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    try {
        await page.goto(url);
        const fullscreenSwitch = await waitForMenu(page);
        assert.equal(await fullscreenSwitch.isEnabled(), true, "rejecting fullscreen surface should still advertise capability");
        assert.equal(await fullscreenSwitch.getAttribute("aria-pressed"), "true");
        await page.locator("#new-game-button").click();
        await waitForWindowedRunning(page);
        assert.equal(await page.evaluate(() => globalThis.__fullscreenHarness.requestCount()), 1, "rejection case did not attempt fullscreen exactly once");
        assert.equal(await page.evaluate(() => document.fullscreenElement), null, "rejected request left a fullscreen element");

        await page.locator("#hamburger-button").click();
        await page.locator("#continue-button").waitFor({ state: "visible" });
        assert.equal(await page.locator("#fullscreen-switch-button").getAttribute("aria-pressed"), "true", "rejection changed fullscreen preference");
        assert.equal(await page.locator(".error-message").count(), 0, "fullscreen rejection surfaced a user-facing error");
        assert.deepEqual(errors, [], "fullscreen rejection produced an uncaught browser error");
    } finally {
        await context.close();
    }
}

async function qualifyUnsupportedFullscreen(browser, url) {
    const context = await browser.newContext();
    context.setDefaultTimeout(60_000);
    await installFullscreenHarness(context, "unsupported", false);
    const errors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    try {
        await page.goto(url);
        const fullscreenSwitch = await waitForMenu(page);
        assert.equal(await fullscreenSwitch.isEnabled(), false, "method-less fullscreen surface should disable the switch");
        assert.equal(await fullscreenSwitch.getAttribute("aria-pressed"), "true", "disabled unsupported switch should preserve the default preference");
        await page.locator("#new-game-button").click();
        await waitForWindowedRunning(page);
        assert.equal(await page.evaluate(() => globalThis.__fullscreenHarness.requestCount()), 0, "unsupported browser made a fullscreen request");
        assert.deepEqual(errors, [], "unsupported fullscreen qualification produced uncaught browser errors");
    } finally {
        await context.close();
    }
}

async function qualifyPendingFullscreenDeparture(browser, url) {
    const context = await browser.newContext();
    context.setDefaultTimeout(60_000);
    await installFullscreenHarness(context, "pending", false);
    const errors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    try {
        await page.goto(url);
        const fullscreenSwitch = await waitForMenu(page);
        assert.equal(await fullscreenSwitch.isEnabled(), true);
        assert.equal(await fullscreenSwitch.getAttribute("aria-pressed"), "true");
        await page.locator("#new-game-button").click({ noWaitAfter: true });
        await page.waitForFunction(() => globalThis.__fullscreenHarness.requestCount() === 1);
        await page.evaluate(() => window.dispatchEvent(new Event("blur")));
        await page.waitForFunction(() => document.querySelector("#app")?.style.visibility === "hidden");

        await page.evaluate(() => globalThis.__fullscreenHarness.resolvePending());
        await page.locator("#new-game-button").waitFor({ state: "visible" });
        await page.waitForFunction(() => document.fullscreenElement === null && document.querySelector("#app")?.style.visibility !== "hidden");
        assert.equal(await page.locator("#fullscreen-switch-button").getAttribute("aria-pressed"), "true", "pending-request cancellation changed the preference");
        assert.equal(await page.locator("canvas").count(), 0, "pending-request departure left gameplay running behind the menu");
        assert.deepEqual(errors, [], "pending fullscreen departure produced uncaught browser errors");
    } finally {
        await context.close();
    }
}

async function waitForMenu(page) {
    const fullscreenSwitch = page.locator("#fullscreen-switch-button").first();
    await fullscreenSwitch.waitFor({ state: "visible" });
    await page.locator("#new-game-button").waitFor({ state: "visible" });
    return fullscreenSwitch;
}

async function waitForWindowedRunning(page) {
    await page.locator("canvas").waitFor({ state: "visible" });
    await page.locator("#hamburger-button:not([hidden])").waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => document.fullscreenElement), null);
}

async function installFullscreenHarness(context, mode, touch) {
    await context.addInitScript(
        ({ mode, touch }) => {
            let fullscreenElement = null;
            let requestCount = 0;
            let pendingResolve = null;

            Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: touch ? 1 : 0 });
            Object.defineProperty(document, "fullscreenEnabled", { configurable: true, get: () => mode !== "unsupported" });
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
            if (mode === "unsupported") {
                Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { configurable: true, value: undefined });
            } else if (mode === "reject") {
                Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
                    configurable: true,
                    value() {
                        requestCount++;
                        return Promise.reject(new DOMException("Synthetic fullscreen denial", "NotAllowedError"));
                    }
                });
            } else if (mode === "pending") {
                Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
                    configurable: true,
                    value() {
                        requestCount++;
                        const target = this;
                        return new Promise((resolve) => {
                            pendingResolve = () => {
                                fullscreenElement = target;
                                document.dispatchEvent(new Event("fullscreenchange"));
                                resolve();
                                pendingResolve = null;
                            };
                        });
                    }
                });
            } else {
                Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
                    configurable: true,
                    value() {
                        requestCount++;
                        fullscreenElement = this;
                        document.dispatchEvent(new Event("fullscreenchange"));
                        return Promise.resolve();
                    }
                });
            }

            Object.defineProperty(globalThis, "__fullscreenHarness", {
                configurable: true,
                value: {
                    requestCount: () => requestCount,
                    resolvePending: () => pendingResolve?.()
                }
            });
        },
        { mode, touch }
    );
}
