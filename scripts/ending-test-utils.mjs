import assert from "node:assert/strict";
import { loadLastLifeModules } from "./last-life-test-utils.mjs";

/** Actual mode/codec/validator/fade graph. Node-only input, image, container and
 * audio boundaries are doubles; the browser suite separately uses real assets. */
export async function endingModules(transforms = {}) {
    const mod = await loadLastLifeModules(transforms);
    for (const name of [
        "SunsetMode",
        "HardEndingMode",
        "IntroMode",
        "IntroMapMode",
        "MapMode",
        "JeepHereMode",
        "JeepYeahMode",
        "ContinueMode",
        "DifficultyMode",
        "OptionsMode",
        "InputMode",
        "CutsceneSequence"
    ]) {
        mod[name] = (await mod.server.ssrLoadModule(`/src/jackal/${name}.ts`))[name];
    }
    mod.fields = await mod.server.ssrLoadModule("/src/jackal/persistence/GameStateFields.ts");
    mod.policy = await mod.server.ssrLoadModule("/src/jackal/persistence/StandaloneModeStatePolicy.ts");
    mod.validator = await mod.server.ssrLoadModule("/src/jackal/persistence/GameStateSnapshotValidator.ts");
    mod.Serializer = (await mod.server.ssrLoadModule("/src/jackal/persistence/JackalGameStateSerializer.ts")).JackalGameStateSerializer;
    mod.soundIds = (await mod.server.ssrLoadModule("/src/jackal/AudioRegistry.ts")).SOUND_FIELD_NAMES;
    return mod;
}
export function endingFixture(mod, { score = 123450, hard = false, stage = 5 } = {}) {
    const main = new mod.Main();
    mod.Main.mainInstance = main;
    const keys = new Set(),
        actions = [],
        text = [];
    const input = Object.fromEntries(["Down", "Up", "Left", "Right", "Fire", "Shoot", "Enter", "Pause", "Escape"].map((n) => ["is" + n, () => keys.has(n)]));
    input.clearKeyPressedRecord = () => keys.clear();
    input.snap = () => {};
    main.input = input;
    main.konamiCode = null;
    Object.assign(main, { score, scoreStr: "654321", stageIndex: stage, hardMode: hard, extraLives: 2, friendlySoldiersPickedUp: 0 });
    main.random = new mod.java.Random(123456);
    for (const id of mod.soundIds)
        main[id] = {
            capturePlaybackState: () => ({ voices: [], activeVoiceIndex: null }),
            restorePlaybackState() {},
            playing() {
                return false;
            },
            stop() {}
        };
    for (const name of [
        "playSoundAtVolume",
        "playSound",
        "playSoundAlways",
        "stopSound",
        "stopAllSound",
        "stopAllSounds",
        "stopAllSoundEffects",
        "stopAllSongs"
    ])
        main[name] = () => {};
    main.requestSong = () => {};
    main.isSongPlaying = () => false;
    main.clearInputPressedRecords = () => keys.clear();
    main.isBrowserRuntimeActive = () => false;
    main.resetNextFrameTime = () => {};
    const image = { draw() {}, getWidth: () => 32, getHeight: () => 32 };
    main.sunset = image;
    main.map = image;
    main.jeepYeah = image;
    for (const name of ["suns", "waves", "rescueHelicopters", "soldiers", "explosions", "yeahs", "smoke"]) main[name] = Array(512).fill(image);
    main.players = Array.from({ length: 2 }, () => Array(32).fill(image));
    main.friendlySoldiers = Array.from({ length: 2 }, () => Array(32).fill(image));
    for (const name of [
        "drawImage",
        "drawRotatedAtCenterScaled",
        "drawRotatedAtCenter",
        "drawOffset",
        "drawOffsetAlpha",
        "drawScaled",
        "drawScaledAlpha",
        "drawVehicle",
        "drawNumber",
        "rotateGraphicsScaled",
        "scaleGraphics",
        "translateGraphics",
        "popGraphics"
    ])
        main[name] = () => {};
    main.drawString = (value, x, y, color) => {
        assert.equal(typeof value, "string");
        text.push({ value, length: value.length, x, y, color });
    };
    main.drawStringWithLength = (value, length, x, y, color) => {
        assert.equal(typeof value, "string");
        assert.ok(length >= 0 && length <= value.length, "render cursor inside text");
        text.push({ value, length, x, y, color });
    };
    const gc = { getInput: () => ({ clearKeyPressedRecord() {}, clearControlPressedRecord() {}, getControllerCount: () => 0 }), getGraphics: () => graphics };
    const graphics = { setColor() {}, fillRect() {}, setWorldClip() {}, clearWorldClip() {} };
    main.gc = gc;
    const originalRequest = main.requestMode.bind(main);
    main.requestMode = (id, container) => {
        actions.push(id);
        if (id === mod.Modes.GAME) {
            main.mode = null;
            main.fading = false;
            main.fadeListener = null;
            return;
        }
        originalRequest(id, container);
    };
    const serializer = new mod.Serializer();
    function capture() {
        return serializer.createSnapshot(main, "ending-node-boundary-test");
    }
    function validate() {
        const s = capture();
        assert.ok(
            mod.validator.isSupportedGameStateSnapshot(s),
            JSON.stringify({ id: s.modeId, fields: s.modeFields, main: s.mainFields, extra: s.modeExtra })
        );
        return s;
    }
    function tick() {
        if (main.fading) main.advanceFade();
        main.mode?.update(gc);
    }
    function render() {
        main.mode?.render(gc, graphics);
    }
    return {
        main,
        gc,
        graphics,
        keys,
        actions,
        text,
        serializer,
        capture,
        validate,
        tick,
        render,
        enter(id) {
            main.requestMode(mod.Modes[id], gc);
        }
    };
}
