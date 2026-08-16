// @ts-nocheck
import {
    AppGameContainer,
    ApplicationGameContainer,
    BasicGame,
    Color,
    Cursor,
    Display,
    GameContainer,
    GL11,
    Graphics,
    Image,
    Input,
    Log,
    Music,
    Mouse,
    ResourceLoader,
    ScalableGame,
    SlickException,
    Sound,
    SoundStore,
    Sys,
    XMLPackedSheet
} from "slick2d-ts";
import {
    ArrayList,
    Arrays,
    BufferedInputStream,
    Character,
    Class,
    Collections,
    DataInputStream,
    HashMap,
    Integer,
    JAVA_LONG_LOW_3_BITS,
    JAVA_LONG_PACKED_3BIT_SHIFTS,
    JavaString,
    Point2D,
    Random,
    System,
    java2DArray,
    java3DArray,
    java4DArray,
    javaArray,
    javaByte,
    javaChar,
    javaDouble,
    javaFloat,
    javaInt,
    javaIntDiv,
    javaLong,
    javaRoundFloat,
    javaShort,
    rotatePoint
} from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { GameElement } from "./GameElement.js";
export class Explosion extends GameElement {
    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.size = 0;
        this.spriteIndex = 0;
        this.scale = 0;
        this.grenadeExplosion = false;
        this.damagesEnemies = false;
        this.enemies = null as any;
        this.type = 0;
        this.tiny = false;
        this.delay = 0;
        this.alpha = 0;
        this.enemyX = 0;
        this.enemyY = 0;
        this.enemy = null as any;
    }

    public constructor(arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_Explosion(argCount, arg0, arg1, arg2, arg3, arg4, arg5);
    }

    private __construct_Explosion(argCount: number, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any): void {
        if (
            argCount === 6 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "boolean" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number"
        ) {
            let xLocal4 = arg0;
            let yLocal4 = arg1;
            let tinyLocal2 = arg2;
            let delayLocal2 = arg3;
            let alphaLocal2 = arg4;
            let enemyLocal = arg5;
            this.__construct_Explosion(5, xLocal4, yLocal4, tinyLocal2, delayLocal2, alphaLocal2);
            this.enemy = enemyLocal;
            this.enemyX = enemyLocal.x;
            this.enemyY = enemyLocal.y;
            return;
        } else if (
            argCount === 5 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "boolean" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number"
        ) {
            let xLocal3 = arg0;
            let yLocal3 = arg1;
            let tinyLocal = arg2;
            let delayLocal = arg3;
            let alphaLocal = arg4;
            this.__construct_Explosion(3, xLocal3, yLocal3, false);
            this.setTiny(tinyLocal);
            this.setDelayed(delayLocal);
            this.setAlpha(alphaLocal);
            return;
        } else if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal2 = arg0;
            let yLocal2 = arg1;
            this.__construct_Explosion(3, xLocal2, yLocal2, false);
            return;
        } else if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal = arg0;
            let yLocal = arg1;
            let playerExplosion = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.type = playerExplosion ? AttackSource.PLAYER_EXPLOSION : AttackSource.EXPLOSION;

            this.enemies = this.gameMode.enemies;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly GROW_RATE: number = 1.03;

    public size: number = 32;

    public damagesEnemies: boolean = true;

    public alpha: number = 1;

    public setAlpha(alpha: any): void {
        this.alpha = alpha;
    }

    public setTiny(tiny: any): void {
        this.tiny = tiny;
        if (tiny) {
            this.setDamagesEnemies(false);
        }
    }

    public setDelayed(delay: any): void {
        this.delay = delay;
    }

    public setDamagesEnemies(damagesEnemies: any): void {
        this.damagesEnemies = damagesEnemies;
    }

    public setGrenadeExplosion(grenadeExplosion: any): void {
        this.grenadeExplosion = grenadeExplosion;
    }

    public init(): void {
        this.layer = 5;
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

        this.size *= Explosion.GROW_RATE;

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

        let margin = this.size * 0.35;
        let x1 = this.x - margin;
        let y1 = this.y - margin;
        let x2 = this.x + margin;
        let y2 = this.y + margin;
        if (this.damagesEnemies && !this.gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
            for (let i = this.enemies.size() - 1; i >= 0; i--) {
                let enemyLocal = this.enemies.get(i);
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
