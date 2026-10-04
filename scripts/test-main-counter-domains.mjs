import assert from "node:assert/strict";
import { test } from "node:test";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";

test("Java counter semantics survive derived reconstruction and current validation", async () => {
    const mod = await endingModules();
    try {
        const f = endingFixture(mod, { stage: 0 });
        f.enter("INTRO_MAP");
        f.main.extraLives = 99;
        f.main.gainExtraLife();
        assert.equal(f.main.extraLives, 100);
        assert.equal(f.main.extraLivesStr, "100");
        f.main.gainExtraLife();
        assert.equal(f.main.extraLivesStr, "101");
        for (const score of [0, 1, 123450, 999999, 1000000, 1234567]) {
            f.main.score = score;
            f.main.scoreStr = "stale";
            f.main.reconcileStateAfterRestore();
            assert.equal(f.main.scoreStr, String(score).padStart(6, "0"));
            assert.equal(f.main.score, score);
            f.validate();
        }
        const base = f.validate();
        for (const field of ["extraLives", "friendlySoldiersPickedUp"]) {
            for (const value of [0, 99, 100, 1000001, 2147483647, 2147483648, Number.MAX_SAFE_INTEGER]) {
                const s = structuredClone(base);
                s.mainFields[field] = value;
                assert.equal(mod.validator.isSupportedGameStateSnapshot(s), true, `${field}=${value}`);
            }
            for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
                const s = structuredClone(base);
                s.mainFields[field] = value;
                assert.equal(mod.validator.isSupportedGameStateSnapshot(s), false);
            }
        }
        for (const [hasMissiles, missilePower, expected] of [
            [false, 0, true],
            [true, 0, true],
            [true, 1, true],
            [true, 2, true],
            [false, 1, false],
            [false, 2, false],
            [true, 3, false],
            [true, -1, false],
            [true, 0.5, false]
        ]) {
            const s = structuredClone(base);
            Object.assign(s.mainFields, { hasMissiles, missilePower });
            assert.equal(mod.validator.isSupportedGameStateSnapshot(s), expected);
        }
        f.main.hasMissiles = false;
        f.main.missilePower = 0;
        for (const expected of [0, 1, 2, 2]) {
            f.main.upgradeWeapon(false);
            assert.equal(f.main.hasMissiles, true);
            assert.equal(f.main.missilePower, expected);
            f.validate();
        }
    } finally {
        await mod.server.close();
    }
});
