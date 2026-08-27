import { javaFloat, javaIntDiv } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
export class Bomb extends Enemy {
    declare public vx: number;
    declare public vy: number;
    declare public scale: number;
    declare public angle: number;
    declare public t: number;
    declare public airplane: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vx = 0;
        this.vy = 0;
        this.scale = 0;
        this.angle = 0;
        this.t = 0;
        this.airplane = false;
    }

    public constructor(x: number, y: number, airplane: boolean);
    public constructor(x: number, y: number, airplane: boolean, vx: number, vy: number);
    public constructor(arg0?: number, arg1?: number, arg2?: boolean, arg3?: number, arg4?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_Bomb(argCount, arg0, arg1, arg2, arg3, arg4);
    }

    private __construct_Bomb(argCount: number, arg0?: number, arg1?: number, arg2?: boolean, arg3?: number, arg4?: number): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal2 = arg0;
            let yLocal2 = arg1;
            let airplaneLocal2 = arg2;
            this.__construct_Bomb(5, xLocal2, yLocal2, airplaneLocal2, 0, 0);
            return;
        } else if (
            argCount === 5 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "boolean" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number"
        ) {
            let xLocal = arg0;
            let yLocal = arg1;
            let airplaneLocal = arg2;
            let vxLocal = arg3;
            let vyLocal = arg4;
            this.x = xLocal;
            this.y = yLocal;
            this.airplane = airplaneLocal;

            this.vx = this.gameMode.player.x + this.main.random.nextFloat() * Bomb.ERROR - Bomb.ERROR - xLocal;
            this.vy = this.gameMode.player.y + this.main.random.nextFloat() * Bomb.ERROR - Bomb.ERROR - yLocal;
            let imag = (airplaneLocal ? Bomb.VELOCITY : 0.75 * Bomb.VELOCITY) / javaFloat(Math.sqrt(this.vx * this.vx + this.vy * this.vy));
            this.vx *= imag;
            this.vy *= imag;

            this.vx += vxLocal;
            this.vy += vyLocal;

            this.angle = this.main.random.nextInt(4) * 90;

            if (airplaneLocal || this.isCloseToFrame()) {
                this.main.playSound(this.main.throwSound);
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly CLOSE_MARGIN: number = 128;
    public static readonly DISTANCE: number = 160;
    public static readonly MIN_SCALE: number = 32 / 44;
    public static readonly TRAVEL_TIME: number = 114;
    public static readonly HALF_TIME: number = javaIntDiv(Bomb.TRAVEL_TIME, 2);
    public static readonly GRAVITY: number = (-2 * (1 - Bomb.MIN_SCALE)) / (Bomb.HALF_TIME * Bomb.HALF_TIME);
    public static readonly HALF_GRAVITY2: number = (Bomb.MIN_SCALE - 1) / (Bomb.TRAVEL_TIME * Bomb.TRAVEL_TIME);
    public static readonly VELOCITY: number = Bomb.DISTANCE / Bomb.TRAVEL_TIME;
    public static readonly HALF_GRAVITY: number = Bomb.GRAVITY / 2;
    public static readonly V0: number = -Bomb.GRAVITY * Bomb.HALF_TIME;
    public static readonly ANGULAR_VELOCITY: number = 5;
    public static readonly ERROR: number = 64;

    private isCloseToFrame(): boolean {
        let X = this.x - this.gameMode.cameraX;
        let Y = this.y - this.gameMode.cameraY;
        return (
            X >= -Bomb.CLOSE_MARGIN &&
            X <= MainConstants.DISPLAY_WIDTH + Bomb.CLOSE_MARGIN &&
            Y >= -Bomb.CLOSE_MARGIN &&
            Y <= MainConstants.DISPLAY_HEIGHT + Bomb.CLOSE_MARGIN
        );
    }

    public override init(): void {
        super.init();

        this.layer = 5;

        this.hitX1 = -19;
        this.hitY1 = -19;
        this.hitX2 = 19;
        this.hitY2 = 19;

        this.mine = true;
        this.mineX1 = -19;
        this.mineY1 = -19;
        this.mineX2 = 19;
        this.mineY2 = 19;
    }

    public override remove(): void {
        this.removeFlag = true;
        if (!this.gameMode.isOutsideOfFrame(this.x, this.y) && this.playSoundOnRemove) {
            this.main.playExplodeSound2();
        }
    }

    public update(): void {
        this.x += this.vx;
        this.y += this.vy;
        if (this.airplane) {
            this.scale = 1 + Bomb.HALF_GRAVITY2 * this.t * this.t;
        } else {
            this.scale = Bomb.MIN_SCALE + this.t * (Bomb.V0 + Bomb.HALF_GRAVITY * this.t);
        }
        this.angle += Bomb.ANGULAR_VELOCITY;

        if (++this.t > Bomb.TRAVEL_TIME) {
            this.remove();
            new Explosion(this.x, this.y).setDamagesEnemies(false);
        }
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        return false;
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        return false;
    }

    // returns true if player bumped into the enemy

    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (this.t < Bomb.TRAVEL_TIME - 2 || invincible) {
            return false;
        }
        if (this.isMine(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(this.x, this.y);
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        this.main.draw(this.main.bomb, this.x, this.y, this.angle, this.scale);
    }
}
