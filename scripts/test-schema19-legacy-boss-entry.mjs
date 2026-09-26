import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadLastLifeModules, makeLastLifeWorld } from "./last-life-test-utils.mjs";
import { installSongs, positionForTrigger } from "./boss-entry-test-utils.mjs";

const original = JSON.parse(readFileSync(new URL("./fixtures/boss-entry-original.json", import.meta.url), "utf8"));

test("immutable pre-fix entry can leave an ordinary boss cue during recorded final-life death", async () => {
    assert.equal(original.source, "355f89e65aa521e5ab9e62cc1b2694dd60059303");
    for (const historical of [true, false]) {
        const mod = await loadLastLifeModules(historical ? { GameMode: () => original.GameMode } : {});
        try {
            const { Triggers } = await mod.server.ssrLoadModule("/src/jackal/Triggers.ts");
            const f = makeLastLifeWorld(mod);
            const songs = installSongs(f, mod);
            positionForTrigger(f);
            f.world.triggerMap[7] = [[Triggers.BOSS_BLUE_TANKS, 0, 0]];
            f.player.explode();
            assert.equal(f.player.respawning, 182);
            assert.equal(songs.old.lastLifeSuspended, true);
            f.tick();
            assert.equal(f.player.respawning, 181);
            assert.equal(f.main.requestedSong, songs.boss);
            assert.equal(f.world.bossCameraPan, true);
            if (historical) {
                assert.equal(f.main.currentSong, null, "old pending cue has no held owner");
                assert.equal(songs.old.lastLifeSuspended, false);
            } else {
                assert.equal(f.main.currentSong, songs.old);
                assert.equal(songs.old.lastLifeSuspended, true);
            }
            f.main.applyRequestedSongChange();
            f.tick();
            assert.equal(f.world.triggerY, 7, "no duplicate trigger consumption");
            if (historical) {
                assert.equal(f.main.currentSong, songs.boss);
                assert.equal(songs.boss.playing, true);
                assert.equal(songs.boss.lastLifeSuspended, false);
                assert.equal(f.player.respawning, 181, "old pan freezes pending death");
                assert.equal(f.world.cameraY, 252);
            } else {
                assert.equal(f.main.currentSong, songs.old);
                assert.equal(songs.old.lastLifeSuspended, true);
                assert.equal(f.player.respawning, 180);
                assert.equal(f.world.cameraY, 256);
            }
        } finally {
            await mod.server.close();
        }
    }
});
