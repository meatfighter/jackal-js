import assert from "node:assert/strict";
import { test } from "node:test";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";
import { makeLastLifeWorld } from "./last-life-test-utils.mjs";

test("actual Java-derived Jackal producers and glyph dispatch retain full scores and lives", async () => {
    const mod = await endingModules();
    try {
        const f = endingFixture(mod, { stage: 0 });
        const calls = [];
        const font = Array.from({ length: 256 }, (_, code) => ({
            draw(x, y) {
                calls.push({ code, x, y });
            }
        }));
        f.main.fonts = Array(16).fill(font);
        f.main.drawString = mod.Main.prototype.drawString;
        const textAt = (y) =>
            calls
                .filter((c) => c.y === y)
                .sort((a, b) => a.x - b.x)
                .map((c) => String.fromCharCode(c.code))
                .join("");
        const hud = new mod.GameMode();
        hud.main = f.main;
        for (const [value, expected] of [
            [0, "000000"],
            [1, "000001"],
            [999999, "999999"],
            [1000000, "1000000"],
            [1234567, "1234567"]
        ]) {
            f.main.score = value;
            f.main.reconcileStateAfterRestore();
            calls.length = 0;
            hud.drawScore();
            assert.equal(textAt(804), "1P" + expected);
            f.enter("MAP");
            calls.length = 0;
            f.render();
            assert.equal(textAt(256), "1P SCORE" + expected);
            f.main.stageIndex = 5;
            f.enter("SUNSET");
            assert.equal(f.main.mode.credits.at(-1)[0], "final score: " + expected);
            f.main.hardMode = true;
            f.enter("HARD_ENDING");
            assert.equal(f.main.mode.finalScore, "final score: " + expected);
            assert.equal(f.main.mode.finalScoreX, (1024 - (13 + expected.length) * 32) >> 1);
            f.main.stageIndex = 0;
            assert.equal(f.main.score, value);
        }
        f.main.extraLives = 99;
        f.main.gainExtraLife();
        calls.length = 0;
        hud.drawScore();
        assert.equal(textAt(868), "P100");
        f.main.score = 19999;
        f.main.addPoints(1);
        assert.equal(f.main.extraLives, 101);
        const world = makeLastLifeWorld(mod);
        world.main.konamiCode = null;
        world.main.extraLives = 2;
        world.player.collectFlashingStar();
        assert.deepEqual([world.main.hasMissiles, world.main.missilePower], [true, 2]);
        world.player.explode();
        assert.deepEqual([world.main.hasMissiles, world.main.missilePower], [false, 0]);
        assert.equal(world.player.respawning, mod.Player.RESPAWN_DELAY);
        world.main.continuePlayer();
        assert.deepEqual([world.main.hasMissiles, world.main.missilePower, world.main.extraLives], [false, 0, 4]);
        world.main.konamiCode = { enabled: true };
        world.main.upgradeWeapon(false);
        assert.deepEqual([world.main.hasMissiles, world.main.missilePower], [true, 2]);
        world.main.startPlayer();
        assert.deepEqual([world.main.hasMissiles, world.main.missilePower, world.main.extraLives, world.main.stageIndex], [false, 0, 30, 0]);
    } finally {
        await mod.server.close();
    }
});
