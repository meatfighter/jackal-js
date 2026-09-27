import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "./vite-test-server.mjs";
import { loadLastLifeModules, makeLastLifeWorld } from "./last-life-test-utils.mjs";

class Part {
    constructor(state = "playing", position = 7.25) {
        this.state = state;
        this.position = position;
        this.events = [];
    }

    getTransportState() {
        return this.state;
    }

    isTransportActive() {
        return this.state === "playing" || this.state === "paused";
    }

    pause() {
        if (this.state === "playing") {
            this.state = "paused";
            this.events.push(["pause", this.position]);
        }
    }

    resume() {
        if (this.state === "paused") {
            this.state = "playing";
            this.events.push(["resume", this.position]);
        }
    }

    stop() {
        this.state = "stopped";
        this.position = 0;
        this.events.push(["stop"]);
    }

    play() {
        this.state = "playing";
        this.position = 0;
        this.events.push(["play"]);
    }

    loop() {
        this.play();
    }
}

test("last-life suspension uses real Song/Main policy and preserves an interrupted offset", async () => {
    const server = await createServer({
        root: fileURLToPath(new URL("../pwa/", import.meta.url)),
        configFile: false,
        appType: "custom",
        logLevel: "silent",
        server: { middlewareMode: true, watch: null }
    });
    try {
        const { Song } = await server.ssrLoadModule("/src/jackal/Song.ts");
        const { Main } = await server.ssrLoadModule("/src/jackal/Main.ts");
        for (const active of ["intro", "intro2", "loop"]) {
            const parts = {
                intro: new Part("stopped", 0),
                intro2: new Part("stopped", 0),
                loop: new Part("stopped", 0)
            };
            parts[active] = new Part();
            const song = Song.fromTwoIntrosAndLoopMusic(parts.intro, parts.intro2, parts.loop);
            song.playing = true;
            song.playedIntro2 = active !== "intro";
            const main = Object.assign(Object.create(Main.prototype), {
                closeRequestedFlag: false,
                currentSong: song,
                requestedSong: song
            });
            const sequencing = song.playedIntro2;
            main.suspendMusicForLastLife();
            for (let i = 0; i < 100; i++) {
                main.applyRequestedSongChange();
                song.update();
                song.resume(); // Gameplay resume must not release a death hold.
            }
            assert.equal(main.isSongPlaying(), false);
            assert.equal(parts[active].getTransportState(), "paused");
            assert.equal(parts[active].position, 7.25);
            assert.equal(song.playedIntro2, sequencing);
            assert.deepEqual(parts[active].events, [["pause", 7.25]]);
            main.resumeMusicAfterLastLife();
            main.resumeMusicAfterLastLife();
            assert.equal(parts[active].getTransportState(), "playing");
            assert.equal(parts[active].position, 7.25);
            assert.deepEqual(parts[active].events, [
                ["pause", 7.25],
                ["resume", 7.25]
            ]);
            assert.equal(song.lastLifeSuspended, false);
        }
    } finally {
        await server.close();
    }
});

async function policyModules(run) {
    const s = await createServer({
        root: fileURLToPath(new URL("../pwa/", import.meta.url)),
        configFile: false,
        appType: "custom",
        logLevel: "silent",
        server: { middlewareMode: true, watch: null }
    });
    try {
        await run((await s.ssrLoadModule("/src/jackal/Song.ts")).Song, (await s.ssrLoadModule("/src/jackal/Main.ts")).Main);
    } finally {
        await s.close();
    }
}
function policyMain(Main, current, requested = current) {
    return Object.assign(Object.create(Main.prototype), { closeRequestedFlag: false, currentSong: current, requestedSong: requested });
}
test("last-life request ownership: queued replacement, null, first song, authoritative same song and cancellation", () =>
    policyModules((Song, Main) => {
        for (const requestedKind of ["different", "null", "same"]) {
            const part = new Part();
            const song = Song.fromIntroMusic(part);
            song.playing = true;
            const next = requestedKind === "different" ? Song.fromIntroMusic(new Part("stopped", 0)) : requestedKind === "same" ? song : null;
            const m = policyMain(Main, song, next);
            m.suspendMusicForLastLife();
            m.applyRequestedSongChange();
            assert.equal(m.requestedSong, next);
            assert.equal(m.currentSong, song);
            assert.equal(part.state, "paused");
            m.resumeMusicAfterLastLife();
            if (next !== song) {
                assert.equal(m.currentSong, null);
                assert.ok(!part.events.some((e) => e[0] === "resume"));
                m.applyRequestedSongChange();
                assert.equal(m.currentSong, next);
            } else assert.equal(part.position, 7.25);
        }
        for (const same of [false, true]) {
            const song = Song.fromIntroMusic(new Part());
            song.playing = true;
            const m = policyMain(Main, song);
            m.suspendMusicForLastLife();
            const next = same ? song : Song.fromIntroMusic(new Part("stopped"));
            m.requestSong(next);
            assert.equal(song.lastLifeSuspended, false);
            assert.equal(m.currentSong, null);
            m.resumeMusicAfterLastLife();
            m.applyRequestedSongChange();
            assert.equal(m.currentSong, next);
            assert.equal(next.intro.state, "playing");
        }
        const queued = Song.fromIntroMusic(new Part("stopped"));
        const m = policyMain(Main, null, queued);
        m.suspendMusicForLastLife();
        assert.equal(m.currentSong, queued);
        assert.equal(queued.playing, false);
        m.applyRequestedSongChange();
        assert.equal(queued.intro.events.length, 0);
        m.resumeMusicAfterLastLife();
        assert.deepEqual(queued.intro.events, [["play"]]);
        const done = Song.fromIntroMusic(new Part("stopped"));
        const finished = policyMain(Main, done);
        finished.suspendMusicForLastLife();
        assert.equal(finished.currentSong, null);
        assert.equal(done.lastLifeSuspended, false);
    }));
