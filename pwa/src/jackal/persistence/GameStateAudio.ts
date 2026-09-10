import { Music, SoundStore, type GameContainer } from "slick2d-ts";
import type { Main } from "../Main.js";
import type { Song } from "../Song.js";
import { SONG_IDS, parseMusicId, type MusicId, type SongId } from "./GameStateFields.js";
import type { AudioStateSnapshot, JackalGameStateSnapshot, MusicSnapshot, SongSnapshot } from "./GameStateSnapshot.js";

export function captureAudioStateSnapshot(_main: Main): AudioStateSnapshot {
    return {
        musicOn: SoundStore.get().musicOn(),
        soundOn: SoundStore.get().soundsOn()
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
        activeMusic: captureActiveSongMusic(id, song)
    };
}

/**
 * Restore is an atomic logical operation, not a sequence of play/seek/unmute
 * callbacks. The shell commits its fresh generation after the entire game state
 * is installed. Current and requested songs may intentionally differ mid-change.
 */
export function restoreSongPlayback(main: Main, gc: GameContainer, snapshot: JackalGameStateSnapshot): void {
    if (!main.isBrowserRuntimeActive()) {
        return;
    }
    main.stopAllSounds();
    Music.resetPlaybackState();
    gc.setMusicOn(snapshot.audioState.musicOn);
    gc.setSoundOn(snapshot.audioState.soundOn);
    const state = snapshot.currentSongState;
    const currentSong = state === null ? null : songById(main, state.id);
    main.currentSong = currentSong;
    main.requestedSong = songById(main, snapshot.requestedSongId);
    if (currentSong === null || state === null) {
        return;
    }
    currentSong.playing = state.playing;
    currentSong.playedIntro2 = state.playedIntro2;
    if (state.activeMusic !== null) {
        const music = musicById(main, state.activeMusic.id);
        if (music === null) {
            throw new Error(`Saved Jackal music part is unavailable: ${state.activeMusic.id}`);
        }
        music.restorePlaybackState(state.activeMusic.playback);
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
