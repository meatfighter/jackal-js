import { Color, type GameContainer, type Graphics } from "slick2d-ts";

import { MainConstants } from "../java/MainConstants.js";
import { HardEndingMode } from "./HardEndingMode.js";
import type { IFadeListener } from "./IFadeListener.js";
import type { IMode } from "./IMode.js";
import type { Main } from "./Main.js";
export class IntroMapMode implements IMode, IFadeListener {
    public static readonly STATE_FADE_IN: number = 0;
    public static readonly STATE_PAUSED: number = 1;
    public static readonly STATE_FADE_OUT: number = 2;
    public static readonly STATE_DONE: number = 3;

    public static readonly PAUSE_DELAY: number = 250;

    public main: Main = null!;
    public gc: GameContainer = null!;
    public delay: number = IntroMapMode.PAUSE_DELAY;
    public state: number = IntroMapMode.STATE_FADE_IN;

    public init(main: Main, gc: GameContainer): void {
        this.main = main;
        this.gc = gc;

        main.requestSong(main.introSong);
        main.startFade(false, this);
    }

    public fadeCompleted(): void {
        if (this.state === IntroMapMode.STATE_FADE_IN) {
            this.state = IntroMapMode.STATE_PAUSED;
        } else {
            this.state = IntroMapMode.STATE_DONE;
            this.main.startPlayer();
            this.main.stopAllSongs();
            this.main.requestSong(this.main.endingSong);

            // Temporary hard-ending rumble test: jump directly to the final-score jeep sequence.
            const hardEnding = new HardEndingMode();
            hardEnding.state = HardEndingMode.STATE_FINAL_SCORE_JEEP;
            this.main.setMode(hardEnding, this.gc);
        }
    }

    public update(gc: GameContainer): void {
        if (this.state === IntroMapMode.STATE_PAUSED && --this.delay === 0) {
            this.state = IntroMapMode.STATE_FADE_OUT;
            this.main.startFade(true, this);
        }
    }

    public render(gc: GameContainer, g: Graphics): void {
        g.setColor(Color.black);
        g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);

        if (this.state === IntroMapMode.STATE_DONE) {
            return;
        }

        this.main.map.draw(124, 92);

        this.main.drawString("This battle will", 416, 224, MainConstants.FONT_GRAY);
        this.main.drawString("make your blood", 416, 288, MainConstants.FONT_GRAY);
        this.main.drawString("boil.", 416, 352, MainConstants.FONT_GRAY);
        this.main.drawString("Good luck!", 480, 416, MainConstants.FONT_GRAY);
    }
}
