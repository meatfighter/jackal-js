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
import type { BossGarageManager } from "./BossGarageManager.js";
import type { Player } from "./Player.js";
export class GrayTank extends Enemy {
    declare public moveSteps: number;
    declare public directionX: number;
    declare public directionY: number;
    declare public vx: number;
    declare public vy: number;
    declare public sensorX: number;
    declare public sensorY: number;
    declare public lastDx: number;
    declare public lastDy: number;
    declare public solids: ArrayList<Enemy> | null;
    declare public player: Player | null;
    declare public handlingLoop: number;
    declare public loopTargetX: number;
    declare public loopTargetY: number;
    declare public firstMove: number;
    declare public shack: boolean;
    declare public shackX: number;
    declare public shackY: number;
    declare public garage: boolean;
    declare public bossGarageManager: BossGarageManager | null;

    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.shootDelay = 0;
        this.shootCount = 0;
        this.moveSteps = 0;
        this.targetAngle = 0;
        this.displayAngle = 0;
        this.directionX = 0;
        this.directionY = 0;
        this.vx = 0;
        this.vy = 0;
        this.sensorX = 0;
        this.sensorY = 0;
        this.lastDx = 0;
        this.lastDy = 0;
        this.solids = null;
        this.player = null;
        this.handlingLoop = 0;
        this.loopTargetX = 0;
        this.loopTargetY = 0;
        this.firstMove = 0;
        this.shack = false;
        this.shackX = 0;
        this.shackY = 0;
        this.garage = false;
        this.bossGarageManager = null;
    }

    public constructor(arg0?: any, arg1?: any, arg2?: any, arg3?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_GrayTank(argCount, arg0, arg1, arg2, arg3);
    }

    private __construct_GrayTank(argCount: number, arg0?: any, arg1?: any, arg2?: any, arg3?: any): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal4 = arg0;
            let yLocal4 = arg1;
            this.x = xLocal4;
            this.y = yLocal4;
            this.firstMove = 2 * 91;
            return;
        } else if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal3 = arg0;
            let yLocal3 = arg1;
            let shackLocal = arg2;
            this.x = xLocal3;
            this.y = yLocal3;
            this.shack = shackLocal;
            this.shackX = xLocal3 - 62;
            this.shackY = yLocal3 - 80;
            this.firstMove = 105;
            return;
        } else if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
            let xLocal2 = arg0;
            let yLocal2 = arg1;
            let firstMoveLocal2 = arg2;
            this.__construct_GrayTank(2, xLocal2, yLocal2);
            this.firstMove = firstMoveLocal2;
            this.garage = true;
            return;
        } else if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let firstMoveLocal = arg2;
            let bossGarageManagerLocal = arg3;
            this.__construct_GrayTank(3, xLocal, yLocal, firstMoveLocal);
            this.bossGarageManager = bossGarageManagerLocal;
            if (bossGarageManagerLocal != null) {
                bossGarageManagerLocal.tankCreated();
                this.points = 0;
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly SPEED: number = 1.5;
    public static readonly SENSOR_RADIUS: number = 56;
    public static readonly ANGLE_STEPS: number = 24;
    public static readonly ANGLE_VELOCITY: number = 45 / GrayTank.ANGLE_STEPS;
    public static readonly SHOOT_DELAY: number = 45;
    public static readonly SHOOT_LONG_DELAY: number = 91;
    public static readonly SHOOT_COUNT: number = 3;
    public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;
    public static readonly BULLET_SPEED: number = 1.4;

    public static readonly MAX_MOVE_SQUARES: number = 8;

    public static readonly DIMENSION_1: number = 52;
    public static readonly DIMENSION_2: number = 40;

    public shootDelay: number = GrayTank.SHOOT_DELAY;
    public shootCount: number = GrayTank.SHOOT_COUNT;

    public targetAngle: number = 90;
    public displayAngle: number = 90;

    public init(): void {
        super.init();

        this.solids = this.gameMode.solids;
        this.player = this.gameMode.player;

        this.layer = 3;

        this.bulletHits = 5;

        this.hitX1 = -50;
        this.hitY1 = -50;
        this.hitX2 = 50;
        this.hitY2 = 50;

        this.mine = true;
        this.mineX1 = -35;
        this.mineY1 = -35;
        this.mineX2 = 35;
        this.mineY2 = 35;

        this.solid = true;
        this.solidX1 = -52;
        this.solidY1 = -52;
        this.solidX2 = 52;
        this.solidY2 = 52;

        this.points = 800;
    }

    private driveAtRightAngleToBarrier(): void {
        let Vx = this.vx;
        let Vy = this.vy;
        let Dx = this.directionX;
        let Dy = this.directionY;

        if (this.main.random.nextInt(5) == 4) {
            this.vx = -this.vx;
            this.vy = -this.vy;
            this.directionX = -this.directionX;
            this.directionY = -this.directionY;
            this.targetAngle += 180;
        } else if (this.main.random.nextInt(3) == 2) {
            this.vx = Vy;
            this.vy = -Vx;
            this.directionX = Dy;
            this.directionY = -Dx;
            this.targetAngle -= 90;
        } else {
            this.vx = -Vy;
            this.vy = Vx;
            this.directionX = -Dy;
            this.directionY = Dx;
            this.targetAngle += 90;
        }
        if (this.targetAngle >= 360) {
            this.targetAngle -= 360;
        } else if (this.targetAngle < 0) {
            this.targetAngle += 360;
        }
        this.sensorX = this.directionX * GrayTank.SENSOR_RADIUS;
        this.sensorY = this.directionY * GrayTank.SENSOR_RADIUS;

        if (this.main.random.nextInt(5) != 4) {
            this.computeMoveSteps();
        }
    }

    private computeMoveSteps(): void {
        let v = 0;

        if (this.directionX != 0) {
            v = this.directionX;
        } else {
            v = this.directionY;
        }
        if (v == 0) {
            return;
        }

        let d = 0;

        if (v > 0) {
            d = 32 - (v % 32);
        } else {
            d = v % 32;
        }

        d += 32 * (1 + this.main.random.nextInt(GrayTank.MAX_MOVE_SQUARES));

        if (this.firstMove > 0) {
            this.moveSteps = 16;
        } else {
            this.moveSteps = javaRoundFloat(d / GrayTank.SPEED);
        }
    }

    private testCorners(nextX: any, nextY: any): void {
        let sx1 = 0;
        let sy1 = 0;
        let sx2 = 0;
        let sy2 = 0;

        switch (this.targetAngle) {
            case 0:
                sx1 = nextX + GrayTank.DIMENSION_1;
                sy1 = nextY - GrayTank.DIMENSION_2;
                sx2 = nextX + GrayTank.DIMENSION_1;
                sy2 = nextY + GrayTank.DIMENSION_2;
                break;
            case 90:
                sx1 = nextX + GrayTank.DIMENSION_2;
                sy1 = nextY + GrayTank.DIMENSION_1;
                sx2 = nextX - GrayTank.DIMENSION_2;
                sy2 = nextY + GrayTank.DIMENSION_1;
                break;
            case 180:
                sx1 = nextX - GrayTank.DIMENSION_1;
                sy1 = nextY + GrayTank.DIMENSION_2;
                sx2 = nextX - GrayTank.DIMENSION_1;
                sy2 = nextY - GrayTank.DIMENSION_2;
                break;
            case 270:
                sx1 = nextX - GrayTank.DIMENSION_2;
                sy1 = nextY - GrayTank.DIMENSION_1;
                sx2 = nextX + GrayTank.DIMENSION_2;
                sy2 = nextY - GrayTank.DIMENSION_1;
                break;
            default:
                return;
        }

        let drive1 = this.gameMode.isDriveable(sx1, sy1);
        let drive2 = this.gameMode.isDriveable(sx2, sy2);
        if (drive1 && drive2) {
            return;
        }

        if (!(drive1 || drive2)) {
            this.driveAtRightAngleToBarrier();
            return;
        }

        let Vx = this.vx;
        let Vy = this.vy;
        let Dx = this.directionX;
        let Dy = this.directionY;

        if (drive2) {
            this.vx = -Vy;
            this.vy = Vx;
            this.directionX = -Dy;
            this.directionY = Dx;
            this.targetAngle += 90;
        } else {
            this.vx = Vy;
            this.vy = -Vx;
            this.directionX = Dy;
            this.directionY = -Dx;
            this.targetAngle -= 90;
        }

        if (this.targetAngle >= 360) {
            this.targetAngle -= 360;
        } else if (this.targetAngle < 0) {
            this.targetAngle += 360;
        }
        this.sensorX = this.directionX * GrayTank.SENSOR_RADIUS;
        this.sensorY = this.directionY * GrayTank.SENSOR_RADIUS;

        if (this.main.random.nextInt(5) != 4) {
            this.computeMoveSteps();
        }
    }

    private handleLoop(): void {
        if (this.handlingLoop == 0) {
            this.handlingLoop = 91 * (2 + this.main.random.nextInt(5));
            this.loopTargetX = this.main.random.nextFloat() * 2048;
            this.loopTargetY = this.main.random.nextFloat() * this.player.y;
        }
    }

    public update(): void {
        if (this.displayAngle != this.targetAngle) {
            this.shootCount = GrayTank.SHOOT_COUNT;
            let deltaAngle = (this.targetAngle - this.displayAngle + 180) % 360;
            if (deltaAngle < 0) {
                deltaAngle += 180;
            } else {
                deltaAngle -= 180;
            }
            if (Math.abs(deltaAngle) < GrayTank.ANGLE_VELOCITY) {
                this.displayAngle = this.targetAngle;
            } else {
                if (deltaAngle < 0) {
                    this.displayAngle -= GrayTank.ANGLE_VELOCITY;
                } else {
                    this.displayAngle += GrayTank.ANGLE_VELOCITY;
                }
            }
        } else {
            if (this.handlingLoop > 0) {
                this.handlingLoop--;
            }

            if (this.firstMove > 0) {
                if (--this.firstMove == 0) {
                    this.garage = false;
                    this.shack = false;
                }
            }

            if (--this.moveSteps <= 0) {
                let dx = 0;
                let dy = 0;
                if (this.main.random.nextInt(5) == 4) {
                    dx = this.main.random.nextInt(512) - 256;
                    dy = this.main.random.nextInt(512) - 256;
                }
                let v = null;
                if (this.firstMove > 0) {
                    v = this.main.createUnitVector(90);
                    v[2] = 90;
                } else {
                    v =
                        this.handlingLoop > 0
                            ? this.gameMode.suggestDirection(this.x, this.y, this.loopTargetX + dx, this.loopTargetY + dy, false)
                            : this.gameMode.suggestDirection(this.x, this.y, this.player.x + dx, this.player.y + dy, false);
                }
                this.vx = v[0] * GrayTank.SPEED;
                this.vy = v[1] * GrayTank.SPEED;
                this.directionX = v[0];
                this.directionY = v[1];
                this.targetAngle = javaInt(v[2]);
                this.sensorX = this.directionX * GrayTank.SENSOR_RADIUS;
                this.sensorY = this.directionY * GrayTank.SENSOR_RADIUS;
                this.computeMoveSteps();
            }

            let nextX = this.x + this.vx;
            let nextY = this.y + this.vy;

            if (!(this.garage || this.shack)) {
                this.testCorners(nextX, nextY);
            }

            let driveable = true;

            if (this.gameMode.isDriveable(nextX + this.sensorX, nextY + this.sensorY) || this.garage || this.shack) {
                // avoid bumping into other enemies
                for (let i = this.solids.size() - 1; i >= 0; i--) {
                    let solidLocal = this.solids.get(i);
                    if (
                        solidLocal != this &&
                        solidLocal.isSolid(nextX + this.solidX1, nextY + this.solidY1, nextX + this.solidX2, nextY + this.solidY2) &&
                        !solidLocal.isSolid(this.x + this.solidX1, this.y + this.solidY1, this.x + this.solidX2, this.y + this.solidY2)
                    ) {
                        driveable = false;
                        break;
                    }
                }
            } else {
                driveable = false;
            }

            if (driveable) {
                this.x = nextX;
                this.y = nextY;
                this.updateTrail();
                if (this.trailContainsLoop()) {
                    this.handleLoop();
                }
            } else if (this.garage || this.shack) {
                this.firstMove++;
            } else {
                this.driveAtRightAngleToBarrier();
            }

            let dx = this.player.x - this.x;
            let dy = this.player.y - this.y;

            if (
                this.moveSteps == 1 &&
                ((this.vy != 0 && javaInt(this.player.x) >> 7 == javaInt(this.x) >> 7) || (this.vx != 0 && javaInt(this.player.y) >> 7 == javaInt(this.y) >> 7))
            ) {
                this.moveSteps = 2;
            }
            if ((this.lastDx * dx <= 0 || this.lastDy * dy <= 0) && this.main.random.nextInt(3) != 2 && this.firstMove == 0) {
                this.moveSteps = 0;
            }

            this.lastDx = dx;
            this.lastDy = dy;

            if (--this.shootDelay <= 0) {
                if (--this.shootCount <= 0) {
                    this.shootCount = GrayTank.SHOOT_COUNT;
                    this.shootDelay = GrayTank.SHOOT_LONG_DELAY;
                } else {
                    this.shootDelay = GrayTank.SHOOT_DELAY;
                }
                let bx = 0;
                let by = 0;
                switch (this.targetAngle) {
                    case 0:
                    case 360:
                        bx = 48;
                        by = -6;
                        break;
                    case 45:
                        bx = 37;
                        by = 31;
                        break;
                    case 90:
                        bx = 0;
                        by = 52;
                        break;
                    case 135:
                        bx = -37;
                        by = 31;
                        break;
                    case 180:
                        bx = -48;
                        by = -6;
                        break;
                    case 225:
                        bx = -31;
                        by = -37;
                        break;
                    case 270:
                        bx = 0;
                        by = -52;
                        break;
                    case 315:
                        bx = 31;
                        by = -37;
                        break;
                }
                new EnemyBullet(
                    this.x + bx,
                    this.y + by,
                    GrayTank.BULLET_SPEED * this.directionX,
                    GrayTank.BULLET_SPEED * this.directionY,
                    GrayTank.BULLET_TRAVEL_TIME
                );
            }
        }
    }

    // returns true if attack successful

    public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
        if (this.shack && this.firstMove > 40) {
            return false;
        } else {
            return super.attack(x1, y1, x2, y2, attackSource);
        }
    }

    // returns true if player bullet was absorbed by enemy

    public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
        if (this.shack && this.firstMove > 40) {
            return false;
        } else {
            return super.bulletAttack(x1, y1, x2, y2);
        }
    }

    public remove(): void {
        super.remove();
        if (this.bossGarageManager != null) {
            this.bossGarageManager.tankDestroyed();
        }
    }

    public render(): void {
        this.main.drawVehicle(this.main.grayTanks, this.x, this.y, this.displayAngle);
        if (this.shack && this.firstMove > 0) {
            this.main.draw(this.main.tankShack, this.shackX, this.shackY);
        }
    }
}
