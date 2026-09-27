import assert from "node:assert/strict";
import { test } from "node:test";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";

// Actual editor/Menu/codec; only physical input, graphics and preference storage are doubled.
function inputFixture(mod, saved) {
    const f = endingFixture(mod, { stage: 0 }),
        listeners = new Set(),
        held = new Set();
    let sequence = 0,
        button = -1,
        writes = 0;
    const input = {
        clearKeyPressedRecord() {},
        clearControlPressedRecord() {},
        resetAdditionalControllerDirectionAxisCalibration() {},
        addKeyListener(v) {
            listeners.add(v);
        },
        removeKeyListener(v) {
            listeners.delete(v);
        },
        isKeyDown: (k) => held.has(k),
        getControllerSampleStatus: () => ({ valid: true, sequence: ++sequence, baselineOnly: false }),
        getControllerCount: () => 1,
        getControllerMapping: () => "",
        getControllerConnectionGeneration: () => 1,
        getButtonCount: () => 16,
        isControllerButtonDirectional: () => false,
        isButtonPressed: (b) => b === button,
        isControllerUp: () => false,
        isControllerDown: () => false,
        isControllerLeft: () => false,
        isControllerRight: () => false
    };
    f.gc.getInput = () => input;
    f.main.brownTanks = [{}];
    f.main.drawRotated = () => {};
    f.main.drawStringAlpha = (v, x, y, c) => f.main.drawString(v, x, y, c);
    f.main.notifyInputMappingChanged = () => {
        writes++;
        return { saved };
    };
    return Object.assign(f, {
        listeners,
        held,
        input,
        getWrites: () => writes,
        button: (v) => {
            button = v;
        }
    });
}
test("declared Input state/branch manifest survives actual keyboard/gamepad assignments and fresh reconstruction", async () => {
    const mod = await endingModules();
    const manifest = new Set();
    try {
        for (const profile of ["keyboard", "gamepad", "mixed"])
            for (const saved of [true, false]) {
                const f = inputFixture(mod, saved),
                    states = new Set();
                const prefix = profile + ":" + saved;
                function checkpoint(label) {
                    const snapshot = f.validate();
                    states.add(snapshot.modeFields.state);
                    f.render();
                    const beforeWrites = f.getWrites(),
                        authority = f.main.buttonMapping.clone();
                    const fresh = inputFixture(mod, saved),
                        freshAuthority = fresh.main.buttonMapping.clone();
                    fresh.serializer.restoreStandaloneModeSnapshot(fresh.main, fresh.gc, snapshot);
                    fresh.validate();
                    fresh.render();
                    assert.equal(fresh.getWrites(), 0, "restore never commits preferences");
                    assert.deepEqual(fresh.main.buttonMapping, freshAuthority, "fresh mapping authority remains independent");
                    if (snapshot.modeFields.state === mod.InputMode.STATE_SAVED) assert.equal(fresh.main.mode.completionMessage(), "DONE");
                    fresh.main.mode.removeInputListeners();
                    assert.equal(fresh.listeners.size, 0);
                    assert.equal(f.getWrites(), beforeWrites);
                    assert.deepEqual(f.main.buttonMapping, authority);
                    mod.Main.mainInstance = f.main;
                    manifest.add(prefix + ":" + label);
                }
                f.enter("INPUT");
                checkpoint("entrance");
                f.keys.add("Enter");
                f.tick();
                assert.equal(f.main.mode.menu.selectionMade, false);
                f.keys.clear();
                while (f.main.fading) f.tick();
                checkpoint("menu");
                f.held.add(30);
                f.keys.add("Enter");
                f.tick();
                f.keys.clear();
                const mode = f.main.mode;
                assert.equal(mode.state, mod.InputMode.STATE_READING);
                for (let row = 0; row < 7; row++) {
                    assert.equal(mode.nameIndex, row);
                    for (let delay = 8; delay >= 0; delay--) {
                        assert.equal(mode.armDelay, delay);
                        checkpoint(`row${row}:arm${delay}`);
                        if (delay > 0) f.tick();
                    }
                    if (row === 0) {
                        mode.keyPressed(30, "");
                        assert.equal(mode.state, mod.InputMode.STATE_READING, "held opener quarantined");
                        f.held.delete(30);
                        mode.keyReleased(30, "");
                        checkpoint("held-opening");
                    }
                    mode.keyPressed(-1, "");
                    assert.equal(mode.state, mod.InputMode.STATE_READING);
                    const useKeyboard = profile === "keyboard" || (profile === "mixed" && row % 2 === 0);
                    if (row > 0 && profile === "keyboard") {
                        mode.keyPressed(30, "");
                        assert.equal(mode.message, "ALREADY USED");
                        mode.keyReleased(30, "");
                        checkpoint("duplicate");
                    }
                    if (useKeyboard) {
                        mode.keyPressed(30 + row, "");
                        mode.keyReleased(30 + row, "");
                    } else {
                        f.button(-1);
                        f.tick();
                        f.button(row);
                        f.tick();
                        f.button(-1);
                    }
                    assert.equal(mode.state, mod.InputMode.STATE_READ_FADE);
                    checkpoint(`row${row}:read-fade-start`);
                    while (mode.state === mod.InputMode.STATE_READ_FADE) {
                        if (mode.delay === 1) checkpoint(`row${row}:read-fade-end`);
                        f.tick();
                    }
                }
                assert.equal(mode.state, mod.InputMode.STATE_SAVED);
                assert.equal(f.getWrites(), 1);
                assert.equal(mode.message, saved ? "SAVED" : "NOT SAVED");
                checkpoint("completion");
                while (mode.state === mod.InputMode.STATE_SAVED) f.tick();
                checkpoint("review");
                f.tick();
                // Real Menu navigation from DONE to RESET, then a fresh activation.
                f.keys.add("Up");
                f.tick();
                f.keys.clear();
                f.tick();
                f.keys.add("Enter");
                f.tick();
                f.keys.clear();
                f.tick();
                assert.equal(f.getWrites(), 2);
                checkpoint("reset");
                f.keys.add("Down");
                f.tick();
                f.keys.clear();
                f.tick();
                f.keys.add("Enter");
                f.tick();
                f.keys.clear();
                checkpoint("exit");
                while (f.main.mode === mode) f.tick();
                assert.equal(f.listeners.size, 0);
                assert.equal(f.getWrites(), 2);
                f.enter("INPUT");
                while (f.main.fading) f.tick();
                checkpoint("reopened");
                assert.deepEqual([...states].sort(), [0, 1, 2, 3, 4, 6]);
                for (const label of ["entrance", "menu", "held-opening", "completion", "review", "reset", "exit", "reopened"])
                    assert.ok(manifest.has(prefix + ":" + label), "required Input branch " + label);
                for (let row = 0; row < 7; row++)
                    for (const edge of ["arm8", "arm0", "read-fade-start", "read-fade-end"]) assert.ok(manifest.has(prefix + `:row${row}:${edge}`));
            }
    } finally {
        await mod.server.close();
    }
});
