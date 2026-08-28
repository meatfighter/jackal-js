import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { SwampMissile } from "./SwampMissile.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class SwampMissileLauncher extends Enemy {
    declare public splashIndex: number;
    declare public launchDelay: number;
    declare public splashing: number;
    declare public ready: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.splashIndex = 0;
        this.launchDelay = 0;
        this.splashing = 0;
        this.ready = false;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_SwampMissileLauncher(argCount, arg0, arg1);
    }

    private __construct_SwampMissileLauncher(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly LAUNCH_DELAY: number = 3 * 91;

    public static readonly splashIndices: boolean[] = [true, true, false, true, false, false];

    public override init(): void {
        super.init();

        this.layer = 3;

        this.bulletHits = 4;

        this.hitX1 = 12;
        this.hitY1 = 4;
        this.hitX2 = 52;
        this.hitY2 = 28;

        this.mine = true;
        this.mineX1 = 16;
        this.mineY1 = 8;
        this.mineX2 = 48;
        this.mineY2 = 24;

        this.solid = true;
        this.solidX1 = 0;
        this.solidY1 = 0;
        this.solidX2 = 64;
        this.solidY2 = 32;

        this.points = 2000;

        this.explosionX = 32;
        this.explosionY = 16;
    }

    public update(): void {
        if (this.ready) {
            if (this.splashing > 0) {
                this.splashing--;
            }
            if (this.launchDelay > 0) {
                this.launchDelay--;
            } else if (!this.gameMode.isOutsideOfFrame(javaFloat(this.x + 32), javaFloat(this.y + 16))) {
                this.launchDelay = SwampMissileLauncher.LAUNCH_DELAY;
                new SwampMissile(javaFloat(this.x + 32), javaFloat(this.y + 16));
                this.splashing = 16;
            }
        } else {
            if (!this.gameMode.isOutsideOfFrame(javaFloat(this.x + 32), this.y)) {
                this.ready = true;
            }
        }
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if ((attackSource == AttackSource.PLAYER_WEAPON || attackSource == AttackSource.TRAVELING_EXPLOSION) && this.hit(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(javaFloat(this.x + this.explosionX), javaFloat(this.y + this.explosionY));
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        return false;
    }

    public render(): void {
        if (this.splashing > 8) {
            this.main.draw(this.main.swampMissiles[4], this.x + 2, this.y);
        } else if (this.splashing > 0) {
            this.main.draw(this.main.swampMissiles[3], this.x + 16, this.y);
        } else {
            if (++this.splashIndex == 6) {
                this.splashIndex = 0;
            }
            if (SwampMissileLauncher.splashIndices[this.splashIndex]) {
                this.main.draw(this.main.swampMissiles[2], this.x + 8, this.y);
            } else {
                this.main.draw(this.main.swampMissiles[1], this.x + 24, this.y);
            }
        }
    }
}
