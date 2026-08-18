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
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
export class CliffGun extends Enemy {
    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.state = 0;
        this.spriteIndex = 0;
        this.delay = 0;
        this.shots = 0;
        this.player = null as any;
    }

    public constructor(arg0?: any, arg1?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_CliffGun(argCount, arg0, arg1);
    }

    private __construct_CliffGun(argCount: number, arg0?: any, arg1?: any): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_HIDDEN: number = 0;
    public static readonly STATE_APPEARING: number = 1;
    public static readonly STATE_VISIBLE_1: number = 2;
    public static readonly STATE_SHOOTING: number = 3;
    public static readonly STATE_VISIBLE_2: number = 4;
    public static readonly STATE_DISAPPEARING: number = 5;

    public static readonly HIDDEN_TIME: number = 80;
    public static readonly APPEARING_TIME: number = 16;
    public static readonly VISIBLE_TIME: number = 16;
    public static readonly RECOIL_TIME: number = 28;
    public static readonly DEACTIVE_TIME: number = CliffGun.RECOIL_TIME * 3;

    public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;
    public static readonly BULLET_SPEED: number = 1.5;

    public static readonly RECOIL_MAGNITUDE: number = 8;
    public static readonly DEACTIVATE_DISTANCE: number = 128;

    public static readonly RECOILS: any[] = javaArray(CliffGun.RECOIL_TIME, 0);

    static {
        for (let i = 0; i < CliffGun.RECOIL_TIME; i++) {
            let percent = i / javaDouble(CliffGun.RECOIL_TIME);
            CliffGun.RECOILS[i] = javaFloat(CliffGun.RECOIL_MAGNITUDE * (0.5 - Math.cos(Math.PI * percent) / 2));
        }
    }

    public state: number = CliffGun.STATE_HIDDEN;

    public delay: number = CliffGun.HIDDEN_TIME;

    public init(): void {
        super.init();

        this.player = this.gameMode.player;

        this.layer = 3;

        this.hitX1 = 8;
        this.hitY1 = 8;
        this.hitX2 = 88;
        this.hitY2 = 56;

        this.points = 1000;

        this.explosionX = 48;
        this.explosionY = 32;
    }

    public update(): void {
        //    if (!ready && y + 32 >= gameMode.cameraX) {
        //      ready = true;
        //    }

        switch (this.state) {
            case CliffGun.STATE_HIDDEN:
                if (--this.delay == 0) {
                    this.state = CliffGun.STATE_APPEARING;
                    this.spriteIndex = 1;
                    this.delay = CliffGun.APPEARING_TIME;
                }
                break;
            case CliffGun.STATE_APPEARING:
                if (--this.delay == 0) {
                    if (this.spriteIndex == 1) {
                        this.spriteIndex = 2;
                        this.delay = CliffGun.APPEARING_TIME;
                    } else {
                        this.state = CliffGun.STATE_VISIBLE_1;
                        this.spriteIndex = 3;
                        this.delay = CliffGun.VISIBLE_TIME;
                    }
                }
                break;
            case CliffGun.STATE_VISIBLE_1:
                if (--this.delay == 0) {
                    if (this.player.y - this.y < CliffGun.DEACTIVATE_DISTANCE) {
                        this.state = CliffGun.STATE_VISIBLE_2;
                        this.delay = CliffGun.DEACTIVE_TIME;
                    } else {
                        this.state = CliffGun.STATE_SHOOTING;
                        this.shots = 3;
                        this.shoot();
                    }
                }
                break;
            case CliffGun.STATE_SHOOTING:
                if (--this.delay == 0) {
                    if (this.shots == 0) {
                        this.state = CliffGun.STATE_VISIBLE_2;
                        this.delay = CliffGun.VISIBLE_TIME;
                    } else {
                        this.shoot();
                    }
                }
                break;
            case CliffGun.STATE_VISIBLE_2:
                if (--this.delay == 0) {
                    this.state = CliffGun.STATE_DISAPPEARING;
                    this.spriteIndex = 2;
                    this.delay = CliffGun.APPEARING_TIME;
                }
                break;
            case CliffGun.STATE_DISAPPEARING:
                if (--this.delay == 0) {
                    if (this.spriteIndex == 2) {
                        this.spriteIndex = 1;
                        this.delay = CliffGun.APPEARING_TIME;
                    } else {
                        this.spriteIndex = 0;
                        this.state = CliffGun.STATE_HIDDEN;
                        this.delay = CliffGun.HIDDEN_TIME;
                    }
                }
                break;
        }
    }

    private shoot(): void {
        this.delay = CliffGun.RECOIL_TIME - 1;
        this.shots--;
        let X = this.x + 48;
        let Y = this.y + 36;
        let dx = this.player.x - X;
        let dy = this.player.y - Y;
        let iMag = CliffGun.BULLET_SPEED / javaFloat(Math.sqrt(dx * dx + dy * dy));
        dx *= iMag;
        dy *= iMag;
        new EnemyBullet(X, Y, dx, dy, CliffGun.BULLET_TRAVEL_TIME);
    }

    // returns true if attack successful

    public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
        if (this.spriteIndex < 2) {
            return false;
        }
        if (attackSource < AttackSource.PLAYER_EXPLOSION && this.hit(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(this.x + this.explosionX, this.y + this.explosionY);
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy

    public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
        if (this.state == CliffGun.STATE_HIDDEN) {
            return false;
        }
        if (this.hit(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        this.main.draw(this.main.cliffGuns[this.spriteIndex], this.x, this.y);
        if (this.spriteIndex == 3) {
            if (this.state == CliffGun.STATE_SHOOTING) {
                this.main.draw(this.main.cliffGuns[4], this.x + 32, this.y - CliffGun.RECOILS[this.delay]);
            } else {
                this.main.draw(this.main.cliffGuns[4], this.x + 32, this.y);
            }
        }
    }
}
