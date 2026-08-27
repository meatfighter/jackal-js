import { Music } from "slick2d-ts";
export class Song {
    public constructor(intro: string);
    public constructor(intro: Music);
    public constructor(intro: string, loop: string);
    public constructor(intro: Music, loop: Music);
    public constructor(intro: string, intro2: string, loop: string);
    public constructor(intro: Music, intro2: Music, loop: Music);
    public constructor(arg0?: string | Music, arg1?: string | Music, arg2?: string | Music) {
        const argCount = arguments.length;
        this.__construct_Song(argCount, arg0, arg1, arg2);
    }

    private __construct_Song(argCount: number, arg0?: string | Music, arg1?: string | Music, arg2?: string | Music): void {
        if (argCount === 1 && (arg0 === null || typeof arg0 === "string")) {
            let introLocal6 = arg0 as string | null;
            this.intro = new Music(introLocal6, Song.STREAMING);
            return;
        } else if (argCount === 1) {
            let introLocal5 = arg0 as Music;
            this.intro = introLocal5;
            return;
        } else if (argCount === 2 && (arg0 === null || typeof arg0 === "string") && (arg1 === null || typeof arg1 === "string")) {
            let introLocal4 = arg0 as string | null;
            let loopLocal4 = arg1 as string | null;
            if (introLocal4 != null) {
                this.intro = new Music(introLocal4, Song.STREAMING);
            }
            this.loop = new Music(loopLocal4, Song.STREAMING);
            return;
        } else if (argCount === 2) {
            let introLocal3 = arg0 as Music;
            let loopLocal3 = arg1 as Music;
            this.intro = introLocal3;
            this.loop = loopLocal3;
            return;
        } else if (
            argCount === 3 &&
            (arg0 === null || typeof arg0 === "string") &&
            (arg1 === null || typeof arg1 === "string") &&
            (arg2 === null || typeof arg2 === "string")
        ) {
            let introLocal2 = arg0 as string | null;
            let intro2Local2 = arg1 as string | null;
            let loopLocal2 = arg2 as string | null;
            if (introLocal2 != null) {
                this.intro = new Music(introLocal2, Song.STREAMING);
            }
            if (intro2Local2 != null) {
                this.intro2 = new Music(intro2Local2, Song.STREAMING);
            }
            this.loop = new Music(loopLocal2, Song.STREAMING);
            return;
        } else if (argCount === 3) {
            let introLocal = arg0 as Music;
            let intro2Local = arg1 as Music;
            let loopLocal = arg2 as Music;
            this.intro = introLocal;
            this.intro2 = intro2Local;
            this.loop = loopLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STREAMING: boolean = false;

    public intro: Music = null;
    public intro2: Music = null;
    public loop: Music = null;
    public playing: boolean = false;
    public playedIntro2: boolean = false;

    public stop(): void {
        if (this.intro != null && this.intro.playing()) {
            this.intro.stop();
        }
        if (this.intro2 != null && this.intro2.playing()) {
            this.intro2.stop();
        }
        if (this.loop != null && this.loop.playing()) {
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
        if (this.intro == null && this.intro2 == null) {
            this.loop.loop();
        } else if (this.intro == null) {
            this.intro2.play();
        } else {
            this.intro.play();
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
        if (this.loop != null) {
            this.loop.loop();
        }
    }

    private resumeMusicPart(music: Music | null): boolean {
        if (music == null || !music.playing()) {
            return false;
        }
        music.resume();
        return true;
    }

    public update(): void {
        if (this.playing) {
            if (this.intro == null || !this.intro.playing()) {
                if (!(this.intro2 == null || this.playedIntro2)) {
                    this.playedIntro2 = true;
                    this.intro2.play();
                } else if ((this.intro2 == null || !this.intro2.playing()) && this.loop != null && !this.loop.playing()) {
                    this.loop.loop();
                }
            }
            if (this.loop == null && !this.intro.playing() && (this.intro2 == null || !this.intro2.playing())) {
                this.stop();
            }
        }
    }
}
