import assert from "node:assert/strict";
import { test } from "node:test";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";
function replace(source, anchor, replacement) {
    assert.ok(source.includes(anchor), "Mutation anchor absent");
    return source.replace(anchor, replacement);
}
async function contract(transforms = {}) {
    const mod = await endingModules(transforms);
    try {
        const captureBag = () => {
            let value;
            assert.doesNotThrow(() => {
                value = mod.CutsceneSequence.captureState();
            }, "Valid restored order remains capturable");
            return value;
        };
        const f = endingFixture(mod, { score: 1000000 });
        f.enter("SUNSET");
        assert.equal(f.main.mode.credits.at(-1)[0], "final score: 1000000", "canonical numeric ending text");
        f.main.mode.init(f.main, f.gc);
        assert.equal(f.main.mode.credits.at(-1)[0], "final score: 1000000", "idempotent canonical text");
        const phase = f.main.mode.rotorAngle;
        f.tick();
        assert.equal(f.main.mode.rotorAngle, phase, "update retains render phase");
        f.render();
        assert.equal(f.main.mode.rotorAngle, -30, "exactly one rotor render step");
        mod.CutsceneSequence.restoreState(["YEAH", "HERE"]);
        const input = ["YEAH", "HERE"];
        const rng = f.main.random.getState();
        mod.CutsceneSequence.restoreState(input);
        input.pop();
        assert.deepEqual(captureBag(), ["YEAH", "HERE"], "restore input not aliased");
        assert.deepEqual(f.main.random.getState(), rng, "restore does not consume RNG");
        mod.CutsceneSequence.restoreState([]);
        assert.deepEqual(captureBag(), [], "empty remains empty");
        mod.CutsceneSequence.restoreState(["YEAH", "HERE"]);
        const saved = f.validate();
        assert.deepEqual(saved.remainingCutscenes, ["YEAH", "HERE"], "base bag captured");
        const fresh = endingFixture(mod);
        mod.CutsceneSequence.restoreState(["WE_MADE_IT"]);
        fresh.serializer.restoreStandaloneModeSnapshot(fresh.main, fresh.gc, saved);
        assert.deepEqual(captureBag(), ["YEAH", "HERE"], "standalone bag restored");
        mod.CutsceneSequence.restoreState(["WE_MADE_IT"]);
        fresh.main.resetNextFrameTime = () => {
            throw new Error("injected reconstruction failure");
        };
        assert.throws(() => fresh.serializer.restoreStandaloneModeSnapshot(fresh.main, fresh.gc, saved), /injected/);
        assert.deepEqual(captureBag(), ["WE_MADE_IT"], "failed reconstruction retains old bag");
        const typing = endingFixture(mod, { score: 1000000 });
        typing.enter("SUNSET");
        while (typing.main.mode.state !== mod.SunsetMode.STATE_CREDITS) typing.tick();
        const bad = typing.validate();
        bad.modeFields.lineLength = 999;
        assert.equal(mod.validator.isSupportedGameStateSnapshot(bad), false, "semantic cursor rejection");
        for (const name of ["finalScore", "finalScoreX"])
            assert.ok(!mod.fields.HARD_ENDING_MODE_FIELD_NAMES.includes(name), "derived field must not be durable");
        const h = endingFixture(mod, { score: 1000000, hard: true });
        h.enter("HARD_ENDING");
        assert.equal(h.main.mode.finalScore, "final score: 1000000", "hard numeric text");
        assert.match(String(f.serializer.restoreGameModeSnapshot), /restoreState\(snapshot.remainingCutscenes\)/, "Game branch publishes durable bag");
        const early = endingFixture(mod, { stage: 0 });
        early.enter("OPTIONS");
        early.keys.add("Enter");
        early.main.mode.update(early.gc);
        early.keys.clear();
        assert.equal(early.main.mode.optionSelectedFlag, true);
        early.validate();
        const intro = endingFixture(mod, { stage: 0 });
        intro.enter("INTRO");
        Object.assign(intro.main.mode, { state: mod.IntroMode.STATE_FADE_OUT, delay: 0 });
        intro.main.mode.fadeCompleted();
        intro.main.mode.update(intro.gc);
        assert.equal(intro.main.mode.delay, -1);
        intro.validate();
        Object.assign(h.main.mode, {
            state: mod.HardEndingMode.STATE_CREDITS,
            cardIndex: mod.HardEndingMode.CARDS.length,
            lineIndex: 0,
            lineLength: 0,
            delay: 0
        });
        h.main.fading = false;
        h.validate();
        const stale = h.capture();
        stale.modeFields.finalScore = "stale";
        assert.equal(mod.validator.isSupportedGameStateSnapshot(stale), false, "derived extra text rejected");
        const jeep = endingFixture(mod, { stage: 0 });
        jeep.enter("YEAH");
        const goodJeep = jeep.validate();
        for (const mutate of [
            (s) => {
                s.modeExtra.jeepYeah.explosion = null;
            },
            (s) => {
                s.modeFields.yeah = false;
            },
            (s) => {
                s.modeExtra.jeepYeah.explosion.delay = 1;
            }
        ]) {
            const bad = structuredClone(goodJeep);
            mutate(bad);
            assert.equal(mod.validator.isSupportedGameStateSnapshot(bad), false, "Jeep helper/identity semantics");
        }
        const restoredJeep = endingFixture(mod, { stage: 0 });
        restoredJeep.serializer.restoreStandaloneModeSnapshot(restoredJeep.main, restoredJeep.gc, goodJeep);
        assert.equal(restoredJeep.main.mode.explosion.enemy, null);
        assert.equal(restoredJeep.main.mode.explosion.enemies, null);
    } finally {
        await mod.server.close();
    }
}
test("ending counterexamples fail intended behavioral assertions", async (t) => {
    await contract();
    const mutants = [
        [
            "stale Sunset append",
            "SunsetMode",
            (s) =>
                replace(
                    s,
                    "this.credits[this.credits.length - 1][0] = finalScoreText(main.score);",
                    "this.credits[this.credits.length - 1][0] += main.scoreStr;"
                )
        ],
        [
            "stale HardEnding text",
            "HardEndingMode",
            (s) => replace(s, "this.finalScore = finalScoreText(main.score);", 'this.finalScore = "final score: " + main.scoreStr;')
        ],
        [
            "missing base bag capture",
            "persistence/JackalGameStateSerializer",
            (s) => replace(s, "remainingCutscenes: CutsceneSequence.captureState(),", "remainingCutscenes: [],")
        ],
        [
            "missing standalone bag restore",
            "persistence/JackalGameStateSerializer",
            (s) => {
                const anchor = "CutsceneSequence.restoreState(snapshot.remainingCutscenes);";
                assert.equal(s.split(anchor).length - 1, 2);
                const i = s.lastIndexOf(anchor);
                return s.slice(0, i) + s.slice(i + anchor.length);
            }
        ],
        [
            "premature bag publication",
            "persistence/JackalGameStateSerializer",
            (s) =>
                replace(
                    s,
                    "        const mode = this.createStandaloneMode(snapshot.modeId);",
                    "        CutsceneSequence.restoreState(snapshot.remainingCutscenes);\n        const mode = this.createStandaloneMode(snapshot.modeId);"
                )
        ],
        [
            "empty bag refill",
            "CutsceneSequence",
            (s) =>
                replace(
                    s,
                    "CutsceneSequence.modes = replacement;",
                    "CutsceneSequence.modes = replacement; if (replacement.isEmpty()) CutsceneSequence.fillList();"
                )
        ],
        ["reverse saved order", "CutsceneSequence", (s) => replace(s, "for (const id of state)", "for (const id of [...state].reverse())")],
        [
            "consume RNG restoring bag",
            "CutsceneSequence",
            (s) => replace(s, "CutsceneSequence.modes = replacement;", "CutsceneSequence.modes = replacement; requireMainRuntime().random.nextInt(3);")
        ],
        [
            "bypass semantics",
            "persistence/GameStateSnapshotValidator",
            (s) => replace(s, "return isStandaloneModeSemanticState(mainFields, snapshot.modeId, snapshot.modeFields, snapshot.modeExtra);", "return true;")
        ],
        [
            "persist derived HardEnding text",
            "persistence/GameStateFields",
            (s) =>
                replace(
                    s,
                    "export const HARD_ENDING_MODE_FIELD_NAMES = fieldsOf<HardEndingMode>()(",
                    'export const HARD_ENDING_MODE_FIELD_NAMES = fieldsOf<HardEndingMode>()("finalScore", "finalScoreX",'
                )
        ],
        [
            "missing game bag restore",
            "persistence/JackalGameStateSerializer",
            (s) => replace(s, "CutsceneSequence.restoreState(snapshot.remainingCutscenes);", "")
        ],
        ["sort saved order", "CutsceneSequence", (s) => replace(s, "for (const id of state)", "for (const id of [...state].sort())")],
        [
            "alias saved bag array",
            "CutsceneSequence",
            (s) =>
                replace(
                    s,
                    "CutsceneSequence.modes = replacement;",
                    "CutsceneSequence.modes = replacement; CutsceneSequence.captureState = () => state as CutsceneId[];"
                )
        ],
        [
            "reject legitimate early menu commit",
            "persistence/GameStateSnapshotValidator",
            (s) =>
                replace(
                    s,
                    "if (state === 2) return optionSelected;",
                    "if (state === 0) return optionSelected === false && selectedIndex === 0; if (state === 2) return optionSelected;"
                )
        ],
        [
            "reject negative Intro fade timer",
            "persistence/StandaloneModeStatePolicy",
            (s) => replace(s, "-IntroMode.TITLE_DELAY, IntroMode.TITLE_DELAY", "0, IntroMode.TITLE_DELAY")
        ],
        [
            "reject completed HardEnding sentinel",
            "persistence/StandaloneModeStatePolicy",
            (s) =>
                replace(
                    s,
                    'const card = number(fields, "cardIndex");',
                    'const card = number(fields, "cardIndex"); if(card === HardEndingMode.CARDS.length) return false;'
                )
        ],
        [
            "permit invalid score-line cursors",
            "persistence/StandaloneModeStatePolicy",
            (s) => replace(s, "return row === lines.length ? allowEnd && length === 0 : length <= lines[row].length;", "return true;")
        ],
        [
            "permit null Jeep explosion",
            "persistence/StandaloneModeStatePolicy",
            (s) => replace(s, "const explosion = object(value.explosion);", "const explosion = object(value.explosion); if(explosion === null) return true;")
        ],
        ["permit ID/yeah mismatch", "persistence/StandaloneModeStatePolicy", (s) => replace(s, 'fields.yeah === (id === "YEAH") &&', "true &&")],
        ["remove rotor rendering step", "SunsetMode", (s) => replace(s, "this.rotorAngle -= 30;", "this.rotorAngle -= 0;")],
        ["double rotor rendering step", "SunsetMode", (s) => replace(s, "this.rotorAngle -= 30;", "this.rotorAngle -= 60;")],
        [
            "move rotor into update",
            "SunsetMode",
            (s) =>
                replace(
                    replace(s, "this.rotorAngle -= 30;", "this.rotorAngle -= 0;"),
                    "public update(gc: GameContainer): void {",
                    "public update(gc: GameContainer): void { this.rotorAngle -= 30;"
                )
        ]
    ];
    for (const [label, path, transform] of mutants)
        await t.test(label, () =>
            assert.rejects(
                contract({ [path]: transform }),
                (e) => e.code === "ERR_ASSERTION" && !e.message.includes("anchor"),
                "Mutant must fail a behavior assertion"
            )
        );
    await contract();
});
