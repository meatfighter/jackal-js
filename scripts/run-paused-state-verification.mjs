/* global window */
import { createServer } from "vite";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { pausedStateMutationPlugin } from "./paused-state-mutation-plugin.mjs";
const vite = await createServer({
    configFile: resolve("pwa/vite.config.ts"),
    server: { host: "127.0.0.1", port: 0, watch: null, hmr: false },
    plugins: [pausedStateMutationPlugin()],
    logLevel: "warn"
});
try {
    await vite.listen();
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}/game-mode-persistence.html`);
        await page.waitForFunction(() => window.gameModePersistence);
        await page.mouse.click(1, 1);
        await page.evaluate(() => window.gameModePersistence.pauseAudioMatrix());
        console.log("Loaded paused audio contract and actual Main pending-song witness passed");
    } finally {
        await browser.close();
    }
} finally {
    await vite.close();
}
