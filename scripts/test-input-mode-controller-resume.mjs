import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pwaRoot = resolve(rootDir, "pwa");
const server = await createServer({
    root: pwaRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
});

try {
    const { ButtonMapping } = await server.ssrLoadModule("/src/jackal/ButtonMapping.ts");
    const { InputMode } = await server.ssrLoadModule("/src/jackal/InputMode.ts");

    test("Jackal Input Config baselines held controller input through ARM_DELAY", () => {
        const fixture = createInputModeFixture(InputMode, ButtonMapping);
        const { mode, controls } = fixture;

        controls.heldButton = 0;
        for (let i = 0; i < InputMode.ARM_DELAY; i++) {
            mode.update({});
        }

        assert.equal(mode.armDelay, 0);
        assert.equal(mode.state, InputMode.STATE_READING);
        assert.deepEqual(Array.from(mode.assignedControllerButtons), []);

        mode.update({});
        assert.equal(mode.state, InputMode.STATE_READING, "a button held throughout ARM_DELAY must not become a fresh binding");

        controls.heldButton = -1;
        mode.update({});
        controls.heldButton = 0;
        mode.update({});

        assert.equal(mode.state, InputMode.STATE_READ_FADE);
        assert.deepEqual(Array.from(mode.assignedControllerButtons), [0]);
        assert.equal(mode.draftButtonMapping.controllerGrenade, 0);
    });

    test("Jackal browser-menu resume re-baselines held controller input", () => {
        const fixture = createInputModeFixture(InputMode, ButtonMapping);
        const { mode, controls } = fixture;

        mode.armDelay = 0;
        controls.heldButton = 0;
        mode.resyncControllerStateAfterBrowserResume();
        mode.update({});

        assert.equal(mode.state, InputMode.STATE_READING);
        assert.deepEqual(Array.from(mode.assignedControllerButtons), []);

        controls.heldButton = -1;
        mode.update({});
        controls.heldButton = 2;
        mode.update({});

        assert.equal(mode.state, InputMode.STATE_READ_FADE);
        assert.deepEqual(Array.from(mode.assignedControllerButtons), [2]);
        assert.equal(mode.draftButtonMapping.controllerGrenade, 2);
    });

    test("Jackal duplicate controller assignment still reports ALREADY USED after edge polling cutover", () => {
        const fixture = createInputModeFixture(InputMode, ButtonMapping);
        const { mode, controls } = fixture;

        mode.armDelay = 0;
        controls.heldButton = -1;
        mode.resyncControllerStateAfterBrowserResume();

        controls.heldButton = 0;
        mode.update({});
        assert.deepEqual(Array.from(mode.assignedControllerButtons), [0]);

        mode.state = InputMode.STATE_READING;
        mode.nameIndex = 5;
        mode.armDelay = 0;
        controls.heldButton = -1;
        mode.resyncControllerStateAfterBrowserResume();
        controls.heldButton = 0;
        mode.update({});

        assert.equal(mode.state, InputMode.STATE_READING);
        assert.equal(mode.message, "ALREADY USED");
        assert.deepEqual(Array.from(mode.assignedControllerButtons), [0]);
    });
} finally {
    await server.close();
}

test("Jackal browser InputMode retains the maintained Java polling architecture", () => {
    const tsSource = readFileSync(resolve(rootDir, "pwa/src/jackal/InputMode.ts"), "utf8");
    const javaSource = readFileSync(resolve(rootDir, "desktop/src/jackal/InputMode.java"), "utf8");

    for (const source of [tsSource, javaSource]) {
        assert.match(source, /syncControllerInputState/);
        assert.match(source, /getPressedControllerDirection/);
        assert.match(source, /getPressedNonDirectionalControllerButton/);
        assert.match(source, /armDelay/);
    }
    assert.doesNotMatch(tsSource, /ControllerListener|addControllerListener|controllerButtonPressed/);
    assert.match(javaSource, /if \(armDelay > 0\) \{[\s\S]*?syncControllerInputState\(\);[\s\S]*?armDelay--;/);
    assert.match(tsSource, /if \(this\.armDelay > 0\) \{[\s\S]*?this\.syncControllerInputState\(\);[\s\S]*?this\.armDelay--;/);
});

test("Jackal Main re-baselines InputMode controller edges before browser gameplay resumes", () => {
    const source = readFileSync(resolve(rootDir, "pwa/src/jackal/Main.ts"), "utf8");
    const start = source.indexOf("public setBrowserSuspended");
    const end = source.indexOf("public stopAllSounds", start);
    const method = source.slice(start, end);

    assert.match(method, /!suspended && this\.mode instanceof InputMode/);
    assert.match(method, /this\.mode\.resyncControllerStateAfterBrowserResume\(\)/);
});

function createInputModeFixture(InputMode, ButtonMapping) {
    const mapping = new ButtonMapping();
    const controls = { heldButton: -1 };
    const queriedButtons = [];
    const input = {
        getControllerCount: () => 1,
        getButtonCount: () => 17,
        isControllerUp: () => false,
        isControllerDown: () => false,
        isControllerLeft: () => false,
        isControllerRight: () => false,
        isButtonPressed: (button) => {
            queriedButtons.push(button);
            assert.ok(button >= 0 && button < 17, `InputMode queried out-of-range controller button ${button}`);
            return button === controls.heldButton;
        },
        addKeyListener() {},
        removeKeyListener() {},
        clearKeyPressedRecord() {},
        clearControlPressedRecord() {},
        resetAdditionalControllerDirectionAxisCalibration() {}
    };
    const main = {
        buttonMapping: mapping,
        bulletHitSound: {},
        playSoundAlways() {},
        clearInputPressedRecords() {},
        notifyInputMappingChanged() {}
    };
    const mode = new InputMode();
    mode.main = main;
    mode.gc = { getInput: () => input };
    mode.buttonMapping = mapping;
    mode.state = InputMode.STATE_READING;
    mode.nameIndex = 4;
    mode.armDelay = InputMode.ARM_DELAY;
    mode.draftButtonMapping = mode.copyButtonMapping(mapping);
    mode.assignedKeys.clear();
    mode.assignedControllerButtons.clear();
    mode.message = "";

    return { controls, input, main, mode, queriedButtons };
}
