import { javaFloat } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
import type { Player } from "./Player.js";
export class GrayBoat extends Enemy {
    declare public player: Player | null;
    declare public spriteIndex: number;
    declare public spriteIndexCounter: number;
    declare public bulletDelay: number;
    declare public gunAngle: number;
    declare public updateGun: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.player = null;
        this.spriteIndex = 0;
        this.spriteIndexCounter = 0;
        this.bulletDelay = 0;
        this.movementDelay = 0;
        this.gunAngle = 0;
        this.updateGun = 0;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_GrayBoat(argCount, arg0, arg1);
    }

    private __construct_GrayBoat(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly SPRITE_TOGGLE_FRAMES: number = 12;
    public static readonly UPDATE_GUN_FRAMES: number = 4;
    public static readonly BULLET_DELAY: number = 91;
    public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;
    public static readonly SPEED: number = 1.75;
    public static readonly MOVEMENT_TIME: number = 227;
    public static readonly TO_DEGREES: number = javaFloat(180 / javaFloat(Math.PI));

    public movementDelay: number = GrayBoat.MOVEMENT_TIME;

    public override init(): void {
        super.init();

        this.player = this.gameMode.player;

        this.layer = 3;

        this.bulletHits = 8;

        this.hitX1 = 8;
        this.hitY1 = 8;
        this.hitX2 = 56;
        this.hitY2 = 184;

        this.points = 800;
    }

    public update(): void {
        if (this.movementDelay > 0) {
            this.movementDelay--;
            this.y = javaFloat(this.y + GrayBoat.SPEED);
        }
        if (--this.spriteIndexCounter < 0) {
            this.spriteIndexCounter = GrayBoat.SPRITE_TOGGLE_FRAMES;
            this.spriteIndex ^= 1;
        }
        if (--this.updateGun < 0) {
            this.updateGun = GrayBoat.UPDATE_GUN_FRAMES;
            this.gunAngle = javaFloat(
                GrayBoat.TO_DEGREES *
                    javaFloat(Math.atan2(javaFloat(this.player!.y - javaFloat(this.y + 131)), javaFloat(this.player!.x - javaFloat(this.x + 32))))
            );
        }
        if (--this.bulletDelay < 0) {
            this.bulletDelay = GrayBoat.BULLET_DELAY;
            let X = javaFloat(this.x + 32);
            let Y = javaFloat(this.y + 131);
            let dx = javaFloat(this.player!.x - X);
            let dy = javaFloat(this.player!.y - Y);
            let imag = javaFloat(1 / javaFloat(Math.sqrt(javaFloat(javaFloat(dx * dx) + javaFloat(dy * dy)))));
            dx = javaFloat(dx * imag);
            dy = javaFloat(dy * imag);

            new EnemyBullet(javaFloat(X + javaFloat(34 * dx)), javaFloat(Y + javaFloat(34 * dy)), dx, dy, GrayBoat.BULLET_TRAVEL_TIME, true);
        }
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource < AttackSource.PLAYER_EXPLOSION && this.hit(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(javaFloat(this.x + 32), javaFloat(this.y + 96));
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.hit(x1, y1, x2, y2)) {
            if (--this.bulletHits <= 0) {
                this.remove();
                new Explosion(javaFloat(this.x + 32), javaFloat(this.y + 96));
                this.main.addPoints(this.points);
            }
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        this.main.draw(this.main.grayBoats[this.spriteIndex], this.x, this.y);
        this.main.drawRotated(this.main.grayBoats[2], this.x + 32, this.y + 131, -14, -13, this.gunAngle);
    }
}
