import { MainConstants } from "../java/MainConstants.js";
import { Bomb } from "./Bomb.js";
import { Enemy } from "./Enemy.js";
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

    public constructor(leftLandingPort: boolean);
    public constructor(x: number, y: number, up: boolean);
    public constructor(x: number, y: number);
    public constructor(arg0?: boolean | number, arg1?: number, arg2?: boolean) {
        super();
        const argCount = arguments.length;
        this.__construct_Airplane(argCount, arg0, arg1, arg2);
    }

    private __construct_Airplane(argCount: number, arg0?: boolean | number, arg1?: number, arg2?: boolean): void {
        if (argCount === 1 && typeof arg0 === "boolean") {
            let leftLandingPort = arg0;
            this.x = this.gameMode.player.x + (leftLandingPort ? -Airplane.APPEAR_DISTANCE : Airplane.APPEAR_DISTANCE);

            this.y = this.gameMode.cameraY - 124;
            return;
        } else if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal2 = arg0;
            let yLocal2 = arg1;
            let upLocal = arg2;
            this.__construct_Airplane(2, xLocal2, yLocal2);
            this.up = upLocal;
            this.orientationIndex = 1;
            return;
        } else if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            this.x = this.gameMode.player.x + (this.main.random.nextBoolean() ? -Airplane.APPEAR_DISTANCE : Airplane.APPEAR_DISTANCE);
            if (this.x - 96 < this.gameMode.cameraX) {
                this.x = this.gameMode.player.x + Airplane.APPEAR_DISTANCE;
            } else if (this.x + 96 > this.gameMode.cameraX + MainConstants.DISPLAY_WIDTH) {
                this.x = this.gameMode.player.x - Airplane.APPEAR_DISTANCE;
            }

            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
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
            this.y -= Airplane.SPEED;
            if (this.y < this.gameMode.cameraY - 384) {
                this.playSoundOnRemove = false;
                this.remove();
            }
        } else {
            this.y += Airplane.SPEED;
        }

        if (--this.bombDelay < 0) {
            this.bombDelay = Airplane.BOMB_DELAY;
            new Bomb(this.x, this.y, true);
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
        this.main.draw(this.main.airplanes[this.orientationIndex][1], this.x + 24, this.y + 24);
        this.main.draw(this.main.airplanes[this.orientationIndex][0], this.x - 60, this.y - 62);
    }
}
