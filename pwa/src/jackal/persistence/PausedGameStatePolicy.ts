type Fields = Readonly<Record<string, unknown>>;
function record(v: unknown): v is Fields {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Adjunct to the full schema/voice validator; never repairs or mutes on restore. */
export function isPausedGameStateValid(snapshot: unknown): boolean {
    if (!record(snapshot)) return false;
    if (snapshot.kind !== "game") return true;
    if (!record(snapshot.gameMode) || !record(snapshot.gameMode.fields)) return false;
    const world = snapshot.gameMode.fields;
    if (world.paused === false) return true;
    if (world.paused !== true || world.playing !== true || world.stageCompletedFlag !== false) return false;
    const song = snapshot.currentSongState;
    if (
        !record(song) ||
        song.playing !== true ||
        song.lastLifeSuspended !== false ||
        typeof song.id !== "string" ||
        snapshot.requestedSongId !== song.id ||
        !record(song.activeMusic) ||
        !record(song.activeMusic.playback) ||
        song.activeMusic.playback.transport !== "paused"
    )
        return false;
    const audio = snapshot.audioState;
    if (!record(audio) || !Array.isArray(audio.sounds)) return false;
    if (audio.sounds.length === 0) return true;
    if (audio.sounds.length !== 1) return false;
    const sound: unknown = audio.sounds[0];
    if (!record(sound) || sound.id !== "pauseSound" || !record(sound.playback) || !Array.isArray(sound.playback.voices) || sound.playback.voices.length !== 1)
        return false;
    const voice: unknown = sound.playback.voices[0];
    // playSoundAlways(pauseSound) uses one unpositioned, non-looping, normal-speed voice.
    return record(voice) && voice.looped === false && voice.playbackRate === 1 && voice.spatialPosition === null;
}
