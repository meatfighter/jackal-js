import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadLastLifeModules, makeLastLifeWorld } from "./last-life-test-utils.mjs";

import { installSongs, positionForTrigger } from "./boss-entry-test-utils.mjs";

test("gameplay cues defer holds, including absent/finished/unstarted current music", async () => {
    const mod = await loadLastLifeModules();
    try {
        for (const state of ["active", "held", "none", "finished", "unstarted-held"])
            for (const same of [false, true]) {
                const f = makeLastLifeWorld(mod);
                const s = installSongs(f, mod);
                f.player.respawning = 5;
                if (state === "held") s.old.suspendForLastLife();
                if (state === "none") f.main.currentSong = f.main.requestedSong = null;
                if (state === "finished" || state === "unstarted-held") s.old.stop();
                if (state === "unstarted-held") s.old.suspendForLastLife();
                const before = s.part.events.length;
                const target = same && f.main.currentSong ? f.main.currentSong : s.boss;
                f.main.queueGameplaySong(target);
                assert.equal(f.main.requestedSong, target);
                assert.equal(f.main.currentSong.lastLifeSuspended, true);
                f.main.applyRequestedSongChange();
                f.main.currentSong.update();
                assert.equal(target.intro.state === "playing", false);
                if (state === "held" || state === "unstarted-held") {
                    assert.equal(f.main.currentSong, s.old);
                    assert.equal(s.part.events.length, before, "queueing must not destroy an existing hold");
                }
                f.main.extraLives = 1;
                f.player.update();
                f.main.applyRequestedSongChange();
                assert.equal(f.main.currentSong, target);
                assert.equal(target.lastLifeSuspended, false);
                assert.equal(target.intro.state, "playing");
                if (target === s.old && (state === "active" || state === "held")) {
                    assert.equal(s.part.position, 7.25, "same interrupted song resumes, not restarts");
                }
            }
        const f = makeLastLifeWorld(mod);
        const s = installSongs(f, mod);
        f.player.respawning = 5;
        f.main.suspendMusicForLastLife();
        f.main.queueGameplaySong(s.boss);
        f.main.requestSong(s.boss); // Explicit authoritative takeover still cancels.
        assert.equal(s.old.lastLifeSuspended, false);
        assert.equal(f.main.currentSong, null);
        f.main.applyRequestedSongChange();
        assert.equal(f.main.currentSong, s.boss);
        assert.equal(s.bossPart.state, "playing");
    } finally {
        await mod.server.close();
    }
});

test("real trigger is consumed once and no-reserve death reaches Continue without a boss pan", async () => {
    const mod = await loadLastLifeModules();
    try {
        const { Triggers } = await mod.server.ssrLoadModule("/src/jackal/Triggers.ts");
        const f = makeLastLifeWorld(mod);
        const s = installSongs(f, mod);
        positionForTrigger(f);
        f.world.triggerMap[7] = [[Triggers.BOSS_BLUE_TANKS, 0, 0]];
        f.player.explode();
        f.player.respawning = 8; // Explicit accelerated death phase after real registration.
        for (let n = 0; n < 8; n++) {
            f.tick();
            if (f.main.mode === f.world) f.main.applyRequestedSongChange();
            assert.equal(f.world.cameraY, 256);
            assert.equal(f.world.triggerY, 7);
        }
        assert.equal(f.main.mode.destination, mod.Modes.CONTINUE);
        const managers = [...f.world.elements[0]].filter((e) => e.constructor.name === "BossBlueTanksManager");
        assert.equal(managers.length, 1);
        assert.equal(managers[0].ready, false);
        assert.equal(managers[0].spawned, 0);
        assert.equal(
            s.bossPart.events.some((e) => e[0] === "play"),
            false
        );
    } finally {
        await mod.server.close();
    }
});

test("element-side rescue releases queued cue before the next eligible pan update", async () => {
    const mod = await loadLastLifeModules();
    try {
        const { Triggers } = await mod.server.ssrLoadModule("/src/jackal/Triggers.ts");
        const f = makeLastLifeWorld(mod);
        const s = installSongs(f, mod);
        positionForTrigger(f);
        f.world.triggerMap[7] = [[Triggers.BOSS_BLUE_TANKS, 0, 0]];
        f.player.explode();
        f.player.respawning = 8;
        f.main.score = 19900;
        f.tick();
        assert.equal(f.player.respawning, 7);
        f.world.elements[7].add({
            removeFlag: false,
            enemy: false,
            changeLayerValue: -1,
            checkBounds() {},
            update() {
                f.main.addPoints(100);
                this.removeFlag = true;
            }
        });
        f.tick();
        assert.equal(f.player.respawning, 6);
        assert.equal(f.main.extraLives, 1);
        assert.equal(s.old.lastLifeSuspended, false);
        assert.equal(f.main.currentSong, null);
        assert.equal(
            s.part.events.some((e) => e[0] === "resume"),
            false
        );
        assert.equal(f.world.cameraY, 256);
        f.main.applyRequestedSongChange();
        assert.equal(f.main.currentSong, s.boss);
        f.tick();
        assert.equal(f.world.cameraY, 252);
        assert.equal(f.player.respawning, 6, "existing reserve-backed pan freeze is retained");
    } finally {
        await mod.server.close();
    }
});

