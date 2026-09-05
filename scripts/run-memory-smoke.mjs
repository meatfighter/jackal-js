import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { cleanupBrowser, launchBrowser, stopChild, waitForExpression, waitForHttpServer } from "./browser-test-utils.mjs";
import { rootDir } from "./build-utils.mjs";

const MIB = 1024 * 1024;
const port = 5199;
const url = `http://127.0.0.1:${port}/memory-smoke.html`;
const viteBin = resolve(rootDir, "node_modules", "vite", "bin", "vite.js");
const warmupCycles = readPositiveInteger("JACKAL_MEMORY_WARMUP_CYCLES", 5);
const measuredCycles = readPositiveInteger("JACKAL_MEMORY_CYCLES", 20);

function readPositiveInteger(name, fallback) {
    const value = process.env[name];
    if (value === undefined) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`${name} must be a positive integer.`);
    }
    return parsed;
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function slope(values) {
    if (values.length < 2) {
        return 0;
    }
    const meanX = (values.length - 1) / 2;
    const meanY = values.reduce((sum, value) => sum + value, 0) / values.length;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < values.length; i++) {
        const dx = i - meanX;
        numerator += dx * (values[i] - meanY);
        denominator += dx * dx;
    }
    return denominator === 0 ? 0 : numerator / denominator;
}

async function installListenerTracker(page) {
    const expression = `(() => {
        if (globalThis.__jackalListenerTracker) return true;
        const originalAdd = EventTarget.prototype.addEventListener;
        const originalRemove = EventTarget.prototype.removeEventListener;
        const records = [];
        const captureOf = (options) => typeof options === "boolean" ? options : Boolean(options?.capture);
        const compact = () => {
            for (let i = records.length - 1; i >= 0; i--) {
                if (!records[i].target.deref() || !records[i].listener.deref()) records.splice(i, 1);
            }
        };
        const targetName = (target) => {
            if (target === window) return "Window";
            if (target === document) return "Document";
            if (target === window.visualViewport) return "VisualViewport";
            return target?.constructor?.name ?? "EventTarget";
        };
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (listener) {
                compact();
                const capture = captureOf(options);
                const exists = records.some((record) =>
                    record.target.deref() === this && record.listener.deref() === listener && record.type === String(type) && record.capture === capture
                );
                if (!exists) {
                    const stack = new Error().stack?.split("\\n").slice(2, 5).map((line) => line.trim()).join(" <- ") ?? "";
                    records.push({ target: new WeakRef(this), listener: new WeakRef(listener), type: String(type), capture, stack });
                }
            }
            return originalAdd.call(this, type, listener, options);
        };
        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            if (listener) {
                const capture = captureOf(options);
                for (let i = records.length - 1; i >= 0; i--) {
                    const record = records[i];
                    if (record.target.deref() === this && record.listener.deref() === listener && record.type === String(type) && record.capture === capture) {
                        records.splice(i, 1);
                    }
                }
            }
            return originalRemove.call(this, type, listener, options);
        };
        globalThis.__jackalListenerTracker = {
            summary() {
                compact();
                const groups = {};
                for (const record of records) {
                    const target = record.target.deref();
                    const listener = record.listener.deref();
                    if (!target || !listener) continue;
                    const key = targetName(target) + ":" + record.type + " @ " + record.stack;
                    groups[key] = (groups[key] ?? 0) + 1;
                }
                return { total: Object.values(groups).reduce((sum, count) => sum + count, 0), groups };
            }
        };
        return true;
    })()`;
    const evaluation = await page.call("Runtime.evaluate", { expression, returnByValue: true });
    if (evaluation.exceptionDetails) {
        throw new Error(`Listener tracker installation failed: ${JSON.stringify(evaluation.exceptionDetails)}`);
    }
}

async function readListenerTracker(page) {
    const evaluation = await page.call("Runtime.evaluate", {
        expression: "globalThis.__jackalListenerTracker.summary()",
        returnByValue: true
    });
    if (evaluation.exceptionDetails) {
        throw new Error(`Listener tracker read failed: ${JSON.stringify(evaluation.exceptionDetails)}`);
    }
    return evaluation.result?.value ?? { total: 0, groups: {} };
}

