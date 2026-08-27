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
import { MainConstants } from "../java/MainConstants.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import type { Player } from "./Player.js";
export class SwampMissile extends Enemy {
    declare public vx: number;
    declare public vy: number;
    declare public launcherX: number;
    declare public launcherY: number;
    declare public clipX: number;
    declare public explodeDelay: number;
    declare public player: Player | null;

    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.launcherX = 0;
        this.launcherY = 0;
        this.clipX = 0;
        this.explodeDelay = 0;
        this.player = null;
        this.entryDelay = 0;
    }

    public constructor(arg0?: any, arg1?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_SwampMissile(argCount, arg0, arg1);
    }

    private __construct_SwampMissile(argCount: number, arg0?: any, arg1?: any): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let launcherXLocal = arg0;
            let launcherYLocal = arg1;
            this.launcherX = launcherXLocal;
            this.launcherY = launcherYLocal;

            this.player = this.gameMode.player;

            this.x = launcherXLocal;
            this.y = launcherYLocal + 32;
            this.vx = 0;
            this.vy = -SwampMissile.SPEED;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly ROTATION_SPEED: number = 0.9;
    public static readonly EXPLODE_DELAY: number = 8 * 91;
    public static readonly SPEED: number = 4;
    public static readonly TO_RADIANS: number = javaFloat(Math.PI / 180);
    public static readonly EXPLODE_OFFSET: number = 21 / SwampMissile.SPEED;
    public static readonly ENTRY_DELAY: number = 45;
    public static readonly REMOVE_MARGIN: number = 336;

    public angle: number = 270;

    public entryDelay: number = SwampMissile.ENTRY_DELAY;

    public init(): void {
        super.init();

        this.layer = 4;

        this.bulletHits = 1;

        this.hitX1 = -26;
        this.hitY1 = -26;
        this.hitX2 = 26;
        this.hitY2 = 26;

        this.mine = true;
        this.mineX1 = -8;
        this.mineY1 = -8;
        this.mineX2 = 8;
        this.mineY2 = 8;
    }

    public update(): void {
        if (this.entryDelay > 0) {
            this.entryDelay--;
            this.y -= SwampMissile.SPEED;
        } else {
            let targetAngle = javaFloat((Math.atan2(this.player.y - this.y, this.player.x - this.x) * 180) / Math.PI);
            let deltaAngle = (targetAngle - this.angle + 180) % 360;
            if (deltaAngle < 0) {
                deltaAngle += 180;
            } else {
                deltaAngle -= 180;
            }
            if (Math.abs(deltaAngle) < SwampMissile.ROTATION_SPEED) {
                this.angle = targetAngle;
            } else {
                if (deltaAngle < 0) {
                    this.angle -= SwampMissile.ROTATION_SPEED;
                } else {
                    this.angle += SwampMissile.ROTATION_SPEED;
                }
            }

            let ang = SwampMissile.TO_RADIANS * this.angle;
            this.vx = SwampMissile.SPEED * javaFloat(Math.cos(ang));
            this.vy = SwampMissile.SPEED * javaFloat(Math.sin(ang));
            this.x += this.vx;
            this.y += this.vy;
        }

        if (
            this.y < this.gameMode.cameraY - SwampMissile.REMOVE_MARGIN ||
            this.y > this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT + SwampMissile.REMOVE_MARGIN ||
            this.x < this.gameMode.cameraX - SwampMissile.REMOVE_MARGIN ||
            this.x > this.gameMode.cameraX + MainConstants.DISPLAY_WIDTH + SwampMissile.REMOVE_MARGIN
        ) {
            this.playSoundOnRemove = false;
            this.remove();
        } else if (++this.explodeDelay == SwampMissile.EXPLODE_DELAY) {
            this.remove();
            new Explosion(this.x + SwampMissile.EXPLODE_OFFSET * this.vx, this.y + SwampMissile.EXPLODE_OFFSET * this.vy).setTiny(true);
        }
    }

    public render(): void {
        if (this.entryDelay > 0) {
            this.gameMode.g.setWorldClip(this.launcherX - 20, this.launcherY - 256, 40, 256);
            this.main.drawRotated(this.main.swampMissiles[0], this.x, this.y, this.angle);
            this.gameMode.g.clearWorldClip();
        } else {
            this.main.drawRotated(this.main.swampMissiles[0], this.x, this.y, this.angle);
        }
    }
}
