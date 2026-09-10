import { Music } from "slick2d-ts";
export class Song {
    private constructor() {}

    public static fromIntroPath(intro: string): Song {
        const song = new Song();
        song.intro = new Music(intro, Song.STREAMING);
        return song;
    }

    public static fromIntroMusic(intro: Music): Song {
        const song = new Song();
        song.intro = intro;
        return song;
    }

    public static fromIntroAndLoopPaths(intro: string | null, loop: string): Song {
        const song = new Song();
        if (intro !== null) {
            song.intro = new Music(intro, Song.STREAMING);
        }
        song.loop = new Music(loop, Song.STREAMING);
        return song;
    }

    public static fromIntroAndLoopMusic(intro: Music | null, loop: Music): Song {
        const song = new Song();
        song.intro = intro;
        song.loop = loop;
        return song;
    }

    public static fromTwoIntrosAndLoopPaths(intro: string | null, intro2: string | null, loop: string): Song {
        const song = new Song();
        if (intro !== null) {
            song.intro = new Music(intro, Song.STREAMING);
        }
        if (intro2 !== null) {
            song.intro2 = new Music(intro2, Song.STREAMING);
        }
        song.loop = new Music(loop, Song.STREAMING);
        return song;
    }

    public static fromTwoIntrosAndLoopMusic(intro: Music | null, intro2: Music | null, loop: Music): Song {
        const song = new Song();
        song.intro = intro;
        song.intro2 = intro2;
        song.loop = loop;
        return song;
    }

    public static readonly STREAMING: boolean = false;

    public intro: Music | null = null;
    public intro2: Music | null = null;
    public loop: Music | null = null;
    public playing: boolean = false;
    public playedIntro2: boolean = false;

    public stop(): void {
        if (this.intro !== null && this.intro.playing()) {
            this.intro.stop();
        }
        if (this.intro2 !== null && this.intro2.playing()) {
            this.intro2.stop();
        }
        if (this.loop !== null && this.loop.playing()) {
            this.loop.stop();
        }
        this.playing = false;
        this.playedIntro2 = false;
    }

    public play(): void {
        if (this.playing) {
            return;
        }
        this.stop();
        if (this.intro === null && this.intro2 === null) {
            this.loop!.loop();
        } else if (this.intro === null) {
            this.intro2!.play();
        } else {
            this.intro!.play();
        }
        this.playing = true;
    }

    public resumeAfterBrowserSuspension(): void {
        if (!this.playing) {
            return;
        }
        if (this.resumeMusicPart(this.intro)) {
            return;
        }
        if (this.resumeMusicPart(this.intro2)) {
            return;
        }
        if (this.resumeMusicPart(this.loop)) {
            return;
        }
        if (!this.playedIntro2 && this.intro2 !== null) {
            this.playedIntro2 = true;
            this.intro2.play();
            return;
        }
        if (this.loop !== null) {
            this.loop.loop();
        }
    }

    private resumeMusicPart(music: Music | null): boolean {
        if (music === null || !music.playing()) {
            return false;
        }
        music.resume();
        return true;
    }

    public update(): void {
        if (this.playing) {
            if (this.intro === null || !this.intro.playing()) {
                if (!(this.intro2 === null || this.playedIntro2)) {
                    this.playedIntro2 = true;
                    this.intro2.play();
                } else if ((this.intro2 === null || !this.intro2.playing()) && this.loop !== null && !this.loop.playing()) {
                    this.loop.loop();
                }
            }
            if (this.loop === null && !this.intro!.playing() && (this.intro2 === null || !this.intro2.playing())) {
                this.stop();
            }
        }
    }
}
