import { ArrayList } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { GameElement } from "./GameElement.js";
import type { Enemy } from "./Enemy.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Explosion extends GameElement {
    declare public spriteIndex: number;
    declare public scale: number;
    declare public grenadeExplosion: boolean;
    declare public enemies: ArrayList<Enemy> | null;
    declare public type: number;
    declare public tiny: boolean;
    declare public delay: number;
    declare public enemyX: number;
    declare public enemyY: number;
    // Java declares an Enemy-valued `enemy` field here while GameElement already has
    // `enemy: boolean`. Java field hiding keeps both slots; JavaScript needs distinct keys.
    declare public sourceEnemy: Enemy | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.size = 0;
        this.spriteIndex = 0;
        this.scale = 0;
        this.grenadeExplosion = false;
        this.damagesEnemies = false;
        this.enemies = null;
        this.type = 0;
        this.tiny = false;
        this.delay = 0;
        this.alpha = 0;
        this.enemyX = 0;
        this.enemyY = 0;
        this.sourceEnemy = null;
    }

    public constructor(x: number, y: number, tiny: boolean, delay: number, alpha: number, enemy: Enemy);
    public constructor(x: number, y: number, tiny: boolean, delay: number, alpha: number);
    public constructor(x: number, y: number);
    public constructor(x: number, y: number, playerExplosion: boolean);
    public constructor(arg0?: number, arg1?: number, arg2?: boolean, arg3?: number, arg4?: number, arg5?: Enemy) {
        super();
        const argCount = arguments.length;
        this.__construct_Explosion(argCount, arg0, arg1, arg2, arg3, arg4, arg5);
    }

    private __construct_Explosion(argCount: number, arg0?: number, arg1?: number, arg2?: boolean, arg3?: number, arg4?: number, arg5?: Enemy): void {
        if (
            argCount === 6 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "boolean" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number"
        ) {
            let xLocal4 = javaFloat(arg0);
            let yLocal4 = javaFloat(arg1);
            let tinyLocal2 = arg2;
            let delayLocal2 = arg3;
            let alphaLocal2 = javaFloat(arg4);
            let enemyLocal = arg5;
            this.__construct_Explosion(5, xLocal4, yLocal4, tinyLocal2, delayLocal2, alphaLocal2);
            this.sourceEnemy = enemyLocal!;
            this.enemyX = enemyLocal!.x;
            this.enemyY = enemyLocal!.y;
            return;
        } else if (
            argCount === 5 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "boolean" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number"
        ) {
            let xLocal3 = javaFloat(arg0);
            let yLocal3 = javaFloat(arg1);
            let tinyLocal = arg2;
            let delayLocal = arg3;
            let alphaLocal = javaFloat(arg4);
            this.__construct_Explosion(3, xLocal3, yLocal3, false);
            this.setTiny(tinyLocal);
            this.setDelayed(delayLocal);
            this.setAlpha(alphaLocal);
            return;
        } else if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal2 = javaFloat(arg0);
            let yLocal2 = javaFloat(arg1);
            this.__construct_Explosion(3, xLocal2, yLocal2, false);
            return;
        } else if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            let playerExplosion = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.type = playerExplosion ? AttackSource.PLAYER_EXPLOSION : AttackSource.EXPLOSION;

            this.enemies = this.gameMode.enemies;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly GROW_RATE: number = javaFloat(1.03);

    public size: number = 32;

    public damagesEnemies: boolean = true;

    public alpha: number = 1;

    public setAlpha(alpha: number): void {
        this.alpha = alpha;
    }

    public setTiny(tiny: boolean): void {
        this.tiny = tiny;
        if (tiny) {
            this.setDamagesEnemies(false);
        }
    }

    public setDelayed(delay: number): void {
        this.delay = delay;
    }

    public setDamagesEnemies(damagesEnemies: boolean): void {
        this.damagesEnemies = damagesEnemies;
    }

    public setGrenadeExplosion(grenadeExplosion: boolean): void {
        this.grenadeExplosion = grenadeExplosion;
    }

    public init(): void {
        this.layer = 5;
    }

    public update(): void {
        if (this.delay > 0) {
            if (--this.delay == 0) {
                if (this.sourceEnemy != null) {
                    this.x = javaFloat(javaFloat(this.x + this.sourceEnemy.x) - this.enemyX);
                    this.y = javaFloat(javaFloat(this.y + this.sourceEnemy.y) - this.enemyY);
                }
            } else {
                return;
            }
        }

        this.size = javaFloat(this.size * Explosion.GROW_RATE);

        if (this.size >= 80) {
            this.spriteIndex = 2;
            this.scale = javaFloat(this.size / 128);
        } else if (this.size >= 56) {
            this.spriteIndex = 1;
            this.scale = javaFloat(this.size / 56);
        } else {
            this.spriteIndex = 0;
            this.scale = javaFloat(this.size / 32);
        }

        let margin = javaFloat(this.size * javaFloat(0.35));
        let x1 = javaFloat(this.x - margin);
        let y1 = javaFloat(this.y - margin);
        let x2 = javaFloat(this.x + margin);
        let y2 = javaFloat(this.y + margin);
        if (this.damagesEnemies && !this.gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
            for (let i = this.enemies!.size() - 1; i >= 0; i--) {
                let enemyLocal = this.enemies!.get(i);
                if (!enemyLocal.removeFlag) {
                    enemyLocal.attack(x1, y1, x2, y2, this.type);
                }
            }
        }

        if ((this.tiny && this.size > 68) || this.size > 128) {
            this.removeFlag = true;
            if (this.grenadeExplosion) {
                this.gameMode.player.setWeaponArmed(true);
            }
        }
    }

    public render(): void {
        if (this.alpha == 1) {
            this.main.drawScaled(this.main.explosions[this.spriteIndex], this.x, this.y, this.scale);
        } else {
            this.main.drawScaled(this.main.explosions[this.spriteIndex], this.x, this.y, this.scale, this.alpha);
        }
    }
}
