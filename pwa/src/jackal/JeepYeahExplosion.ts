import type { ArrayList } from "../java/JavaRuntime.js";
import type { Enemy } from "./Enemy.js";
import type { Main } from "./Main.js";
export class JeepYeahExplosion {
    public constructor(arg0?: number, arg1?: number) {
        const argCount = arguments.length;
        this.__construct_JeepYeahExplosion(argCount, arg0, arg1);
    }

    private __construct_JeepYeahExplosion(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly GROW_RATE: number = 1.03;

    public size: number = 32;
    public spriteIndex: number = 0;
    public scale: number = 0;
    public grenadeExplosion: boolean = false;
    public damagesEnemies: boolean = true;
    public enemies: ArrayList<Enemy> = null;
    public type: number = 0;
    public tiny: boolean = false;
    public delay: number = 0;
    public alpha: number = 1;
    public enemyX: number = 0;
    public enemyY: number = 0;
    public enemy: Enemy = null;
    public x: number = 0;
    public y: number = 0;
    public remove: boolean = false;

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

    public update(): void {
        if (this.delay > 0) {
            if (--this.delay == 0) {
                if (this.enemy != null) {
                    this.x += this.enemy.x - this.enemyX;
                    this.y += this.enemy.y - this.enemyY;
                }
            } else {
                return;
            }
        }

        this.size *= JeepYeahExplosion.GROW_RATE;

        if (this.size >= 80) {
            this.spriteIndex = 2;
            this.scale = this.size / 128;
        } else if (this.size >= 56) {
            this.spriteIndex = 1;
            this.scale = this.size / 56;
        } else {
            this.spriteIndex = 0;
            this.scale = this.size / 32;
        }

        if ((this.tiny && this.size > 68) || this.size > 128) {
            this.remove = true;
        }
    }

    public render(main: Main): void {
        if (this.alpha == 1) {
            main.drawScaled(main.explosions[this.spriteIndex], this.x, this.y, this.scale);
        } else {
            main.drawScaled(main.explosions[this.spriteIndex], this.x, this.y, this.scale, this.alpha);
        }
    }
}