async function startCycle(page, index) {
    const expression = `(() => {
        globalThis.__jackalMemorySmokeCycle = { done: false, error: null };
        Promise.resolve(globalThis.__jackalMemorySmoke.runCycle(${index})).then(
            () => { globalThis.__jackalMemorySmokeCycle.done = true; },
            (error) => { globalThis.__jackalMemorySmokeCycle.error = error?.stack ?? error?.message ?? String(error); }
        );
        return true;
    })()`;
    await page.call("Runtime.evaluate", { expression, returnByValue: true });
    await waitForExpression(
        page,
        `(() => {
            const cycle = globalThis.__jackalMemorySmokeCycle;
            if (cycle?.error) throw new Error(cycle.error);
            return cycle?.done === true;
        })()`,
        60_000
    );
}

async function destroyCycle(page) {
    const evaluation = await page.call("Runtime.evaluate", {
        expression: "globalThis.__jackalMemorySmoke.destroyCycle(); true;",
        returnByValue: true
    });
    if (evaluation.exceptionDetails) {
        throw new Error(`Memory smoke destroy failed: ${JSON.stringify(evaluation.exceptionDetails)}`);
    }
}

async function collectSample(page, cycle) {
    await page.call("HeapProfiler.collectGarbage");
    await new Promise((resolve) => setTimeout(resolve, 75));
    await page.call("HeapProfiler.collectGarbage");
    const heap = await page.call("Runtime.getHeapUsage");
    const dom = await page.call("Memory.getDOMCounters");
    const trackedListeners = await readListenerTracker(page);
    return {
        cycle,
        usedHeap: heap.usedSize,
        embedderHeap: heap.embedderHeapUsedSize ?? 0,
        backingStorage: heap.backingStorageSize ?? 0,
        documents: dom.documents,
        nodes: dom.nodes,
        listeners: dom.jsEventListeners,
        trackedListeners
    };
}

function growingListenerGroups(samples) {
    const first = samples[0]?.trackedListeners.groups ?? {};
    const last = samples.at(-1)?.trackedListeners.groups ?? {};
    return Object.entries(last)
        .map(([key, count]) => ({ key, growth: count - (first[key] ?? 0), count }))
        .filter((entry) => entry.growth > 0)
        .sort((a, b) => b.growth - a.growth || b.count - a.count);
}

function summarize(samples) {
    const windowSize = Math.min(5, Math.max(2, Math.floor(samples.length / 4)));
    const first = samples.slice(0, windowSize);
    const last = samples.slice(-windowSize);
    const firstHeap = median(first.map((sample) => sample.usedHeap));
    const lastHeap = median(last.map((sample) => sample.usedHeap));
    const heapGrowth = lastHeap - firstHeap;
    const heapSlope = slope(samples.map((sample) => sample.usedHeap));
    const heapGrowthLimit = Math.max(8 * MIB, firstHeap * 0.25);

    const firstListeners = median(first.map((sample) => sample.listeners));
    const lastListeners = median(last.map((sample) => sample.listeners));
    const listenerGrowth = lastListeners - firstListeners;
    const listenerSlope = slope(samples.map((sample) => sample.listeners));

    const firstNodes = median(first.map((sample) => sample.nodes));
    const lastNodes = median(last.map((sample) => sample.nodes));
    const nodeGrowth = lastNodes - firstNodes;
    const nodeSlope = slope(samples.map((sample) => sample.nodes));

    const firstDocuments = median(first.map((sample) => sample.documents));
    const lastDocuments = median(last.map((sample) => sample.documents));
    const documentGrowth = lastDocuments - firstDocuments;
    const documentSlope = slope(samples.map((sample) => sample.documents));

    const findings = [];
    if (heapGrowth > heapGrowthLimit && heapSlope > 256 * 1024) {
        findings.push(`post-GC JS heap grew ${(heapGrowth / MIB).toFixed(2)} MiB with a ${(heapSlope / 1024).toFixed(1)} KiB/cycle slope`);
    }
    if (listenerGrowth >= Math.max(5, measuredCycles * 0.5) && listenerSlope > 0.5) {
        findings.push(`event listener count grew ${listenerGrowth.toFixed(0)} with a ${listenerSlope.toFixed(2)}/cycle slope`);
    }
    if (nodeGrowth > 200 && nodeSlope > 5) {
        findings.push(`DOM node count grew ${nodeGrowth.toFixed(0)} with a ${nodeSlope.toFixed(2)}/cycle slope`);
    }
    if (documentGrowth > 2 && documentSlope > 0.1) {
        findings.push(`document count grew ${documentGrowth.toFixed(0)} with a ${documentSlope.toFixed(2)}/cycle slope`);
    }

    return {
        firstHeap,
        lastHeap,
        heapSlope,
        firstListeners,
        lastListeners,
        listenerSlope,
        firstNodes,
        lastNodes,
        firstDocuments,
        lastDocuments,
        findings
    };
}

