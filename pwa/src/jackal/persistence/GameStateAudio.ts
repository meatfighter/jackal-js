import type { GameContainer, Music } from "slick2d-ts";
import type { Main } from "../Main.js";
import type { Song } from "../Song.js";
import { SONG_IDS, parseMusicId, type MusicId, type SongId } from "./GameStateFields.js";
import type { AudioStateSnapshot, JackalGameStateSnapshot, MusicSnapshot, SongSnapshot } from "./GameStateSnapshot.js";

export function captureAudioStateSnapshot(main: Main): AudioStateSnapshot {
    if (main.browserSuspended) {
        return {
            musicOn: main.browserSuspendedMusicOn,
            soundOn: main.browserSuspendedSoundOn
        };
    }
    return {
        musicOn: main.gc === null ? true : main.gc.isMusicOn(),
        soundOn: main.gc === null ? true : main.gc.isSoundOn()
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
        return null;
    }
    return {
        id,
        playing: song.playing,
        playedIntro2: song.playedIntro2,
        activeMusic: captureActiveSongMusic(main, song)
    };
}

export function restoreSongPlayback(main: Main, gc: GameContainer, snapshot: JackalGameStateSnapshot): void {
    const currentSongState = snapshot.currentSongState;
    const currentSong = currentSongState === null ? null : songById(main, currentSongState.id);
    const requestedSong = songById(main, snapshot.requestedSongId);
    main.currentSong = currentSong;
    main.requestedSong = requestedSong;

    if (currentSongState === null || currentSong === null || currentSong !== requestedSong) {
        restoreAudioEnabled(main, gc, snapshot.audioState);
        return;
    }

    currentSong.playing = currentSongState.playing;
    currentSong.playedIntro2 = currentSongState.playedIntro2;
    if (currentSongState.activeMusic !== null && currentSongState.playing) {
        restoreActiveMusic(main, gc, snapshot.audioState, currentSongState.activeMusic);
    } else {
        restoreAudioEnabled(main, gc, snapshot.audioState);
    }
}

function captureActiveSongMusic(main: Main, song: Song): MusicSnapshot | null {
    if (song.intro !== null && song.intro.playing()) {
        return captureMusic(main, song.intro);
    }
    if (song.intro2 !== null && song.intro2.playing()) {
        return captureMusic(main, song.intro2);
    }
    if (song.loop !== null && song.loop.playing()) {
        return captureMusic(main, song.loop);
    }
    return null;
}

function captureMusic(main: Main, music: Music): MusicSnapshot {
    const id = musicIdForMusic(main, music);
    if (id === null) {
        throw new Error("Unable to identify music for game-state save.");
    }
    return {
        id,
        position: sanitizeMusicPosition(music.getPosition()),
        volume: sanitizeMusicVolume(music.getVolume())
    };
}

function songById(main: Main, id: SongId | null): Song | null {
    return id === null ? null : main[id];
}

function musicIdForMusic(main: Main, music: Music): MusicId | null {
    for (const songId of SONG_IDS) {
        const song = main[songId];
        if (song.intro === music) {
            return `${songId}.intro`;
        }
        if (song.intro2 === music) {
            return `${songId}.intro2`;
        }
        if (song.loop === music) {
            return `${songId}.loop`;
        }
    }
    return null;
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

function restoreActiveMusic(main: Main, gc: GameContainer, audioState: AudioStateSnapshot, snapshot: MusicSnapshot): void {
    const music = musicById(main, snapshot.id);
    if (music === null || !main.isBrowserRuntimeActive()) {
        restoreAudioEnabled(main, gc, audioState);
        return;
    }

    const position = sanitizeMusicPosition(snapshot.position);
    const volume = sanitizeMusicVolume(snapshot.volume);
    const parts = parseMusicId(snapshot.id);
    if (parts === null) {
        restoreAudioEnabled(main, gc, audioState);
        return;
    }

    gc.setMusicOn(false);
    music.setVolume(volume);
    music.setPosition(position);
    if (parts.suffix === "loop") {
        music.loop(1, volume);
    } else {
        music.play(1, volume);
    }

    void music
        .ready()
        .then(() => {
            globalThis.setTimeout(() => {
                if (!main.isBrowserRuntimeActive()) {
                    return;
                }
                music.setPosition(position);
                music.setVolume(volume);
                restoreAudioEnabled(main, gc, audioState);
            }, 0);
        })
        .catch(() => {
            if (main.isBrowserRuntimeActive()) {
                restoreAudioEnabled(main, gc, audioState);
            }
        });
}

function restoreAudioEnabled(main: Main, gc: GameContainer, audioState: AudioStateSnapshot): void {
    if (!main.isBrowserRuntimeActive()) {
        return;
    }
    if (main.browserSuspended) {
        main.browserSuspendedMusicOn = audioState.musicOn;
        main.browserSuspendedSoundOn = audioState.soundOn;
        gc.setMusicOn(false);
        gc.setSoundOn(false);
        return;
    }
    gc.setMusicOn(audioState.musicOn);
    gc.setSoundOn(audioState.soundOn);
}

function sanitizeMusicPosition(position: number): number {
    return Number.isFinite(position) ? Math.max(0, position) : 0;
}

function sanitizeMusicVolume(volume: number): number {
    return Number.isFinite(volume) ? Math.max(0, volume) : 1;
}
