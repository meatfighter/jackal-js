import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createServer } from "vite";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
    root: resolve(rootDir, "pwa"),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
});

try {
    const { isWithinGameStateValidationBudget } = await server.ssrLoadModule("/src/jackal/persistence/GameStateSnapshotValidator.ts");

    test("Jackal snapshot validation budget accepts ordinary bounded object graphs", () => {
        assert.equal(
            isWithinGameStateValidationBudget({
                version: 15,
                fields: Array.from({ length: 128 }, (_, index) => ({ index, name: "entity-" + index }))
            }),
            true
        );
    });

    test("Jackal snapshot validation budget rejects cyclic object graphs", () => {
        const cyclic = {};
        cyclic.self = cyclic;
        assert.equal(isWithinGameStateValidationBudget(cyclic), false);
    });

    test("Jackal snapshot validation budget rejects aggregate container exhaustion", () => {
        const containers = Array.from({ length: 65_536 }, () => ({}));
        assert.equal(isWithinGameStateValidationBudget(containers), false);
    });

    test("Jackal snapshot validation budget rejects aggregate child exhaustion", () => {
        const children = new Array(524_289).fill(null);
        assert.equal(isWithinGameStateValidationBudget(children), false);
    });

    test("Jackal snapshot validation budget rejects aggregate string exhaustion", () => {
        assert.equal(isWithinGameStateValidationBudget("x".repeat(1_500_001)), false);
    });
} finally {
    await server.close();
}
