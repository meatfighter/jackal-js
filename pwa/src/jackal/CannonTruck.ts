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
export class CannonTruck extends Enemy {
    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.directionIndex = 0;
        this.right = false;
        this.state = 0;
        this.delay = 0;
        this.fires = 0;
        this.ready = false;
    }

    public constructor(arg0?: any, arg1?: any, arg2?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_CannonTruck(argCount, arg0, arg1, arg2);
    }

    private __construct_CannonTruck(argCount: number, arg0?: any, arg1?: any, arg2?: any): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal = arg0;
            let yLocal = arg1;
            let rightLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.right = rightLocal;
            this.directionIndex = rightLocal ? 0 : 1;

            this.explosionX = 48;
            this.explosionY = 48;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_SLEEPING: number = 0;
    public static readonly STATE_RECOILING: number = 1;

    public static readonly SHOOT_DELAY: number = 91;
    public static readonly RECOIL_DELAY: number = 16;
    public static readonly RECOIL_HALF: number = 8;

    public static readonly BULLET_ORIGIN_X: number = 48;
    public static readonly BULLET_ORIGIN_Y: number = 25;

    public static readonly BULLET_TRAVEL_TIME: number = 137;
    public static readonly BULLET_SPEED: number = 2;
    public static readonly BULLET_ANGLE: number = javaFloat((10 * Math.PI) / 180);

    public static readonly DIRS: any[] = [
        [[javaFloat(CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4)), javaFloat(CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4))]],
        [
            [
                javaFloat(CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4 - CannonTruck.BULLET_ANGLE)),
                javaFloat(CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4 - CannonTruck.BULLET_ANGLE))
            ],
            [
                javaFloat(CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4 + CannonTruck.BULLET_ANGLE)),
                javaFloat(CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4 + CannonTruck.BULLET_ANGLE))
            ]
        ],
        [
            [
                javaFloat(CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4 - 2 * CannonTruck.BULLET_ANGLE)),
                javaFloat(CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4 - 2 * CannonTruck.BULLET_ANGLE))
            ],
            [
                javaFloat(CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4 + 2 * CannonTruck.BULLET_ANGLE)),
                javaFloat(CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4 + 2 * CannonTruck.BULLET_ANGLE))
            ]
        ]
    ];

    public state: number = CannonTruck.STATE_SLEEPING;
    public delay: number = 1;

    public init(): void {
        super.init();

        this.layer = 3;

        this.bulletHits = 8;

        this.hitX1 = 8;
        this.hitY1 = 8;
        this.hitX2 = 88;
        this.hitY2 = 88;

        this.mine = true;
        this.mineX1 = 8;
        this.mineY1 = 8;
        this.mineX2 = 88;
        this.mineY2 = 88;

        this.solid = true;
        this.solidX1 = 0;
        this.solidY1 = 0;
        this.solidX2 = 96;
        this.solidY2 = 96;

        this.points = 1500;
    }

    private fire(): void {
        this.state = CannonTruck.STATE_RECOILING;
        this.delay = CannonTruck.RECOIL_DELAY;

        switch (this.fires) {
            case 0:
                new EnemyBullet(
                    this.x + CannonTruck.BULLET_ORIGIN_X,
                    this.y + CannonTruck.BULLET_ORIGIN_Y,
                    this.right ? CannonTruck.DIRS[0][0][0] : -CannonTruck.DIRS[0][0][0],
                    CannonTruck.DIRS[0][0][1],
                    CannonTruck.BULLET_TRAVEL_TIME
                );
                break;
            case 1:
                new EnemyBullet(
                    this.x + CannonTruck.BULLET_ORIGIN_X,
                    this.y + CannonTruck.BULLET_ORIGIN_Y,
                    this.right ? CannonTruck.DIRS[1][0][0] : -CannonTruck.DIRS[1][0][0],
                    CannonTruck.DIRS[1][0][1],
                    CannonTruck.BULLET_TRAVEL_TIME
                );
                new EnemyBullet(
                    this.x + CannonTruck.BULLET_ORIGIN_X,
                    this.y + CannonTruck.BULLET_ORIGIN_Y,
                    this.right ? CannonTruck.DIRS[1][1][0] : -CannonTruck.DIRS[1][1][0],
                    CannonTruck.DIRS[1][1][1],
                    CannonTruck.BULLET_TRAVEL_TIME
                );
                break;
            case 2:
                new EnemyBullet(
                    this.x + CannonTruck.BULLET_ORIGIN_X,
                    this.y + CannonTruck.BULLET_ORIGIN_Y,
                    this.right ? CannonTruck.DIRS[2][0][0] : -CannonTruck.DIRS[2][0][0],
                    CannonTruck.DIRS[2][0][1],
                    CannonTruck.BULLET_TRAVEL_TIME
                );
                new EnemyBullet(
                    this.x + CannonTruck.BULLET_ORIGIN_X,
                    this.y + CannonTruck.BULLET_ORIGIN_Y,
                    this.right ? CannonTruck.DIRS[2][1][0] : -CannonTruck.DIRS[2][1][0],
                    CannonTruck.DIRS[2][1][1],
                    CannonTruck.BULLET_TRAVEL_TIME
                );
                break;
        }
        this.fires++;
    }

    public update(): void {
        if (!this.ready) {
            if (this.y + 48 > this.gameMode.cameraY) {
                this.ready = true;
            } else {
                return;
            }
        }
        switch (this.state) {
            case CannonTruck.STATE_SLEEPING:
                if (--this.delay == 0) {
                    this.fire();
                }
                break;
            case CannonTruck.STATE_RECOILING:
                if (--this.delay == 0) {
                    if (this.fires == 3) {
                        this.state = CannonTruck.STATE_SLEEPING;
                        this.delay = CannonTruck.SHOOT_DELAY;
                        this.fires = 0;
                    } else {
                        this.fire();
                    }
                }
                break;
        }
    }

    public render(): void {
        if (this.state == CannonTruck.STATE_RECOILING && this.delay > CannonTruck.RECOIL_HALF) {
            this.main.draw(this.main.cannonTruck[this.directionIndex][1], this.x, this.y);
        } else {
            this.main.draw(this.main.cannonTruck[this.directionIndex][0], this.x, this.y);
        }
    }
}
