import { Music, type SoundPlaybackSnapshot } from "slick2d-ts";
import { MainConstants } from "../../java/MainConstants.js";
import { registeredSounds, soundForId, type RegisteredSound } from "../AudioRegistry.js";
import type { Main } from "../Main.js";
import type { Song } from "../Song.js";
import { SONG_IDS, parseMusicId, type MusicId, type SongId } from "./GameStateFields.js";
import type { AudioStateSnapshot, JackalGameStateSnapshot, MusicSnapshot, SongSnapshot, SoundCooldownSnapshot, SoundSnapshot } from "./GameStateSnapshot.js";

const EMPTY_SOUND_PLAYBACK: SoundPlaybackSnapshot = Object.freeze({
    voices: Object.freeze([]),
    activeVoiceIndex: null
});

export function captureAudioStateSnapshot(main: Main): AudioStateSnapshot {
    const sounds = registeredSounds(main);
    return {
        sounds: captureSoundSnapshots(sounds),
        cooldowns: captureSoundCooldownSnapshots(main, sounds)
    };
}

export function songIdFor(main: Main, song: Song | null): SongId | null {
    if (song === null) {
        return null;
    }
    for (const id of SONG_IDS) {
        if (main[id] === song) {
            return id;
        }
    }
    return null;
}

export function captureSongSnapshot(main: Main, song: Song | null): SongSnapshot | null {
    if (song === null) {
        return null;
    }
    const id = songIdFor(main, song);
    if (id === null) {
        throw new Error("Unable to identify the current Jackal song.");
    }
    return {
        id,
        playing: song.playing,
        playedIntro2: song.playedIntro2,
        lastLifeSuspended: song.lastLifeSuspended,
        activeMusic: captureActiveSongMusic(id, song)
    };
}

/**
 * Restore is an atomic logical operation, not a sequence of play/seek/native
 * attachment callbacks. The shell commits its fresh generation after the entire game state
 * is installed. Current and requested songs may intentionally differ mid-change.
 */
export function restoreAudioPlayback(main: Main, snapshot: JackalGameStateSnapshot): void {
    if (!main.isBrowserRuntimeActive()) {
        return;
    }

    clearExistingAudioState(main);

    try {
        restoreSongState(main, snapshot);
        restoreSoundState(main, snapshot.audioState.sounds);
        restoreSoundCooldownState(main, snapshot.audioState.cooldowns);
    } catch (error) {
        clearExistingAudioState(main);
        throw error;
    }
}

function clearExistingAudioState(main: Main): void {
    main.stopAllSounds();
    main.lastPlayTime.clear();
    Music.resetPlaybackState();
}

function captureSoundSnapshots(sounds: readonly RegisteredSound[]): SoundSnapshot[] {
    const snapshots: SoundSnapshot[] = [];
    for (const { id, sound } of sounds) {
        const playback = sound.capturePlaybackState();
        if (playback.voices.length !== 0) {
            snapshots.push({ id, playback });
        }
    }
    return snapshots;
}

function captureSoundCooldownSnapshots(main: Main, sounds: readonly RegisteredSound[]): SoundCooldownSnapshot[] {
    const snapshots: SoundCooldownSnapshot[] = [];
    const now = main.getSoundCooldownTime();
    const minimumSoundTime = MainConstants.MINIMUM_SOUND_TIME;

    for (const { id, sound } of sounds) {
        const lastPlayTime = main.lastPlayTime.get(sound);
        if (lastPlayTime === undefined) {
            continue;
        }
        if (!Number.isFinite(lastPlayTime)) {
            throw new Error(`Jackal Sound cooldown is invalid for ${id}.`);
        }
        const elapsedMs = Math.max(0, now - lastPlayTime);
        if (elapsedMs > minimumSoundTime) {
            continue;
        }
        snapshots.push({
            id,
            // The durable schema uses integer milliseconds; never shorten a live fractional cooldown.
            remainingMs: Math.ceil(Math.max(0, Math.min(minimumSoundTime, minimumSoundTime - elapsedMs)))
        });
    }
    return snapshots;
}

function restoreSongState(main: Main, snapshot: JackalGameStateSnapshot): void {
    const state = snapshot.currentSongState;
    const currentSong = state === null ? null : songById(main, state.id);
    main.currentSong = currentSong;
    main.requestedSong = songById(main, snapshot.requestedSongId);
    if (currentSong === null || state === null) {
        return;
    }
    currentSong.playing = state.playing;
    currentSong.playedIntro2 = state.playedIntro2;
    currentSong.lastLifeSuspended = state.lastLifeSuspended;
    if (state.activeMusic !== null) {
        const music = musicById(main, state.activeMusic.id);
        if (music === null) {
            throw new Error(`Saved Jackal music part is unavailable: ${state.activeMusic.id}`);
        }
        music.restorePlaybackState(state.activeMusic.playback);
    }
}

function restoreSoundState(main: Main, snapshots: readonly SoundSnapshot[]): void {
    const saved = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot.playback] as const));
    for (const { id, sound } of registeredSounds(main)) {
        sound.restorePlaybackState(saved.get(id) ?? EMPTY_SOUND_PLAYBACK);
    }
}

function restoreSoundCooldownState(main: Main, snapshots: readonly SoundCooldownSnapshot[]): void {
    const now = main.getSoundCooldownTime();
    const minimumSoundTime = MainConstants.MINIMUM_SOUND_TIME;
    for (const snapshot of snapshots) {
        const elapsedMs = minimumSoundTime - snapshot.remainingMs;
        main.lastPlayTime.set(soundForId(main, snapshot.id), now - elapsedMs);
    }
}

function captureActiveSongMusic(songId: SongId, song: Song): MusicSnapshot | null {
    const parts = [
        ["intro", song.intro],
        ["intro2", song.intro2],
        ["loop", song.loop]
    ] as const;
    for (const [suffix, music] of parts) {
        if (music !== null && music.getTransportState() !== "stopped") {
            // Some songs share Music objects. Identify the part through the
            // current Song rather than the first globally matching alias.
            return { id: `${songId}.${suffix}` as MusicId, playback: music.capturePlaybackState() };
        }
    }
    return null;
}

function songById(main: Main, id: SongId | null): Song | null {
    return id === null ? null : main[id];
}

function musicById(main: Main, id: MusicId): Music | null {
    const parts = parseMusicId(id);
    if (parts === null) {
        return null;
    }
    const song = main[parts.songId];
    switch (parts.suffix) {
        case "intro":
            return song.intro;
        case "intro2":
            return song.intro2;
        case "loop":
            return song.loop;
    }
}
