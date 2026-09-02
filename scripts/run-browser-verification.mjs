import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { rootDir } from "./build-utils.mjs";

const port = 5197;
const url = `http://127.0.0.1:${port}/browser-verify.html`;
const candidates = [
    process.env.CHROMIUM_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
].filter(Boolean);

async function findBrowser() {
    for (const candidate of candidates) {
        try {
            await access(candidate);
            return candidate;
        } catch {
            // Try the next known browser location.
        }
    }
    throw new Error("Chromium was not found. Set CHROMIUM_PATH to a Chrome or Chromium executable.");
}

async function waitForServer(child) {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error(`Vite browser-verification server exited with code ${child.exitCode}.`);
        }
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
            if (response.ok) {
                return;
            }
        } catch {
            // Vite may not be listening yet.
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
    throw new Error("Vite browser-verification server did not start within 20 seconds.");
}

function collect(child) {
    return new Promise((resolveResult, rejectResult) => {
        let stdout = "";
        let stderr = "";
        child.stdout?.on("data", (chunk) => (stdout += String(chunk)));
        child.stderr?.on("data", (chunk) => (stderr += String(chunk)));
        child.once("error", rejectResult);
        child.once("exit", (code, signal) => resolveResult({ code, signal, stdout, stderr }));
    });
}

async function stop(child) {
    if (child.exitCode !== null) {
        return;
    }
    child.kill("SIGTERM");
    await Promise.race([collect(child), new Promise((resolveDelay) => setTimeout(resolveDelay, 3000))]);
    if (child.exitCode === null) {
        child.kill("SIGKILL");
    }
}

const viteBin = resolve(rootDir, "node_modules", "vite", "bin", "vite.js");
const server = spawn(process.execPath, [viteBin, "--config", "pwa/vite.config.ts", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"]
});

try {
    await waitForServer(server);
    const browser = await findBrowser();
    const chrome = spawn(
        browser,
        ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu-sandbox", "--virtual-time-budget=15000", "--dump-dom", url],
        { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"] }
    );
    const result = await collect(chrome);
    if (result.code !== 0) {
        throw new Error(`Chromium browser verification failed (code=${result.code}, signal=${result.signal}).
${result.stderr}`);
    }
    if (!/data-status=["']passed["']/.test(result.stdout)) {
        throw new Error(`Jackal browser verification did not pass.
${result.stdout}
${result.stderr}`);
    }
    console.log("Jackal real-browser atlas and buffered-scaling verification passed.");
} finally {
    await stop(server);
}
