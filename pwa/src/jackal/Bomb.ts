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

    private constructor() {
        super();
    }

    public static create(x: number, y: number, airplane: boolean): Bomb {
        return Bomb.withVelocity(x, y, airplane, 0, 0);
    }

    public static withVelocity(x: number, y: number, airplane: boolean, vx: number, vy: number): Bomb {
        const bomb = new Bomb();
        x = javaFloat(x);
        y = javaFloat(y);
        vx = javaFloat(vx);
        vy = javaFloat(vy);

        bomb.x = x;
        bomb.y = y;
        bomb.airplane = airplane;

        bomb.vx = javaFloat(javaFloat(javaFloat(bomb.gameMode.player.x + javaFloat(bomb.main.random.nextFloat() * Bomb.ERROR)) - Bomb.ERROR) - x);
        bomb.vy = javaFloat(javaFloat(javaFloat(bomb.gameMode.player.y + javaFloat(bomb.main.random.nextFloat() * Bomb.ERROR)) - Bomb.ERROR) - y);
        const imag = javaFloat(
            (airplane ? Bomb.VELOCITY : javaFloat(0.75 * Bomb.VELOCITY)) /
                javaFloat(Math.sqrt(javaFloat(javaFloat(bomb.vx * bomb.vx) + javaFloat(bomb.vy * bomb.vy))))
        );
        bomb.vx = javaFloat(bomb.vx * imag);
        bomb.vy = javaFloat(bomb.vy * imag);

        bomb.vx = javaFloat(bomb.vx + vx);
        bomb.vy = javaFloat(bomb.vy + vy);

        bomb.angle = javaFloat(bomb.main.random.nextInt(4) * 90);

        if (airplane || bomb.isCloseToFrame()) {
            bomb.main.playSound(bomb.main.throwSound);
        }
        return bomb;
    }

    public static readonly CLOSE_MARGIN: number = 128;
    public static readonly DISTANCE: number = 160;
    public static readonly MIN_SCALE: number = javaFloat(32 / 44);
    public static readonly TRAVEL_TIME: number = 114;
    public static readonly HALF_TIME: number = javaIntDiv(Bomb.TRAVEL_TIME, 2);
    public static readonly GRAVITY: number = javaFloat(javaFloat(-2 * javaFloat(1 - Bomb.MIN_SCALE)) / (Bomb.HALF_TIME * Bomb.HALF_TIME));
    public static readonly HALF_GRAVITY2: number = javaFloat(javaFloat(Bomb.MIN_SCALE - 1) / (Bomb.TRAVEL_TIME * Bomb.TRAVEL_TIME));
    public static readonly VELOCITY: number = javaFloat(Bomb.DISTANCE / Bomb.TRAVEL_TIME);
    public static readonly HALF_GRAVITY: number = javaFloat(Bomb.GRAVITY / 2);
    public static readonly V0: number = javaFloat(-Bomb.GRAVITY * Bomb.HALF_TIME);
    public static readonly ANGULAR_VELOCITY: number = 5;
    public static readonly ERROR: number = 64;

    private isCloseToFrame(): boolean {
        let X = javaFloat(this.x - this.gameMode.cameraX);
        let Y = javaFloat(this.y - this.gameMode.cameraY);
        return (
            X >= -Bomb.CLOSE_MARGIN &&
            X <= javaFloat(MainConstants.DISPLAY_WIDTH + Bomb.CLOSE_MARGIN) &&
            Y >= -Bomb.CLOSE_MARGIN &&
            Y <= javaFloat(MainConstants.DISPLAY_HEIGHT + Bomb.CLOSE_MARGIN)
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
        this.x = javaFloat(this.x + this.vx);
        this.y = javaFloat(this.y + this.vy);
        if (this.airplane) {
            this.scale = javaFloat(1 + javaFloat(javaFloat(Bomb.HALF_GRAVITY2 * this.t) * this.t));
        } else {
            this.scale = javaFloat(Bomb.MIN_SCALE + javaFloat(this.t * javaFloat(Bomb.V0 + javaFloat(Bomb.HALF_GRAVITY * this.t))));
        }
        this.angle = javaFloat(this.angle + Bomb.ANGULAR_VELOCITY);

        if (++this.t > Bomb.TRAVEL_TIME) {
            this.remove();
            Explosion.create(this.x, this.y).setDamagesEnemies(false);
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
        if (this.isMineBounds(x1, y1, x2, y2)) {
            this.remove();
            Explosion.create(this.x, this.y);
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        this.main.drawImageRotatedScaled(this.main.bomb, this.x, this.y, this.angle, this.scale);
    }
}
