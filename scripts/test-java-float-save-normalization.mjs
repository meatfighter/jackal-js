import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

async function loadJavaFloatState() {
    const path = join(rootDir, "pwa", "src", "jackal", "persistence", "JavaFloatState.ts");
    const source = readFileSync(path, "utf8")
        .replace(/^import \{ javaFloat \} from .*;\s*$/m, "const javaFloat = Math.fround;")
        .replace(/^import type .*;\s*$/m, "");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            useDefineForClassFields: false,
            sourceMap: false,
            removeComments: true
        },
        fileName: path
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

test("legacy binary64 save values are normalized at Java float storage boundaries", async () => {
    const state = await loadJavaFloatState();

    const tank = {
        x: 1 / 3,
        directionX: 0.9,
        moveSteps: 17,
        player: { id: 1 }
    };
    state.normalizeJavaFloatFields(tank, state.GAME_ELEMENT_JAVA_FLOAT_FIELDS.BrownTank);
    assert.equal(tank.x, Math.fround(1 / 3));
    assert.equal(tank.directionX, Math.fround(0.9));
    assert.equal(tank.moveSteps, 17);
    assert.deepEqual(tank.player, { id: 1 });

    const main = { unitVector: [1 / 3, 0.9] };
    state.normalizeJavaFloatFields(main, state.MAIN_JAVA_FLOAT_FIELDS);
    assert.deepEqual(main.unitVector, [Math.fround(1 / 3), Math.fround(0.9)]);

    const plane = { x: -950.0000000001, y: -400, z: -14.999999999, angle: -29.999999999, left: true };
    state.normalizeJavaFloatFields(plane, state.JEEP_YEAH_PLANE_JAVA_FLOAT_FIELDS);
    assert.equal(plane.x, Math.fround(-950.0000000001));
    assert.equal(plane.z, Math.fround(-14.999999999));
    assert.equal(plane.angle, Math.fround(-29.999999999));
    assert.equal(plane.left, true);
});

test("serializer applies float normalization to every persisted mechanics family", () => {
    const source = readFileSync(join(rootDir, "pwa", "src", "jackal", "persistence", "JackalGameStateSerializer.ts"), "utf8");
    for (const marker of [
        "MAIN_JAVA_FLOAT_FIELDS",
        "GAME_MODE_JAVA_FLOAT_FIELDS",
        "PLAYER_JAVA_FLOAT_FIELDS",
        "GAME_ELEMENT_JAVA_FLOAT_FIELDS[entitySnapshot.type]",
        "STANDALONE_MODE_JAVA_FLOAT_FIELDS[snapshot.modeId]",
        "MENU_JAVA_FLOAT_FIELDS",
        "JEEP_YEAH_PLANE_JAVA_FLOAT_FIELDS",
        "JEEP_YEAH_EXPLOSION_JAVA_FLOAT_FIELDS",
        "JEEP_YEAH_BULLET_JAVA_FLOAT_FIELDS",
        "normalizeJavaFloatFields(target, javaFloatFields)"
    ]) {
        assert.ok(source.includes(marker), `Missing save normalization integration: ${marker}`);
    }
});