const server = spawn(process.execPath, [viteBin, "--config", "pwa/vite.config.ts", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"]
});
let browser = null;
try {
    await waitForHttpServer(server, url);
    browser = await launchBrowser(url, rootDir, "jackal-memory-");
    await waitForExpression(
        browser.page,
        '(() => { const element = document.querySelector("#result"); if (element?.dataset.status === "failed") throw new Error(element.textContent || "Memory smoke fixture failed."); return element?.dataset.status === "ready"; })()',
        60_000
    );
    await installListenerTracker(browser.page);

    console.log(`Warming up ${warmupCycles} Jackal browser sessions...`);
    for (let cycle = 0; cycle < warmupCycles; cycle++) {
        await startCycle(browser.page, cycle);
        await destroyCycle(browser.page);
        await browser.page.call("HeapProfiler.collectGarbage");
    }

    console.log(`Measuring ${measuredCycles} post-destroy sessions...`);
    const samples = [];
    for (let cycle = 0; cycle < measuredCycles; cycle++) {
        await startCycle(browser.page, warmupCycles + cycle);
        await destroyCycle(browser.page);
        const sample = await collectSample(browser.page, cycle + 1);
        samples.push(sample);
        console.log(
            `  ${String(cycle + 1).padStart(2, " ")}: heap ${(sample.usedHeap / MIB).toFixed(2)} MiB, ` +
                `embedder ${(sample.embedderHeap / MIB).toFixed(2)} MiB, nodes ${sample.nodes}, listeners ${sample.listeners}, ` +
                `tracked ${sample.trackedListeners.total}`
        );
    }

    const summary = summarize(samples);
    console.log(`Post-GC heap median: ${(summary.firstHeap / MIB).toFixed(2)} MiB -> ${(summary.lastHeap / MIB).toFixed(2)} MiB`);
    console.log(`Heap trend: ${(summary.heapSlope / 1024).toFixed(1)} KiB/cycle`);
    console.log(`Event listeners median: ${summary.firstListeners.toFixed(0)} -> ${summary.lastListeners.toFixed(0)} (${summary.listenerSlope.toFixed(2)}/cycle)`);
    console.log(`DOM nodes median: ${summary.firstNodes.toFixed(0)} -> ${summary.lastNodes.toFixed(0)}`);
    console.log(`Documents median: ${summary.firstDocuments.toFixed(0)} -> ${summary.lastDocuments.toFixed(0)}`);

    const growingGroups = growingListenerGroups(samples);
    if (growingGroups.length > 0) {
        console.log("Growing listener registrations observed by the weak listener tracker:");
        for (const entry of growingGroups.slice(0, 10)) {
            console.log(`  +${entry.growth} (${entry.count} active): ${entry.key}`);
        }
    }

    if (summary.findings.length > 0) {
        throw new Error(`Memory smoke test found clear sustained growth:\n- ${summary.findings.join("\n- ")}`);
    }
    console.log("Jackal memory smoke test passed: no clear sustained post-destroy heap/DOM/listener growth detected.");
} finally {
    if (browser !== null) {
        try {
            await browser.page.call("Runtime.evaluate", { expression: "globalThis.__jackalMemorySmoke?.cleanup(); true;", returnByValue: true });
        } catch {
            // Browser cleanup below still terminates the isolated test profile.
        }
    }
    await cleanupBrowser(browser);
    await stopChild(server);
}
