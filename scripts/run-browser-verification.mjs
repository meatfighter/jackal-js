import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { cleanupBrowser, findBrowser, launchBrowser, stopChild, waitForExpression, waitForHttpServer } from "./browser-test-utils.mjs";
import { rootDir } from "./build-utils.mjs";

const port = 5197;
const focusedSuite = process.env.JACKAL_BROWSER_SUITE;
if (focusedSuite && !["last-life-music", "last-life-arbitration", "boss-entry-last-life", "ending-persistence", "counter-parity"].includes(focusedSuite))
    throw new Error("Unknown browser verification suite");
const browserVerificationUrl = `http://127.0.0.1:${port}/browser-verify.html${focusedSuite ? "?suite=" + focusedSuite : ""}`;
const appUrl = `http://127.0.0.1:${port}/`;
const viteBin = resolve(rootDir, "node_modules", "vite", "bin", "vite.js");
const server = spawn(process.execPath, [viteBin, "--config", "pwa/vite.config.ts", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"]
});
let browser = null;
try {
    await waitForHttpServer(server, browserVerificationUrl);
    browser = await launchBrowser("about:blank", rootDir, "jackal-browser-");
    const verificationHooks =
        "window.captureCompactLabels = (game) => new Promise(resolve => { window.compactLabelCapture = { game, resolve }; }); window.activateLastLifeAudio = (activate) => new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(new Error('Last-life audio activation exceeded 10s')),10000); window.lastLifeAudioActivation={activate,resolve:(value)=>{clearTimeout(timer);resolve(value);}}; })";
    // Install the driver bridge before fixture navigation; an unchecked evaluation
    // during the initial navigation can leave the test running without its hooks.
    await browser.page.call("Page.enable");
    await browser.page.call("Page.bringToFront");
    const hooks = await browser.page.call("Page.addScriptToEvaluateOnNewDocument", { source: verificationHooks });
    assert.ok(hooks.identifier, "Verification hooks registered before navigation");
    const navigation = await browser.page.call("Page.navigate", { url: browserVerificationUrl });
    assert.ok(!navigation.errorText, "Verification fixture navigation failed");
    await waitForExpression(browser.page, 'typeof window.captureCompactLabels === "function" && typeof window.activateLastLifeAudio === "function"');
    let stage = "";
    const seenStages = new Set();
    while (true) {
        const status = await waitForExpression(
            browser.page,
            `(() => {const r=document.querySelector('#result');if(r?.dataset.status==='failed')throw new Error(r.textContent);return window.lastLifeAudioActivation ? {audioActivation:true} : window.compactLabelCapture ? {game:window.compactLabelCapture.game} : r?.dataset.status==='passed' ? {done:true} : r?.dataset.stage && r.dataset.stage !== ${JSON.stringify(stage)} ? {stage:r.dataset.stage} : false;})()`,
            360000
        );
        if (status.done) {
            const ending = await browser.page.call("Runtime.evaluate", {
                expression: "JSON.stringify(window.endingPersistenceEvidence ?? null)",
                returnByValue: true
            });
            if (ending.result?.value && process.env.QUALIFICATION_EVIDENCE_DIR) {
                mkdirSync(process.env.QUALIFICATION_EVIDENCE_DIR, { recursive: true });
                writeFileSync(resolve(process.env.QUALIFICATION_EVIDENCE_DIR, "ending-first-render-matrix.json"), ending.result.value);
            }
            if (process.env.QUALIFICATION_EVIDENCE_DIR) {
                const counters = await browser.page.call("Runtime.evaluate", {
                    expression:
                        "JSON.stringify({map:window.mapCounterEvidence??null,healthyFinal:window.healthyFinalEvidence??null,awardMutants:window.healthyFinalMutationEvidence??null})",
                    returnByValue: true
                });
                writeFileSync(resolve(process.env.QUALIFICATION_EVIDENCE_DIR, "counter-parity-browser.json"), counters.result.value);
            }
            break;
        }
        if (status.stage) {
            assert.ok(!seenStages.has(status.stage) && seenStages.size < 11, "Browser suite stages must advance finitely");
            seenStages.add(status.stage);
            stage = status.stage;
            console.log(`Browser verification stage: ${stage} (360s bound)`);
            continue;
        }
        if (status.audioActivation) {
            const activation = await browser.page.call("Runtime.evaluate", {
                expression: "(() => { const a=window.lastLifeAudioActivation; delete window.lastLifeAudioActivation; return a.activate().then(a.resolve); })()",
                userGesture: true,
                awaitPromise: true
            });
            assert.ok(!activation.exceptionDetails, "Real user-gesture audio activation failed");
            console.log("Last-life real audio activation passed.");
            continue;
        }
        const dir = process.env.QUALIFICATION_EVIDENCE_DIR ?? resolve(tmpdir(), "native-input-labels-screenshots");
        mkdirSync(dir, { recursive: true });
        for (const [name, width, height] of [
            ["native", 1024, 960],
            ["mobile", 360, 640]
        ]) {
            await browser.page.call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
            const resized = await browser.page.call("Runtime.evaluate", {
                expression: `window.compactLabelCapture.resize(${width},${height})`,
                awaitPromise: true
            });
            assert.ok(!resized.exceptionDetails, "Mapping presentation resize");
            await new Promise((resolve) => setTimeout(resolve, 250));
            const shot = await browser.page.call("Page.captureScreenshot", { format: "png" });
            writeFileSync(resolve(dir, `${status.game}-compact-labels-${name}.png`), Buffer.from(shot.data, "base64"));
        }
        await browser.page.call("Emulation.clearDeviceMetricsOverride");
        await browser.page.call("Runtime.evaluate", { expression: "{const c=window.compactLabelCapture;delete window.compactLabelCapture;c.resolve();}" });
    }
    const output = await waitForExpression(
        browser.page,
        '(() => { const element = document.querySelector("#result"); if (element?.dataset.status === "failed") throw new Error(element.textContent || "Browser verification failed."); return element?.dataset.status === "passed" ? element.textContent : false; })()',
        // Full fade, arbitration, entry, and music matrices use real source-save/destroy/fresh-runtime restores.
        360_000
    );
    const evidence = await browser.page.call("Runtime.evaluate", { expression: "window.renderPauseEvidence", returnByValue: true });
    if (evidence.result?.value) {
        const dir = process.env.QUALIFICATION_EVIDENCE_DIR ?? resolve(tmpdir(), "jackal-render-pause");
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, "render-pause-performance.json"), JSON.stringify(evidence.result.value, null, 2) + "\n");
    }
    const stock = await browser.page.call("Runtime.evaluate", { expression: "window.bossEntryStockEvidence", returnByValue: true });
    if (stock.result?.value && process.env.QUALIFICATION_EVIDENCE_DIR) {
        mkdirSync(process.env.QUALIFICATION_EVIDENCE_DIR, { recursive: true });
        writeFileSync(resolve(process.env.QUALIFICATION_EVIDENCE_DIR, "boss-entry-stock-overlap.json"), JSON.stringify(stock.result.value, null, 2) + "\n");
    }
    console.log(focusedSuite ? `Focused ${focusedSuite} browser verification passed (full gameplay suite not requested).` : output);
    await verifySessionOwnership(appUrl, "Jackal");
} finally {
    await cleanupBrowser(browser);
    await stopChild(server);
}