test("ended and null active-part boundaries freeze sequencing, then proceed without replaying interrupted intro", () =>
    policyModules((Song, Main) => {
        for (const state of ["ended-pending", "stopped"]) {
            const intro = new Part(state, 7.25),
                second = new Part("stopped"),
                loop = new Part("stopped");
            const song = Song.fromTwoIntrosAndLoopMusic(intro, second, loop);
            song.playing = true;
            const m = policyMain(Main, song);
            m.suspendMusicForLastLife();
            for (let i = 0; i < 100; i++) song.update();
            assert.equal(song.playedIntro2, false);
            assert.equal(second.events.length, 0);
            m.resumeMusicAfterLastLife();
            assert.equal(intro.events.length, 0);
            song.update();
            assert.equal(song.playedIntro2, true);
            assert.deepEqual(second.events, [["play"]]);
        }
    }));
test("repeated and later holds recover once; strong stop, mode replacement and close never resurrect held transport", () =>
    policyModules((Song, Main) => {
        for (const action of ["stop", "mode", "close"]) {
            const part = new Part(),
                song = Song.fromIntroMusic(part);
            song.playing = true;
            const m = policyMain(Main, song);
            m.suspendMusicForLastLife();
            m.resumeMusicAfterLastLife();
            m.suspendMusicForLastLife();
            assert.equal(part.events.filter((e) => e[0] === "pause").length, 2);
            if (action === "mode") {
                m.input = { clearKeyPressedRecord() {} };
                m.resetNextFrameTime = () => {};
                m.setMode({ init() {}, update() {} }, {});
            } else {
                m.stopAllSongs();
                if (action === "close") m.closeRequestedFlag = true;
            }
            m.resumeMusicAfterLastLife();
            assert.equal(song.lastLifeSuspended, false);
            assert.equal(part.state, "stopped");
            assert.equal(part.events.filter((e) => e[0] === "resume").length, 1);
        }
    }));

test("zero-reserve recorded death rejects Pause after authoritative music replacement", async () => {
    const mod = await loadLastLifeModules();
    try {
        const f = makeLastLifeWorld(mod),
            old = mod.Song.fromIntroMusic(new Part()),
            next = mod.Song.fromIntroMusic(new Part("stopped", 0));
        old.playing = true;
        f.main.currentSong = f.main.requestedSong = old;
        f.player.respawning = 3;
        f.main.suspendMusicForLastLife();
        f.main.requestSong(next);
        f.main.applyRequestedSongChange();
        assert.equal(old.lastLifeSuspended, false);
        assert.equal(f.main.isSongPlaying(), true);
        f.world.input.isPause = () => true;
        f.tick();
        assert.equal(f.world.paused, false, "New audible music cannot make a zero-reserve death pausable");
        assert.equal(f.player.respawning, 2, "Death continues after the rejected Pause");
        f.main.addPoints(20000);
        f.tick();
        assert.equal(f.world.paused, true, "Legitimate rescue restores normal Pause eligibility");
        assert.equal(next.intro.getTransportState(), "paused");
    } finally {
        await mod.server.close();
    }
});
