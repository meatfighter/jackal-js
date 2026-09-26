import { javaFloat } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { AttackSource } from "./AttackSource.js";
import { BossSuperTankGun } from "./BossSuperTankGun.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { FlashingSkull } from "./FlashingSkull.js";
import type { ICameraPanListener } from "./ICameraPanListener.js";
import { SuperFire } from "./SuperFire.js";
import type { Player } from "./Player.js";
export class BossSuperTank extends Enemy implements ICameraPanListener {
    declare public player: Player | null;
    declare public colorIndex: number;
    declare public wheelAngle: number;
    declare public treadOffset: number;
    declare public vx: number;
    declare public targetX: number;
    declare public ax: number;
    declare public hits: number;
    declare public smashed: number;
    declare public exploding: number;
    declare public superFire: SuperFire | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.player = null;
        this.colorIndex = 0;
        this.wheelAngle = 0;
        this.treadOffset = 0;
        this.state = 0;
        this.appearingDelay = 0;
        this.vx = 0;
        this.targetX = 0;
        this.ax = 0;
        this.hits = 0;
        this.delay = 0;
        this.smashed = 0;
        this.exploding = 0;
        this.superFire = null;
    }

    public constructor(x: number, y: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.player = this.gameMode.player;
        this.player.longRange = true;
        new BossSuperTankGun(this);
    }

    public static readonly STATE_APPEARING: number = 0;
    public static readonly STATE_ACCELERATING: number = 1;
    public static readonly STATE_MOVING: number = 2;
    public static readonly STATE_DECELERATING: number = 3;
    public static readonly STATE_STOPPED: number = 4;
    public static readonly STATE_EXPLODING: number = 5;
    public static readonly STATE_EXPLODING_FINISHING: number = 6;
    public static readonly STATE_EXPLODED: number = 7;
    public static readonly STATE_PANNING: number = 8;
    public static readonly STATE_FLASHING_SKULL: number = 9;

    public static readonly ACCELERATION_TIME: number = 23;
    public static readonly MAX_SPEED: number = 2.5;
    public static readonly ACCELERATION: number = javaFloat(BossSuperTank.MAX_SPEED / BossSuperTank.ACCELERATION_TIME);
    // Assigned once in the static block, matching Java static-final initialization.
    public static ACCELERATION_DISTANCE: number = 0;

    static {
        let vx = 0;
        let x = 0;
        while (vx < BossSuperTank.MAX_SPEED) {
            vx = javaFloat(vx + BossSuperTank.ACCELERATION);
            x = javaFloat(x + vx);
        }
        BossSuperTank.ACCELERATION_DISTANCE = x;
    }

    public static readonly FIRE_PROBABILITY: number = 0.75;
    public static readonly TARGET_PLAYER_PROBABILITY: number = javaFloat(0.1);

    public static readonly WHEEL_ANGLE_CONST: number = javaFloat(180 / (Math.PI * 32));
    public static readonly ANGLED_TREAD_ANGLE: number = 30;
    public static readonly ANGLED_TREAD_RADIANS: number = (BossSuperTank.ANGLED_TREAD_ANGLE * Math.PI) / 180;
    public static readonly ANGLED_TREAD_X: number = javaFloat(Math.cos(BossSuperTank.ANGLED_TREAD_RADIANS));
    public static readonly ANGLED_TREAD_Y: number = javaFloat(Math.sin(BossSuperTank.ANGLED_TREAD_RADIANS));
    public static readonly APPEARING_SCALE: number = javaFloat(1 / 23);

    public static readonly HITS_ORANGE: number = 5;
    public static readonly HITS_RED: number = 10;
    public static readonly HITS_EXPLODE: number = 15;

    //  public static final int HITS_ORANGE = 1;
    //  public static final int HITS_RED = 2;
    //  public static final int HITS_EXPLODE = 3;

    public static readonly EXPLODING_TIME: number = 460;
    public static readonly EXPLODING_FINISHING_TIME: number = 100;
    public static readonly INV_EXPLODING_TIME: number = javaFloat(1 / javaFloat(BossSuperTank.EXPLODING_TIME));

    public state: number = BossSuperTank.STATE_APPEARING;
    public appearingDelay: number = 23;

    public delay: number = 1;

    public override init(): void {
        super.init();

        this.layer = 2;

        this.hitX1 = 0;
        this.hitY1 = 32;
        this.hitX2 = 456;
        this.hitY2 = 198;

        this.points = 10000;
    }

    private chooseTarget(): void {
        this.state = BossSuperTank.STATE_ACCELERATING;
        if (this.main.random.nextFloat() <= javaFloat(BossSuperTank.TARGET_PLAYER_PROBABILITY * this.colorIndex)) {
            this.targetX = this.player!.x;
        } else {
            this.targetX = javaFloat(javaFloat(this.gameMode.cameraX + 48) + this.main.random.nextInt(MainConstants.DISPLAY_WIDTH - 96));
        }
        if (this.targetX < 176) {
            this.targetX = 176;
        } else if (this.targetX > 1872) {
            this.targetX = 1872;
        }
        this.targetX = javaFloat(this.targetX - 210);
        if (Math.abs(javaFloat(this.x - this.targetX)) < javaFloat(3 * BossSuperTank.ACCELERATION_DISTANCE)) {
            if (javaFloat(this.targetX + 210) < 1024) {
                this.targetX = javaFloat(this.x + javaFloat(3 * BossSuperTank.ACCELERATION_DISTANCE));
            } else {
                this.targetX = javaFloat(this.x - javaFloat(3 * BossSuperTank.ACCELERATION_DISTANCE));
            }
        }
        if (this.targetX < this.x) {
            this.ax = -BossSuperTank.ACCELERATION;
        } else {
            this.ax = BossSuperTank.ACCELERATION;
        }
    }

    private move(dx: number): void {
        this.x = javaFloat(this.x + dx);
        this.wheelAngle = javaFloat(this.wheelAngle + javaFloat(BossSuperTank.WHEEL_ANGLE_CONST * dx));
        this.treadOffset = javaFloat(this.treadOffset - dx);
        while (this.treadOffset < 0) {
            this.treadOffset = javaFloat(this.treadOffset + 16);
        }
        while (this.treadOffset >= 16) {
            this.treadOffset = javaFloat(this.treadOffset - 16);
        }
    }

    private stopMoving(): void {
        this.state = BossSuperTank.STATE_STOPPED;
        if (this.main.random.nextFloat() <= BossSuperTank.FIRE_PROBABILITY) {
            this.superFire = new SuperFire(javaFloat(this.x + 210), javaFloat(this.y + 314), this);
        }
        this.delay = 91;
    }

    public update(): void {
        switch (this.state) {
            case BossSuperTank.STATE_APPEARING:
                if (--this.appearingDelay === 0) {
                    this.chooseTarget();
                    for (let i = 0; i < 5; i++) {
                        this.main.superTanks[0][i].setAlpha(1);
                    }
                }
                break;
            case BossSuperTank.STATE_ACCELERATING:
                this.vx = javaFloat(this.vx + this.ax);
                this.move(this.vx);
                if (this.ax < 0) {
                    if (this.vx <= -BossSuperTank.MAX_SPEED) {
                        this.state = BossSuperTank.STATE_MOVING;
                    }
                } else {
                    if (this.vx >= BossSuperTank.MAX_SPEED) {
                        this.state = BossSuperTank.STATE_MOVING;
                    }
                }
                break;
            case BossSuperTank.STATE_MOVING:
                this.move(this.vx);
                if (Math.abs(javaFloat(this.targetX - this.x)) <= BossSuperTank.ACCELERATION_DISTANCE) {
                    this.state = BossSuperTank.STATE_DECELERATING;
                }
                break;
            case BossSuperTank.STATE_DECELERATING:
                this.vx = javaFloat(this.vx - this.ax);
                this.move(this.vx);
                if (this.ax < 0) {
                    if (this.vx >= 0) {
                        this.stopMoving();
                    }
                } else {
                    if (this.vx <= 0) {
                        this.stopMoving();
                    }
                }
                break;
            case BossSuperTank.STATE_STOPPED:
                if (--this.delay === 0) {
                    this.chooseTarget();
                }
                break;
            case BossSuperTank.STATE_EXPLODING:
                if (--this.delay === 0) {
                    if (this.exploding + 1 < BossSuperTank.EXPLODING_TIME) {
                        Explosion.create(
                            javaFloat(this.x + this.main.random.nextInt(456)),
                            javaFloat(javaFloat(this.y + 32) + this.main.random.nextInt(230))
                        ).setDamagesEnemies(false);
                    }
                    this.delay = 8;
                }
                this.smashed = javaFloat(this.exploding * BossSuperTank.INV_EXPLODING_TIME);
                if (++this.exploding === BossSuperTank.EXPLODING_TIME) {
                    this.state = BossSuperTank.STATE_EXPLODING_FINISHING;
                    this.exploding = BossSuperTank.EXPLODING_FINISHING_TIME;
                }
                break;
            case BossSuperTank.STATE_EXPLODING_FINISHING:
                if (--this.exploding === 0) {
                    this.main.requestSong(this.main.cutsceneSong);
                    this.state = BossSuperTank.STATE_EXPLODED;
                    this.delay = 91;
                }
                break;
            case BossSuperTank.STATE_EXPLODED:
                if (this.delay > 1) {
                    this.delay--;
                } else if (this.delay === 1 && this.gameMode.tryStartEndingCameraPan(this)) {
                    this.delay = 0;
                    this.state = BossSuperTank.STATE_PANNING;
                }
                break;
        }
    }

    private kaboom(): void {
        this.state = BossSuperTank.STATE_EXPLODING;
        this.main.stopAllSongs();
        this.main.playSoundAlways(this.main.headquartersExplodesSound);
        this.main.addPoints(this.points + 2000 * this.main.friendlySoldiersPickedUp);
        this.gameMode.destroyAllExcept(this);
        this.delay = 1;
        if (this.superFire !== null) {
            this.superFire.remove();
        }
    }

    private displayHit(hitX: number, hitY: number): void {
        if (hitY > this.y + 230) {
            hitY = this.y + 230;
        }

        for (let i = 0; i < 3; i++) {
            let X = hitX;
            let Y = hitY;
            let d = 0;
            do {
                Explosion.attachedToEnemy(X, Y, true, d, 0.5, this);
                d += 2;
                X += this.main.random.nextInt(128) - 64;
                if (X < this.x) {
                    X = this.x + this.main.random.nextInt(128);
                } else if (X > this.x + 456) {
                    X = this.x + 456 - this.main.random.nextInt(128);
                }
                Y -= 32;
            } while (Y > this.y + 32);
        }
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (this.state >= BossSuperTank.STATE_EXPLODING) {
            return false;
        }
        if (attackSource === AttackSource.PLAYER_WEAPON && this.hitBounds(x1, y1, x2, y2)) {
            this.hits++;
            this.main.playHitExplodeSound();
            if (this.hits === BossSuperTank.HITS_EXPLODE) {
                this.kaboom();
            } else {
                this.displayHit(javaFloat(0.5 * javaFloat(x1 + x2)), javaFloat(0.5 * javaFloat(y1 + y2)));
                if (this.hits === BossSuperTank.HITS_ORANGE) {
                    this.colorIndex = 1;
                } else if (this.hits === BossSuperTank.HITS_RED) {
                    this.colorIndex = 2;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.state >= BossSuperTank.STATE_EXPLODING) {
            return false;
        }
        if (this.hitBounds(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    public panComplete(): void {
        this.state = BossSuperTank.STATE_FLASHING_SKULL;
        new FlashingSkull();
    }

    public render(): void {
        if (this.state === BossSuperTank.STATE_APPEARING) {
            for (let i = 0; i < 5; i++) {
                this.main.superTanks[0][i].setAlpha(1 - this.appearingDelay * BossSuperTank.APPEARING_SCALE);
            }
        }

        this.gameMode.g.setWorldClip(this.x, this.y + 200, 64, 64);
        this.main.drawRotated(
            this.main.superTanks[this.colorIndex][0],
            this.x + 48 + BossSuperTank.ANGLED_TREAD_X * this.treadOffset,
            this.y + 219 + BossSuperTank.ANGLED_TREAD_Y * this.treadOffset,
            BossSuperTank.ANGLED_TREAD_ANGLE
        );
        this.gameMode.g.setWorldClip(this.x + 400, this.y + 200, 50, 64);
        this.main.drawRotated(
            this.main.superTanks[this.colorIndex][0],
            this.x + 402 + BossSuperTank.ANGLED_TREAD_X * this.treadOffset,
            this.y + 227 - BossSuperTank.ANGLED_TREAD_Y * this.treadOffset,
            -BossSuperTank.ANGLED_TREAD_ANGLE
        );
        this.gameMode.g.setWorldClip(this.x + 64, this.y + 200, 336, 64);
        for (let i = 0; i < 6; i++) {
            this.main.drawImage(this.main.superTanks[this.colorIndex][0], this.treadOffset + this.x + 32 + (i << 6), this.y + 200);
        }
        this.gameMode.g.clearWorldClip();
        for (let i = 0; i < 6; i++) {
            this.main.drawRotated(this.main.superTanks[this.colorIndex][1], this.x + 72 + (i << 6), this.y + 216, this.wheelAngle);
        }
        if (this.state >= BossSuperTank.STATE_EXPLODING_FINISHING) {
            this.main.drawImage(this.main.superTanks[3][2], this.x + 160, this.y);
            this.main.drawImage(this.main.superTanks[3][3], this.x, this.y + 32);
            this.main.drawImage(this.main.superTanks[3][4], this.x + 192, this.y + 232);
        } else if (this.state === BossSuperTank.STATE_EXPLODING) {
            let alpha = 1 - this.smashed;
            this.main.drawImageAlpha(this.main.superTanks[2][2], this.x + 160, this.y, alpha);
            this.main.drawImageAlpha(this.main.superTanks[2][3], this.x, this.y + 32, alpha);
            this.main.drawImageAlpha(this.main.superTanks[2][4], this.x + 192, this.y + 232, alpha);
            this.main.drawImageAlpha(this.main.superTanks[3][2], this.x + 160, this.y, this.smashed);
            this.main.drawImageAlpha(this.main.superTanks[3][3], this.x, this.y + 32, this.smashed);
            this.main.drawImageAlpha(this.main.superTanks[3][4], this.x + 192, this.y + 232, this.smashed);
        } else {
            this.main.drawImage(this.main.superTanks[this.colorIndex][2], this.x + 160, this.y);
            this.main.drawImage(this.main.superTanks[this.colorIndex][3], this.x, this.y + 32);
            this.main.drawImage(this.main.superTanks[this.colorIndex][4], this.x + 192, this.y + 232);
        }
    }
}
