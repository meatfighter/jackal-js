import type { Image } from "slick2d-ts";
import { javaFloat } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
import type { Player } from "./Player.js";
export class FloorGun extends Enemy {
    declare public player: Player | null;
    declare public openY: number;
    declare public angle: number;
    declare public aimingSpeed: number;
    declare public colorIndex: number;
    declare public ready: boolean;
    declare public mask: Image | null;
    declare public panel: Image | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.player = null;
        this.state = 0;
        this.delay = 0;
        this.openY = 0;
        this.angle = 0;
        this.aimingSpeed = 0;
        this.colorIndex = 0;
        this.ready = false;
        this.mask = null;
        this.panel = null;
    }

    public constructor(x: number, y: number);
    public constructor(x: number, y: number, plain: boolean);
    public constructor(arg0?: number, arg1?: number, arg2?: boolean) {
        super();
        const argCount = arguments.length;
        this.__construct_FloorGun(argCount, arg0, arg1, arg2);
    }

    private __construct_FloorGun(argCount: number, arg0?: number, arg1?: number, arg2?: boolean): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal2 = arg0;
            let yLocal2 = arg1;
            this.__construct_FloorGun(3, xLocal2, yLocal2, false);
            return;
        } else if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal = arg0;
            let yLocal = arg1;
            let plain = arg2;
            this.x = xLocal;
            this.y = yLocal;
            if (plain) {
                this.mask = this.main.plainFloorGuns[0];
                this.panel = this.main.plainFloorGuns[1];
            } else {
                this.mask = this.main.floorGuns[6];
                this.panel = this.main.floorGuns[7];
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_CLOSED: number = 0;
    public static readonly STATE_OPENING: number = 1;
    public static readonly STATE_AIMING: number = 2;
    public static readonly STATE_SHOOTING: number = 3;
    public static readonly STATE_CLOSING: number = 4;

    public static readonly CLOSED_DELAY: number = 2 * 91;
    public static readonly OPEN_DELAY: number = 85;
    public static readonly AIMING_DELAY: number = 40;
    public static readonly SHOOT_DELAY: number = 22;

    public static readonly SHOOT_SPREAD_ANGLE: number = javaFloat((20 * Math.PI) / 180);

    public static readonly OPEN_SPEED: number = 32 / FloorGun.OPEN_DELAY;

    public static readonly BULLET_SPEED: number = 1.625;
    public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;

    public state: number = FloorGun.STATE_CLOSED;
    public delay: number = 1;

    public override init(): void {
        super.init();

        this.player = this.gameMode.player;

        this.layer = 3;

        this.bulletHits = 4;

        this.hitX1 = 4;
        this.hitY1 = 4;
        this.hitX2 = 60;
        this.hitY2 = 60;

        this.mine = true;
        this.mineX1 = 8;
        this.mineY1 = 8;
        this.mineX2 = 56;
        this.mineY2 = 56;

        this.solid = true;
        this.solidX1 = 0;
        this.solidY1 = 0;
        this.solidX2 = 64;
        this.solidY2 = 64;

        this.points = 1000;

        this.explosionX = 32;
        this.explosionY = 32;
    }

    public update(): void {
        if (!this.ready) {
            if (!this.gameMode.isOutsideOfFrame(this.x + 32, this.y + 32)) {
                this.ready = true;
            } else {
                return;
            }
        }

        switch (this.state) {
            case FloorGun.STATE_CLOSED:
                if (--this.delay == 0) {
                    this.state = FloorGun.STATE_OPENING;
                    this.openY = 0;
                    this.delay = FloorGun.OPEN_DELAY;
                }
                break;
            case FloorGun.STATE_OPENING:
                this.openY += FloorGun.OPEN_SPEED;
                if (--this.delay == 0) {
                    this.state = FloorGun.STATE_AIMING;
                    this.angle = 90;
                    this.delay = FloorGun.AIMING_DELAY;

                    let targetAngle = javaFloat((Math.atan2(this.player!.y - this.y, this.player!.x - this.x) * 180) / Math.PI);
                    let deltaAngle = (targetAngle + 90) % 360;
                    if (deltaAngle < 0) {
                        deltaAngle += 180;
                    } else {
                        deltaAngle -= 180;
                    }

                    this.aimingSpeed = deltaAngle / FloorGun.AIMING_DELAY;
                }
                break;
            case FloorGun.STATE_AIMING:
                this.angle += this.aimingSpeed;
                if (--this.delay == 0) {
                    this.state = FloorGun.STATE_SHOOTING;
                    this.delay = FloorGun.SHOOT_DELAY;
                }
                break;
            case FloorGun.STATE_SHOOTING:
                if (--this.delay == 0) {
                    this.state = FloorGun.STATE_CLOSING;
                    this.delay = FloorGun.OPEN_DELAY;
                    this.openY = 32;

                    let shootAngle = javaFloat(Math.atan2(this.player!.y - (this.y + 32), this.player!.x - (this.x + 32)));
                    shootAngle -= 2 * FloorGun.SHOOT_SPREAD_ANGLE;

                    for (let i = 0; i < 5; i++, shootAngle += FloorGun.SHOOT_SPREAD_ANGLE) {
                        let cos = javaFloat(Math.cos(shootAngle));
                        let sin = javaFloat(Math.sin(shootAngle));
                        new EnemyBullet(
                            this.x + 32 + 13 * cos,
                            this.y + 32 + 13 * sin,
                            FloorGun.BULLET_SPEED * cos,
                            FloorGun.BULLET_SPEED * sin,
                            FloorGun.BULLET_TRAVEL_TIME,
                            true
                        );
                    }
                }
                break;
            case FloorGun.STATE_CLOSING:
                this.openY -= FloorGun.OPEN_SPEED;
                if (--this.delay == 0) {
                    this.state = FloorGun.STATE_CLOSED;
                    this.delay = FloorGun.CLOSED_DELAY;
                }
                break;
        }
    }

    // returns true if player bumped into the enemy

    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (invincible || this.state == FloorGun.STATE_CLOSED || this.openY < 16) {
            return false;
        }
        if (this.isMine(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(this.x + this.explosionX, this.y + this.explosionY);
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (this.state == FloorGun.STATE_CLOSED || this.openY < 16) {
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

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.state == FloorGun.STATE_CLOSED || this.openY < 16) {
            return false;
        }
        if (this.hit(x1, y1, x2, y2)) {
            if (--this.bulletHits <= 0) {
                this.remove();
                new Explosion(this.x + this.explosionX, this.y + this.explosionY);
                this.main.addPoints(this.points);
            } else {
                this.main.playSoundAlways(this.main.bulletHitSound);
            }
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        switch (this.state) {
            case FloorGun.STATE_CLOSED:
                this.main.draw(this.panel!, this.x, this.y);
                this.main.draw(this.panel!, this.x, this.y + 32);
                this.main.draw(this.mask!, this.x, this.y);
                break;
            case FloorGun.STATE_OPENING:
                this.gameMode.g.setWorldClip(this.x, this.y, 64, 64);
                this.main.draw(this.main.floorGuns[4], this.x, this.y);
                this.main.draw(this.main.floorGuns[0], this.x + 3, this.y + 51 - this.openY * 1.5);
                this.main.draw(this.panel!, this.x, this.y - this.openY);
                this.main.draw(this.panel!, this.x, this.y + 32 + this.openY);
                this.main.draw(this.mask!, this.x, this.y);
                this.gameMode.g.clearWorldClip();
                break;
            case FloorGun.STATE_AIMING:
                this.main.draw(this.main.floorGuns[4], this.x, this.y);
                this.main.draw(this.mask!, this.x, this.y);
                this.main.drawRotated(this.main.floorGuns[0], this.x + 32, this.y + 32, -29, -29, this.angle - 90);
                break;
            case FloorGun.STATE_SHOOTING:
                if (++this.colorIndex == 4) {
                    this.colorIndex = 0;
                }
                this.main.draw(this.main.floorGuns[this.colorIndex == 1 ? 5 : 4], this.x, this.y);
                this.main.draw(this.mask!, this.x, this.y);
                this.main.drawRotated(this.main.floorGuns[this.colorIndex], this.x + 32, this.y + 32, -29, -29, this.angle - 90);
                break;
            case FloorGun.STATE_CLOSING:
                this.gameMode.g.setWorldClip(this.x, this.y, 64, 64);
                this.main.draw(this.main.floorGuns[4], this.x, this.y);
                this.main.drawRotated(this.main.floorGuns[0], this.x + 32, this.y + 32 + 48 - this.openY * 1.5, -29, -29, this.angle - 90);
                this.main.draw(this.panel!, this.x, this.y - this.openY);
                this.main.draw(this.panel!, this.x, this.y + 32 + this.openY);
                this.main.draw(this.mask!, this.x, this.y);
                this.gameMode.g.clearWorldClip();
                break;
        }
    }
}
