import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

// Execute the current production method bodies; replace only audio/time/world
// boundaries. This focused fixture is not a full engine or playback test.
function method(path, className, name) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const cls = file.statements.find((n) => ts.isClassDeclaration(n) && n.name?.text === className);
    const member = cls?.members.find((n) => ts.isMethodDeclaration(n) && n.name?.getText(file) === name);
    assert.ok(member?.body, `Missing ${className}.${name}`);
    return member.getText(file);
}
const mainMethods = ["playSound", "playSoundAlways", "stopAllSoundEffects"].map((name) => method("../pwa/src/jackal/Main.ts", "Main", name)).join("\n");
const worldUpdate = method("../pwa/src/jackal/GameMode.ts", "GameMode", "update");
const WORLD = Symbol("ordinary world reached");
function fixture(transform = (s) => s) {
    const events = [],
        sounds = [];
    let edge = false,
        now = 1000,
        soundOn = true,
        songAvailable = true;
    const store = {
        stopSoundEffects() {
            events.push("purge");
            for (const sound of sounds) sound.voices.length = 0;
        }
    };
    const source = `class Main { static MINIMUM_SOUND_TIME = 125; ${mainMethods} }
        class GameMode { ${transform(worldUpdate)} }`;
    const compiled = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }
    }).outputText;
    const { Main, GameMode } = new Function("SoundStore", `${compiled}; return { Main, GameMode };`)({ get: () => store });
    function sound(name, count) {
        const value = {
            voices: Array.from({ length: count }, (_, i) => `${name}.${i}`),
            attempts: 0,
            play() {
                this.attempts++;
                events.push(name);
                if (soundOn) this.voices.push(`${name}.new.${this.attempts}`);
            },
            stop() {
                this.voices.pop();
            }
        };
        sounds.push(value);
        return value;
    }
    const main = new Main(),
        world = new GameMode();
    const explosion = sound("explosion", 2),
        helicopter = sound("helicopter", 1),
        pause = sound("pause-cue", 1);
    const music = {
        position: 7.25,
        paused: false,
        pause() {
            events.push("music.pause");
            this.paused = true;
        },
        resume() {
            events.push("music.resume");
            this.paused = false;
        }
    };
    Object.assign(main, {
        incompleteCleanup: () => {
            events.push("purge");
            sounds.forEach((s) => s.stop());
        },
        closeRequestedFlag: false,
        extraLives: 1,
        lastPlayTime: new Map(),
        getSoundCooldownTime: () => now,
        isSongPlaying: () => songAvailable,
        pauseSound: pause,
        currentSong: music,
        requestedSong: music,
        resetNextFrameTime: () => events.push("clock.reset")
    });
    main.lastPlayTime.set(pause, now); // Existing 125-ms cooldown must not swallow an accepted cue.
    main.lastPlayTime.set(explosion, now - 50);
    Object.assign(world, {
        main,
        paused: false,
        stageCompletedFlag: false,
        playing: true,
        player: { respawning: 0 },
        input: {
            isPause: () => {
                const v = edge;
                edge = false;
                return v;
            }
        }
    });
    Object.defineProperty(world, "waterAlphaIndex", {
        get() {
            throw WORLD;
        }
    });
    const run = () => {
        try {
            world.update({});
            return "returned";
        } catch (e) {
            if (e === WORLD) return "world";
            throw e;
        }
    };
    return {
        main,
        world,
        music,
        explosion,
        helicopter,
        pause,
        sounds,
        events,
        run,
        press: () => {
            edge = true;
        },
        elapse: (ms) => {
            now += ms;
        },
        setSoundOn: (v) => {
            soundOn = v;
        },
        setSongAvailable: (v) => {
            songAvailable = v;
        }
    };
}
function assertPause(f) {
    const cooldowns = [...f.main.lastPlayTime];
    f.press();
    assert.equal(f.run(), "returned", "Pause must terminate before world work");
    assert.equal(f.world.paused, true);
    assert.deepEqual(f.events, ["purge", "pause-cue", "music.pause", "clock.reset"]);
    assert.equal(f.explosion.voices.length, 0);
    assert.equal(f.helicopter.voices.length, 0);
    assert.equal(f.pause.voices.length, 1, "Old pause cue retired; new one survives");
    assert.deepEqual([...f.main.lastPlayTime], cooldowns, "Do not clear or rewrite scheduling history");
    assert.equal(f.main.currentSong, f.music);
    assert.equal(f.main.requestedSong, f.music);
    assert.equal(f.music.position, 7.25);
}
test("accepted Pause purges first and plays a fresh unthrottled cue", () => assertPause(fixture()));
test("already-paused idle ticks do not repeatedly purge the pause cue", () => {
    const f = fixture();
    assertPause(f);
    f.events.length = 0;
    assert.equal(f.run(), "returned");
    assert.deepEqual(f.events, ["clock.reset"]);
    assert.equal(f.pause.voices.length, 1);
});
test("unpause resumes music but never recreates retired effects or stops the cue", () => {
    const f = fixture();
    assertPause(f);
    f.events.length = 0;
    f.press();
    assert.equal(f.run(), "returned");
    assert.equal(f.world.paused, false);
    assert.deepEqual(f.events, ["music.resume", "clock.reset"]);
    assert.equal(f.explosion.voices.length, 0);
    assert.equal(f.helicopter.voices.length, 0);
    assert.equal(f.pause.voices.length, 1);
    assert.equal(f.music.position, 7.25);
});
test("rapid re-pause gets a new cue despite the original 125-ms cooldown", () => {
    const f = fixture();
    assertPause(f);
    f.elapse(10);
    f.press();
    f.run();
    f.events.length = 0;
    f.elapse(10);
    assertPause(f);
    assert.equal(f.pause.attempts, 2);
});
for (const reason of ["no edge", "stage complete", "not playing", "last-life respawn", "no song"])
    test(`rejected Pause does not purge or play a cue: ${reason}`, () => {
        const f = fixture();
        if (reason !== "no edge") f.press();
        if (reason === "stage complete") f.world.stageCompletedFlag = true;
        if (reason === "not playing") f.world.playing = false;
        if (reason === "last-life respawn") {
            f.world.player.respawning = 1;
            f.main.extraLives = 0;
        }
        if (reason === "no song") f.setSongAvailable(false);
        assert.equal(f.run(), "world");
        assert.equal(f.world.paused, false);
        assert.deepEqual(f.events, []);
        assert.equal(f.explosion.voices.length, 2);
    });
