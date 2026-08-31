import { MainConstants } from "../java/MainConstants.js";
import { Bomb } from "./Bomb.js";
import { Enemy } from "./Enemy.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Airplane extends Enemy {
    declare public bombDelay: number;
    declare public up: boolean;
    declare public orientationIndex: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.bombDelay = 0;
        this.up = false;
        this.orientationIndex = 0;
    }

    private constructor() {
        super();
    }

    public static forLandingPort(leftLandingPort: boolean): Airplane {
        const airplane = new Airplane();
        airplane.x = javaFloat(airplane.gameMode.player.x + (leftLandingPort ? -Airplane.APPEAR_DISTANCE : Airplane.APPEAR_DISTANCE));
        airplane.y = javaFloat(airplane.gameMode.cameraY - 124);
        return airplane;
    }

    public static at(x: number, y: number): Airplane {
        const airplane = new Airplane();
        x = javaFloat(x);
        y = javaFloat(y);

        airplane.x = javaFloat(airplane.gameMode.player.x + (airplane.main.random.nextBoolean() ? -Airplane.APPEAR_DISTANCE : Airplane.APPEAR_DISTANCE));
        if (javaFloat(airplane.x - 96) < airplane.gameMode.cameraX) {
            airplane.x = javaFloat(airplane.gameMode.player.x + Airplane.APPEAR_DISTANCE);
        } else if (javaFloat(airplane.x + 96) > javaFloat(airplane.gameMode.cameraX + MainConstants.DISPLAY_WIDTH)) {
            airplane.x = javaFloat(airplane.gameMode.player.x - Airplane.APPEAR_DISTANCE);
        }

        airplane.y = y;
        return airplane;
    }

    public static atWithDirection(x: number, y: number, up: boolean): Airplane {
        const airplane = Airplane.at(x, y);
        airplane.up = up;
        airplane.orientationIndex = 1;
        return airplane;
    }

    public static readonly SPEED: number = 5;
    public static readonly BOMB_DELAY: number = 68;
    public static readonly APPEAR_DISTANCE: number = 192;

    public override init(): void {
        super.init();

        this.layer = 7;

        this.hitX1 = -40;
        this.hitY1 = -40;
        this.hitX2 = 40;
        this.hitY2 = 40;

        this.points = 1000;
    }

    public override remove(): void {
        this.removeFlag = true;
        if (this.playSoundOnRemove) {
            this.main.playHitExplodeSound();
        }
        this.main.stopSound(this.main.planeSound);
    }

    public update(): void {
        this.main.playSoundIfNotPlaying(this.main.planeSound);

        if (this.up) {
            this.y = javaFloat(this.y - Airplane.SPEED);
            if (this.y < javaFloat(this.gameMode.cameraY - 384)) {
                this.playSoundOnRemove = false;
                this.remove();
            }
        } else {
            this.y = javaFloat(this.y + Airplane.SPEED);
        }

        if (--this.bombDelay < 0) {
            this.bombDelay = Airplane.BOMB_DELAY;
            Bomb.create(this.x, this.y, true);
        }
    }

    // returns true if player bumped into the enemy
    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        return false;
    }

    // returns true if player bullet was absorbed by enemy
    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        return false;
    }

    public render(): void {
        this.main.drawImage(this.main.airplanes[this.orientationIndex][1], this.x + 24, this.y + 24);
        this.main.drawImage(this.main.airplanes[this.orientationIndex][0], this.x - 60, this.y - 62);
    }
}
