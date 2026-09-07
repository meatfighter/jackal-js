import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

async function loadKonamiCode() {
    const sourcePath = join(rootDir, "pwa", "src", "jackal", "KonamiCode.ts");
    const source = readFileSync(sourcePath, "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            useDefineForClassFields: false,
            sourceMap: false,
            removeComments: true
        },
        fileName: sourcePath
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

function makeInput() {
    const state = {
        up: false,
        down: false,
        left: false,
        right: false,
        fire: false,
        shoot: false,
        cleared: 0
    };

    return {
        state,
        input: {
            isUp: () => state.up,
            isDown: () => state.down,
            isLeft: () => state.left,
            isRight: () => state.right,
            isFire: () => state.fire,
            isShoot: () => state.shoot,
            clearKeyPressedRecord: () => {
                state.cleared++;
            }
        }
    };
}

function pressAndRelease(konamiCode, state, control) {
    state[control] = true;
    konamiCode.update();
    state[control] = false;
    konamiCode.update();
}

test("completing the Konami code consumes the final buffered press", async () => {
    const { KonamiCode } = await loadKonamiCode();
    const { state, input } = makeInput();
    let soundsPlayed = 0;
    const main = {
        input,
        weaponUpgradeSound: {},
        playSoundAlways() {
            soundsPlayed++;
        }
    };
    const konamiCode = new KonamiCode(main);

    for (const control of ["up", "up", "down", "down", "left", "right", "left", "right", "shoot"]) {
        pressAndRelease(konamiCode, state, control);
    }

    assert.equal(konamiCode.enabled, false);
    assert.equal(state.cleared, 0);

    state.fire = true;
    konamiCode.update();

    assert.equal(konamiCode.enabled, true);
    assert.equal(state.cleared, 1, "The final controller press must not remain buffered for menu confirmation.");
    assert.equal(soundsPlayed, 1);

    state.fire = false;
    konamiCode.update();
    assert.equal(state.cleared, 1);
});
