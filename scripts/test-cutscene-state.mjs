import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypeScript } from "./persistence-test-loader.mjs";
const { CutsceneSequence: bag } = await loadTypeScript("pwa/src/jackal/CutsceneSequence.ts");
const { installMainRuntime } = await loadTypeScript("pwa/src/jackal/MainRuntimeState.ts");
const { Random } = await loadTypeScript("pwa/src/java/JavaRuntime.ts");
const { isCutsceneState } = await loadTypeScript("pwa/src/jackal/CutsceneState.ts");
const subsets = [[], ["YEAH"], ["WE_MADE_IT"], ["HERE"], ["YEAH", "WE_MADE_IT"], ["YEAH", "HERE"], ["WE_MADE_IT", "HERE"], ["YEAH", "WE_MADE_IT", "HERE"]];
test("every ordered bag subset resumes identical choices, bag and JavaRandom through refill", () => {
    for (const initial of subsets) {
        const seed = new Random(4567).getState();
        const trace = () => {
            const choices = [];
            const main = {
                random: Random.fromState(seed),
                requestMode(id) {
                    choices.push(id);
                }
            };
            installMainRuntime(main);
            bag.restoreState(initial);
            assert.deepEqual(main.random.getState(), seed);
            const trace = [];
            for (let i = 0; i < 12; i++) {
                bag.requestCutscene({});
                trace.push({ choice: choices.at(-1), bag: bag.captureState(), rng: main.random.getState() });
            }
            return trace;
        };
        const control = trace();
        assert.deepEqual(trace(), control);
    }
});
test("bag capture/restore is copied, strict, ordered and atomic", () => {
    for (const state of subsets) {
        bag.restoreState(state);
        const copy = bag.captureState();
        copy.push("invalid");
        assert.deepEqual(bag.captureState(), state);
        const input = [...state];
        bag.restoreState(input);
        input.push("invalid");
        assert.deepEqual(bag.captureState(), state);
    }
    for (const bad of [
        undefined,
        null,
        {},
        "YEAH",
        [0],
        ["unknown"],
        ["HERE", "YEAH"],
        ["YEAH", "YEAH"],
        ["YEAH", "WE_MADE_IT", "HERE", "HERE"],
        new Array(1)
    ]) {
        bag.restoreState(["YEAH", "HERE"]);
        assert.equal(isCutsceneState(bad), false);
        assert.throws(() => bag.restoreState(bad));
        assert.deepEqual(bag.captureState(), ["YEAH", "HERE"]);
    }
});
