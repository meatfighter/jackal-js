import { javaFloat, javaInt, javaRoundFloat, type ArrayList } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
import type { BossBlueTanksManager } from "./BossBlueTanksManager.js";
import type { Player } from "./Player.js";
export class BossBlueTank extends Enemy {
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
    declare public recoilOffset: number;
    declare public recoilDelay: number;
    declare public colorOffset: number;
    declare public introVy: number;
    declare public introDelay: number;
    declare public bossBlueTanksManager: BossBlueTanksManager | null;

    protected override __initializeJavaSubclassDefaults(): void {
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
        this.recoilOffset = 0;
        this.recoilDelay = 0;
        this.colorOffset = 0;
        this.introVy = 0;
        this.introDelay = 0;
        this.bossBlueTanksManager = null;
    }

    public constructor(x: number, y: number, bossBlueTanksManager: BossBlueTanksManager) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.bossBlueTanksManager = bossBlueTanksManager;
        this.directionX = 0;
        this.vx = 0;
        if (y < 0) {
            this.displayAngle = javaFloat((this.targetAngle = 90));
            this.directionY = 1;
            this.vy = this.introVy = BossBlueTank.SPEED;
            this.introDelay = 128;
        } else {
            this.displayAngle = javaFloat((this.targetAngle = 270));
            this.directionY = -1;
            this.vy = this.introVy = -BossBlueTank.SPEED;
            this.introDelay = 42;
        }
    }

    public static readonly SPEED: number = 2.5;
    public static readonly SENSOR_RADIUS: number = 53;
    public static readonly ANGLE_STEPS: number = 18;
    public static readonly ANGLE_VELOCITY: number = javaFloat(45 / BossBlueTank.ANGLE_STEPS);
    public static readonly SHOOT_DELAY: number = 16;
    public static readonly RECOIL_DELAY: number = 12;
    public static readonly SHOOT_LONG_DELAY: number = 91;
    public static readonly SHOOT_COUNT: number = 2;
    public static readonly BULLET_TRAVEL_TIME: number = 5 * 91;

    public static readonly MAX_MOVE_SQUARES: number = 8;

    public static readonly DIMENSION_1: number = 48;
    public static readonly DIMENSION_2: number = 40;

    public shootDelay: number = BossBlueTank.SHOOT_DELAY;
    public shootCount: number = BossBlueTank.SHOOT_COUNT;

    public targetAngle: number = 90;
    public displayAngle: number = 90;

    public override init(): void {
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
        this.mineX1 = -40;
        this.mineY1 = -40;
        this.mineX2 = 40;
        this.mineY2 = 40;

        this.solid = true;
        this.solidX1 = -54;
        this.solidY1 = -54;
        this.solidX2 = 54;
        this.solidY2 = 54;
    }

    private driveAtRightAngleToBarrier(): void {
        let Vx = this.vx;
        let Vy = this.vy;
        let Dx = this.directionX;
        let Dy = this.directionY;

        if (this.main.random.nextInt(5) === 4) {
            this.vx = -this.vx;
            this.vy = -this.vy;
            this.directionX = -this.directionX;
            this.directionY = -this.directionY;
            this.targetAngle += 180;
        } else if (this.main.random.nextInt(3) === 2) {
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
        this.sensorX = javaFloat(this.directionX * BossBlueTank.SENSOR_RADIUS);
        this.sensorY = javaFloat(this.directionY * BossBlueTank.SENSOR_RADIUS);

        if (this.main.random.nextInt(5) !== 4) {
            this.computeMoveSteps();
        }
    }

    private computeMoveSteps(): void {
        let v = 0;

        if (this.directionX !== 0) {
            v = this.directionX;
        } else {
            v = this.directionY;
        }
        if (v === 0) {
            return;
        }

        let d = 0;

        if (v > 0) {
            d = javaFloat(32 - javaFloat(v % 32));
        } else {
            d = javaFloat(v % 32);
        }

        d = javaFloat(d + 32 * (1 + this.main.random.nextInt(BossBlueTank.MAX_MOVE_SQUARES)));

        this.moveSteps = javaRoundFloat(javaFloat(d / BossBlueTank.SPEED));
    }

    private testCorners(nextX: number, nextY: number): void {
        let sx1 = 0;
        let sy1 = 0;
        let sx2 = 0;
        let sy2 = 0;

        switch (this.targetAngle) {
            case 0:
                sx1 = javaFloat(nextX + BossBlueTank.DIMENSION_1);
                sy1 = javaFloat(nextY - BossBlueTank.DIMENSION_2);
                sx2 = javaFloat(nextX + BossBlueTank.DIMENSION_1);
                sy2 = javaFloat(nextY + BossBlueTank.DIMENSION_2);
                break;
            case 90:
                sx1 = javaFloat(nextX + BossBlueTank.DIMENSION_2);
                sy1 = javaFloat(nextY + BossBlueTank.DIMENSION_1);
                sx2 = javaFloat(nextX - BossBlueTank.DIMENSION_2);
                sy2 = javaFloat(nextY + BossBlueTank.DIMENSION_1);
                break;
            case 180:
                sx1 = javaFloat(nextX - BossBlueTank.DIMENSION_1);
                sy1 = javaFloat(nextY + BossBlueTank.DIMENSION_2);
                sx2 = javaFloat(nextX - BossBlueTank.DIMENSION_1);
                sy2 = javaFloat(nextY - BossBlueTank.DIMENSION_2);
                break;
            case 270:
                sx1 = javaFloat(nextX - BossBlueTank.DIMENSION_2);
                sy1 = javaFloat(nextY - BossBlueTank.DIMENSION_1);
                sx2 = javaFloat(nextX + BossBlueTank.DIMENSION_2);
                sy2 = javaFloat(nextY - BossBlueTank.DIMENSION_1);
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
        this.sensorX = javaFloat(this.directionX * BossBlueTank.SENSOR_RADIUS);
        this.sensorY = javaFloat(this.directionY * BossBlueTank.SENSOR_RADIUS);

        if (this.main.random.nextInt(5) !== 4) {
            this.computeMoveSteps();
        }
    }

    private handleLoop(): void {
        if (this.handlingLoop === 0) {
            this.handlingLoop = 91 * (2 + this.main.random.nextInt(5));
            this.loopTargetX = javaFloat(this.main.random.nextFloat() * 2048);
            this.loopTargetY = javaFloat(this.main.random.nextFloat() * this.player!.y);
        }
    }

    public update(): void {
        if (this.introDelay > 0) {
            let nextX = this.x;
            let nextY = javaFloat(this.y + this.introVy);

            for (let i = this.solids!.size() - 1; i >= 0; i--) {
                let solidLocal2 = this.solids!.get(i);
                if (
                    solidLocal2 !== this &&
                    solidLocal2.isSolidBounds(
                        javaFloat(nextX + this.solidX1),
                        javaFloat(nextY + this.solidY1),
                        javaFloat(nextX + this.solidX2),
                        javaFloat(nextY + this.solidY2)
                    ) &&
                    !solidLocal2.isSolidBounds(
                        javaFloat(this.x + this.solidX1),
                        javaFloat(this.y + this.solidY1),
                        javaFloat(this.x + this.solidX2),
                        javaFloat(this.y + this.solidY2)
                    )
                ) {
                    return;
                }
            }

            this.introDelay--;
            this.y = nextY;
            return;
        }

        if (this.recoilDelay > 0) {
            if (--this.recoilDelay === 0) {
                this.recoilOffset = 0;
            }
        }

        if (this.displayAngle !== this.targetAngle) {
            this.shootCount = BossBlueTank.SHOOT_COUNT;
            let deltaAngle = javaFloat(javaFloat(javaFloat(this.targetAngle - this.displayAngle) + 180) % 360);
            if (deltaAngle < 0) {
                deltaAngle = javaFloat(deltaAngle + 180);
            } else {
                deltaAngle = javaFloat(deltaAngle - 180);
            }
            if (Math.abs(deltaAngle) < BossBlueTank.ANGLE_VELOCITY) {
                this.displayAngle = javaFloat(this.targetAngle);
            } else {
                if (deltaAngle < 0) {
                    this.displayAngle = javaFloat(this.displayAngle - BossBlueTank.ANGLE_VELOCITY);
                } else {
                    this.displayAngle = javaFloat(this.displayAngle + BossBlueTank.ANGLE_VELOCITY);
                }
            }
        } else {
            if (this.handlingLoop > 0) {
                this.handlingLoop--;
            }

            if (--this.moveSteps <= 0) {
                let dx = 0;
                let dy = 0;
                if (this.main.random.nextInt(5) === 4) {
                    dx = this.main.random.nextInt(512) - 256;
                    dy = this.main.random.nextInt(512) - 256;
                }
                let v =
                    this.handlingLoop > 0
                        ? this.gameMode.suggestDirectionWithCurrentAngle(
                              this.x,
                              this.y,
                              javaFloat(this.loopTargetX + dx),
                              javaFloat(this.loopTargetY + dy),
                              this.targetAngle,
                              false
                          )
                        : this.gameMode.suggestDirectionWithCurrentAngle(
                              this.x,
                              this.y,
                              javaFloat(this.player!.x + dx),
                              javaFloat(this.player!.y + dy),
                              this.targetAngle,
                              false
                          );
                this.vx = javaFloat(v[0] * BossBlueTank.SPEED);
                this.vy = javaFloat(v[1] * BossBlueTank.SPEED);
                this.directionX = v[0];
                this.directionY = v[1];
                this.targetAngle = javaInt(v[2]);
                this.sensorX = javaFloat(this.directionX * BossBlueTank.SENSOR_RADIUS);
                this.sensorY = javaFloat(this.directionY * BossBlueTank.SENSOR_RADIUS);
                this.computeMoveSteps();
            }

            let nextX = javaFloat(this.x + this.vx);
            let nextY = javaFloat(this.y + this.vy);

            this.testCorners(nextX, nextY);

            let driveable = true;

            if (this.gameMode.isDriveable(javaFloat(nextX + this.sensorX), javaFloat(nextY + this.sensorY))) {
                // avoid bumping into other enemies
                for (let i = this.solids!.size() - 1; i >= 0; i--) {
                    let solidLocal = this.solids!.get(i);
                    if (
                        solidLocal !== this &&
                        solidLocal.isSolidBounds(
                            javaFloat(nextX + this.solidX1),
                            javaFloat(nextY + this.solidY1),
                            javaFloat(nextX + this.solidX2),
                            javaFloat(nextY + this.solidY2)
                        ) &&
                        !solidLocal.isSolidBounds(
                            javaFloat(this.x + this.solidX1),
                            javaFloat(this.y + this.solidY1),
                            javaFloat(this.x + this.solidX2),
                            javaFloat(this.y + this.solidY2)
                        )
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
            } else {
                this.driveAtRightAngleToBarrier();
            }

            let dx = javaFloat(this.player!.x - this.x);
            let dy = javaFloat(this.player!.y - this.y);

            if (
                this.moveSteps === 1 &&
                ((this.vy !== 0 && javaInt(this.player!.x) >> 7 === javaInt(this.x) >> 7) ||
                    (this.vx !== 0 && javaInt(this.player!.y) >> 7 === javaInt(this.y) >> 7))
            ) {
                this.moveSteps = 2;
            }
            if ((javaFloat(this.lastDx * dx) <= 0 || javaFloat(this.lastDy * dy) <= 0) && this.main.random.nextInt(3) !== 2) {
                this.moveSteps = 0;
            }

            this.lastDx = dx;
            this.lastDy = dy;

            if (--this.shootDelay <= 0) {
                if (--this.shootCount <= 0) {
                    this.shootCount = BossBlueTank.SHOOT_COUNT;
                    this.shootDelay = BossBlueTank.SHOOT_LONG_DELAY;
                } else {
                    this.shootDelay = BossBlueTank.SHOOT_DELAY;
                }
                let bx = 0;
                let by = 0;
                switch (this.targetAngle) {
                    case 0:
                    case 360:
                        bx = 49;
                        by = -12;
                        break;
                    case 45:
                        bx = 50;
                        by = 36;
                        break;
                    case 90:
                        bx = 0;
                        by = 52;
                        break;
                    case 135:
                        bx = -50;
                        by = 36;
                        break;
                    case 180:
                        bx = -49;
                        by = -12;
                        break;
                    case 225:
                        bx = -36;
                        by = -50;
                        break;
                    case 270:
                        bx = 0;
                        by = -52;
                        break;
                    case 315:
                        bx = 36;
                        by = -50;
                        break;
                }
                EnemyBullet.colored(
                    javaFloat(this.x + bx),
                    javaFloat(this.y + by),
                    javaFloat(this.directionX * 2),
                    javaFloat(this.directionY * 2),
                    BossBlueTank.BULLET_TRAVEL_TIME,
                    false
                );
                this.recoilDelay = BossBlueTank.RECOIL_DELAY;
                this.recoilOffset = 1;
            }
        }
    }

    public override remove(): void {
        this.removeFlag = true;
        this.main.playHitExplodeSound();
        this.bossBlueTanksManager!.blueTankDestroyed();
    }

    private attacked(): void {
        this.bulletHits = 5;
        if (this.colorOffset === 0) {
            this.colorOffset = 2;
        } else {
            this.main.addPoints(800);
            Explosion.create(this.x, this.y);
            this.remove();
        }
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource === AttackSource.PLAYER_WEAPON && this.hitBounds(x1, y1, x2, y2)) {
            if (this.colorOffset === 0) {
                this.main.playHitExplodeSound();
            }
            this.attacked();
            return true;
        }
        return false;
    }

    // returns true if player bullet was absorbed by enemy
    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.hitBounds(x1, y1, x2, y2)) {
            if (--this.bulletHits === 0) {
                this.attacked();
            } else {
                this.main.playSoundAlways(this.main.bulletHitSound);
            }
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bumped into the enemy
    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (invincible) {
            return false;
        }
        if (this.isMineBounds(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        this.main.drawVehicle(this.main.bossBlueTanks[this.colorOffset + this.recoilOffset], this.x, this.y, this.displayAngle);
    }
}
