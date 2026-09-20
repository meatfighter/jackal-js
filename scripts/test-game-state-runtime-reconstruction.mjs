import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("Jackal v15 Main save fields exclude runtime clocks, caches, close state and dead controller flags", () => {
    const fields = readFileSync(resolve(rootDir, "pwa/src/jackal/persistence/GameStateFields.ts"), "utf8");
    const mainFields = fields.match(/export const MAIN_FIELD_NAMES[\s\S]*?\);/)?.[0] ?? "";

    for (const name of [
        "loadIndex",
        "nextFrameTime",
        "extraLivesStr",
        "scoreStr",
        "closeRequestedFlag",
        "controllerGrenadePressed",
        "controllerGunPressed",
        "unitVector"
    ]) {
        assert.doesNotMatch(mainFields, new RegExp(`"${name}"`));
    }
});

test("Jackal Main explicitly reconstructs removed runtime and derived fields after restore", () => {
    const source = readFileSync(resolve(rootDir, "pwa/src/jackal/Main.ts"), "utf8");
    const start = source.indexOf("public reconcileStateAfterRestore");
    const end = source.indexOf("public resetNextFrameTime", start);
    const method = source.slice(start, end);

    assert.match(method, /this\.extraLivesStr = this\.extraLives\.toString\(\)/);
    assert.match(method, /this\.scoreStr = Main\.formatScore\(this\.score\)/);
    assert.match(method, /this\.closeRequestedFlag = false/);
    assert.match(method, /this\.controllerGrenadePressed = false/);
    assert.match(method, /this\.controllerGunPressed = false/);
    assert.match(method, /this\.unitVector\.fill\(0\)/);
});

test("Jackal serializer reconciles Main and resets frame time on both restore paths", () => {
    const source = readFileSync(resolve(rootDir, "pwa/src/jackal/persistence/JackalGameStateSerializer.ts"), "utf8");
    const gameRestore = source.slice(source.indexOf("private restoreGameModeSnapshot"), source.indexOf("private restoreStandaloneModeSnapshot"));
    const modeRestore = source.slice(source.indexOf("private restoreStandaloneModeSnapshot"), source.indexOf("private createModeContext"));

    for (const restore of [gameRestore, modeRestore]) {
        assert.match(restore, /main\.reconcileStateAfterRestore\(\)/);
        assert.match(restore, /main\.resetNextFrameTime\(\)/);
        assert.match(restore, /main\.clearInputPressedRecords\(\)/);
    }
});
