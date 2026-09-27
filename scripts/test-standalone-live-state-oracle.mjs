import assert from "node:assert/strict";
import { test } from "node:test";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";

test("unaccelerated production ending states validate on every tick and equal-schedule render", async () => {
    const mod = await endingModules();
    try {
        for (const score of [123450, 1000000])
            for (const hard of [false, true]) {
                const f = endingFixture(mod, { score, hard });
                f.enter("SUNSET");
                const phases = new Set();
                let ticks = 0;
                while (f.main.mode !== null && !(f.main.mode instanceof mod.IntroMode)) {
                    const s = f.validate();
                    phases.add(`${s.modeId}:${s.modeFields.state}`);
                    if (ticks % 17 === 0) {
                        f.render();
                        f.validate();
                        f.render();
                        f.validate();
                    }
                    if (
                        (f.main.mode instanceof mod.SunsetMode && f.main.mode.state === mod.SunsetMode.STATE_WAITING) ||
                        (f.main.mode instanceof mod.HardEndingMode && f.main.mode.state === mod.HardEndingMode.STATE_FINAL_SCORE)
                    )
                        f.keys.add("Enter");
                    f.tick();
                    assert.ok(++ticks < 60000, "finite ending progression");
                }
                assert.equal(f.main.score, score);
                assert.ok(phases.has("SUNSET:0"));
                assert.ok(phases.has(hard ? "HARD_ENDING:8" : "SUNSET:6"));
                console.log(JSON.stringify({ score, hard, ticks, phases: [...phases] }));
            }
    } finally {
        await mod.server.close();
    }
});

test("actual Intro attract loops and every cutscene/map stage validate throughout", async () => {
    const mod = await endingModules();
    try {
        const intro = endingFixture(mod, { stage: 0 });
        intro.enter("INTRO");
        let loops = 0,
            prior = intro.main.mode.state;
        for (let i = 0; i < 30000 && loops < 2; i++) {
            intro.validate();
            intro.tick();
            const next = intro.main.mode.state;
            if (prior === mod.IntroMode.STATE_FADE_OUT && next === mod.IntroMode.STATE_FADE_IN) loops++;
            prior = next;
        }
        assert.equal(loops, 2);
        for (const choice of [0, 1]) {
            const f = endingFixture(mod, { stage: 0 });
            f.enter("INTRO");
            while (f.main.mode.state !== mod.IntroMode.STATE_TITLE) {
                f.validate();
                f.tick();
            }
            if (choice) {
                f.keys.add("Down");
                f.tick();
                f.keys.clear();
                f.tick();
            }
            f.keys.add("Enter");
            f.tick();
            f.keys.clear();
            let n = 0;
            while (f.main.mode instanceof mod.IntroMode) {
                f.validate();
                f.tick();
                assert.ok(++n < 1000, "Intro selection exits finitely");
            }
            f.validate();
            assert.ok(f.actions.includes(choice ? mod.Modes.OPTIONS : mod.Modes.INTRO_MAP));
        }

        for (const id of ["HERE", "YEAH", "WE_MADE_IT", "INTRO_MAP"])
            for (let stage = 0; stage < (id === "INTRO_MAP" ? 1 : 5); stage++) {
                const f = endingFixture(mod, { stage });
                f.main.friendlySoldiersPickedUp = 3;
                f.enter(id);
                let ticks = 0;
                const visits = new Set();
                while (f.main.mode) {
                    const snapshot = f.validate();
                    visits.add(`${snapshot.modeId}:${snapshot.modeFields.state}`);
                    f.tick();
                    assert.ok(++ticks < 10000, `${id} finite progression`);
                }
                assert.ok(f.actions.includes(mod.Modes.GAME));
                if (id !== "INTRO_MAP") for (const state of [0, 1, 2, 3, 4]) assert.ok(visits.has(`MAP:${state}`), `${id}/${stage} MAP phase ${state}`);
            }
    } finally {
        await mod.server.close();
    }
});
