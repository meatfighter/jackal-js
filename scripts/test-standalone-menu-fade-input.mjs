import assert from "node:assert/strict";
import { test } from "node:test";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";
test("real Menu fresh input can commit every option during entrance fade and restores without replay", async () => {
    const mod = await endingModules();
    try {
        for (const id of ["CONTINUE", "DIFFICULTY", "OPTIONS"])
            for (const elapsed of [0, 8, 14])
                for (const action of ["Enter", "Fire", "Shoot"]) {
                    const probe = endingFixture(mod, { stage: 0 });
                    probe.enter(id);
                    for (let index = 0; index < probe.main.mode.menu.options.length; index++) {
                        const f = endingFixture(mod, { stage: 0 });
                        f.enter(id);
                        for (let i = 0; i < elapsed && f.main.fading; i++) f.tick();
                        // Navigate with genuine release/down levels through actual Menu.update.
                        for (let n = 0; n < index; n++) {
                            f.keys.clear();
                            f.main.mode.update(f.gc);
                            f.keys.add("Down");
                            f.main.mode.update(f.gc);
                        }
                        f.keys.clear();
                        f.main.mode.update(f.gc);
                        f.keys.add(action);
                        f.main.mode.update(f.gc);
                        f.keys.clear();
                        const snapshot = f.validate();
                        assert.equal(snapshot.modeFields.state, 0);
                        assert.equal(snapshot.modeFields.optionSelectedFlag, true);
                        assert.equal(snapshot.modeFields.selectedIndex, index);
                        const fresh = endingFixture(mod, { stage: 0 });
                        fresh.serializer.restoreStandaloneModeSnapshot(fresh.main, fresh.gc, snapshot);
                        assert.deepEqual(fresh.actions, [], "restore does not replay action");
                        assert.equal(fresh.main.mode.selectedIndex, index);
                        const owner = fresh.main.mode;
                        let n = 0;
                        while (fresh.main.mode === owner) {
                            fresh.validate();
                            fresh.tick();
                            assert.ok(++n < 100);
                        }
                        assert.equal(fresh.actions.length, 1, "selection transition exactly once");
                    }
                }
        const input = endingFixture(mod, { stage: 0 });
        input.enter("INPUT");
        input.keys.add("Enter");
        input.main.mode.update(input.gc);
        input.keys.clear();
        assert.equal(input.main.mode.state, mod.InputMode.STATE_FADE_IN);
        assert.equal(input.main.mode.menu.selectionMade, false, "Input menu keeps its distinct entrance-fade input policy");
        input.validate();
        const f = endingFixture(mod, { stage: 0 });
        f.main.hardMode = true;
        f.enter("DIFFICULTY");
        const s = f.validate();
        assert.equal(s.modeFields.selectedIndex, 0);
        assert.equal(s.modeExtra.menu.fields.selectedIndex, 1);
    } finally {
        await mod.server.close();
    }
});
