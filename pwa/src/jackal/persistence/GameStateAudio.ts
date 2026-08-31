import type { GameContainer, Music } from "slick2d-ts";
import type { Main } from "../Main.js";
import type { Song } from "../Song.js";
import { SONG_IDS, parseMusicId, type MusicId, type SongId } from "./GameStateFields.js";
import type { AudioStateSnapshot, JackalGameStateSnapshot, MusicSnapshot, SongSnapshot } from "./GameStateSnapshot.js";

export function captureAudioStateSnapshot(main: Main): AudioStateSnapshot {
    if (main.browserSuspended) {
        return {
            musicOn: Boolean(main.browserSuspendedMusicOn),
            soundOn: Boolean(main.browserSuspendedSoundOn)
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
    const requestedSong = songById(main, snapshot.requestedSongId ?? snapshot.currentSongId);
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
    if (song.intro !== null && isMusicActiveForSnapshot(song.intro)) {
        return captureMusic(main, song.intro);
    }
    if (song.intro2 !== null && isMusicActiveForSnapshot(song.intro2)) {
        return captureMusic(main, song.intro2);
    }
    if (song.loop !== null && isMusicActiveForSnapshot(song.loop)) {
        return captureMusic(main, song.loop);
    }
    return null;
}

function captureMusic(main: Main, music: Music): MusicSnapshot {
    const id = musicIdForMusic(main, music);
    if (id === null) {
        throw new Error("Unable to identify music for game-state save.");
    }
    const looped = Boolean(Reflect.get(music, "looped"));
    return {
        id,
        looped,
        paused: Boolean(Reflect.get(music, "paused")),
        playing: music.playing(),
        playbackRate: numberField(music, "playbackRate", 1),
        position: normalizeMusicPosition(music, music.getPosition(), looped),
        volume: music.getVolume()
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
    if (music === null) {
        restoreAudioEnabled(main, gc, audioState);
        return;
    }

    const position = normalizeMusicPosition(music, snapshot.position, snapshot.looped);
    if (!snapshot.playing && !snapshot.paused) {
        music.setVolume(snapshot.volume);
        music.setPosition(position);
        restoreAudioEnabled(main, gc, audioState);
        return;
    }

    gc.setMusicOn(false);
    music.setVolume(snapshot.volume);
    music.setPosition(position);
    if (snapshot.looped) {
        music.loop(snapshot.playbackRate, snapshot.volume);
    } else {
        music.play(snapshot.playbackRate, snapshot.volume);
    }

    void music
        .ready()
        .then(() => {
            globalThis.setTimeout(() => {
                music.setPosition(normalizeMusicPosition(music, position, snapshot.looped));
                music.setVolume(snapshot.volume);
                if (snapshot.paused) {
                    music.pause();
                }
                restoreAudioEnabled(main, gc, audioState);
            }, 0);
        })
        .catch(() => {
            restoreAudioEnabled(main, gc, audioState);
        });
}

function restoreAudioEnabled(main: Main, gc: GameContainer, audioState: AudioStateSnapshot): void {
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

function normalizeMusicPosition(music: Music, position: number, looped: boolean): number {
    const sanitized = Number.isFinite(position) ? Math.max(0, position) : 0;
    if (!looped) {
        return sanitized;
    }

    const buffer = Reflect.get(music, "buffer");
    const duration = buffer !== null && typeof buffer === "object" ? Reflect.get(buffer, "duration") : 0;
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
        return sanitized;
    }
    return sanitized % duration;
}

function isMusicActiveForSnapshot(music: Music): boolean {
    return music.playing() || Boolean(Reflect.get(music, "paused"));
}

function numberField(target: object, field: string, fallback: number): number {
    const value = Reflect.get(target, field);
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
