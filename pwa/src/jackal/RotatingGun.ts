import type { Image } from "slick2d-ts";
import { javaArray, javaFloat, javaInt } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
export enum RotatingGunState {
    FIRING,
    PAUSED_BETWEEN_FIRING,
    TRACKING
}
import type { BossGarageManager } from "./BossGarageManager.js";
export class RotatingGun extends Enemy {
    declare public recoil: number;
    declare public pause: number;
    declare public group: number;
    declare public recoilIndex: number;
    declare public white: boolean;
    declare public bossGarageManager: BossGarageManager | null;
    declare public type: number;
    declare public sprites: Image[] | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.state = null;
        this.angle = 0;
        this.recoil = 0;
        this.pause = 0;
        this.group = 0;
        this.groupSize = 0;
        this.recoilIndex = 0;
        this.white = false;
        this.bossGarageManager = null;
        this.type = 0;
        this.sprites = null;
    }

    public constructor(x: number, y: number, bossGarageManager: BossGarageManager, white: boolean);
    public constructor(x: number, y: number, white: boolean);
    public constructor(x: number, y: number, type: number);
    public constructor(arg0?: number, arg1?: number, arg2?: BossGarageManager | boolean | number, arg3?: boolean) {
        super();
        const argCount = arguments.length;
        this.__construct_RotatingGun(argCount, arg0, arg1, arg2, arg3);
    }

    private __construct_RotatingGun(argCount: number, arg0?: number, arg1?: number, arg2?: BossGarageManager | boolean | number, arg3?: boolean): void {
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg3 === "boolean") {
            let xLocal3 = arg0;
            let yLocal3 = arg1;
            let bossGarageManagerLocal = arg2 as BossGarageManager;
            let whiteLocal2 = arg3;
            this.x = xLocal3;
            this.y = yLocal3;
            this.white = whiteLocal2;
            this.bossGarageManager = bossGarageManagerLocal;
            this.groupSize = 2;
            this.sprites = this.main.grayGuns;
            return;
        } else if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal2 = arg0;
            let yLocal2 = arg1;
            let whiteLocal = arg2;
            this.x = xLocal2;
            this.y = yLocal2;
            this.white = whiteLocal;
            this.sprites = this.main.grayGuns;
            return;
        } else if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let typeLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.type = typeLocal;
            this.white = typeLocal != RotatingGun.TYPE_BROWN;
            this.groupSize = 1;

            switch (typeLocal) {
                case RotatingGun.TYPE_GREEN:
                    this.sprites = this.main.greenGuns;
                    break;
                case RotatingGun.TYPE_BROWN:
                    this.sprites = this.main.brownGuns;
                    break;
                default:
                    this.sprites = this.main.grayGuns;
                    break;
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly TYPE_GRAY: number = 0;
    public static readonly TYPE_GREEN: number = 1;
    public static readonly TYPE_BROWN: number = 2;

    public static readonly RECOIL_DURATION: number = 17;
    public static readonly RECOIL_AMPLITUDE: number = 8;
    public static readonly recoils: number[] = javaArray(RotatingGun.RECOIL_DURATION, 0);
    public static readonly PAUSE_AFTER_RECOIL: number = 17;
    public static readonly PAUSE_BETWEEN_GROUPS: number = 50;
    public static readonly GROUP_SIZE: number = 3;
    public static readonly ROTATION_SPEED: number = 0.9;
    public static readonly BULLET_DISTANCE: number = 400;
    public static readonly GARAGE_BULLET_DISTANCE: number = 464;
    public static readonly BULLET_TRAVEL_TIME: number = javaInt(RotatingGun.BULLET_DISTANCE / EnemyBullet.SPEED);
    public static readonly GARAGE_BULLET_TRAVEL_TIME: number = javaInt(RotatingGun.GARAGE_BULLET_DISTANCE / EnemyBullet.SPEED);
    public static readonly YELLOW_BULLET_SPEED: number = 1.25;

    static {
        for (let i = 1; i <= RotatingGun.RECOIL_DURATION; i++) {
            RotatingGun.recoils[i - 1] = RotatingGun.RECOIL_AMPLITUDE * javaFloat(Math.sin((i * Math.PI) / (RotatingGun.RECOIL_DURATION + 1)));
        }
    }

    public state: RotatingGunState = RotatingGunState.PAUSED_BETWEEN_FIRING;
    public angle: number = 90;

    public groupSize: number = RotatingGun.GROUP_SIZE;

    public override init(): void {
        super.init();

        this.layer = 3;

        this.bulletHits = 3;

        this.hitX1 = -40;
        this.hitY1 = -40;
        this.hitX2 = 40;
        this.hitY2 = 40;

        this.mine = true;
        this.mineX1 = -28;
        this.mineY1 = -28;
        this.mineX2 = 28;
        this.mineY2 = 28;

        this.solid = true;
        this.solidX1 = -64;
        this.solidY1 = -64;
        this.solidX2 = 64;
        this.solidY2 = 64;

        this.points = 500;
    }

    public update(): void {
        switch (this.state) {
            case RotatingGunState.FIRING:
                if (--this.recoilIndex < 0) {
                    if (++this.group == this.groupSize) {
                        this.recoil = 0;
                        this.state = RotatingGunState.TRACKING;
                        this.pause = RotatingGun.PAUSE_BETWEEN_GROUPS;
                        this.group = 0;
                    } else {
                        this.recoil = 0;
                        this.state = RotatingGunState.PAUSED_BETWEEN_FIRING;
                        this.pause = RotatingGun.PAUSE_AFTER_RECOIL;
                    }
                } else {
                    this.recoil = RotatingGun.recoils[this.recoilIndex];
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
                let targetAngle = javaFloat((Math.atan2(player.y - this.y, player.x - this.x) * 180) / Math.PI);
                let deltaAngle = (targetAngle - this.angle + 180) % 360;
                if (deltaAngle < 0) {
                    deltaAngle += 180;
                } else {
                    deltaAngle -= 180;
                }
                if (Math.abs(deltaAngle) < RotatingGun.ROTATION_SPEED) {
                    this.angle = targetAngle;
                    if (this.pause == 0) {
                        this.fire();
                    }
                } else {
                    if (deltaAngle < 0) {
                        this.angle -= RotatingGun.ROTATION_SPEED;
                    } else {
                        this.angle += RotatingGun.ROTATION_SPEED;
                    }
                }
                if (!this.white) {
                    if (this.angle < 45) {
                        this.angle = 45;
                    } else if (this.angle > 135) {
                        this.angle = 135;
                    }
                }
                break;
            }
        }
    }

    private fire(): void {
        this.state = RotatingGunState.FIRING;
        this.recoilIndex = RotatingGun.RECOIL_DURATION - 1;
        let ang = javaFloat((this.angle * Math.PI) / 180);
        let cos = javaFloat(Math.cos(ang));
        let sin = javaFloat(Math.sin(ang));
        if (this.bossGarageManager != null) {
            if (this.white) {
                new EnemyBullet(this.x + 60 * cos, this.y + 60 * sin, cos, sin, RotatingGun.GARAGE_BULLET_TRAVEL_TIME, true);
            } else {
                new EnemyBullet(
                    this.x + 60 * cos,
                    this.y + 60 * sin,
                    RotatingGun.YELLOW_BULLET_SPEED * cos,
                    RotatingGun.YELLOW_BULLET_SPEED * sin,
                    RotatingGun.GARAGE_BULLET_TRAVEL_TIME,
                    false
                );
            }
        } else if (this.white) {
            new EnemyBullet(this.x + 60 * cos, this.y + 60 * sin, cos, sin, RotatingGun.BULLET_TRAVEL_TIME, true);
        } else {
            new EnemyBullet(
                this.x + 60 * cos,
                this.y + 60 * sin,
                RotatingGun.YELLOW_BULLET_SPEED * cos,
                RotatingGun.YELLOW_BULLET_SPEED * sin,
                RotatingGun.BULLET_TRAVEL_TIME,
                false
            );
        }
    }

    public render(): void {
        this.main.drawRotated(this.sprites[this.recoil == 0 ? 0 : 1], this.x, this.y, -28, this.recoil - 60, this.angle + 90);
    }
}
