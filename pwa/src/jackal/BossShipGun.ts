import { javaFloat } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
import type { BossShipManager } from "./BossShipManager.js";
import type { Player } from "./Player.js";
export class BossShipGun extends Enemy {
    declare public player: Player | null;
    declare public openY: number;
    declare public angle: number;
    declare public aimingSpeed: number;
    declare public colorIndex: number;
    declare public bossShipManager: BossShipManager | null;
    declare public wasHit: boolean;
    declare public triggered: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.player = null;
        this.state = 0;
        this.delay = 0;
        this.openY = 0;
        this.angle = 0;
        this.aimingSpeed = 0;
        this.colorIndex = 0;
        this.bossShipManager = null;
        this.hits = 0;
        this.wasHit = false;
        this.triggered = false;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: BossShipManager) {
        super();
        const argCount = arguments.length;
        this.__construct_BossShipGun(argCount, arg0, arg1, arg2);
    }

    private __construct_BossShipGun(argCount: number, arg0?: number, arg1?: number, arg2?: BossShipManager): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            let bossShipManagerLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.bossShipManager = bossShipManagerLocal!;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_CLOSED: number = 0;
    public static readonly STATE_OPENING: number = 1;
    public static readonly STATE_AIMING: number = 2;
    public static readonly STATE_SHOOTING: number = 3;
    public static readonly STATE_CLOSING: number = 4;

    public static readonly MIN_CLOSED_DELAY: number = 3 * 91;
    public static readonly MAX_CLOSED_DELAY: number = 6 * 91;
    public static readonly OPEN_DELAY: number = 85;
    public static readonly AIMING_DELAY: number = 40;
    public static readonly SHOOT_DELAY: number = 22;

    public static readonly SHOOT_SPREAD_ANGLE: number = javaFloat((20 * Math.PI) / 180);

    public static readonly OPEN_SPEED: number = javaFloat(32 / BossShipGun.OPEN_DELAY);

    public static readonly BULLET_SPEED: number = 1.625;
    public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;

    public state: number = BossShipGun.STATE_CLOSED;
    public delay: number = BossShipGun.MIN_CLOSED_DELAY + this.main.random.nextInt(BossShipGun.MAX_CLOSED_DELAY - BossShipGun.MIN_CLOSED_DELAY);

    public hits: number = 2;

    public override init(): void {
        super.init();

        this.player = this.gameMode.player;

        this.layer = 3;

        this.bulletHits = 6;

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
        switch (this.state) {
            case BossShipGun.STATE_CLOSED:
                if (this.triggered && --this.delay == 0) {
                    this.triggered = false;
                    this.state = BossShipGun.STATE_OPENING;
                    this.openY = 0;
                    this.delay = BossShipGun.OPEN_DELAY;
                    this.wasHit = false;
                }
                break;
            case BossShipGun.STATE_OPENING:
                this.openY = javaFloat(this.openY + BossShipGun.OPEN_SPEED);
                if (this.openY > 32) {
                    this.openY = 32;
                }
                if (--this.delay == 0 || this.openY >= 32) {
                    this.state = BossShipGun.STATE_AIMING;
                    this.angle = 90;
                    this.delay = BossShipGun.AIMING_DELAY;

                    let targetAngle = javaFloat((Math.atan2(javaFloat(this.player!.y - this.y), javaFloat(this.player!.x - this.x)) * 180) / Math.PI);
                    let deltaAngle = javaFloat(javaFloat(targetAngle + 90) % 360);
                    if (deltaAngle < 0) {
                        deltaAngle = javaFloat(deltaAngle + 180);
                    } else {
                        deltaAngle = javaFloat(deltaAngle - 180);
                    }

                    this.aimingSpeed = javaFloat(deltaAngle / BossShipGun.AIMING_DELAY);
                }
                break;
            case BossShipGun.STATE_AIMING:
                this.angle = javaFloat(this.angle + this.aimingSpeed);
                if (--this.delay == 0) {
                    this.state = BossShipGun.STATE_SHOOTING;
                    this.delay = BossShipGun.SHOOT_DELAY;
                }
                break;
            case BossShipGun.STATE_SHOOTING:
                if (--this.delay == 0) {
                    this.state = BossShipGun.STATE_CLOSING;
                    this.delay = BossShipGun.OPEN_DELAY;
                    this.openY = 32;

                    let shootAngle = javaFloat(
                        Math.atan2(javaFloat(this.player!.y - javaFloat(this.y + 32)), javaFloat(this.player!.x - javaFloat(this.x + 32)))
                    );
                    shootAngle = javaFloat(shootAngle - javaFloat(2 * BossShipGun.SHOOT_SPREAD_ANGLE));

                    for (let i = 0; i < 5; i++, shootAngle = javaFloat(shootAngle + BossShipGun.SHOOT_SPREAD_ANGLE)) {
                        let cos = javaFloat(Math.cos(shootAngle));
                        let sin = javaFloat(Math.sin(shootAngle));
                        new EnemyBullet(
                            javaFloat(javaFloat(this.x + 32) + javaFloat(13 * cos)),
                            javaFloat(javaFloat(this.y + 32) + javaFloat(13 * sin)),
                            javaFloat(BossShipGun.BULLET_SPEED * cos),
                            javaFloat(BossShipGun.BULLET_SPEED * sin),
                            BossShipGun.BULLET_TRAVEL_TIME,
                            false
                        );
                    }
                }
                break;
            case BossShipGun.STATE_CLOSING:
                this.openY = javaFloat(this.openY - BossShipGun.OPEN_SPEED);
                if (this.openY < 0) {
                    this.openY = 0;
                }
                if (--this.delay == 0 || this.openY <= 0) {
                    this.state = BossShipGun.STATE_CLOSED;
                    this.delay = BossShipGun.MIN_CLOSED_DELAY + this.main.random.nextInt(BossShipGun.MAX_CLOSED_DELAY - BossShipGun.MIN_CLOSED_DELAY);
                }
                break;
        }
    }

    public open(delay: number): void {
        if (this.state == BossShipGun.STATE_CLOSED) {
            this.triggered = true;
            if (delay < 1) {
                delay = 1;
            }
            this.delay = delay;
        }
    }

    public isOpenable(): boolean {
        return !(
            this.removeFlag || this.gameMode.isOutsideOfFrame(javaFloat(this.x + 8), javaFloat(this.y + 8), javaFloat(this.x + 56), javaFloat(this.y + 56))
        );
    }

    // returns true if player bumped into the enemy

    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (invincible || this.state == BossShipGun.STATE_CLOSED || this.openY < 16) {
            return false;
        }
        if (this.isMine(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(javaFloat(this.x + this.explosionX), javaFloat(this.y + this.explosionY));
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    public override remove(): void {
        this.removeFlag = true;
        this.main.addPoints(this.points);
        this.main.playHitExplodeSound();
        this.bossShipManager!.gunDestroyed(this);
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (this.wasHit || this.state == BossShipGun.STATE_CLOSED || this.openY < 16) {
            return false;
        }
        if (attackSource == AttackSource.PLAYER_WEAPON && this.hit(x1, y1, x2, y2)) {
            this.wasHit = true;
            new Explosion(javaFloat(this.x + this.explosionX), javaFloat(this.y + this.explosionY));
            if (--this.hits == 0) {
                this.remove();
            } else {
                this.state = BossShipGun.STATE_CLOSING;
                this.delay = BossShipGun.OPEN_DELAY;
                this.main.playHitExplodeSound();
            }
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.state == BossShipGun.STATE_CLOSED || this.openY < 16) {
            return false;
        }
        if (this.hit(x1, y1, x2, y2)) {
            if (--this.bulletHits <= 0) {
                this.remove();
                new Explosion(javaFloat(this.x + this.explosionX), javaFloat(this.y + this.explosionY));
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
            case BossShipGun.STATE_CLOSED:
                this.main.draw(this.main.shipGuns[1], this.x, this.y);
                this.main.draw(this.main.shipGuns[2], this.x, this.y + 32);
                this.main.draw(this.main.shipGuns[0], this.x, this.y);
                break;
            case BossShipGun.STATE_OPENING:
                this.gameMode.g.setWorldClip(this.x, this.y, 64, 64);
                this.main.draw(this.main.floorGuns[4], this.x, this.y);
                this.main.draw(this.main.floorGuns[0], this.x + 3, this.y + 51 - this.openY * 1.5);
                this.main.draw(this.main.shipGuns[1], this.x, this.y - this.openY);
                this.main.draw(this.main.shipGuns[2], this.x, this.y + 32 + this.openY);
                this.main.draw(this.main.shipGuns[0], this.x, this.y);
                this.gameMode.g.clearWorldClip();
                break;
            case BossShipGun.STATE_AIMING:
                this.main.draw(this.main.floorGuns[4], this.x, this.y);
                this.main.draw(this.main.shipGuns[0], this.x, this.y);
                this.main.drawRotated(this.main.floorGuns[0], this.x + 32, this.y + 32, -29, -29, this.angle - 90);
                break;
            case BossShipGun.STATE_SHOOTING:
                if (++this.colorIndex == 4) {
                    this.colorIndex = 0;
                }
                this.main.draw(this.main.floorGuns[this.colorIndex == 1 ? 5 : 4], this.x, this.y);
                this.main.draw(this.main.shipGuns[0], this.x, this.y);
                this.main.drawRotated(this.main.floorGuns[this.colorIndex], this.x + 32, this.y + 32, -29, -29, this.angle - 90);
                break;
            case BossShipGun.STATE_CLOSING:
                this.gameMode.g.setWorldClip(this.x, this.y, 64, 64);
                this.main.draw(this.main.floorGuns[4], this.x, this.y);
                this.main.drawRotated(this.main.floorGuns[0], this.x + 32, this.y + 32 + 48 - this.openY * 1.5, -29, -29, this.angle - 90);
                this.main.draw(this.main.shipGuns[1], this.x, this.y - this.openY);
                this.main.draw(this.main.shipGuns[2], this.x, this.y + 32 + this.openY);
                this.main.draw(this.main.shipGuns[0], this.x, this.y);
                this.gameMode.g.clearWorldClip();
                break;
        }
    }
}
