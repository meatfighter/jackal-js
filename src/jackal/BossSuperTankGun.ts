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
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { RotatingGunState } from "./RotatingGun.js";
export enum BossSuperTankGunState {
    FIRING,
    PAUSED_BETWEEN_FIRING,
    TRACKING
}
export class BossSuperTankGun extends Enemy {
    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.state = null as any;
        this.angle = 0;
        this.recoil = 0;
        this.pause = 0;
        this.group = 0;
        this.groupSize = 0;
        this.recoilIndex = 0;
        this.bossSuperTank = null as any;
    }

    public constructor(arg0?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_BossSuperTankGun(argCount, arg0);
    }

    private __construct_BossSuperTankGun(argCount: number, arg0?: any): void {
        if (argCount === 1) {
            let bossSuperTankLocal = arg0;
            this.bossSuperTank = bossSuperTankLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly RECOIL_DURATION: number = 17;
    public static readonly RECOIL_AMPLITUDE: number = 8;
    public static readonly recoils: any[] = javaArray(BossSuperTankGun.RECOIL_DURATION, 0);
    public static readonly PAUSE_AFTER_RECOIL: number = 17;
    public static readonly PAUSE_BETWEEN_GROUPS: number = 50;
    public static readonly GROUP_SIZE: number = 3;
    public static readonly ROTATION_SPEED: number = 0.9;
    public static readonly BULLET_DISTANCE: number = 480;
    public static readonly GARAGE_BULLET_DISTANCE: number = 464;
    public static readonly YELLOW_BULLET_SPEED: number = 1.75 * EnemyBullet.SPEED;
    public static readonly BULLET_TRAVEL_TIME: number = javaInt(BossSuperTankGun.BULLET_DISTANCE / BossSuperTankGun.YELLOW_BULLET_SPEED);
    public static readonly X_OFFSET: number = 244;
    public static readonly Y_OFFSET: number = 88;

    static {
        for (let i = 1; i <= BossSuperTankGun.RECOIL_DURATION; i++) {
            BossSuperTankGun.recoils[i - 1] = BossSuperTankGun.RECOIL_AMPLITUDE * javaFloat(Math.sin((i * Math.PI) / (BossSuperTankGun.RECOIL_DURATION + 1)));
        }
    }

    public state: any = RotatingGunState.PAUSED_BETWEEN_FIRING;
    public angle: number = 90;

    public pause: number = 2 * 91;

    public groupSize: number = BossSuperTankGun.GROUP_SIZE;

    public init(): void {
        super.init();

        this.layer = 3;
    }

    public update(): void {
        this.x = this.bossSuperTank.x + BossSuperTankGun.X_OFFSET;
        this.y = this.bossSuperTank.y + BossSuperTankGun.Y_OFFSET;

        switch (this.state) {
            case RotatingGunState.FIRING:
                if (--this.recoilIndex < 0) {
                    if (++this.group == this.groupSize) {
                        this.recoil = 0;
                        this.state = RotatingGunState.TRACKING;
                        this.pause = BossSuperTankGun.PAUSE_BETWEEN_GROUPS;
                        this.group = 0;
                    } else {
                        this.recoil = 0;
                        this.state = RotatingGunState.PAUSED_BETWEEN_FIRING;
                        this.pause = BossSuperTankGun.PAUSE_AFTER_RECOIL;
                    }
                } else {
                    this.recoil = BossSuperTankGun.recoils[this.recoilIndex];
                }
                break;
            case RotatingGunState.PAUSED_BETWEEN_FIRING:
                if (this.pause > 0) {
                    this.pause--;
                } else {
                    this.fire();
                }
                break;
            case RotatingGunState.TRACKING: {
                if (this.pause > 0) {
                    this.pause--;
                }
                let player = this.gameMode.player;
                let targetAngle = javaFloat(
                    (Math.atan2(player.y - (this.bossSuperTank.y + BossSuperTankGun.Y_OFFSET), player.x - (this.bossSuperTank.x + BossSuperTankGun.X_OFFSET)) *
                        180) /
                        Math.PI
                );
                let deltaAngle = (targetAngle - this.angle + 180) % 360;
                if (deltaAngle < 0) {
                    deltaAngle += 180;
                } else {
                    deltaAngle -= 180;
                }
                if (Math.abs(deltaAngle) < BossSuperTankGun.ROTATION_SPEED) {
                    this.angle = targetAngle;
                    if (this.pause == 0) {
                        this.fire();
                    }
                } else {
                    if (deltaAngle < 0) {
                        this.angle -= BossSuperTankGun.ROTATION_SPEED;
                    } else {
                        this.angle += BossSuperTankGun.ROTATION_SPEED;
                    }
                }
                break;
            }
        }

        if (this.bossSuperTank.removeFlag) {
            this.remove();
        }
    }

    private fire(): void {
        this.state = RotatingGunState.FIRING;
        this.recoilIndex = BossSuperTankGun.RECOIL_DURATION - 1;
        let ang = javaFloat((this.angle * Math.PI) / 180);
        let cos = javaFloat(Math.cos(ang));
        let sin = javaFloat(Math.sin(ang));
        new EnemyBullet(
            this.bossSuperTank.x + BossSuperTankGun.X_OFFSET + 93 * cos,
            this.bossSuperTank.y + BossSuperTankGun.Y_OFFSET + 93 * sin,
            BossSuperTankGun.YELLOW_BULLET_SPEED * cos + this.bossSuperTank.vx,
            BossSuperTankGun.YELLOW_BULLET_SPEED * sin,
            BossSuperTankGun.BULLET_TRAVEL_TIME,
            false,
            false
        );
    }

    // returns true if attack successful

    public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
        return false;
    }

    // returns true if player bullet was absorbed by enemy

    public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
        return false;
    }

    public render(): void {
        this.main.drawRotated(
            this.main.superGuns[this.bossSuperTank.colorIndex == 0 ? 0 : 1],
            this.bossSuperTank.x + BossSuperTankGun.X_OFFSET,
            this.bossSuperTank.y + BossSuperTankGun.Y_OFFSET,
            -this.recoil - 34,
            -32,
            this.angle
        );
    }
}