test("positive-bonus held state gets a release checkpoint; zero-distance pan completes once", async () => {
    const mod = await loadLastLifeModules();
    try {
        const f = makeLastLifeWorld(mod);
        const s = installSongs(f, mod);
        positionForTrigger(f);
        f.world.triggerY = -1;
        f.player.respawning = 3;
        s.old.suspendForLastLife();
        f.main.requestedSong = s.boss;
        f.main.extraLives = 1;
        let calls = 0;
        f.world.startBossCameraPan({
            panComplete() {
                calls++;
            }
        });
        f.tick();
        assert.equal(f.world.cameraY, 256);
        assert.equal(f.player.respawning, 2);
        assert.equal(s.old.lastLifeSuspended, false);
        assert.equal(calls, 0);
        f.main.applyRequestedSongChange();
        f.tick();
        assert.equal(f.world.cameraY, 252);
        assert.equal(f.player.respawning, 2);
        f.world.cameraY = 0; // Explicit destination-boundary fixture.
        f.tick();
        assert.equal(calls, 1);
        assert.equal(f.world.bossCameraPan, false);
        f.tick();
        assert.equal(calls, 1);
    } finally {
        await mod.server.close();
    }
});

test("all six boss-entry cues use queueGameplaySong without changing other requests", () => {
    const names = ["BOSS_BLUE_TANKS", "BOSS_STATUES", "BOSS_SHIP", "BOSS_HELICOPTER", "BOSS_GARAGE", "BOSS_HEADQUARTERS"];
    for (const [path, call] of [
        ["../pwa/src/jackal/GameMode.ts", "this.main.queueGameplaySong(this.main.bossSong)"],
        ["../desktop/src/jackal/GameMode.java", "main.queueGameplaySong(main.bossSong)"]
    ]) {
        const source = readFileSync(new URL(path, import.meta.url), "utf8");
        for (const name of names) {
            const start = source.indexOf(`case Triggers.${name}:`);
            assert.ok(start >= 0);
            const body = source.slice(start, source.indexOf("break;", start));
            assert.ok(body.includes(call), name);
            assert.doesNotMatch(body, /\.requestSong\([^;]*bossSong/);
        }
        assert.equal(source.split(call).length - 1, 6);
    }
});

test("latest gameplay queue, first cue, close and callback ownership retain exact intent", async () => {
    const mod = await loadLastLifeModules();
    try {
        const f = makeLastLifeWorld(mod),
            s = installSongs(f, mod);
        f.player.respawning = 4;
        f.main.suspendMusicForLastLife();
        f.main.queueGameplaySong(s.boss);
        f.main.queueGameplaySong(s.old);
        assert.equal(f.main.requestedSong, s.old);
        assert.equal(s.part.position, 7.25);
        f.main.closeRequestedFlag = true;
        f.main.queueGameplaySong(s.boss);
        assert.equal(f.main.requestedSong, s.old);
        f.main.closeRequestedFlag = false;
        f.main.extraLives = 1;
        f.player.update();
        assert.equal(s.part.state, "playing");
        assert.equal(s.part.position, 7.25);
        positionForTrigger(f);
        f.player.respawning = 0;
        f.world.triggerY = -1;
        f.world.cameraY = 4;
        let callbacks = 0;
        f.world.startBossCameraPan({
            panComplete() {
                callbacks++;
                f.main.requestMode(mod.Modes.CONTINUE);
            }
        });
        const before = f.player.x;
        f.tick();
        assert.equal(callbacks, 1);
        assert.equal(f.main.mode.destination, mod.Modes.CONTINUE);
        assert.equal(f.player.x, before);
        assert.equal(f.world.bossCameraPan, false);
    } finally {
        await mod.server.close();
    }
});

test("six real managers defer readiness and consume their trigger exactly once", async () => {
    const mod = await loadLastLifeModules();
    try {
        const { Triggers } = await mod.server.ssrLoadModule("/src/jackal/Triggers.ts");
        for (const name of ["BOSS_BLUE_TANKS", "BOSS_STATUES", "BOSS_SHIP", "BOSS_HELICOPTER", "BOSS_GARAGE", "BOSS_HEADQUARTERS"]) {
            const f = makeLastLifeWorld(mod),
                s = installSongs(f, mod);
            positionForTrigger(f);
            f.world.triggerMap[7] = [[Triggers[name], 0, 0]];
            f.player.explode();
            f.player.respawning = 8;
            f.tick();
            const manager = f.world.cameraPanListener;
            assert.ok(manager.constructor.name.endsWith("Manager"));
            const initial = f.world.elements.flatMap((list) => [...list]).filter((e) => e.constructor === manager.constructor).length;
            for (let n = 0; n < 7; n++) f.tick();
            assert.equal(initial, 1);
            assert.equal(f.world.triggerY, 7);
            assert.equal(manager.ready, false);
            assert.equal(f.world.cameraY, 256);
            assert.equal(f.main.mode.destination, mod.Modes.CONTINUE);
            assert.equal(
                s.bossPart.events.some((e) => e[0] === "play"),
                false
            );
            assert.equal(f.world.elements.flatMap((list) => [...list]).filter((e) => e.constructor === manager.constructor).length, 1);
        }
    } finally {
        await mod.server.close();
    }
});
