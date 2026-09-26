import assert from "node:assert/strict";
import { test } from "node:test";
import { loadLastLifeModules, makeLastLifeWorld } from "./last-life-test-utils.mjs";
function change(source, from, to) {
    assert.ok(source.includes(from), "Mutation target must exist");
    return source.replace(from, to);
}
class Part {
    constructor(state = "playing") {
        this.state = state;
        this.position = 7.25;
        this.events = [];
    }

    getTransportState() {
        return this.state;
    }

    isTransportActive() {
        return ["playing", "paused"].includes(this.state);
    }

    pause() {
        if (this.state === "playing") {
            this.state = "paused";
            this.events.push("pause");
        }
    }

    resume() {
        if (this.state === "paused") {
            this.state = "playing";
            this.events.push("resume");
        }
    }

    stop() {
        this.state = "stopped";
        this.position = 0;
        this.events.push("stop");
    }

    play() {
        this.state = "playing";
        this.position = 0;
        this.events.push("play");
    }

    loop() {
        this.play();
    }
}
async function checkPolicy(transforms = {}) {
    const mod = await loadLastLifeModules(transforms);
    try {
        let f = makeLastLifeWorld(mod);
        f.player.respawning = 1;
        f.world.stageCompleted();
        f.tick();
        assert.equal(f.main.mode.destination, mod.Modes.CONTINUE, "recorded death cannot be erased by completion");
        f = makeLastLifeWorld(mod);
        f.player.respawning = 3;
        f.world.stageCompleted();
        f.world.stageCompletedDelay = 1;
        f.tick();
        assert.equal(f.player.respawning, 2, "waiting must continue simulation");
        assert.equal(f.world.stageCompletedDelay, 1, "exit waits at one");
        assert.equal(f.main.fading, false, "pending death cannot fade");
        f = makeLastLifeWorld(mod);
        f.player.respawning = 2;
        const tank = new mod.BossSuperTank(100, 100);
        tank.state = mod.BossSuperTank.STATE_EXPLODED;
        tank.delay = 1;
        tank.update();
        assert.equal(f.world.playing, true, "ending permission precedes cinematic ownership");
        assert.equal(tank.state, mod.BossSuperTank.STATE_EXPLODED, "unaccepted ending remains pending");
        assert.equal(tank.delay, 1, "ending final step must stay positive");
        f = makeLastLifeWorld(mod);
        const part = new Part(),
            second = new Part("stopped"),
            song = mod.Song.fromTwoIntrosAndLoopMusic(part, second, new Part("stopped"));
        song.playing = true;
        f.main.currentSong = f.main.requestedSong = song;
        f.main.suspendMusicForLastLife();
        assert.equal(part.state, "paused");
        f.player.respawning = 1;
        f.main.score = 19999;
        f.main.addPoints(1);
        assert.equal(part.state, "paused", "score callbacks cannot resume before cleanup");
        f.player.update();
        assert.equal(f.main.extraLives, 0);
        assert.equal(part.position, 7.25, "recovery retains offset");
        assert.deepEqual(part.events, ["pause", "resume"], "interrupted playback resumes once");
        f.main.suspendMusicForLastLife();
        song.stop();
        assert.equal(song.lastLifeSuspended, false, "strong stop clears logical recovery");
        f = makeLastLifeWorld(mod);
        const ended = new Part("ended-pending"),
            next = new Part("stopped"),
            held = mod.Song.fromTwoIntrosAndLoopMusic(ended, next, new Part("stopped"));
        held.playing = true;
        f.main.currentSong = held;
        f.main.requestedSong = mod.Song.fromIntroMusic(new Part("stopped"));
        f.main.suspendMusicForLastLife();
        held.update();
        assert.equal(held.playedIntro2, false, "hold freezes sequencer at backend part boundary");
        f.main.applyRequestedSongChange();
        assert.equal(f.main.currentSong, held, "pre-existing request cannot leak during hold");
    } finally {
        await mod.server.close();
    }
}
test("behavioral last-life counterexamples reach assertions; original source stays green", async (t) => {
    await checkPolicy();
    const mutants = [
        [
            "completed objective erases death",
            "Player",
            (s) =>
                change(
                    s,
                    "} else {\n                    if (this.main.konamiCode",
                    "} else if (!this.gameMode.stageCompletedFlag) {\n                    if (this.main.konamiCode"
                )
        ],
        ["ordinary exit bypasses last-positive gate", "GameMode", (s) => change(s, "(this.stageCompletedDelay > 1 || this.player.respawning === 0) &&", "")],
        [
            "ending gate consumes waiting step",
            "BossSuperTank",
            (s) =>
                change(
                    s,
                    "} else if (this.delay === 1 && this.gameMode.tryStartEndingCameraPan(this)) {",
                    "} else if (--this.delay === 0 && this.gameMode.tryStartEndingCameraPan(this)) {"
                )
        ],
        [
            "cinematic ownership acquired before acceptance",
            "GameMode",
            (s) =>
                change(
                    s,
                    "if (this.main.mode !== this || this.player.respawning !== 0) {",
                    "this.playing = false;\n        if (this.main.mode !== this || this.player.respawning !== 0) {"
                )
        ],
        [
            "whole world frozen while waiting",
            "GameMode",
            (s) => change(s, "public update(gc: GameContainer): void {", "public update(gc: GameContainer): void { if(this.player.respawning > 0) return;")
        ],
        ["stop/play recovery loses offset", "Song", (s) => change(s, "    this.resume();", "    this.stop(); this.play();")],
        ["sequencer ignores last-life reason", "Song", (s) => change(s, "this.lastLifeSuspended || !this.playing ||", "!this.playing ||")],
        [
            "gainExtraLife prematurely resumes",
            "Main",
            (s) => change(s, "public gainExtraLife(): void {", "public gainExtraLife(): void { this.resumeMusicAfterLastLife();")
        ],
        ["scheduler leaks pre-existing request", "Main", (s) => change(s, "if (this.currentSong?.lastLifeSuspended) return;", "")],
        [
            "strong stop leaves recovery armed",
            "Song",
            (s) => change(s, "public stop(): void {\n        this.lastLifeSuspended = false;", "public stop(): void {")
        ]
    ];
    for (const [name, owner, transform] of mutants)
        await t.test(name, () =>
            assert.rejects(checkPolicy({ [owner]: transform }), (error) => error instanceof assert.AssertionError && !error.message.includes("Mutation target"))
        );
    await checkPolicy();
});
