import { Music } from "slick2d-ts";

/** Game-level sequencing only. Slick owns physical playback generations. */
export class Song {
    private constructor() {}

    public static fromIntroPath(intro: string): Song {
        return Song.fromIntroMusic(new Music(intro, Song.STREAMING));
    }

    public static fromIntroMusic(intro: Music): Song {
        const song = new Song();
        song.intro = intro;
        return song;
    }

    public static fromIntroAndLoopPaths(intro: string | null, loop: string): Song {
        return Song.fromIntroAndLoopMusic(intro === null ? null : new Music(intro, Song.STREAMING), new Music(loop, Song.STREAMING));
    }

    public static fromIntroAndLoopMusic(intro: Music | null, loop: Music): Song {
        const song = new Song();
        song.intro = intro;
        song.loop = loop;
        return song;
    }

    public static fromTwoIntrosAndLoopPaths(intro: string | null, intro2: string | null, loop: string): Song {
        return Song.fromTwoIntrosAndLoopMusic(
            intro === null ? null : new Music(intro, Song.STREAMING),
            intro2 === null ? null : new Music(intro2, Song.STREAMING),
            new Music(loop, Song.STREAMING)
        );
    }

    public static fromTwoIntrosAndLoopMusic(intro: Music | null, intro2: Music | null, loop: Music): Song {
        const song = new Song();
        song.intro = intro;
        song.intro2 = intro2;
        song.loop = loop;
        return song;
    }

    public static readonly STREAMING = false;
    public intro: Music | null = null;
    public intro2: Music | null = null;
    public loop: Music | null = null;
    public playing = false;
    public playedIntro2 = false;

    public stop(): void {
        for (const music of [this.intro, this.intro2, this.loop]) {
            if (music !== null && music.getTransportState() !== "stopped") {
                music.stop();
            }
        }
        this.playing = false;
        this.playedIntro2 = false;
    }

    public play(): void {
        if (this.playing) {
            return;
        }
        this.stop();
        this.playing = true;
        if (this.intro !== null) {
            this.intro.play();
        } else if (this.intro2 !== null) {
            // A two-intro song with no first intro starts its second intro once.
            this.playedIntro2 = true;
            this.intro2.play();
        } else if (this.loop !== null) {
            this.loop.loop();
        } else {
            this.playing = false;
        }
    }

    /** Pause the exact active Music part without changing Song sequencing. */
    public pause(): void {
        if (!this.playing) {
            return;
        }
        for (const music of [this.intro, this.intro2, this.loop]) {
            if (music?.getTransportState() === "playing") {
                music.pause();
                return;
            }
        }
    }

    /** Resume the exact paused Music part without changing Song sequencing. */
    public resume(): void {
        if (!this.playing) {
            return;
        }
        for (const music of [this.intro, this.intro2, this.loop]) {
            if (music?.getTransportState() === "paused") {
                music.resume();
                return;
            }
        }
    }

    public update(): void {
        if (!this.playing || this.intro?.isTransportActive()) {
            return;
        }
        if (this.intro2 !== null && !this.playedIntro2) {
            this.playedIntro2 = true;
            this.intro2.play();
            return;
        }
        if (this.intro2?.isTransportActive()) {
            return;
        }
        if (this.loop !== null) {
            if (!this.loop.isTransportActive()) {
                this.loop.loop();
            }
        } else {
            this.stop();
        }
    }
}
