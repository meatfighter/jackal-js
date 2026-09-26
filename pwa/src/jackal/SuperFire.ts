import { java3DArray, javaArray, javaFloat, javaInt } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
import type { BossSuperTank } from "./BossSuperTank.js";
import type { Player } from "./Player.js";
export class SuperFire extends GameElement {
    declare public player: Player | null;
    declare public length: number;
    declare public flickerCounter: number;
    declare public flickerIndex: number;
    declare public asterDelay: number;
    declare public bossSuperTank: BossSuperTank | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.player = null;
        this.state = 0;
        this.length = 0;
        this.flickerCounter = 0;
        this.flickerIndex = 0;
        this.asterDelay = 0;
        this.bossSuperTank = null;
    }

    public constructor(x: number, y: number, bossSuperTank: BossSuperTank) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);

        this.x = x;
        this.y = y;
        this.bossSuperTank = bossSuperTank;
    }

    public static readonly STATE_ASTER: number = 0;
    public static readonly STATE_DIAMOND: number = 1;
    public static readonly STATE_GROWING: number = 2;
    public static readonly STATE_MOVING: number = 3;

    public static readonly ASTER_DELAY: number = 23;
    public static readonly ASTER_SPINES: number = 5;
    public static readonly ASTER_RADIUS: number = 128;
    public static readonly ASTER_ANGLE: number = javaFloat(Math.PI);
    public static readonly ASTER_SPACER_ANGLE: number = javaFloat((2.0 * Math.PI) / SuperFire.ASTER_SPINES);

    public static readonly ASTERS_XYS: number[][][] = java3DArray(SuperFire.ASTER_DELAY, SuperFire.ASTER_SPINES, 2, 0);
    public static readonly ASTER_SCALES: number[] = javaArray(SuperFire.ASTER_DELAY, 0);

    static {
        for (let i = 0; i < SuperFire.ASTER_DELAY; i++) {
            SuperFire.ASTER_SCALES[i] = javaFloat(javaFloat(i) / javaFloat(SuperFire.ASTER_DELAY - 1));
            let radius = javaFloat(javaFloat(1 - SuperFire.ASTER_SCALES[i]) * SuperFire.ASTER_RADIUS);
            let angle = javaFloat(SuperFire.ASTER_SCALES[i] * SuperFire.ASTER_ANGLE);
            for (let j = 0; j < SuperFire.ASTER_SPINES; j++) {
                let ang = javaFloat(angle + javaFloat(SuperFire.ASTER_SPACER_ANGLE * j));
                SuperFire.ASTERS_XYS[i][j][0] = javaFloat(radius * javaFloat(Math.cos(ang)));
                SuperFire.ASTERS_XYS[i][j][1] = javaFloat(radius * javaFloat(Math.sin(ang)));
            }
        }
    }

    public static readonly SPEED: number = 11;

    public state: number = SuperFire.STATE_ASTER;

    public init(): void {
        this.layer = 5;

        this.player = this.gameMode.player;
    }

    public update(): void {
        switch (this.state) {
            case SuperFire.STATE_ASTER:
                if (++this.asterDelay === SuperFire.ASTER_DELAY) {
                    this.state = SuperFire.STATE_DIAMOND;
                    this.main.playSound(this.main.fireSound);
                }
                break;
            case SuperFire.STATE_DIAMOND:
                this.length = javaFloat(this.length + SuperFire.SPEED);
                if (this.length >= 128) {
                    this.state = SuperFire.STATE_GROWING;
                }
                break;
            case SuperFire.STATE_GROWING:
                this.length = javaFloat(this.length + SuperFire.SPEED);
                if (this.length >= 512) {
                    this.length = 512;
                    this.state = SuperFire.STATE_MOVING;
                }
                break;
            case SuperFire.STATE_MOVING:
                this.y = javaFloat(this.y + SuperFire.SPEED);
                if (this.y > javaFloat(javaFloat(this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT) + 32)) {
                    this.remove();
                }
                break;
        }
        if (this.state !== SuperFire.STATE_ASTER) {
            this.player!.attackBounds(javaFloat(this.x - 40), javaFloat(this.y + 32), javaFloat(this.x + 40), javaFloat(javaFloat(this.y + this.length) - 32));
        }
        if (this.bossSuperTank!.removeFlag) {
            this.remove();
        }
    }

    public render(): void {
        if (!this.gameMode.paused) {
            if (this.flickerCounter >= 2.5) {
                this.flickerCounter -= 2.5;
            } else {
                this.flickerIndex ^= 1;
            }
            this.flickerCounter++;
        }
        let X = this.x - 48;
        let halfLength = this.length * 0.5;
        switch (this.state) {
            case SuperFire.STATE_ASTER:
                for (let i = 0; i < SuperFire.ASTER_SPINES; i++) {
                    this.main.drawCenteredScaledAlpha(
                        this.main.elephantGuns[4],
                        this.x + SuperFire.ASTERS_XYS[this.asterDelay][i][0],
                        this.y + SuperFire.ASTERS_XYS[this.asterDelay][i][1],
                        SuperFire.ASTER_SCALES[this.asterDelay],
                        SuperFire.ASTER_SCALES[this.asterDelay]
                    );
                }
                break;
            case SuperFire.STATE_DIAMOND:
                this.gameMode.g.setWorldClip(X - 1, this.y, 98, halfLength);
                this.main.drawImage(this.main.superFires[this.flickerIndex][0], X, this.y);
                this.gameMode.g.setWorldClip(X - 1, this.y + halfLength, 98, halfLength);
                this.main.drawImage(this.main.superFires[this.flickerIndex][2], X, this.y + this.length - 64);
                this.gameMode.g.clearWorldClip();
                break;
            case SuperFire.STATE_GROWING:
                this.main.drawImage(this.main.superFires[this.flickerIndex][0], X, this.y);
                this.gameMode.g.setWorldClip(X - 1, this.y + 64, 98, this.length);
                for (let i = 1 + (javaInt(this.length - 128) >> 5); i >= 0; i--) {
                    this.main.drawImage(this.main.superFires[this.flickerIndex][1], X, this.y + this.length - (i << 5) - 64);
                }
                this.gameMode.g.clearWorldClip();
                this.main.drawImage(this.main.superFires[this.flickerIndex][2], X, this.y + this.length - 64);
                break;
            default:
            case SuperFire.STATE_MOVING:
                this.main.drawImage(this.main.superFires[this.flickerIndex][0], X, this.y);
                for (let i = 0; i < 12; i++) {
                    this.main.drawImage(this.main.superFires[this.flickerIndex][1], X, this.y + 64 + (i << 5));
                }
                this.main.drawImage(this.main.superFires[this.flickerIndex][2], X, this.y + 448);
                break;
        }
    }
}
