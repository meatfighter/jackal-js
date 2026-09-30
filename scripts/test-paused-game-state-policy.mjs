import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
const source = readFileSync(new URL("../pwa/src/jackal/persistence/PausedGameStatePolicy.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { isPausedGameStateValid: valid } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const voice = () => ({ looped: false, playbackRate: 1, positionSeconds: 0.01, gain: 0, spatialPosition: null });
function snapshot() {
    return {
        kind: "game",
        gameMode: { fields: { paused: true, playing: true, stageCompletedFlag: false } },
        requestedSongId: "stageSong0",
        currentSongState: { id: "stageSong0", playing: true, lastLifeSuspended: false, activeMusic: { playback: { transport: "paused" } } },
        audioState: { sounds: [{ id: "pauseSound", playback: { voices: [voice()] } }], cooldowns: [{ id: "explodeSound", remainingMs: 80 }] }
    };
}
test("paused state permits one ordinary cue or none, without touching cooldowns", () => {
    const s = snapshot(),
        bytes = JSON.stringify(s);
    assert(valid(s));
    assert.equal(JSON.stringify(s), bytes);
    s.audioState.sounds = [];
    assert(valid(s));
});
test("unpaused and standalone audio is not subject to the pause-only rule", () => {
    const s = snapshot();
    s.gameMode.fields.paused = false;
    s.requestedSongId = "bossSong";
    s.audioState.sounds.push({ id: "explodeSound", playback: { voices: [voice()] } });
    assert(valid(s));
    assert(valid({ kind: "mode" }));
});
test("reject impossible paused voices and pending soundtrack changes independently", () => {
    const mutations = [
        (s) => s.audioState.sounds.push({ id: "explodeSound", playback: { voices: [voice()] } }),
        (s) => {
            s.audioState.sounds[0].id = "helicopterSound2";
        },
        (s) => s.audioState.sounds[0].playback.voices.push(voice()),
        (s) => {
            s.audioState.sounds[0].playback.voices[0].looped = true;
        },
        (s) => {
            s.audioState.sounds[0].playback.voices[0].playbackRate = 0.5;
        },
        (s) => {
            s.audioState.sounds[0].playback.voices[0].spatialPosition = { x: 0, y: 0, z: 0 };
        },
        (s) => {
            s.requestedSongId = "bossSong";
        },
        (s) => {
            s.requestedSongId = null;
        },
        (s) => {
            s.gameMode.fields.playing = false;
        },
        (s) => {
            s.gameMode.fields.stageCompletedFlag = true;
        }
    ];
    for (const mutate of mutations) {
        const s = snapshot();
        mutate(s);
        const bytes = JSON.stringify(s);
        assert(!valid(s));
        assert.equal(JSON.stringify(s), bytes);
    }
});
