import { Color, type GameContainer, type Graphics } from "slick2d-ts";

import { MainConstants } from "../java/MainConstants.js";
import type { IFadeListener } from "./IFadeListener.js";
import type { IMode } from "./IMode.js";
import { Modes } from "./Modes.js";
import type { Main } from "./Main.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class MapMode implements IMode, IFadeListener {
    public static readonly STATE_FADE_IN: number = 0;
    public static readonly STATE_PAUSED: number = 1;
    public static readonly STATE_MOVING: number = 2;
    public static readonly STATE_PAUSED_2: number = 3;
    public static readonly STATE_FADE_OUT: number = 4;
    public static readonly STATE_DONE: number = 5;

    public static readonly PAUSE_DELAY: number = 91;
    public static readonly SOLDIER_DELAY: number = 14;
    public static readonly PAUSE_DELAY_2: number = 3 * 91;

    public static readonly JEEP_SPEED: number = 2.25;

    public static readonly JEEP_YS: number[] = [759, 631, 503, 379, 259];

    public main: Main = null!;
    public gc: GameContainer = null!;
    public state: number = MapMode.STATE_FADE_IN;
    public delay: number = MapMode.PAUSE_DELAY;
    public jeepY: number = 868;
    public soldierDelay: number = MapMode.SOLDIER_DELAY;
    public targetJeepY: number = 0;

    public init(main: Main, gc: GameContainer): void {
        this.main = main;
        this.gc = gc;

        this.targetJeepY = javaFloat(MapMode.JEEP_YS[main.stageIndex]);

        main.startFade(false, this);
    }

    public fadeCompleted(): void {
        if (this.state === MapMode.STATE_FADE_IN) {
            this.state = MapMode.STATE_PAUSED;
        } else {
            this.state = MapMode.STATE_DONE;
            this.main.advanceStageIndex();
            this.main.requestMode(Modes.GAME, this.gc);
        }
    }

    public update(gc: GameContainer): void {
        switch (this.state) {
            case MapMode.STATE_PAUSED:
                if (--this.delay === 0) {
                    this.state = MapMode.STATE_MOVING;
                }
                break;
            case MapMode.STATE_MOVING:
                if (this.main.friendlySoldiersPickedUp > 0 && --this.soldierDelay === 0) {
                    this.soldierDelay = MapMode.SOLDIER_DELAY;
                    this.main.friendlySoldiersPickedUp--;
                    this.main.addPoints(2000);
                }
                this.jeepY = javaFloat(this.jeepY - MapMode.JEEP_SPEED);
                if (this.jeepY <= this.targetJeepY) {
                    this.jeepY = this.targetJeepY;
                    if (this.main.friendlySoldiersPickedUp === 0) {
                        this.state = MapMode.STATE_PAUSED_2;
                        this.delay = MapMode.PAUSE_DELAY_2;
                    }
                }
                break;
            case MapMode.STATE_PAUSED_2:
                if (--this.delay === 0) {
                    if (this.main.isSongPlaying()) {
                        this.delay = 1;
                    } else {
                        this.state = MapMode.STATE_FADE_OUT;
                        this.main.startFade(true, this);
                    }
                }
                break;
        }
    }

    public render(gc: GameContainer, g: Graphics): void {
        g.setColor(Color.black);
        g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);

        if (this.state === MapMode.STATE_DONE) {
            return;
        }

        this.main.map.draw(124, 92);

        this.main.drawScaled(this.main.players[0][2], 288, this.jeepY, 0.5);

        this.main.drawImage(this.main.friendlySoldiers[0][8], 552, 344);

        this.main.drawString("1P SCORE", 416, 256, MainConstants.FONT_GRAY);
        this.main.drawString(this.main.scoreStr, 704, 256, MainConstants.FONT_GRAY);
        this.main.drawNumber(this.main.friendlySoldiersPickedUp, 2, 608, 352, MainConstants.FONT_GRAY);
    }
}
