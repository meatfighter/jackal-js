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
import { BossHelicopter } from "./BossHelicopter.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import type { Player } from "./Player.js";
export class EnemyHelicopter extends Enemy {
    declare public angle: number;
    declare public rotorAngle: number;
    declare public positionDriftTime: number;
    declare public positionDriftDx: number;
    declare public positionDriftDy: number;
    declare public enteringAcceleration: number;
    declare public vy: number;
    declare public delay: number;
    declare public down: boolean;
    declare public player: Player | null;
    declare public targetAngle: number;
    declare public targetHalfAngle: number;
    declare public positiveAngle: boolean;
    declare public va: number;
    declare public v: number;

    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.angle = 0;
        this.rotorAngle = 0;
        this.positionDriftTime = 0;
        this.positionDriftDx = 0;
        this.positionDriftDy = 0;
        this.state = 0;
        this.enteringAcceleration = 0;
        this.vy = 0;
        this.delay = 0;
        this.down = false;
        this.player = null;
        this.targetAngle = 0;
        this.targetHalfAngle = 0;
        this.positiveAngle = false;
        this.va = 0;
        this.v = 0;
        this.shootDelay = 0;
    }

    public constructor(arg0?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_EnemyHelicopter(argCount, arg0);
    }

    private __construct_EnemyHelicopter(argCount: number, arg0?: any): void {
        if (argCount === 1 && typeof arg0 === "boolean") {
            let downLocal = arg0;
            this.x = this.gameMode.player.x + (this.main.random.nextBoolean() ? -EnemyHelicopter.APPEAR_DISTANCE : EnemyHelicopter.APPEAR_DISTANCE);
            if (this.x - 96 < this.gameMode.cameraX) {
                this.x = this.gameMode.player.x + EnemyHelicopter.APPEAR_DISTANCE;
            } else if (this.x + 96 > this.gameMode.cameraX + MainConstants.DISPLAY_WIDTH) {
                this.x = this.gameMode.player.x - EnemyHelicopter.APPEAR_DISTANCE;
            }

            if (downLocal) {
                this.angle = 90;
                this.y = this.gameMode.cameraY - 60;
            } else {
                this.angle = 270;
                this.y = this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT + 60;
            }

            this.enteringAcceleration =
                (2 * (this.y - (this.gameMode.cameraY + 0.5 * MainConstants.DISPLAY_HEIGHT))) /
                (javaFloat(EnemyHelicopter.ENTERING_TIME) * javaFloat(EnemyHelicopter.ENTERING_TIME));
            this.vy = -this.enteringAcceleration * javaFloat(EnemyHelicopter.ENTERING_TIME);

            this.down = downLocal;
            this.player = this.gameMode.player;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly APPEAR_DISTANCE: number = 192;

    public static readonly STATE_ENTERING: number = 0;
    public static readonly STATE_PAUSED: number = 1;
    public static readonly STATE_EXITING: number = 2;

    public static readonly ENTERING_TIME: number = 2 * 91;
    public static readonly PAUSED_TIME: number = 45;
    public static readonly ROTATION_TIME: number = 91;

    public static readonly ROTATION_ACCELERATION: number = 90 / (javaFloat(EnemyHelicopter.ROTATION_TIME) * javaFloat(EnemyHelicopter.ROTATION_TIME));
    public static readonly TO_RADIANS: number = javaFloat(Math.PI / 180);

    public static readonly SHOOT_DELAY: number = 68;

    public static readonly BULLET_SPEED: number = 1.75;
    public static readonly BULLET_TRAVEL_TIME: number = 91;

    public state: number = EnemyHelicopter.STATE_ENTERING;

    public shootDelay: number = EnemyHelicopter.SHOOT_DELAY;

    public init(): void {
        super.init();

        this.layer = 7;

        this.hitX1 = -24;
        this.hitY1 = -71;
        this.hitX2 = 24;
        this.hitY2 = 41;

        this.points = 2000;
    }

    public remove(): void {
        this.removeFlag = true;
        this.main.stopSound(this.main.helicopterSound2);
        if (this.playSoundOnRemove) {
            this.main.playHitExplodeSound();
        }
    }

    // returns true if player bullet was absorbed by enemy

    public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
        return false;
    }

    public update(): void {
        this.main.playSoundIfNotPlaying(this.main.helicopterSound2);

        if (--this.shootDelay < 0) {
            this.shootDelay = EnemyHelicopter.SHOOT_DELAY;
            let dx = this.player.x - this.x;
            let dy = this.player.y - this.y;
            let imag = EnemyHelicopter.BULLET_SPEED / javaFloat(Math.sqrt(dx * dx + dy * dy));
            dx *= imag;
            dy *= imag;

            new EnemyBullet(this.x + dx, this.y + dy, dx, dy, EnemyHelicopter.BULLET_TRAVEL_TIME, true);
        }

        if (--this.positionDriftTime <= 0) {
            this.positionDriftTime = BossHelicopter.POSITION_DRIFT_TIME - 1;
            let driftAngle = BossHelicopter.PI2 * this.main.random.nextFloat();
            this.positionDriftDx = javaFloat(Math.cos(driftAngle));
            this.positionDriftDy = javaFloat(Math.sin(driftAngle));
        }
        this.x += this.positionDriftDx * BossHelicopter.POSITIONS[this.positionDriftTime];
        this.y += this.positionDriftDy * BossHelicopter.POSITIONS[this.positionDriftTime];

        switch (this.state) {
            case EnemyHelicopter.STATE_ENTERING:
                let lastVy = this.vy;
                this.vy += this.enteringAcceleration;
                this.y += this.vy;
                if (lastVy * this.vy <= 0) {
                    this.state = EnemyHelicopter.STATE_PAUSED;
                    this.delay = EnemyHelicopter.PAUSED_TIME;
                }
                break;
            case EnemyHelicopter.STATE_PAUSED:
                if (--this.delay == 0) {
                    this.state = EnemyHelicopter.STATE_EXITING;
                    if (this.down) {
                        this.enteringAcceleration = -this.enteringAcceleration;
                    }
                    if (this.down) {
                        if (this.x > this.player.x) {
                            this.targetAngle = 135;
                            this.targetHalfAngle = 112.5;
                            this.positiveAngle = true;
                        } else {
                            this.targetAngle = 45;
                            this.targetHalfAngle = 67.5;
                            this.positiveAngle = false;
                        }
                    } else {
                        if (this.x > this.player.x) {
                            this.targetAngle = 225;
                            this.targetHalfAngle = 247.5;
                            this.positiveAngle = false;
                        } else {
                            this.targetAngle = 315;
                            this.targetHalfAngle = 292.5;
                            this.positiveAngle = true;
                        }
                    }
                }
                break;
            case EnemyHelicopter.STATE_EXITING:
                if (this.angle != this.targetAngle) {
                    this.angle += this.va;
                    if (this.positiveAngle) {
                        if (this.angle >= this.targetHalfAngle) {
                            this.va -= EnemyHelicopter.ROTATION_ACCELERATION;
                            if (this.va <= 0) {
                                this.angle = this.targetAngle;
                            }
                        } else {
                            this.va += EnemyHelicopter.ROTATION_ACCELERATION;
                        }
                    } else {
                        if (this.angle <= this.targetHalfAngle) {
                            this.va += EnemyHelicopter.ROTATION_ACCELERATION;
                            if (this.va >= 0) {
                                this.angle = this.targetAngle;
                            }
                        } else {
                            this.va -= EnemyHelicopter.ROTATION_ACCELERATION;
                        }
                    }
                }
                let ang = EnemyHelicopter.TO_RADIANS * this.angle;
                this.v += this.enteringAcceleration;
                this.x += this.v * javaFloat(Math.cos(ang));
                this.y += this.v * javaFloat(Math.sin(ang));
                if (this.gameMode.isOutsideOfFrame(this.x - 96, this.y - 96, this.x + 96, this.y + 96)) {
                    this.playSoundOnRemove = false;
                    this.remove();
                }
                break;
        }
    }

    public checkBounds(maxY: any): void {}

    public render(): void {
        this.rotorAngle -= 30;
        if (this.rotorAngle == -90) {
            this.rotorAngle = 0;
        }

        let ang = this.angle - BossHelicopter.DRIFT_ANGLES[this.positionDriftTime] * this.positionDriftDx;

        this.main.drawRotated(this.main.enemyHelicopters[2], this.x + 32, this.y + 40, -30, -11, ang);
        this.main.drawRotated(this.main.enemyHelicopters[0], this.x, this.y, -74, -28, ang);

        for (let i = 0; i < 4; i++) {
            this.main.drawRotated(this.main.enemyHelicopters[1], this.x, this.y, 0, -18, 90 * i + this.rotorAngle);
        }
    }
}
