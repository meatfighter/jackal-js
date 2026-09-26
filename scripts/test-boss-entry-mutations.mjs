import assert from "node:assert/strict";
import { test } from "node:test";
import { loadLastLifeModules, makeLastLifeWorld } from "./last-life-test-utils.mjs";
import { installSongs, positionForTrigger } from "./boss-entry-test-utils.mjs";
function change(source, from, to) {
    assert.ok(source.includes(from), "Missing mutation target");
    return source.replace(from, to);
}
async function exercise(transforms = {}) {
    const mod = await loadLastLifeModules(transforms);
    try {
        const { Triggers } = await mod.server.ssrLoadModule("/src/jackal/Triggers.ts");
        for (const name of ["BOSS_BLUE_TANKS", "BOSS_STATUES", "BOSS_SHIP", "BOSS_HELICOPTER", "BOSS_GARAGE", "BOSS_HEADQUARTERS"]) {
            const f = makeLastLifeWorld(mod),
                s = installSongs(f, mod);
            positionForTrigger(f);
            f.world.triggerMap[7] = [[Triggers[name], 0, 0]];
            f.player.respawning = 8;
            f.main.suspendMusicForLastLife();
            f.tick();
            f.main.applyRequestedSongChange();
            assert.equal(s.old.lastLifeSuspended, true, "Boss cue cannot cancel hold");
            f.tick();
            assert.equal(f.player.respawning, 6, "Deferred world must advance death");
            assert.equal(f.world.cameraY, 256);
            assert.equal(
                f.world.elements.flatMap((l) => [...l]).filter((e) => e.constructor === f.world.cameraPanListener.constructor).length,
                1,
                "Trigger cannot retry"
            );
        }
        {
            const f = makeLastLifeWorld(mod);
            positionForTrigger(f);
            f.world.triggerY = -1;
            f.player.respawning = 3;
            f.world.startBossCameraPan({ panComplete() {} });
            f.tick();
            assert.equal(f.player.respawning, 2, "Zero-reserve death without song still advances");
            assert.equal(f.world.cameraY, 256);
        }
        for (const state of ["none", "finished"]) {
            const f = makeLastLifeWorld(mod),
                s = installSongs(f, mod);
            f.player.respawning = 3;
            if (state === "none") f.main.currentSong = null;
            else s.old.stop();
            f.main.queueGameplaySong(s.boss);
            f.main.applyRequestedSongChange();
            assert.equal(s.boss.lastLifeSuspended, true, "New cue must be silent");
        }
        const f = makeLastLifeWorld(mod),
            s = installSongs(f, mod);
        positionForTrigger(f);
        f.world.triggerY = -1;
        f.player.respawning = 3;
        s.old.suspendForLastLife();
        f.main.extraLives = 1;
        let calls = 0;
        f.world.startBossCameraPan({
            panComplete() {
                calls++;
            }
        });
        f.tick();
        assert.equal(f.player.respawning, 2, "Positive hold needs Player checkpoint");
        assert.equal(s.part.position, 7.25);
        assert.equal(s.part.events.filter((e) => e[0] === "resume").length, 1);
        f.world.cameraY = 0;
        f.tick();
        f.tick();
        assert.equal(calls, 1, "Destination settles once");
    } finally {
        await mod.server.close();
    }
}
test("entry counterexamples fail behavioral assertions and leave green production intact", async (t) => {
    await exercise();
    const mutants = [];
    for (const name of ["BOSS_BLUE_TANKS", "BOSS_STATUES", "BOSS_SHIP", "BOSS_HELICOPTER", "BOSS_GARAGE", "BOSS_HEADQUARTERS"])
        mutants.push([
            name + " authoritative cue",
            "GameMode",
            (s) => {
                const start = s.indexOf("case Triggers." + name + ":"),
                    end = s.indexOf("break;", start);
                return s.slice(0, start) + change(s.slice(start, end), "queueGameplaySong", "requestSong") + s.slice(end);
            }
        ]);
    mutants.push(
        [
            "queue cancels held song",
            "Main",
            (s) => change(s, "public queueGameplaySong(song: Song): void {", "public queueGameplaySong(song: Song): void { this.requestSong(song);")
        ],
        ["new absent/finished cue leaks", "Main", (s) => change(s, "        song.suspendForLastLife();", "        song.play();")],
        ["positive hold ignored", "GameMode", (s) => change(s, " || this.main.currentSong?.lastLifeSuspended === true", "")],
        ["zero-reserve death ignored", "GameMode", (s) => change(s, "this.main.extraLives === 0 || ", "")],
        [
            "whole world early return",
            "GameMode",
            (s) =>
                change(
                    s,
                    "public update(gc: GameContainer): void {",
                    "public update(gc: GameContainer): void { if(this.bossCameraPan && this.isBossEntryBlockedByDeath()) return;"
                )
        ],
        [
            "trigger row retries",
            "GameMode",
            (s) =>
                change(
                    s,
                    "        this.processTriggers();",
                    "        this.processTriggers(); if(this.bossCameraPan && this.isBossEntryBlockedByDeath()) this.triggerY++;"
                )
        ],
        [
            "zero-distance stranded",
            "GameMode",
            (s) =>
                change(
                    s,
                    "if (this.bossCameraPan && !this.isBossEntryBlockedByDeath()) {",
                    "if (this.bossCameraPan && this.cameraY !== 0 && !this.isBossEntryBlockedByDeath()) {"
                )
        ],
        ["interrupted recovery restarts", "Song", (s) => change(s, "        this.resume();", "        this.stop(); this.play();")]
    );
    for (const [name, owner, transform] of mutants)
        await t.test(name, () =>
            assert.rejects(
                exercise({ [owner]: transform }),
                (error) => error instanceof assert.AssertionError && !error.message.includes("Missing mutation target")
            )
        );
    await exercise();
});
