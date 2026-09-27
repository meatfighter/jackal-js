import assert from "node:assert/strict";
import { test } from "node:test";
import { memoryStorage } from "./persistence-test-loader.mjs";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";
test("semantically invalid standalone saves are repeatable non-destructive load misses", async () => {
    const mod = await endingModules();
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    try {
        const storage = await mod.server.ssrLoadModule("/src/jackal/persistence/GameStateStorage.ts");
        const { JackalGameStateStore } = await mod.server.ssrLoadModule("/src/jackal/persistence/JackalGameStateStore.ts");
        const mem = memoryStorage();
        Object.defineProperty(globalThis, "localStorage", { configurable: true, value: mem });
        const cases = {
            SUNSET: {
                creditsIndex: [-1, 0.5, 999],
                lineIndex: [999],
                lineLength: [-1, 0.5, 999],
                sunPhase: [-1, 920, 0.5],
                rotorAngle: [1, -90],
                helicopterZ: [mod.SunsetMode.Z0],
                helicopterDelay: [-1, 99999],
                state: [8, 9]
            },
            HARD_ENDING: { cardIndex: [999], lineIndex: [999], lineLength: [-1, 999], rumble: [-1, 999], state: [9], finalScore: ["stale"], finalScoreX: [0] },
            INTRO: { soldierSet: [-1, 2], namesIndex: [999], nameLength: [999], state: [11] },
            HERE: { jeepHereX: [-1, 2000], state: [4] },
            YEAH: { yeah: [false], smokeX: [64], bulletDelay: [0], state: [3] },
            WE_MADE_IT: { yeah: [true] },
            MAP: { targetJeepY: [-1], jeepY: [-1], soldierDelay: [0], state: [5] },
            INTRO_MAP: { delay: [0], state: [3] },
            OPTIONS: { selectedIndex: [99], state: [3] }
        };
        for (const [id, fields] of Object.entries(cases)) {
            const f = endingFixture(mod, { stage: ["SUNSET", "HARD_ENDING"].includes(id) ? 5 : 0, hard: id === "HARD_ENDING" });
            f.enter(id);
            const valid = f.validate();
            const changes = [];
            for (const [name, values] of Object.entries(fields))
                for (const value of values)
                    changes.push((s) => {
                        s.modeFields[name] = value;
                    });
            changes.push((s) => {
                s.mainFields.fading = !s.mainFields.fading;
            });
            for (const value of [undefined, null, ["HERE", "YEAH"], ["YEAH", "YEAH"], [0]])
                changes.push((s) => {
                    if (value === undefined) delete s.remainingCutscenes;
                    else s.remainingCutscenes = value;
                });
            if (id === "YEAH")
                for (const name of ["leftPlane", "rightPlane", "fireLeft", "fireRight", "explosion"])
                    changes.push((s) => {
                        s.modeExtra.jeepYeah[name] = null;
                    });
            if (["MAP", "HERE", "YEAH", "WE_MADE_IT"].includes(id))
                changes.push((s) => {
                    s.mainFields.stageIndex = 5;
                });
            for (const mutate of changes) {
                const bad = structuredClone(valid);
                mutate(bad);
                assert.equal(mod.validator.isSupportedGameStateSnapshot(bad), false, JSON.stringify(bad.modeFields));
                mem.clearCalls();
                storage.writeStoredGameState(valid, () => true);
                const key = mem.calls.set[0];
                const bytes = JSON.stringify(bad);
                mem.values.set(key, bytes);
                mem.clearCalls();
                const owner = f.main.mode,
                    rng = f.main.random.getState(),
                    bag = mod.CutsceneSequence.captureState();
                const store = new JackalGameStateStore("semantic-rejection");
                for (let n = 0; n < 2; n++) {
                    assert.equal(storage.inspectStoredGameState().status, "invalid");
                    assert.equal(store.restore(f.main, f.gc), false);
                }
                assert.equal(f.main.mode, owner);
                assert.deepEqual(f.main.random.getState(), rng);
                assert.deepEqual(mod.CutsceneSequence.captureState(), bag);
                assert.equal(mem.values.get(key), bytes);
                assert.deepEqual(mem.calls.set, []);
                assert.deepEqual(mem.calls.remove, []);
            }
        }
    } finally {
        if (previous) Object.defineProperty(globalThis, "localStorage", previous);
        else delete globalThis.localStorage;
        await mod.server.close();
    }
});
