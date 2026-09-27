import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "./vite-test-server.mjs";

const server = await createServer({ root: "pwa", appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
try {
    const { InputMode } = await server.ssrLoadModule("/src/jackal/InputMode.ts");
    const { ButtonMapping } = await server.ssrLoadModule("/src/jackal/ButtonMapping.ts");
    for (const saved of [true, false]) {
        test(`Reset renders only defaults and menu; Change retains completion, saved=${saved}`, () => {
            const draws = [];
            let writes = 0;
            let sounds = 0;
            let cursors = 0;
            const input = {
                clearKeyPressedRecord() {},
                clearControlPressedRecord() {},
                addKeyListener() {},
                removeKeyListener() {},
                resetAdditionalControllerDirectionAxisCalibration() {},
                isKeyDown: () => false,
                getControllerSampleStatus: () => ({ valid: true, sequence: 1, baselineOnly: false }),
                getControllerCount: () => 0
            };
            const main = {
                buttonMapping: new ButtonMapping(),
                input,
                brownTanks: [{}],
                drawString: (text) => draws.push(text),
                drawRotated: () => cursors++,
                translateGraphics() {},
                popGraphics() {},
                playSound: () => sounds++,
                playSoundAlways() {},
                clearInputPressedRecords() {},
                startFade() {},
                requestMode() {},
                notifyInputMappingChanged: () => {
                    writes++;
                    return { saved };
                }
            };
            const gc = { getInput: () => input };
            const graphics = { setColor() {}, fillRect() {} };
            const mode = new InputMode();
            mode.init(main, gc);
            mode.fadeCompleted();
            const render = () => {
                draws.length = 0;
                mode.render(gc, graphics);
                return [...draws];
            };
            const defaults = InputMode.LABELS.map((label, i) => new ButtonMapping().inputMappingLine(label, InputMode.ACTIONS[i]));
            const expected = ["INPUT", ...defaults, "DONE", "RESET", "CHANGE"];
            main.buttonMapping.keyUp = 30;
            mode.refreshInputMappingLines();
            assert.notDeepEqual(render(), expected);
            for (let i = 1; i <= 3; i++) {
                mode.optionSelected(InputMode.OPTION_RESET);
                assert.deepEqual(render(), expected);
                assert.equal(main.buttonMapping.keyUp, new ButtonMapping().keyUp);
                assert.equal(mode.menu.selectedIndex, InputMode.OPTION_RESET);
                assert.equal(mode.state, InputMode.STATE_MENU);
                assert.equal(mode.delay, 0);
                assert.equal(writes, i);
                assert.equal(sounds, i);
            }
            assert.ok(cursors >= 3);
            mode.optionSelected(InputMode.OPTION_CHANGE);
            for (const key of [30, 31, 32, 33, 34, 35, 36]) {
                for (let tick = 0; tick < InputMode.ARM_DELAY; tick++) mode.update(gc);
                mode.keyPressed(key, "");
                mode.keyReleased(key, "");
                assert.equal(mode.state, InputMode.STATE_READ_FADE);
                for (let tick = 0; tick < InputMode.FADE_TIME; tick++) mode.update(gc);
            }
            assert.equal(writes, 4);
            assert.deepEqual(render(), [saved ? "SAVED" : "NOT SAVED"]);
            assert.equal(mode.delay, 30);
            for (let tick = 1; tick < 30; tick++) mode.update(gc);
            assert.deepEqual(render(), [saved ? "SAVED" : "NOT SAVED"]);
            mode.update(gc);
            assert.equal(mode.state, InputMode.STATE_MENU);
            mode.optionSelected(InputMode.OPTION_RESET);
            assert.deepEqual(render(), expected);
            mode.resyncInputAfterBrowserResume();
            mode.restorePersistencePresentation();
            assert.deepEqual(render(), expected);
            mode.optionSelected(InputMode.OPTION_DONE);
            mode.fadeCompleted();
            mode.state = InputMode.STATE_FADE_IN;
            mode.init(main, gc);
            mode.fadeCompleted();
            assert.deepEqual(render(), expected);
            assert.equal(writes, 5, "navigation/resume/restore must not replay persistence");
        });
    }
} finally {
    await server.close();
}
