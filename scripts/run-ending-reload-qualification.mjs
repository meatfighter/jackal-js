/* global window, document, localStorage */
import assert from "node:assert/strict";
import { createServer as createViteServer } from "vite";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname, sep, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium, firefox } from "playwright";
import { disableFullscreenPreference } from "./fullscreen-test-utils.mjs";

const root = resolve(process.env.PWA_ROOT ?? ".release-components/pwa");
assert.ok(existsSync(join(root, "index.html")), "Ending reload requires freshly built PWA");
const evidence = process.env.QUALIFICATION_EVIDENCE_DIR ?? join(tmpdir(), "jackal-ending-reload");
mkdirSync(evidence, { recursive: true });
const vite = await createViteServer({ configFile: resolve("pwa/vite.config.ts"), server: { host: "127.0.0.1", port: 0 }, logLevel: "warn" });
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
try {
    await vite.listen();
    await new Promise((done) => production.listen(0, "127.0.0.1", done));
    const fixtureUrl = `http://127.0.0.1:${vite.httpServer.address().port}/ending-reload.html`;
    const packageUrl = `http://127.0.0.1:${production.address().port}/pwa/`;
    for (const [name, type] of Object.entries({ chromium, firefox })) {
        const browser = await type.launch({
            headless: name === "firefox" && process.env.PWA_FIREFOX_HEADLESS === "1",
            ...(name === "chromium" ? { args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] } : {})
        });
        try {
            writeFileSync(
                join(evidence, `${name}-ending-browser-identity.json`),
                JSON.stringify(
                    {
                        name,
                        version: browser.version(),
                        executable: type.executablePath(),
                        headless: name === "firefox" && process.env.PWA_FIREFOX_HEADLESS === "1"
                    },
                    null,
                    2
                )
            );
            // Keep Firefox from tearing down its last native window between
            // independent contexts. This blank page owns no game modules/storage.
            if (name === "firefox") {
                const keeper = await browser.newPage();
                await keeper.goto("about:blank");
            }
            const records = [];
            let packagedBytes;
            for (const remaining of [0, 1, 2])
                for (const partial of [false, true]) {
                    const context = await browser.newContext();
                    context.setDefaultTimeout(120000);
                    try {
                        let page = await context.newPage();
                        const errors = [];
                        context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
                        page.on("pageerror", (e) => errors.push(e.message));
                        await page.goto(fixtureUrl);
                        await page.waitForFunction(() => !!window.endingReload);
                        assert.deepEqual(await page.evaluate(() => window.endingReload.initialBag), []);
                        const before = await page.evaluate(
                            ({ remaining, partial }) => window.endingReload.prepareReload(remaining, partial ? 1000000 : 123450, partial),
                            { remaining, partial }
                        );
                        assert.equal(before.snapshot.version, 20);
                        assert.equal(before.bag.length, remaining);
                        packagedBytes = before.bytes;
                        await page.close(); // Entire document/module graph is gone; only bytes survive.
                        page = await context.newPage();
                        await page.goto(fixtureUrl);
                        await page.waitForFunction(() => !!window.endingReload);
                        assert.deepEqual(await page.evaluate(() => window.endingReload.initialBag), []);
                        const after = await page.evaluate((bytes) => window.endingReload.restoreReload(bytes), before.bytes);
                        assert.deepEqual(after.bag, before.bag);
                        assert.deepEqual(after.rng, before.rng);
                        assert.deepEqual(after.trace, before.trace, "cross-document next choices/bag/RNG through refill");
                        assert.deepEqual(after.text, before.text, "first restored score card draws exact text/length/position");
                        // Snapshot comparison retains all durable authorities, ignoring only timestamp.
                        const a = structuredClone(after.snapshot),
                            b = structuredClone(before.snapshot);
                        delete a.savedAt;
                        delete b.savedAt;
                        assert.deepEqual(a, b);
                        await page.screenshot({ path: join(evidence, `${name}-ending-reload-${remaining}-${partial}.png`) });
                        assert.deepEqual(errors, []);
                        records.push({ remaining, partial, before, after });
                        await page.evaluate(() => window.endingReload.dispose());
                    } catch (error) {
                        console.error(`${name}: reload case remaining=${remaining}, partial=${partial} failed`, error);
                        throw error;
                    } finally {
                        await context.close();
                    }
                }
            const context = await browser.newContext();
            context.setDefaultTimeout(120000);
            try {
                const page = await context.newPage();
                await page.goto(packageUrl);
                await page.waitForFunction(() => window.__gameResourcesPrepared === true);
                await disableFullscreenPreference(page);
                await page.evaluate((bytes) => localStorage.setItem("jackal.game-state:" + encodeURIComponent("/pwa/"), bytes), packagedBytes);
                await page.reload();
                await page.waitForFunction(() => window.__gameResourcesPrepared === true);
                const resume = page.locator("#continue-button, #continueButton");
                assert.equal(await resume.isEnabled(), true);
                await resume.click();
                await page.locator("canvas").waitFor();
                await page.waitForFunction(() =>
                    [...document.querySelectorAll("button")].some((b) => /menu/i.test(b.getAttribute("aria-label") ?? "") && !b.hidden)
                );
                await page.screenshot({ path: join(evidence, `${name}-packaged-ending-continue.png`) });
                await page.evaluate(() => {
                    const b = [...document.querySelectorAll("button")].find((b) => /menu/i.test(b.getAttribute("aria-label") ?? "") && !b.hidden);
                    if (!b) throw Error("Packaged Menu absent");
                    b.click();
                });
                await resume.waitFor({ state: "visible" });
                const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("jackal.game-state:" + encodeURIComponent("/pwa/"))));
                assert.equal(saved.version, 20);
                assert.equal(saved.mainFields.score, 1000000);
                assert.ok(Array.isArray(saved.remainingCutscenes));
                // Retire the retained accepted runtime before injecting rejected bytes.
                // Its authorized pagehide final save is allowed to replace test bytes.
                await page.reload();
                await page.waitForFunction(() => window.__gameResourcesPrepared === true);
                assert.equal(await page.locator("canvas").count(), 0);
                const invalid = structuredClone(saved);
                invalid.modeFields.lineLength = 999;
                const invalidBytes = JSON.stringify(invalid);
                await page.evaluate((bytes) => localStorage.setItem("jackal.game-state:" + encodeURIComponent("/pwa/"), bytes), invalidBytes);
                for (let attempt = 0; attempt < 2; attempt++) {
                    await page.reload();
                    await page.waitForFunction(() => window.__gameResourcesPrepared === true);
                    assert.equal(await resume.isEnabled(), false, "Semantically invalid current save disables durable Continue");
                    assert.equal(await page.locator("canvas").count(), 0, "No half-restored canvas");
                    assert.equal(await page.locator("#new-game-button, #newGameButton").isEnabled(), true);
                    assert.equal(await page.evaluate(() => localStorage.getItem("jackal.game-state:" + encodeURIComponent("/pwa/"))), invalidBytes);
                }
                await page.locator("#new-game-button, #newGameButton").click();
                await page.locator("canvas").waitFor();
            } finally {
                await context.close();
            }
            writeFileSync(join(evidence, `${name}-ending-reload.json`), JSON.stringify(records, null, 2));
            console.log(`${name}: actual new-document bag/RNG/refill and ending text, packaged schema20 Continue passed`);
        } finally {
            await browser.close();
        }
    }
} finally {
    await vite.close();
    await new Promise((done) => production.close(done));
}