async function verifySessionOwnership(url, gameName) {
    const executablePath = await findBrowser();
    const ownershipBrowser = await chromium.launch({
        executablePath,
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu-sandbox"]
    });

    try {
        const context = await ownershipBrowser.newContext({ viewport: { width: 800, height: 600 } });
        const first = await context.newPage();
        await first.goto(url, { waitUntil: "domcontentloaded" });

        const scalingLabel = first.locator(".setting-scaling-row > span").first();
        const primaryButton = first.locator(".start-button:not(:disabled)").first();
        await scalingLabel.waitFor({ state: "visible", timeout: 30_000 });
        await primaryButton.waitFor({ state: "visible", timeout: 30_000 });

        const messageReference = await readComputedStyles(scalingLabel, ["fontFamily", "fontSize", "fontWeight", "color"]);
        const buttonReference = await readComputedStyles(primaryButton, [
            "backgroundColor",
            "color",
            "fontFamily",
            "fontSize",
            "fontWeight",
            "borderRadius",
            "minHeight",
            "minWidth",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft"
        ]);

        const second = await context.newPage();
        await second.setViewportSize({ width: 360, height: 640 });
        await second.goto(url, { waitUntil: "domcontentloaded" });

        const ownershipMessage = second.locator(".session-ownership-message");
        const continueButton = second.getByRole("button", { name: "Continue Here" });
        await ownershipMessage.waitFor({ state: "visible", timeout: 30_000 });
        await continueButton.waitFor({ state: "visible", timeout: 30_000 });

        assert.equal(await ownershipMessage.textContent(), "Your game is open in another tab.");
        assert.equal(await continueButton.getAttribute("class"), "start-button");
        assert.deepEqual(await readComputedStyles(ownershipMessage, ["fontFamily", "fontSize", "fontWeight", "color"]), messageReference);
        assert.deepEqual(
            await readComputedStyles(continueButton, [
                "backgroundColor",
                "color",
                "fontFamily",
                "fontSize",
                "fontWeight",
                "borderRadius",
                "minHeight",
                "minWidth",
                "paddingTop",
                "paddingRight",
                "paddingBottom",
                "paddingLeft"
            ]),
            buttonReference
        );

        const wrapping = await ownershipMessage.evaluate((element) => {
            element.textContent = "The other tab has not released your game. Close it, then try again.";
            const style = globalThis.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
                clientWidth: element.clientWidth,
                display: style.display,
                documentClientWidth: globalThis.document.documentElement.clientWidth,
                documentScrollWidth: globalThis.document.documentElement.scrollWidth,
                height: rect.height,
                innerWidth: globalThis.innerWidth,
                left: rect.left,
                lineHeight: Number.parseFloat(style.lineHeight),
                right: rect.right,
                scrollWidth: element.scrollWidth,
                whiteSpace: style.whiteSpace
            };
        });

        assert.equal(wrapping.innerWidth, 360);
        assert.equal(wrapping.display, "block");
        assert.equal(wrapping.whiteSpace, "normal");
        assert.ok(wrapping.left >= -0.5, `Ownership message extends past the left viewport edge: ${wrapping.left}`);
        assert.ok(wrapping.right <= wrapping.innerWidth + 0.5, `Ownership message extends past the right viewport edge: ${wrapping.right}`);
        assert.ok(wrapping.scrollWidth <= wrapping.clientWidth + 1, "Ownership message has horizontal overflow.");
        assert.ok(wrapping.documentScrollWidth <= wrapping.documentClientWidth + 1, "Ownership screen causes horizontal page overflow.");
        assert.ok(
            Number.isFinite(wrapping.lineHeight) && wrapping.height > wrapping.lineHeight * 1.5,
            "Long ownership messages should wrap to multiple lines."
        );

        await continueButton.click();
        await first.waitForFunction(() => globalThis.document.querySelector(".session-ownership-message")?.textContent === "Your game moved to another tab.");

        const movedMessage = first.locator(".session-ownership-message");
        assert.deepEqual(await readComputedStyles(movedMessage, ["fontFamily", "fontSize", "fontWeight", "color"]), messageReference);
        assert.equal(await movedMessage.evaluate((element) => globalThis.getComputedStyle(element).display), "block");

        await second.locator(".setting-scaling-row > span").first().waitFor({ state: "visible", timeout: 30_000 });
        console.log(`${gameName} multi-tab ownership verification passed.`);
    } finally {
        await ownershipBrowser.close();
    }
}

async function readComputedStyles(locator, properties) {
    return locator.evaluate((element, names) => {
        const style = globalThis.getComputedStyle(element);
        return Object.fromEntries(names.map((name) => [name, style[name]]));
    }, properties);
}
