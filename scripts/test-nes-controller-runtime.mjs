import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
const server = await createServer({
    root: fileURLToPath(new URL("../pwa/", import.meta.url)),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
});
try {
    const { HumanInput } = await server.ssrLoadModule("/src/jackal/HumanInput.ts");
    const { ButtonMapping } = await server.ssrLoadModule("/src/jackal/ButtonMapping.ts");
    function fixture() {
        const pads = [{ generation: 1, held: new Set(), edges: new Set() }];
        const state = { valid: true, sequence: 0, baselineOnly: false };
        const mapping = new ButtonMapping();
        Object.assign(mapping, {
            controllerUp: 7,
            controllerDown: 6,
            controllerLeft: 3,
            controllerRight: 0,
            controllerGrenade: -2,
            controllerGun: -3,
            controllerStart: -4
        });
        const input = {
            getControllerSampleStatus: () => state,
            getControllerCount: () => pads.length,
            getControllerConnectionGeneration: (c) => pads[c].generation,
            getButtonCount: () => 17,
            isKeyDown: () => false,
            isKeyPressed: () => false,
            isControllerUp: (c) => pads[c].held.has(-2),
            isControllerDown: (c) => pads[c].held.has(-3),
            isControllerLeft: (c) => pads[c].held.has(-4),
            isControllerRight: (c) => pads[c].held.has(-5),
            isButtonPressed: (b, c) => pads[c].held.has(b),
            isControllerButtonDirectional: (b) => b >= 12 && b <= 15,
            isControlPressed: (b, c) => pads[c].edges.delete(b),
            clearKeyPressedRecord() {},
            clearControlPressedRecord() {
                pads.forEach((p) => p.edges.clear());
            }
        };
        const human = new HumanInput(mapping, { getInput: () => input });
        const snap = () => {
            state.sequence++;
            human.snap();
        };
        snap();
        return { human, mapping, pads, state, snap };
    }
    test("logical A/B levels and menu confirmation preserve virtual meaning", () => {
        const f = fixture();
        f.pads[0].held.add(-2);
        f.pads[0].edges.add(2);
        f.snap();
        assert.equal(f.human.isFire(), true);
        assert.equal(f.human.isUp(), false);
        assert.equal(f.human.isEnter(), true);
        assert.equal(f.human.isEnter(), false);
        f.pads[0].held.clear();
        f.snap();
        f.pads[0].held.add(-3);
        f.pads[0].edges.add(3);
        f.snap();
        assert.equal(f.human.isShoot(), true);
        assert.equal(f.human.isDown(), false);
        assert.equal(f.human.isEnter(), true);
    });
    test("each logical Start uses consuming press edges", () => {
        for (const [binding, control] of [
            [-2, 2],
            [-3, 3],
            [-4, 0],
            [-5, 1]
        ]) {
            const f = fixture();
            f.mapping.controllerStart = binding;
            f.pads[0].held.add(binding);
            f.pads[0].edges.add(control);
            f.snap();
            assert.equal(f.human.isPause(), true);
            assert.equal(f.human.isPause(), false);
            f.snap();
            assert.equal(f.human.isPause(), false);
            f.pads[0].held.clear();
            f.snap();
            assert.equal(f.human.isPause(), false);
            f.pads[0].edges.add(control);
            assert.equal(f.human.isPause(), true);
        }
    });
    test("confirm drains all sources and controllers, movement raw never confirms", () => {
        const f = fixture();
        f.pads.push({ generation: 2, held: new Set(), edges: new Set([0, 2, 3, 5]) });
        f.pads[0].edges = new Set([0, 2, 3, 5]);
        assert.equal(f.human.isEnter(), true);
        assert.equal(f.human.isEnter(), false);
        f.pads[0].edges.add(11);
        f.pads[0].held.add(7);
        f.snap();
        assert.equal(f.human.isUp(), true);
        assert.equal(f.human.isEnter(), false);
    });
    test("later controller held join is baselined even while earlier controller is active", () => {
        for (const [binding, read] of [
            [7, "isUp"],
            [6, "isDown"],
            [3, "isLeft"],
            [0, "isRight"],
            [-2, "isFire"],
            [-3, "isShoot"]
        ]) {
            const f = fixture();
            f.pads[0].held.add(binding);
            f.snap();
            assert.equal(f.human[read](), true);
            f.pads.push({ generation: 2, held: new Set([binding]), edges: new Set() });
            f.snap();
            f.pads[0].held.clear();
            f.snap();
            assert.equal(f.human[read](), false, read + " held join leaked");
            f.pads[0].held.add(binding);
            f.pads[1].held.clear();
            f.snap();
            f.pads[0].held.clear();
            f.pads[1].held.add(binding);
            f.snap();
            assert.equal(f.human[read](), true, read + " later release was skipped");
        }
    });
    test("invalid samples preserve held state and changed mappings quarantine held sources", () => {
        const f = fixture();
        f.pads[0].held.add(-2);
        f.snap();
        assert.equal(f.human.isFire(), true);
        f.state.valid = false;
        f.pads[0].held.clear();
        f.snap();
        assert.equal(f.human.isFire(), true);
        f.state.valid = true;
        f.pads[0].held.add(4);
        f.mapping.controllerGrenade = 4;
        f.snap();
        assert.equal(f.human.isFire(), false);
        f.pads[0].held.clear();
        f.snap();
        f.pads[0].held.add(4);
        f.snap();
        assert.equal(f.human.isFire(), true);
    });
} finally {
    await server.close();
}
