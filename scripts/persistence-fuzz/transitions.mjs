// Test-only transition projection. Audio positions and ordinary countdowns are deliberately absent.
const select = (value, keys) => Object.fromEntries(keys.filter((key) => value && Object.hasOwn(value, key)).map((key) => [key, value[key]]));
const music = (value) => (value ? [value.id, value.playback?.transport] : null);
const sounds = (values) =>
    (values ?? []).map((sound) => [sound.id, sound.playback?.activeVoiceIndex, sound.playback?.voices?.map((voice) => [voice.looped, voice.playbackRate])]);
export function captureContext(s) {
    return { stage: s.mainFields.stageIndex, world: 0, hard: s.mainFields.hardMode, mode: s.kind === "game" ? "game" : s.modeId };
}
export function transitionProjection(s) {
    const world = s.gameMode,
        player = s.playerFields,
        song = s.currentSongState;
    return {
        context: captureContext(s),
        main: select(s.mainFields, ["fading", "fadeOut", "extraLives", "score"]),
        world: select(world?.fields, ["paused", "playing", "bossCameraPan", "endingCameraPan", "cameraPanListener", "stageCompletedFlag"]),
        player: select(player, ["pows", "releaseablePows", "longRange", "inSwamp"]),
        respawning: (player?.respawning ?? 0) > 0,
        standalone: select(s.modeFields, ["state"]),
        roots: world?.elements,
        indexes: world?.indexes,
        entities: world?.entities.map((e) => [e.id, e.type, select(e.fields, ["state", "removeFlag"])]),
        song: song ? [song.id, song.playing, song.playedIntro2, song.lastLifeSuspended, music(song.activeMusic)] : null,
        requested: s.requestedSongId,
        sounds: sounds(s.audioState?.sounds)
    };
}