test("Sound OFF is not overridden merely to force a pause cue", () => {
    const f = fixture();
    f.setSoundOn(false);
    f.press();
    f.run();
    assert.equal(f.world.paused, true);
    assert.equal(f.pause.attempts, 1);
    assert(f.sounds.every((s) => s.voices.length === 0));
});
test("mutation: missing purge fails behavior, not compilation", () => {
    const from = "this.main.stopAllSoundEffects();";
    assert(worldUpdate.includes(from));
    const f = fixture((s) => s.replace(from, ""));
    assert.throws(() => assertPause(f), assert.AssertionError);
});
test("mutation: cooldown-based cue fails behavior, not compilation", () => {
    const from = "this.main.playSoundAlways(this.main.pauseSound);";
    assert(worldUpdate.includes(from));
    const f = fixture((s) => s.replace(from, "this.main.playSound(this.main.pauseSound);"));
    assert.throws(() => assertPause(f), assert.AssertionError);
});

for (const [label, transform, probe] of [
    [
        "cue before purge",
        (s) =>
            s
                .replace("this.main.stopAllSoundEffects();", "this.main.playSoundAlways(this.main.pauseSound);")
                .replace(
                    "this.main.playSoundAlways(this.main.pauseSound);\n            this.main.currentSong",
                    "this.main.stopAllSoundEffects();\n            this.main.currentSong"
                ),
        assertPause
    ],
    [
        "purge on idle pause",
        (s) => s.replace("if (this.paused) {", "if (this.paused) { this.main.stopAllSoundEffects();"),
        (f) => {
            assertPause(f);
            f.events.length = 0;
            f.run();
            assert.deepEqual(f.events, ["clock.reset"]);
        }
    ],
    [
        "purge on unpause",
        (s) => s.replace("this.paused = false;", "this.paused = false; this.main.stopAllSoundEffects();"),
        (f) => {
            assertPause(f);
            f.press();
            f.run();
            assert.equal(f.pause.voices.length, 1);
        }
    ],
    ["incomplete per-Sound cleanup", (s) => s.replace("this.main.stopAllSoundEffects();", "this.main.incompleteCleanup();"), assertPause]
])
    test(`mutation: ${label} fails its behavioral assertion`, () => {
        const changed = transform(worldUpdate);
        assert.notEqual(changed, worldUpdate);
        const f = fixture(() => changed);
        assert.throws(() => probe(f), assert.AssertionError);
    });
