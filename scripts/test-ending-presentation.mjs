import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypeScript, shellSubject } from "./persistence-test-loader.mjs";

const root = "pwa/src/jackal/";
const [{ SunsetMode }, { HardEndingMode }, fields, policy, { IntroMode }] = await Promise.all([
    loadTypeScript(root + "SunsetMode.ts"),
    loadTypeScript(root + "HardEndingMode.ts"),
    loadTypeScript(root + "persistence/GameStateFields.ts"),
    loadTypeScript(root + "persistence/StandaloneModeStatePolicy.ts"),
    loadTypeScript(root + "IntroMode.ts")
]);

function main(score, hardMode = false) {
    const input = { clearKeyPressedRecord() {} };
    for (const name of ["isEnter", "isUp", "isDown", "isLeft", "isRight", "isShoot", "isFire"]) input[name] = () => false;
    return {
        score,
        scoreStr: "000000",
        stageIndex: 5,
        hardMode,
        input,
        konamiCode: null,
        fading: false,
        fadeOut: false,
        fadeIndex: 0,
        startFade(out) {
            this.fading = true;
            this.fadeOut = out;
            this.fadeIndex = out ? 0 : 22;
        },
        stopAllSoundEffects() {},
        stopAllSongs() {},
        requestSong() {},
        playSoundAlways() {}
    };
}
function bag(object, names) {
    return Object.fromEntries(names.map((name) => [name, object[name]]));
}
function accepted(m, id, mode, names, extra = null) {
    return policy.isStandaloneModeSemanticState(m, id, bag(mode, names), extra);
}

for (const score of [0, 1, 123450, 999999, 1000000, 2147483647]) {
    test(`ending score ${score} derives from number, not stale text`, () => {
        const expected = "final score: " + String(score).padStart(6, "0");
        const m = main(score);
        const sunset = new SunsetMode();
        sunset.init(m, {});
        assert.equal(sunset.credits.at(-1)[0], expected);
        m.scoreStr = "654321";
        sunset.init(m, {});
        assert.equal(sunset.credits.at(-1)[0], expected, "idempotent line rebuild, not concatenation");
        const another = new SunsetMode();
        assert.equal(another.credits.at(-1)[0], "final score: ", "no template/instance alias");
        assert.equal(SunsetMode.CREDIT_CARDS.at(-1)[0], "final score: ");
        m.hardMode = true;
        const hard = new HardEndingMode();
        hard.init(m, {});
        assert.equal(hard.finalScore, expected);
        assert.equal(hard.finalScoreX, (1024 - expected.length * 32) >> 1);
    });
}

test("derived ending strings and coordinates are not durable fields", () => {
    for (const name of ["finalScore", "finalScoreX"]) assert.ok(!fields.HARD_ENDING_MODE_FIELD_NAMES.includes(name));
    assert.ok(!fields.MAIN_FIELD_NAMES.includes("scoreStr"));
    assert.ok(!fields.SUNSET_MODE_FIELD_NAMES.includes("credits"));
});

test("seven-digit final-line cursor advances past the old six-digit width", () => {
    const m = main(1000000);
    const mode = new SunsetMode();
    mode.init(m, {});
    m.fading = false;
    Object.assign(mode, {
        state: SunsetMode.STATE_CREDITS,
        helicopterDelay: SunsetMode.HELICOPTER_TIME,
        helicopterZ: 0,
        creditsIndex: mode.credits.length - 1,
        lineIndex: 0,
        lineLength: "final score: 000000".length,
        delay: 1
    });
    assert.ok(accepted(m, "SUNSET", mode, fields.SUNSET_MODE_FIELD_NAMES));
    mode.update({});
    assert.equal(mode.lineLength, "final score: 1000000".length);
    for (let i = 0; i < SunsetMode.EOL_PAUSE_TIME; i++) mode.update({});
    assert.equal(mode.lineIndex, 1);
    assert.equal(mode.lineLength, 0);
});

test("hard-ending completed-card sentinel is accepted only outside character cards", () => {
    const m = main(123450, true);
    const mode = new HardEndingMode();
    mode.init(m, {});
    Object.assign(mode, { state: HardEndingMode.STATE_CREDITS, cardIndex: HardEndingMode.CARDS.length, lineIndex: 0, lineLength: 0, delay: 0 });
    assert.ok(accepted(m, "HARD_ENDING", mode, fields.HARD_ENDING_MODE_FIELD_NAMES));
    mode.state = HardEndingMode.STATE_TYPING;
    mode.delay = HardEndingMode.TYPE_DELAY;
    assert.equal(accepted(m, "HARD_ENDING", mode, fields.HARD_ENDING_MODE_FIELD_NAMES), false);
});

test("normal-to-hard exit is still the normal ending presentation", () => {
    const m = main(123450);
    const mode = new SunsetMode();
    mode.init(m, {});
    Object.assign(m, { hardMode: true, stageIndex: 0, fading: true, fadeOut: true });
    Object.assign(mode, {
        state: SunsetMode.STATE_ADVANCE_TO_HARD_MODE,
        helicopterDelay: SunsetMode.HELICOPTER_TIME,
        helicopterZ: 0,
        creditsIndex: mode.credits.length - 1,
        lineIndex: mode.credits.at(-1).length,
        lineLength: 0,
        delay: 0
    });
    assert.ok(accepted(m, "SUNSET", mode, fields.SUNSET_MODE_FIELD_NAMES));
    m.stageIndex = 5;
    assert.equal(accepted(m, "SUNSET", mode, fields.SUNSET_MODE_FIELD_NAMES), false);
});

test("real Intro callback/update can produce a valid negative fade-in delay", () => {
    const m = main(0);
    const mode = new IntroMode();
    mode.init(m, {});
    Object.assign(mode, { state: IntroMode.STATE_FADE_OUT, delay: 0, soldierSet: 1, namesIndex: IntroMode.NAMES[1].length, nameLength: 0 });
    mode.fadeCompleted();
    mode.update({});
    assert.equal(mode.state, IntroMode.STATE_FADE_IN);
    assert.equal(mode.delay, -1);
    assert.ok(accepted(m, "INTRO", mode, fields.INTRO_MODE_FIELD_NAMES));
});

test("actual simple-menu primitive policy accepts early committed selection", () => {
    const subject = shellSubject(root + "persistence/GameStateSnapshotValidator.ts", ["isSimpleMenuModeFields"], {
        isIntegerInRange: (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi
    });
    for (const max of [1, 2]) {
        assert.equal(subject.isSimpleMenuModeFields({ state: 0, optionSelectedFlag: true, selectedIndex: max }, max), true);
        assert.equal(subject.isSimpleMenuModeFields({ state: 0, optionSelectedFlag: false, selectedIndex: max }, max), false);
        assert.equal(subject.isSimpleMenuModeFields({ state: 3, optionSelectedFlag: true, selectedIndex: 0 }, max), false);
    }
});
