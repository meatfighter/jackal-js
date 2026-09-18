import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slickModuleUrl = import.meta.resolve("slick2d-ts");
const mainSource = readFileSync(new URL("../pwa/src/jackal/Main.ts", import.meta.url), "utf8");
const registrySource = readFileSync(new URL("../pwa/src/jackal/AudioRegistry.ts", import.meta.url), "utf8");
const audioSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateAudio.ts", import.meta.url), "utf8");
const fieldsSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateFields.ts", import.meta.url), "utf8");
const webAppSource = readFileSync(new URL("../pwa/src/app/JackalWebApp.ts", import.meta.url), "utf8");
const gameModeSource = readFileSync(new URL("../pwa/src/jackal/GameMode.ts", import.meta.url), "utf8");
const songSource = readFileSync(new URL("../pwa/src/jackal/Song.ts", import.meta.url), "utf8");

function compileModule(source) {
    const output = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

async function loadSongModule() {
    const fakeMusicUrl = compileModule(`
        export class Music {
            constructor() {
                this.state = "stopped";
                this.pauseCalls = 0;
                this.resumeCalls = 0;
                this.playCalls = 0;
                this.loopCalls = 0;
            }
            getTransportState() { return this.state; }
            isTransportActive() { return this.state === "playing" || this.state === "paused"; }
            play() { this.playCalls++; this.state = "playing"; }
            loop() { this.loopCalls++; this.state = "playing"; }
            stop() { this.state = "stopped"; }
            pause() { if (this.state === "playing") { this.pauseCalls++; this.state = "paused"; } }
            resume() { if (this.state === "paused") { this.resumeCalls++; this.state = "playing"; } }
        }
    `);
    const songUrl = compileModule(songSource.replace(`from "slick2d-ts"`, `from "${fakeMusicUrl}"`));
    const [{ Song }, { Music }] = await Promise.all([import(songUrl), import(fakeMusicUrl)]);
    return { Song, Music };
}

async function loadAudioModules() {
    const registryUrl = compileModule(registrySource);
    const fieldsUrl = compileModule(fieldsSource);
    const mainConstantsUrl = compileModule("export class MainConstants { static MINIMUM_SOUND_TIME = 125; }");
    const songUrl = compileModule(songSource.replace(`from "slick2d-ts"`, `from "${slickModuleUrl}"`));
    const audioUrl = compileModule(
        audioSource
            .replace(`from "slick2d-ts"`, `from "${slickModuleUrl}"`)
            .replace(`from "../../java/MainConstants.js"`, `from "${mainConstantsUrl}"`)
            .replace(`from "../AudioRegistry.js"`, `from "${registryUrl}"`)
            .replace(`from "./GameStateFields.js"`, `from "${fieldsUrl}"`)
    );
    const [registry, audio, songModule] = await Promise.all([import(registryUrl), import(audioUrl), import(songUrl)]);
    return { registry, audio, Song: songModule.Song };
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function voice(overrides = {}) {
    return {
        looped: false,
        playbackRate: 1,
        positionSeconds: 0.05,
        gain: 1,
        spatialPosition: null,
        ...overrides
    };
}

function playback(voices = [], activeVoiceIndex = voices.length === 0 ? null : voices.length - 1) {
    return { voices, activeVoiceIndex };
}

class FakeSound {
    constructor(state = playback()) {
        this.state = clone(state);
        this.restoreCalls = [];
    }

    capturePlaybackState() {
        return clone(this.state);
    }

    restorePlaybackState(state) {
        this.state = clone(state);
        this.restoreCalls.push(clone(state));
    }

    play() {
        const voices = [...this.state.voices, voice()];
        this.state = playback(voices, voices.length - 1);
    }
}

function fakeMain(soundIds) {
    const main = {
        lastPlayTime: new Map(),
        currentSong: null,
        requestedSong: null,
        browserRuntimeActive: true,
        stopCount: 0,
        isBrowserRuntimeActive() {
            return this.browserRuntimeActive;
        },
        stopAllSounds() {
            this.stopCount++;
            for (const id of soundIds) {
                this[id].state = playback();
            }
        }
    };
    for (const id of soundIds) {
        main[id] = new FakeSound();
    }
    return main;
}

function declaredMainSoundFields() {
    const file = ts.createSourceFile("Main.ts", mainSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const result = [];
    for (const statement of file.statements) {
        if (!ts.isClassDeclaration(statement) || statement.name?.text !== "Main") {
            continue;
        }
        for (const member of statement.members) {
            if (!ts.isPropertyDeclaration(member) || member.type?.getText(file) !== "Sound" || !ts.isIdentifier(member.name)) {
                continue;
            }
            result.push(member.name.text);
        }
    }
    return result;
}

function collectAudioPolicySetterCalls(directory, relative = "") {
    const calls = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            calls.push(...collectAudioPolicySetterCalls(path, childRelative));
            continue;
        }
        if (!entry.isFile() || !entry.name.endsWith(".ts")) {
            continue;
        }
        const source = readFileSync(path, "utf8");
        for (const method of ["setMusicOn", "setSoundsOn", "setSoundOn"]) {
            const matches = source.match(new RegExp(`\\.${method}\\s*\\(`, "g")) ?? [];
            for (let i = 0; i < matches.length; i++) {
                calls.push(`pwa/src/${childRelative}:${method}`);
            }
        }
    }
    return calls.sort();
}

function functionBody(source, signature) {
    const start = source.indexOf(signature);
    assert.notEqual(start, -1, `Missing ${signature}.`);
    const next = source.indexOf("\n    private ", start + signature.length);
    return source.slice(start, next === -1 ? source.length : next);
}

test("AudioRegistry exactly covers Main Sound fields and rejects identity aliases", async () => {
    const { registry } = await loadAudioModules();
    const declared = declaredMainSoundFields();
    assert.equal(declared.length, 25);
    assert.equal(registry.SOUND_FIELD_NAMES.length, 25);
    assert.equal(new Set(registry.SOUND_FIELD_NAMES).size, 25);
    assert.deepEqual([...registry.SOUND_FIELD_NAMES].sort(), [...declared].sort());

    const main = fakeMain(registry.SOUND_FIELD_NAMES);
    assert.equal(registry.registeredSounds(main).length, 25);

    main.enemyHitSound = main.bulletHitSound;
    assert.throws(() => registry.registeredSounds(main), /aliased Sound object/);

    const incomplete = fakeMain(registry.SOUND_FIELD_NAMES);
    incomplete.wellDoneSound = null;
    assert.throws(() => registry.registeredSounds(incomplete), /registry is incomplete/);
});

test("capture includes every registered active Sound in deterministic order without global audio policy", async () => {
    const { registry, audio } = await loadAudioModules();
    const main = fakeMain(registry.SOUND_FIELD_NAMES);
    for (let i = 0; i < registry.SOUND_FIELD_NAMES.length; i++) {
        main[registry.SOUND_FIELD_NAMES[i]].state = playback([voice({ positionSeconds: 0.01 * (i + 1) })], 0);
    }

    const snapshot = audio.captureAudioStateSnapshot(main);
    assert.equal("musicOn" in snapshot, false);
    assert.equal("soundOn" in snapshot, false);
    assert.deepEqual(
        snapshot.sounds.map(({ id }) => id),
        [...registry.SOUND_FIELD_NAMES]
    );
});

test("audio capture is sparse, preserves overlaps and snapshots independent remaining cooldown", async () => {
    const { registry, audio } = await loadAudioModules();
    const main = fakeMain(registry.SOUND_FIELD_NAMES);
    main.helicopterSound.state = playback([voice({ looped: true, positionSeconds: 1.25 })], 0);
    main.explodeSound.state = playback([voice({ positionSeconds: 0.1 }), voice({ positionSeconds: 0.2 })], null);
    main.machineGunSound.state = playback([voice({ positionSeconds: 0.03 })], 0);
    main.lastPlayTime.set(main.extraLifeSound, Date.now() - 20);
    main.lastPlayTime.set(main.machineGunSound, Date.now() - 40);
    main.lastPlayTime.set(main.missileSound, Date.now() - 500);

    const snapshot = audio.captureAudioStateSnapshot(main);
    assert.deepEqual(
        snapshot.sounds.map(({ id }) => id),
        ["explodeSound", "helicopterSound", "machineGunSound"]
    );
    assert.equal(snapshot.sounds.find(({ id }) => id === "explodeSound").playback.voices.length, 2);
    assert.equal(snapshot.sounds.find(({ id }) => id === "explodeSound").playback.activeVoiceIndex, null);
    assert.equal(snapshot.sounds.find(({ id }) => id === "helicopterSound").playback.voices[0].positionSeconds, 1.25);
    assert.deepEqual(
        snapshot.cooldowns.map(({ id }) => id),
        ["extraLifeSound", "machineGunSound"]
    );
    assert.equal(
        snapshot.sounds.some(({ id }) => id === "extraLifeSound"),
        false,
        "cooldown state must not require an active waveform"
    );
    assert.ok(snapshot.cooldowns[0].remainingMs >= 80 && snapshot.cooldowns[0].remainingMs <= 125);
    assert.ok(snapshot.cooldowns[1].remainingMs >= 60 && snapshot.cooldowns[1].remainingMs <= 125);
});

test("audio restore is exhaustive and reconstructs repeat suppression without a wall-clock timestamp", async () => {
    const { registry, audio } = await loadAudioModules();
    const main = fakeMain(registry.SOUND_FIELD_NAMES);
    main.extraLifeSound.state = playback([voice()], 0);
    main.lastPlayTime.set(main.extraLifeSound, Date.now());

    const helicopter = playback([voice({ looped: true, positionSeconds: 1.75 })], 0);
    const machineGun = playback([voice({ looped: true, positionSeconds: 0.04 })], 0);
    const overlapping = playback([voice({ positionSeconds: 0.1 }), voice({ positionSeconds: 0.2 })], null);
    const snapshot = {
        requestedSongId: null,
        currentSongState: null,
        audioState: {
            sounds: [
                { id: "explodeSound", playback: overlapping },
                { id: "helicopterSound", playback: helicopter },
                { id: "machineGunSound", playback: machineGun }
            ],
            cooldowns: [{ id: "machineGunSound", remainingMs: 80 }]
        }
    };
    audio.restoreAudioPlayback(main, snapshot);
    assert.equal(main.stopCount, 1);
    assert.deepEqual(main.helicopterSound.state, helicopter);
    assert.deepEqual(main.machineGunSound.state, machineGun);
    assert.deepEqual(main.explodeSound.state, overlapping);
    assert.deepEqual(main.extraLifeSound.state, playback());
    for (const id of registry.SOUND_FIELD_NAMES) {
        assert.equal(main[id].restoreCalls.length, 1, `${id} must receive exactly one captured-or-empty restore.`);
    }

    assert.equal(main.lastPlayTime.size, 1);
    const reconstructedElapsed = Date.now() - main.lastPlayTime.get(main.machineGunSound);
    assert.ok(reconstructedElapsed >= 45 && reconstructedElapsed < 70, `unexpected reconstructed cooldown elapsed time: ${reconstructedElapsed}`);

    const beforeVoices = main.machineGunSound.state.voices.length;
    const lastPlayTime = main.lastPlayTime.get(main.machineGunSound);
    const now = Date.now();
    if (lastPlayTime === undefined || now - lastPlayTime > 125) {
        main.machineGunSound.play();
        main.lastPlayTime.set(main.machineGunSound, now);
    }
    assert.equal(main.machineGunSound.state.voices.length, beforeVoices, "restored cooldown must suppress an immediate duplicate Sound voice");
});

test("failed audio restore cannot mutate application audio policy", async () => {
    const { registry, audio } = await loadAudioModules();
    const { SoundStore } = await import("slick2d-ts");
    const main = fakeMain(registry.SOUND_FIELD_NAMES);
    const store = SoundStore.get();
    store.setMusicOn(false);
    store.setSoundsOn(true);

    main.explodeSound.restorePlaybackState = () => {
        throw new Error("Injected Jackal audio restore failure.");
    };
    const snapshot = {
        requestedSongId: null,
        currentSongState: null,
        audioState: {
            sounds: [{ id: "explodeSound", playback: playback([voice()], 0) }],
            cooldowns: []
        }
    };

    try {
        assert.throws(() => audio.restoreAudioPlayback(main, snapshot), /Injected Jackal audio restore failure/);
        assert.equal(store.musicOn(), false);
        assert.equal(store.soundsOn(), true);
    } finally {
        store.destroy();
    }
});

test("Sound persistence uses public logical transport APIs and true all-voice cleanup", () => {
    assert.match(audioSource, /capturePlaybackState\(\)/);
    assert.match(audioSource, /restorePlaybackState\(/);
    assert.match(audioSource, /registeredSounds\(main\)/);
    assert.match(audioSource, /SoundStore\.get\(\)\.stopSoundEffects\(\)/);
    assert.doesNotMatch(audioSource, /\b(?:musicOn|soundOn|setMusicOn|setSoundOn)\b/);
    assert.doesNotMatch(audioSource, /\.ref\b|sourceId|AudioBufferSourceNode|Reflect\./);
});

test("Song pause/resume preserves intro, intro2, and loop sequencing", async () => {
    const { Song, Music } = await loadSongModule();
    const intro = new Music();
    const intro2 = new Music();
    const loop = new Music();
    const song = Song.fromTwoIntrosAndLoopMusic(intro, intro2, loop);

    song.play();
    assert.equal(intro.state, "playing");
    assert.equal(song.playedIntro2, false);

    song.pause();
    assert.equal(intro.state, "paused");
    song.update();
    assert.equal(intro2.state, "stopped", "paused intro must remain the active Song part");
    song.resume();
    assert.equal(intro.state, "playing");

    intro.state = "stopped";
    song.update();
    assert.equal(intro2.state, "playing");
    assert.equal(song.playedIntro2, true);

    song.pause();
    assert.equal(intro2.state, "paused");
    song.update();
    assert.equal(loop.state, "stopped", "paused intro2 must not advance to loop");
    song.resume();
    assert.equal(intro2.state, "playing");

    intro2.state = "stopped";
    song.update();
    assert.equal(loop.state, "playing");

    song.pause();
    assert.equal(loop.state, "paused");
    song.update();
    assert.equal(loop.loopCalls, 1, "paused loop must not be restarted by Song.update()");
    song.resume();
    assert.equal(loop.state, "playing");
    assert.equal(loop.resumeCalls, 1);
});

test("only the PWA shell may mutate global Music/Sound enable policy", () => {
    const calls = collectAudioPolicySetterCalls(resolve(rootDir, "pwa", "src"));
    assert.deepEqual(calls, [
        "pwa/src/app/JackalWebApp.ts:setMusicOn",
        "pwa/src/app/JackalWebApp.ts:setSoundsOn"
    ]);
});

test("Song pause/resume preserves sequencing and paused transport snapshot", async () => {
    const { audio, Song } = await loadAudioModules();

    function fakeMusic(initialState) {
        return {
            state: initialState,
            pauseCalls: 0,
            resumeCalls: 0,
            getTransportState() {
                return this.state;
            },
            isTransportActive() {
                return this.state === "playing" || this.state === "paused";
            },
            pause() {
                if (this.state === "playing") {
                    this.pauseCalls++;
                    this.state = "paused";
                }
            },
            resume() {
                if (this.state === "paused") {
                    this.resumeCalls++;
                    this.state = "playing";
                }
            },
            stop() {
                this.state = "stopped";
            },
            capturePlaybackState() {
                return {
                    transport: this.state,
                    looped: false,
                    playbackRate: 1,
                    positionSeconds: 12.5,
                    volume: 1,
                    fade: null
                };
            }
        };
    }

    const intro = fakeMusic("playing");
    const intro2 = fakeMusic("stopped");
    const loop = fakeMusic("stopped");
    const song = Song.fromTwoIntrosAndLoopMusic(intro, intro2, loop);
    song.playing = true;
    song.playedIntro2 = false;

    song.pause();
    assert.equal(intro.state, "paused");
    assert.equal(intro.pauseCalls, 1);
    assert.equal(song.playing, true, "pause must not change Song sequencing ownership");

    const main = { stageSong0: song };
    const snapshot = audio.captureSongSnapshot(main, song);
    assert.equal(snapshot.id, "stageSong0");
    assert.equal(snapshot.playing, true);
    assert.equal(snapshot.activeMusic.id, "stageSong0.intro");
    assert.equal(snapshot.activeMusic.playback.transport, "paused");
    assert.equal(snapshot.activeMusic.playback.positionSeconds, 12.5);

    song.resume();
    assert.equal(intro.state, "playing");
    assert.equal(intro.resumeCalls, 1);
    assert.equal(song.playing, true);
});

test("gameplay Pause uses Song transport rather than global Music policy", () => {
    assert.doesNotMatch(gameModeSource, /setMusicOn\s*\(/);
    assert.match(gameModeSource, /currentSong\?\.pause\(\)/);
    assert.match(gameModeSource, /currentSong\?\.resume\(\)/);
    assert.match(songSource, /public pause\(\): void/);
    assert.match(songSource, /getTransportState\(\) === "playing"/);
    assert.match(songSource, /music\.pause\(\)/);
    assert.match(songSource, /public resume\(\): void/);
    assert.match(songSource, /getTransportState\(\) === "paused"/);
    assert.match(songSource, /music\.resume\(\)/);
});

test("application audio policy is established before playback activation and on Reset", () => {
    const startGame = functionBody(webAppSource, "private async startGame");
    assert.ok(startGame.indexOf("this.applyApplicationAudioPreferences()") < startGame.indexOf("beginGameAudio()"));

    const resume = functionBody(webAppSource, "private async resumeLiveGameFromMenu()");
    assert.ok(resume.indexOf("this.applyApplicationAudioPreferences()") < resume.indexOf("beginGameAudio()"));

    const reset = functionBody(webAppSource, "private resetPwaState()");
    assert.match(reset, /this\.applyApplicationAudioPreferences\(\)/);

    const helper = functionBody(webAppSource, "private applyApplicationAudioPreferences()");
    assert.match(helper, /setMusicOn\(true\)/);
    assert.match(helper, /setSoundsOn\(true\)/);
    assert.match(helper, /this\.applyAudioVolume\(this\.volume\)/);
});

test("live-menu lifecycle freezes before save and commits audio before resume", () => {
    const liveMenu = functionBody(webAppSource, "private async showLiveMenuOverlay()");
    assert.ok(liveMenu.indexOf("this.suspendGameForMenu()") < liveMenu.indexOf("this.saveCurrentGameState()"));

    const suspend = functionBody(webAppSource, "private suspendGameForMenu()");
    assert.match(suspend, /setLoopSuspended\(true\)/);
    assert.match(suspend, /setBrowserSuspended\(true\)/);
    assert.match(suspend, /releaseGameAudio\(\)/);
    assert.doesNotMatch(suspend, /stopAllSounds|stopSoundEffects|stopAllPlayback|destroy\(/);

    const resume = functionBody(webAppSource, "private async resumeLiveGameFromMenu()");
    const commit = resume.indexOf("commitGameAudio(audio)");
    assert.notEqual(commit, -1);
    assert.ok(commit < resume.indexOf("liveGame.setBrowserSuspended(false)"));
    assert.ok(commit < resume.indexOf("liveContainer.setLoopSuspended(false)"));
});

test("fresh durable restore completes before audio commit and gameplay resume", () => {
    const launch = webAppSource.slice(webAppSource.indexOf("private async launchPreparedGame"), webAppSource.indexOf("private returnToMenu"));
    const restoreHook = launch.indexOf("mainGame.loadingCompleteHandler");
    const start = launch.indexOf("await appContainer.start()");
    const resources = launch.indexOf("await ResourceLoader.waitForAll()");
    const commit = launch.indexOf("commitGameAudio(audio)");
    const gameResume = launch.indexOf("mainGame.setBrowserSuspended(false)");
    const loopResume = launch.indexOf("appContainer.setLoopSuspended(false)");

    assert.ok(restoreHook >= 0 && start > restoreHook, "saved-state restore hook must be installed before container startup");
    assert.ok(resources > start && commit > resources, "container startup and restore must settle before audio generation commit");
    assert.ok(gameResume > commit, "logical game clock must not resume before audio generation commit");
    assert.ok(loopResume > commit, "RAF loop must not resume before audio generation commit");
});
