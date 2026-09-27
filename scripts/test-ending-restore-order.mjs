import assert from "node:assert/strict";
import { test } from "node:test";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";

async function exercise(transforms = {}) {
    const mod = await endingModules(transforms);
    try {
        for (const score of [0, 123450, 999999, 1000000, 2147483647])
            for (const id of ["SUNSET", "HARD_ENDING"]) {
                const source = endingFixture(mod, { score, hard: id === "HARD_ENDING" });
                mod.CutsceneSequence.restoreState(["WE_MADE_IT", "HERE"]);
                source.enter(id);
                for (let n = 0; n < 40; n++) source.tick();
                const snapshot = source.validate();
                source.main.scoreStr = "888888";
                source.serializer.restoreStandaloneModeSnapshot(source.main, source.gc, snapshot);
                assert.equal(
                    id === "SUNSET" ? source.main.mode.credits.at(-1)[0] : source.main.mode.finalScore,
                    "final score: " + String(score).padStart(6, "0"),
                    "same-Main restore ignores a different stale nonzero display cache"
                );

                const fresh = endingFixture(mod, { score: 1, hard: false });
                fresh.main.scoreStr = "777777";
                const events = [];
                const reconcile = fresh.main.reconcileStateAfterRestore.bind(fresh.main);
                fresh.main.reconcileStateAfterRestore = () => {
                    events.push("reconcile");
                    reconcile();
                };
                const create = fresh.serializer.createStandaloneMode.bind(fresh.serializer);
                fresh.serializer.createStandaloneMode = (modeId) => {
                    const mode = create(modeId);
                    const init = mode.init.bind(mode);
                    mode.init = (main, gc) => {
                        events.push("init");
                        assert.equal(main.scoreStr, String(score).padStart(6, "0"), "derived Main cache reconciled before init");
                        init(main, gc);
                    };
                    mode.update = () => assert.fail("restore must not update mode");
                    return mode;
                };
                for (const name of ["setMode", "gainExtraLife", "addPoints"]) fresh.main[name] = () => assert.fail(`restore called ${name}`);
                mod.CutsceneSequence.restoreState(["YEAH"]);
                const clear = fresh.main.clearInputPressedRecords;
                fresh.main.clearInputPressedRecords = () => {
                    assert.deepEqual(mod.CutsceneSequence.captureState(), ["YEAH"], "bag installed last");
                    clear();
                };
                fresh.serializer.restoreStandaloneModeSnapshot(fresh.main, fresh.gc, snapshot);
                assert.deepEqual(events, ["reconcile", "init", "reconcile"]);
                assert.equal(fresh.main.score, score);
                assert.equal(fresh.main.scoreStr, String(score).padStart(6, "0"));
                const text = "final score: " + String(score).padStart(6, "0");
                if (id === "SUNSET") assert.equal(fresh.main.mode.credits.at(-1)[0], text);
                else {
                    assert.equal(fresh.main.mode.finalScore, text);
                    assert.equal(fresh.main.mode.finalScoreX, (1024 - text.length * 32) >> 1);
                }
                const recapture = fresh.validate();
                delete recapture.savedAt;
                const expected = structuredClone(snapshot);
                delete expected.savedAt;
                assert.deepEqual(recapture, expected, "recapture including saved fade/fields/RNG/bag");
                assert.equal(fresh.main.fadeListener, fresh.main.fading ? fresh.main.mode : null);
                mod.CutsceneSequence.restoreState(["YEAH"]);
                fresh.main.resetNextFrameTime = () => {
                    throw Error("injected before final bag publication");
                };
                assert.throws(() => fresh.serializer.restoreStandaloneModeSnapshot(fresh.main, fresh.gc, snapshot), /injected/);
                assert.deepEqual(mod.CutsceneSequence.captureState(), ["YEAH"]);
            }
    } finally {
        await mod.server.close();
    }
}
test("actual standalone reconstruction reconciles before init once, restores fields and publishes bag last", () => exercise());
test("restore-order regression mutant fails derived-cache assertion", async () => {
    await assert.rejects(
        exercise({
            "persistence/JackalGameStateSerializer": (s) => {
                const a = "main.reconcileStateAfterRestore();\n        const mode = this.createStandaloneMode";
                assert.ok(s.includes(a));
                return s.replace(a, "const mode = this.createStandaloneMode");
            }
        }),
        (e) => e.code === "ERR_ASSERTION" && e.message.includes("derived Main cache")
    );
    await exercise();
});
