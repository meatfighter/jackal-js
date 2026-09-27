import assert from "node:assert/strict";
import { test } from "node:test";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";

test("explicit MAP phases cover POW conversion, target wait and song wait", async () => {
    const mod = await endingModules();
    try {
        for (let stage = 0; stage < 5; stage++) {
            for (const powCount of [0, 1, 3, 10]) {
                const baseScore = 999999;
                const f = endingFixture(mod, { stage, score: baseScore });
                f.main.friendlySoldiersPickedUp = powCount;
                f.main.reconcileStateAfterRestore();
                let songPolls = 0;
                f.main.isSongPlaying = () => ++songPolls <= 3;
                f.enter("MAP");
                const seen = new Set();
                const checkpoints = new Map();
                let waitingAtTargetWithPows = false;
                let ticks = 0;
                while (f.main.mode !== null) {
                    const s = f.validate();
                    assert.equal(s.modeId, "MAP");
                    const state = s.modeFields.state;
                    seen.add(state);
                    if (!checkpoints.has(state)) checkpoints.set(state, structuredClone(s));
                    if (f.main.mode.jeepY === f.main.mode.targetJeepY && f.main.friendlySoldiersPickedUp > 0) waitingAtTargetWithPows = true;
                    if (ticks % 17 === 0) {
                        f.render();
                        f.validate();
                    }
                    f.tick();
                    assert.ok(++ticks < 10000, "finite production MAP progression");
                }
                assert.deepEqual([...seen].sort(), [0, 1, 2, 3, 4]);
                assert.equal(f.main.score, baseScore + powCount * 2000);
                assert.equal(f.main.friendlySoldiersPickedUp, 0);
                assert.equal(f.main.stageIndex, stage + 1);
                assert.equal(songPolls, 4, "three playing responses then actual exit branch");
                assert.ok(f.actions.includes(mod.Modes.GAME));
                if (stage === 0 && powCount === 10) assert.equal(waitingAtTargetWithPows, true);
                // Production codec/mode reconstruction, with explicitly doubled Node resource boundaries.
                for (const saved of checkpoints.values()) {
                    const restored = endingFixture(mod, { stage });
                    restored.serializer.restoreStandaloneModeSnapshot(restored.main, restored.gc, saved);
                    restored.validate();
                    restored.render();
                    for (let n = 0; n < 3 && restored.main.mode !== null; n++) {
                        restored.tick();
                        if (restored.main.mode !== null) restored.validate();
                    }
                }
            }
        }
    } finally {
        await mod.server.close();
    }
});
