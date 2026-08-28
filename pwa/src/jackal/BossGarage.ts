import type { Image } from "slick2d-ts";
import { javaInt } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { BrownTank } from "./BrownTank.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { GrayTank } from "./GrayTank.js";
import type { BossGarageManager } from "./BossGarageManager.js";
export class BossGarage extends Enemy {
    declare public bossGarageManager: BossGarageManager | null;
    declare public doorY: number;
    declare public isBrownTank: boolean;
    declare public vehicle: Image[] | null;
    declare public vehicleY: number;
    declare public brownTank: BrownTank | null;
    declare public grayTank: GrayTank | null;
    declare public delay: number;
    declare public groupIndex: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.bossGarageManager = null;
        this.lightIndex = 0;
        this.state = 0;
        this.doorY = 0;
        this.isBrownTank = false;
        this.vehicle = null;
        this.vehicleY = 0;
        this.brownTank = null;
        this.grayTank = null;
        this.delay = 0;
        this.groupIndex = 0;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: BossGarageManager) {
        super();
        const argCount = arguments.length;
        this.__construct_BossGarage(argCount, arg0, arg1, arg2);
    }

    private __construct_BossGarage(argCount: number, arg0?: number, arg1?: number, arg2?: BossGarageManager): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let bossGarageManagerLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.bossGarageManager = bossGarageManagerLocal!;

            let X = javaInt(xLocal) >> 5;
            let Y = javaInt(yLocal) >> 5;

            this.groupIndex = this.gameMode.groupsMap[Y][X];
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_CLOSED: number = 0;
    public static readonly STATE_OPENING: number = 1;
    public static readonly STATE_CLOSING: number = 2;
    public static readonly STATE_OPEN: number = 3;
    public static readonly STATE_OPEN_2: number = 4;
    public static readonly STATE_OPEN_3: number = 5;

    public static readonly OPENING_SPEED: number = 2;
    public static readonly OPEN_3_PAUSE: number = 136;

    public lightIndex: number = 3;
    public state: number = BossGarage.STATE_CLOSED;

    public override init(): void {
        super.init();

        this.layer = 0;

        this.hitX1 = 8;
        this.hitY1 = 8;
        this.hitX2 = 120;
        this.hitY2 = 88;

        this.explosionX = 64;
        this.explosionY = 48;
    }

    public update(): void {
        switch (this.state) {
            case BossGarage.STATE_OPENING:
                this.doorY += BossGarage.OPENING_SPEED;
                if (this.doorY >= 96) {
                    if (this.bossGarageManager!.full()) {
                        this.state = BossGarage.STATE_OPEN_3;
                        this.delay = BossGarage.OPEN_3_PAUSE;
                    } else {
                        this.state = BossGarage.STATE_OPEN;
                    }
                }
                break;
            case BossGarage.STATE_OPEN:
                if (this.isBrownTank) {
                    this.vehicleY += BrownTank.SPEED;
                    if (this.vehicleY > this.y + 72) {
                        this.brownTank = new BrownTank(this.x + 64, this.vehicleY, 125, this.bossGarageManager!);
                        this.state = BossGarage.STATE_OPEN_2;
                    }
                } else {
                    this.vehicleY += GrayTank.SPEED;
                    if (this.vehicleY > this.y + 80) {
                        this.grayTank = new GrayTank(this.x + 64, this.vehicleY, 125, this.bossGarageManager!);
                        this.state = BossGarage.STATE_OPEN_2;
                    }
                }
                break;
            case BossGarage.STATE_OPEN_2:
                if (this.isBrownTank) {
                    if (this.brownTank!.y > this.y + 138 || this.brownTank!.removeFlag) {
                        this.brownTank = null;
                        this.state = BossGarage.STATE_CLOSING;
                    }
                } else {
                    if (this.grayTank!.y > this.y + 148 || this.grayTank!.removeFlag) {
                        this.grayTank = null;
                        this.state = BossGarage.STATE_CLOSING;
                    }
                }
                break;
            case BossGarage.STATE_CLOSING:
                this.doorY -= BossGarage.OPENING_SPEED;
                if (this.doorY <= 0) {
                    this.state = BossGarage.STATE_CLOSED;
                }
                break;
            case BossGarage.STATE_OPEN_3:
                if (--this.delay == 0) {
                    this.state = BossGarage.STATE_CLOSING;
                }
                break;
        }
    }

    public open(): void {
        if (this.state == BossGarage.STATE_CLOSED) {
            this.state = BossGarage.STATE_OPENING;
            this.isBrownTank = this.main.random.nextBoolean();
            if (this.isBrownTank) {
                this.vehicle = this.main.brownTanks;
                this.vehicleY = this.y - 8;
            } else {
                this.vehicle = this.main.grayTanks;
                this.vehicleY = this.y - 24;
            }
        }
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (this.state >= BossGarage.STATE_OPEN && attackSource == AttackSource.PLAYER_WEAPON && this.hit(x1, y1, x2, y2)) {
            this.remove();
            if (this.state == BossGarage.STATE_OPEN) {
                new Explosion(this.x + 64, this.vehicleY);
            }
            new Explosion(this.x + this.explosionX, this.y + this.explosionY);
            this.main.addPoints(this.points);
            this.bossGarageManager!.garageDestroyed();
            this.gameMode.triggerGroup(this.groupIndex);
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.hit(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        if (this.state == BossGarage.STATE_CLOSED) {
            this.main.draw(this.main.garages[0], this.x, this.y);
        } else {
            if (--this.lightIndex == 0) {
                this.lightIndex = 3;
            }

            this.main.draw(this.main.garages[1], this.x, this.y);
            if (this.state == BossGarage.STATE_OPEN) {
                this.gameMode.g.setWorldClip(this.x - 1, this.y, 130, 256);
                this.main.drawVehicle(
                    this.vehicle!,
                    this.x + 64,
                    this.vehicleY,
                    90,
                    this.isBrownTank ? (this.vehicleY - (this.y - 8)) * 0.0125 : (this.vehicleY - (this.y - 24)) * 0.0096154
                );
                this.gameMode.g.clearWorldClip();
            }
            this.main.draw(this.main.garages[4], this.x, this.y);
            if (this.lightIndex > 1) {
                this.main.draw(this.main.garages[this.lightIndex], this.x + 46, this.y - 4);
            }

            if (this.state == BossGarage.STATE_OPENING || this.state == BossGarage.STATE_CLOSING) {
                this.gameMode.g.setWorldClip(this.x - 1, this.y, 130, 256);
                this.main.draw(this.main.garages[0], this.x, this.y - this.doorY);
                this.gameMode.g.clearWorldClip();
            }
        }
    }
}
