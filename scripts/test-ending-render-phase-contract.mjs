import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";
test("every ending instance field has exactly one explicit durable/derived/runtime policy", async () => {
    const mod = await endingModules();
    try {
        for (const [name, descriptor, derived] of [
            ["SunsetMode", "SUNSET_MODE_FIELD_NAMES", ["credits"]],
            ["HardEndingMode", "HARD_ENDING_MODE_FIELD_NAMES", ["finalScore", "finalScoreX"]]
        ]) {
            const source = ts.createSourceFile(name, readFileSync(`pwa/src/jackal/${name}.ts`, "utf8"), ts.ScriptTarget.Latest, true);
            const cls = source.statements.find((n) => ts.isClassDeclaration(n) && n.name.text === name);
            const members = cls.members
                .filter((n) => ts.isPropertyDeclaration(n) && !n.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword))
                .map((n) => n.name.getText(source));
            const classified = [...mod.fields[descriptor], ...derived, "main", "gc", "input"];
            assert.equal(new Set(classified).size, classified.length, "no duplicate field authority");
            assert.deepEqual([...members].sort(), classified.sort());
        }
        const cutscene = readFileSync("pwa/src/jackal/CutsceneSequence.ts", "utf8");
        const cutsceneAst = ts.createSourceFile("CutsceneSequence.ts", cutscene, ts.ScriptTarget.Latest, true);
        const cutsceneClass = cutsceneAst.statements.find((n) => ts.isClassDeclaration(n));
        const staticFields = cutsceneClass.members.filter((n) => ts.isPropertyDeclaration(n));
        assert.deepEqual(
            staticFields.map((n) => n.name.getText(cutsceneAst)),
            ["modes"],
            "every module-lifetime field has an explicit policy"
        );
        assert.ok(staticFields[0].modifiers.some((n) => n.kind === ts.SyntaxKind.StaticKeyword));

        const serializer = readFileSync("pwa/src/jackal/persistence/JackalGameStateSerializer.ts", "utf8");
        assert.match(serializer, /remainingCutscenes: CutsceneSequence.captureState\(\)/);
        assert.equal(serializer.split("CutsceneSequence.restoreState(snapshot.remainingCutscenes)").length - 1, 2);
    } finally {
        await mod.server.close();
    }
});
test("rotor advances once per eligible render, sun advances only on update, and phase restores exactly", async () => {
    const mod = await endingModules();
    try {
        for (const rotor of [0, -30, -60]) {
            const f = endingFixture(mod);
            f.enter("SUNSET");
            f.main.mode.rotorAngle = rotor;
            const mode = f.main.mode;
            const before = f.capture();
            f.tick();
            assert.equal(mode.rotorAngle, rotor);
            assert.equal(mode.sunPhase, (before.modeFields.sunPhase + mod.SunsetMode.SUN_PHASE_ADVANCE) % mod.SunsetMode.SUN_PHASE_STEPS);
            const snapshot = f.validate();
            const restored = endingFixture(mod);
            restored.serializer.restoreStandaloneModeSnapshot(restored.main, restored.gc, snapshot);
            for (let n = 0; n < 6; n++) {
                f.render();
                restored.render();
                assert.equal(mode.rotorAngle, restored.main.mode.rotorAngle);
                assert.equal(mode.rotorAngle, [0, -30, -60][([0, -30, -60].indexOf(rotor) + n + 1) % 3]);
                assert.equal(f.main.score, 123450);
                assert.equal(mode.lineLength, snapshot.modeFields.lineLength);
            }
        }
        const f = endingFixture(mod);
        f.enter("SUNSET");
        while (f.main.mode.state !== mod.SunsetMode.STATE_PAUSED_2) f.tick();
        for (let i = 0; i < 3; i++) f.render();
        assert.equal(f.main.mode.rotorAngle, 0);
    } finally {
        await mod.server.close();
    }
});
