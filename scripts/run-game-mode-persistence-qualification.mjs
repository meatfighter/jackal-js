/* global window, document, localStorage */
import assert from "node:assert/strict";
import { createServer as createViteServer } from "vite";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, extname, sep, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium, firefox } from "playwright";
import { disableFullscreenPreference } from "./fullscreen-test-utils.mjs";

const root = resolve(process.env.PWA_ROOT ?? "dist/pwa");
assert.ok(existsSync(join(root, "index.html")), "Game-mode persistence requires freshly built PWA");
const buildIdentity = readFileSync(join(root, "sw.js"), "utf8").match(/const (?:VERSION|BUILD_STAMP) = ["\']([^"\']+)["\']/)?.[1];
assert.ok(buildIdentity, "Packaged build identity");
const evidence = process.env.QUALIFICATION_EVIDENCE_DIR ?? join(tmpdir(), "jackal-game-mode-persistence");
mkdirSync(evidence, { recursive: true });
const vite = await createViteServer({
    configFile: resolve("pwa/vite.config.ts"),
    server: { host: "127.0.0.1", port: 0, watch: null, hmr: false },
    logLevel: "warn"
});
const mime = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ogg": "audio/ogg",
    ".webmanifest": "application/manifest+json",
    ".txt": "text/plain",
    ".xml": "application/xml"
};
const production = createServer((req, res) => {
    const path = resolve(root, "." + new URL(req.url, "http://local").pathname.replace(/^\/pwa\//, "/").replace(/\/$/, "/index.html"));
    if (!path.startsWith(root + sep) || !existsSync(path) || !statSync(path).isFile()) {
        res.writeHead(404).end();
        return;
    }
    res.writeHead(200, { "Content-Type": mime[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(path).pipe(res);
});

async function bounded(page, label, operation) {
    let lastProgress = Date.now();
    const progress = (m) => {
        if (m.text().startsWith("Checkpoint:")) {
            lastProgress = Date.now();
            console.log(m.text());
        }
    };
    page.on("console", progress);
    let timer;
    try {
        return await Promise.race([
            operation(),
            new Promise((_, reject) => {
                timer = setInterval(() => {
                    if (Date.now() - lastProgress > 60000) reject(Error(label + " made no progress for 60 seconds"));
                }, 1000);
            })
        ]);
    } finally {
        clearInterval(timer);
        page.off("console", progress);
    }
}
try {
    await vite.listen();
    await new Promise((done) => production.listen(0, "127.0.0.1", done));
    const fixtureUrl = `http://127.0.0.1:${vite.httpServer.address().port}/game-mode-persistence.html`;
    const packageUrl = `http://127.0.0.1:${production.address().port}/pwa/`;
    for (const [name, type] of Object.entries({ chromium, firefox })) {
        const browser = await type.launch({
            headless: name === "firefox" && process.env.PWA_FIREFOX_HEADLESS === "1",
            ...(name === "chromium" ? { args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] } : {})
        });
        try {
            if (name === "firefox") await browser.newPage();
            const context = await browser.newContext();
            context.setDefaultTimeout(60000);
            const errors = [];
            context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
            let page = await context.newPage();
            page.on("console", (m) => {
                if (m.text().startsWith("Checkpoint:")) console.log(name + ": " + m.text());
            });
            await page.goto(fixtureUrl);
            await page.waitForFunction(() => window.gameModePersistence);
            await page.mouse.click(1, 1);
            await page.exposeFunction("recordGameModeCheckpoint", (label) => page.screenshot({ fullPage: true, path: join(evidence, `${name}-${label}.png`) }));
            const matrix = await bounded(page, name + " matrix", () => page.evaluate(() => window.gameModePersistence.matrix()));
            const reloads = [];
            let hqBytes;
            const audioSeeds = {};
            for (const label of [
                "ordered-collision",
                "first-tank",
                "moving",
                "active-fire",
                "detached-fire",
                "destruction",
                "ending-pan",
                "earlier-boss",
                "paused-conveyor",
                "pause-audio",
                "pause-middle",
                "pause-completed",
                "unpaused-audio",
                "headquarters"
            ]) {
                console.log(name + ": document " + label);
                const checkpoint = await bounded(page, label, () => page.evaluate((label) => window.gameModePersistence.prepareReload(label), label));
                assert.equal(JSON.parse(checkpoint.bytes).version, 23);
                if (label === "headquarters") hqBytes = checkpoint.bytes;
                if (label === "pause-audio" || label === "pause-middle" || label === "pause-completed" || label === "unpaused-audio")
                    audioSeeds[label] = checkpoint.bytes;
                await page.close();
                page = await context.newPage();
                await page.goto(fixtureUrl);
                await page.waitForFunction(() => window.gameModePersistence);
                await page.mouse.click(1, 1);
                reloads.push(
                    await bounded(page, label + " restore", () =>
                        page.evaluate((checkpoint) => window.gameModePersistence.restoreReload(checkpoint), checkpoint)
                    )
                );
                await page.screenshot({ fullPage: true, path: join(evidence, `${name}-game-mode-${label}.png`) });
            }
            assert.deepEqual(errors, []);
            await context.close();
            for (const [label, bytes] of Object.entries(audioSeeds)) {
                console.log(name + ": packaged " + label);
                const audioShell = await browser.newContext();
                try {
                    // Keep native sample progress fixed while exercising the actual release shell lifecycle.
                    await audioShell.addInitScript(() => {
                        Object.defineProperty(BaseAudioContext.prototype, "currentTime", { configurable: true, get: () => 0 });
                        AudioBufferSourceNode.prototype.start = () => {};
                        AudioBufferSourceNode.prototype.stop = () => {};
                    });
                    let p = await audioShell.newPage();
                    const key = "jackal.game-state:" + encodeURIComponent("/pwa/");
                    await p.goto(packageUrl);
                    await p.waitForFunction(() => window.__gameResourcesPrepared === true);
                    await disableFullscreenPreference(p);
                    await p.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key, bytes });
                    await p.reload();
                    const continueAndMenu = async () => {
                        await p.waitForFunction(() => window.__gameResourcesPrepared === true);
                        await p.locator("#continue-button, #continueButton").click();
                        await p.locator("canvas").waitFor();
                        await p.waitForFunction(() =>
                            [...document.querySelectorAll("button")].some((b) => /menu/i.test(b.getAttribute("aria-label") ?? "") && !b.hidden)
                        );
                        await p.evaluate(() => {
                            const b = [...document.querySelectorAll("button")].find((b) => /menu/i.test(b.getAttribute("aria-label") ?? "") && !b.hidden);
                            if (!b) throw Error("Audio menu absent");
                            b.click();
                        });
                        await p.locator("#continue-button, #continueButton").waitFor({ state: "visible" });
                        const saved = await p.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
                        assert.equal(saved.gameMode.fields.paused, label !== "unpaused-audio");
                        if (label === "pause-audio" || label === "pause-middle") {
                            assert.equal(saved.audioState.sounds.length, 1);
                            assert.equal(saved.audioState.sounds[0].id, "pauseSound");
                            assert.equal(saved.audioState.sounds[0].playback.voices.length, 1, "Continue restores remainder without a second cue");
                            assert.equal(
                                saved.audioState.sounds[0].playback.voices[0].positionSeconds,
                                JSON.parse(bytes).audioState.sounds[0].playback.voices[0].positionSeconds,
                                "Exact remaining cue position"
                            );
                        } else if (label === "pause-completed") {
                            assert.deepEqual(saved.audioState.sounds, [], "Completed cue is not recreated by Continue");
                        } else {
                            assert.equal(
                                saved.audioState.sounds.find((s) => s.id === "explodeSound")?.playback.voices.length,
                                2,
                                "Menu preserves overlapping effects"
                            );
                            assert.ok(
                                saved.audioState.sounds.some((s) => s.id === "helicopterSound"),
                                "Menu preserves long effect"
                            );
                        }
                    };
                    await continueAndMenu();
                    await continueAndMenu(); // Retained Continue keeps logical voices.
                    await p.close();
                    p = await audioShell.newPage();
                    await p.goto(packageUrl);
                    await continueAndMenu(); // New document exercises the production reader and audio commit.
                    reloads.push({ label: "packaged-" + label, retained: true, freshDocument: true });
                } finally {
                    await audioShell.close();
                }
            }
            const shell = await browser.newContext();
            shell.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
            shell.setDefaultTimeout(60000);
            try {
                const key = "jackal.game-state:" + encodeURIComponent("/pwa/");
                let p = await shell.newPage();
                await p.goto(packageUrl);
                await p.waitForFunction(() => window.__gameResourcesPrepared === true);
                await disableFullscreenPreference(p);
                await p.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key, bytes: hqBytes });
                await p.reload();
                await p.waitForFunction(() => window.__gameResourcesPrepared === true);
                const resume = () => p.locator("#continue-button, #continueButton");
                const menu = async () => {
                    await p.waitForFunction(() =>
                        [...document.querySelectorAll("button")].some((b) => /menu/i.test(b.getAttribute("aria-label") ?? "") && !b.hidden)
                    );
                    await p.evaluate(() => {
                        const b = [...document.querySelectorAll("button")].find((b) => /menu/i.test(b.getAttribute("aria-label") ?? "") && !b.hidden);
                        if (!b) throw Error("Menu absent");
                        b.click();
                    });
                    await resume().waitFor({ state: "visible" });
                };
                const read = () => p.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
                await resume().click();
                await p.locator("canvas").waitFor();
                await p.keyboard.press("KeyZ");
                await p.waitForTimeout(8000);
                await p.screenshot({ fullPage: true, path: join(evidence, `${name}-packaged-live-tank.png`) });
                await menu();
                const saved = await read();
                assert.equal(saved.version, 23);
                assert.notEqual(JSON.stringify(saved), hqBytes);
                assert.ok(saved.gameMode.entities.some((e) => e.type === "BossSuperTank"));
                assert.ok(!saved.gameMode.entities.some((e) => e.type === "BossHeadquarters"));
                await p.screenshot({ fullPage: true, path: join(evidence, `${name}-packaged-tank-menu.png`) });
                await resume().click();
                await p.locator("canvas").waitFor();
                await menu(); // Retained Continue.
                await p.reload();
                await p.waitForFunction(() => window.__gameResourcesPrepared === true);
                await resume().click();
                await p.locator("canvas").waitFor();
                await menu();
                await p.close();
                p = await shell.newPage();
                await p.goto(packageUrl);
                await p.waitForFunction(() => window.__gameResourcesPrepared === true);
                await resume().click();
                await p.locator("canvas").waitFor();
                await menu();
                await p.evaluate(() => navigator.serviceWorker.ready);
                await p.reload();
                await p.waitForFunction(() => !!navigator.serviceWorker.controller);
                await shell.setOffline(true);
                await p.reload();
                await p.waitForFunction(() => window.__gameResourcesPrepared === true);
                await resume().click();
                await p.locator("canvas").waitFor();
                await menu();
                await shell.setOffline(false);
                await resume().click();
                await p.locator("canvas").waitFor();
                const previousOwner = p;
                const nextOwner = await shell.newPage();
                await nextOwner.goto(packageUrl);
                await nextOwner.getByRole("button", { name: "Continue Here", exact: true }).click();
                p = nextOwner;
                await resume().waitFor({ state: "visible" });
                assert.equal(await resume().isEnabled(), true);
                await previousOwner.getByText("Your game moved to another tab.", { exact: true }).waitFor();
                const takeover = await read();
                assert.equal(takeover.version, 23);
                assert.ok(takeover.gameMode.entities.some((e) => e.type === "BossSuperTank"));
                await previousOwner.close();
                // Retire the accepted runtime before planting corrupt data.
                await p.reload();
                await p.waitForFunction(() => window.__gameResourcesPrepared === true);
                for (const version of [23, 22, 24]) {
                    const bad = structuredClone(saved);
                    bad.version = version;
                    if (version === 23) delete bad.gameMode.indexes;
                    const bytes = JSON.stringify(bad);
                    await p.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key, bytes });
                    await p.reload();
                    await p.waitForFunction(() => window.__gameResourcesPrepared === true);
                    assert.equal(await resume().isEnabled(), false);
                    assert.equal(await p.locator("canvas").count(), 0);
                    assert.equal(await p.evaluate((key) => localStorage.getItem(key), key), bytes);
                }
                await p.locator("#new-game-button, #newGameButton").click();
                await p.locator("canvas").waitFor();
            } finally {
                await shell.close();
            }
            assert.deepEqual(errors, []);
            writeFileSync(
                join(evidence, `${name}-game-mode-persistence.json`),
                JSON.stringify(
                    {
                        name,
                        headless: name === "firefox" && process.env.PWA_FIREFOX_HEADLESS === "1",
                        buildIdentity,
                        browser: browser.version(),
                        executable: type.executablePath(),
                        matrix,
                        reloads
                    },
                    null,
                    2
                )
            );
        } finally {
            await browser.close();
        }
    }
} finally {
    await vite.close();
    await new Promise((done) => production.close(done));
}
