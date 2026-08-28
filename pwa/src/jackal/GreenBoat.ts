import { javaFloat } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import type { Player } from "./Player.js";
export class GreenBoat extends Enemy {
    declare public player: Player | null;
    declare public spriteIndex: number;
    declare public spriteIndexCounter: number;
    declare public bulletDelay: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.player = null;
        this.spriteIndex = 0;
        this.spriteIndexCounter = 0;
        this.bulletDelay = 0;
        this.movementDelay = 0;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_GreenBoat(argCount, arg0, arg1);
    }

    private __construct_GreenBoat(argCount: number, arg0?: number, arg1?: number): void {
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
    public static readonly BULLET_DELAY: number = 91;
    public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;
    public static readonly SPEED: number = 0.75;
    public static readonly MOVEMENT_TIME: number = 181;

    public movementDelay: number = GreenBoat.MOVEMENT_TIME;

    public override init(): void {
        super.init();

        this.player = this.gameMode.player;

        this.layer = 3;

        this.bulletHits = 6;

        this.hitX1 = -40;
        this.hitY1 = -40;
        this.hitX2 = 40;
        this.hitY2 = 40;

        this.points = 800;
    }

    public update(): void {
        if (this.movementDelay > 0) {
            this.movementDelay--;
            this.x = javaFloat(this.x - GreenBoat.SPEED);
            this.y = javaFloat(this.y + GreenBoat.SPEED);
        }
        if (--this.spriteIndexCounter < 0) {
            this.spriteIndexCounter = GreenBoat.SPRITE_TOGGLE_FRAMES;
            this.spriteIndex ^= 1;
        }
        if (--this.bulletDelay < 0) {
            this.bulletDelay = GreenBoat.BULLET_DELAY;
            let X = javaFloat(this.x - 16);
            let Y = javaFloat(this.y + 16);
            let dx = javaFloat(this.player!.x - X);
            let dy = javaFloat(this.player!.y - Y);
            let imag = javaFloat(1 / javaFloat(Math.sqrt(javaFloat(javaFloat(dx * dx) + javaFloat(dy * dy)))));

            new EnemyBullet(X, Y, javaFloat(dx * imag), javaFloat(dy * imag), GreenBoat.BULLET_TRAVEL_TIME, true);
        }
    }

    public render(): void {
        this.main.draw(this.main.greenBoats[this.spriteIndex], this.x - 58, this.y - 64);
    }
}
