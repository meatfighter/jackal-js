import { javaArray, javaDouble, javaFloat, type ArrayList } from "../java/JavaRuntime.js";
import { DeadEnemySoldier } from "./DeadEnemySoldier.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { EnemySoldierType } from "./EnemySoldierType.js";
import { Explosion } from "./Explosion.js";
import { Fire } from "./Fire.js";
import type { BossHelicopter } from "./BossHelicopter.js";
import type { Player } from "./Player.js";
export class EnemySoldier extends Enemy {
    declare public type: EnemySoldierType | null;
    declare public solids: ArrayList<Enemy> | null;
    declare public player: Player | null;
    declare public targetX: number;
    declare public targetY: number;
    declare public targetVx: number;
    declare public targetVy: number;
    declare public directionX: number;
    declare public directionY: number;
    declare public walking: number;
    declare public aiming: number;
    declare public orientation: number;
    declare public legIndex: number;
    declare public legFrames: number;
    declare public walkSteps: number;
    declare public blink: number;
    declare public wobbleX: number;
    declare public wobbleY: number;
    declare public spriteIndex: number;
    declare public wobbleScaleX: number;
    declare public wobbleScaleY: number;
    declare public shots: number;
    declare public totalShots: number;
    declare public inSwamp: boolean;
    declare public bossHelicopter: BossHelicopter | null;
    declare public fire: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.type = null;
        this.state = 0;
        this.solids = null;
        this.player = null;
        this.targetX = 0;
        this.targetY = 0;
        this.targetVx = 0;
        this.targetVy = 0;
        this.directionX = 0;
        this.directionY = 0;
        this.walking = 0;
        this.aiming = 0;
        this.orientation = 0;
        this.legIndex = 0;
        this.legFrames = 0;
        this.walkSteps = 0;
        this.blink = 0;
        this.wobbleX = 0;
        this.wobbleY = 0;
        this.spriteIndex = 0;
        this.wobbleScaleX = 0;
        this.wobbleScaleY = 0;
        this.shots = 0;
        this.totalShots = 0;
        this.inSwamp = false;
        this.bossHelicopter = null;
        this.fire = false;
    }

    public constructor(x: number, y: number, type: EnemySoldierType) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.type = type;
        switch (type) {
            case EnemySoldierType.APPEARING:
                this.runUpwards();
                break;
            case EnemySoldierType.WALKER:
                this.startSeeking();
                break;
            case EnemySoldierType.STATIONARY:
                this.startAiming();
                break;
            case EnemySoldierType.TROOPS_TRUCK:
                this.runLeft();
                break;
            case EnemySoldierType.FIRE:
                type = EnemySoldierType.STATIONARY;
                this.startAiming();
                this.fire = true;
                break;
        }
        if (this.fire) {
            this.totalShots = 1;
        } else {
            switch (this.gameMode.stageIndex) {
                case 0:
                case 1:
                    this.totalShots = 1;
                    break;
                case 2:
                case 3:
                    this.totalShots = 2;
                    break;
                case 4:
                case 5:
                    this.totalShots = 3;
                    break;
            }
        }
    }

    public static readonly WALK_SPEED: number = 0.5;
    public static readonly MIN_WALK_TIME: number = 1 * 91;
    public static readonly MAX_WALK_TIME: number = 4 * 91;
    public static readonly MAX_WALK_STEPS: number = 5;
    public static readonly LEG_FRAMES: number = 26;
    public static readonly LEG_AMPLITUDE: number = 2;
    public static readonly AIM_FRAMES: number = 114;
    public static readonly AIM_BLINKING: number = 23;
    public static readonly AIM_RESHOOT: number = 11;
    public static readonly EXTRA_AIMING_TIME: number = 2 * 91;
    public static readonly BULLET_TRAVEL_TIME: number = 1 * 91;
    public static readonly TO_DEGREES: number = javaFloat(180 / Math.PI);

    public static readonly STATE_SEEKING: number = 0;
    public static readonly STATE_AIMING: number = 1;

    public static readonly ORIENTATION_DOWN: number = 0;
    public static readonly ORIENTATION_RIGHT: number = 2;
    public static readonly ORIENTATION_UP: number = 4;
    public static readonly ORIENTATION_LEFT: number = 6;

    public static readonly WOBBLES: number[] = javaArray(EnemySoldier.LEG_FRAMES, 0);
    static {
        for (let i = EnemySoldier.LEG_FRAMES - 1; i >= 0; i--) {
            EnemySoldier.WOBBLES[i] = javaFloat(-EnemySoldier.LEG_AMPLITUDE * javaFloat(Math.sin((2.0 * Math.PI * i) / javaDouble(EnemySoldier.LEG_FRAMES))));
        }
    }

    public state: number = EnemySoldier.STATE_SEEKING;

    public override init(): void {
        super.init();

        this.solids = this.gameMode.solids;
        this.player = this.gameMode.player;

        this.layer = 3;
        this.bulletHits = 1;

        this.hitX1 = -16;
        this.hitY1 = -54;
        this.hitX2 = 16;
        this.hitY2 = 6;

        this.mine = true;
        this.mineX1 = -16;
        this.mineY1 = -54;
        this.mineX2 = 16;
        this.mineY2 = 6;

        this.solid = true;
        this.solidX1 = -16;
        this.solidY1 = -54;
        this.solidX2 = 16;
        this.solidY2 = 6;

        this.points = 100;
    }

    public setBossHelicopter(bossHelicopter: BossHelicopter): void {
        this.bossHelicopter = bossHelicopter;
        this.points = 10;
    }

    private computeOrientation(): void {
        this.wobbleScaleX = javaFloat(Math.abs(this.directionY));
        this.wobbleScaleY = javaFloat(Math.abs(this.directionX));

        if (this.wobbleScaleY > this.wobbleScaleX) {
            if (this.directionX > 0) {
                this.orientation = EnemySoldier.ORIENTATION_RIGHT;
            } else {
                this.orientation = EnemySoldier.ORIENTATION_LEFT;
            }
        } else {
            if (this.directionY > 0) {
                this.orientation = EnemySoldier.ORIENTATION_DOWN;
            } else {
                this.orientation = EnemySoldier.ORIENTATION_UP;
            }
        }
    }

    public getWalkSpeed(): number {
        return javaFloat(this.inSwamp ? javaFloat(0.5 * EnemySoldier.WALK_SPEED) : EnemySoldier.WALK_SPEED);
    }

    private targetPlayer(): void {
        let direction = this.gameMode.suggestDirection(this.x, this.y, this.player!.x, this.player!.y, true);

        this.directionX = direction[0];
        this.directionY = direction[1];
        this.targetVx = javaFloat(this.getWalkSpeed() * direction[0]);
        this.targetVy = javaFloat(this.getWalkSpeed() * direction[1]);

        this.walking = this.main.random.nextInt(EnemySoldier.MAX_WALK_TIME - EnemySoldier.MIN_WALK_TIME) + EnemySoldier.MIN_WALK_TIME;

        this.computeOrientation();
    }

    private avoidGettingToCloseToPlayer(): void {
        let dx = javaFloat(this.player!.x - this.x);
        let dy = javaFloat(this.player!.y - this.y);
        let r2 = javaFloat(javaFloat(dx * dx) + javaFloat(dy * dy));
        if (r2 < 16384 && javaFloat(javaFloat(dx * this.directionX) + javaFloat(dy * this.directionY)) > 0) {
            let v = this.main.unitVector;
            let ir = javaFloat(1 / javaFloat(Math.sqrt(r2)));
            v[0] = javaFloat(ir * -dx);
            v[1] = javaFloat(ir * -dy);
            this.gameMode.rotate(v, javaFloat(javaFloat(this.main.random.nextFloat() * javaFloat(0.3927)) - javaFloat(0.1963)));
            this.directionX = v[0];
            this.directionY = v[1];
            this.targetVx = javaFloat(this.getWalkSpeed() * this.directionX);
            this.targetVy = javaFloat(this.getWalkSpeed() * this.directionY);
            this.walking = this.main.random.nextInt(EnemySoldier.MAX_WALK_TIME - EnemySoldier.MIN_WALK_TIME) + EnemySoldier.MIN_WALK_TIME;
            this.computeOrientation();
        }
    }

    private walkAtRightAngleToBarrier(): void {
        let direction = this.gameMode.suggestDirectionFromVelocity(this.directionX, this.directionY);
        this.directionX = direction[0];
        this.directionY = direction[1];
        this.targetVx = javaFloat(this.getWalkSpeed() * direction[0]);
        this.targetVy = javaFloat(this.getWalkSpeed() * direction[1]);
        this.computeOrientation();
    }

    private aim(): void {
        this.directionX = javaFloat(this.player!.x - this.x);
        this.directionY = javaFloat(this.player!.y - javaFloat(this.y - 30));
        this.computeOrientation();

        if (this.aiming > EnemySoldier.AIM_BLINKING) {
            let r2 = javaFloat(javaFloat(this.directionX * this.directionX) + javaFloat(this.directionY * this.directionY));
            if (r2 <= 9216) {
                if (this.type === EnemySoldierType.WALKER) {
                    this.startSeeking();
                } else {
                    return;
                }
            }
        }

        if (--this.aiming <= 0) {
            this.shoot();
            if (++this.shots === this.totalShots) {
                this.shots = 0;
                if (this.type === EnemySoldierType.WALKER) {
                    this.startSeeking();
                } else {
                    this.startAiming();
                }
            } else {
                this.aiming = EnemySoldier.AIM_RESHOOT;
            }
        }
    }

    private shoot(): void {
        let imag = javaFloat(1 / javaFloat(Math.sqrt(javaFloat(javaFloat(this.directionX * this.directionX) + javaFloat(this.directionY * this.directionY)))));
        if (this.fire) {
            new Fire(
                this.x,
                javaFloat(this.y - 30),
                javaFloat(this.directionX * imag),
                javaFloat(this.directionY * imag),
                javaFloat(EnemySoldier.TO_DEGREES * javaFloat(Math.atan2(this.directionY, this.directionX))),
                this
            );
        } else {
            EnemyBullet.colored(
                this.x,
                javaFloat(this.y - 30),
                javaFloat(this.directionX * imag),
                javaFloat(this.directionY * imag),
                EnemySoldier.BULLET_TRAVEL_TIME,
                true
            );
        }
    }

    private startAiming(): void {
        this.state = EnemySoldier.STATE_AIMING;
        this.aiming = EnemySoldier.AIM_FRAMES;
        if (this.type !== EnemySoldierType.WALKER) {
            this.aiming += this.main.random.nextInt(EnemySoldier.EXTRA_AIMING_TIME);
        }
        this.aim();
    }

    private runLeft(): void {
        this.state = EnemySoldier.STATE_SEEKING;
        this.type = EnemySoldierType.WALKER;

        this.directionX = -1;
        this.directionY = 0;
        this.targetVx = javaFloat(-this.getWalkSpeed());
        this.targetVy = 0;

        this.walkSteps = EnemySoldier.MAX_WALK_STEPS;
        this.walking = EnemySoldier.MAX_WALK_TIME;

        this.computeOrientation();
    }

    private runUpwards(): void {
        this.state = EnemySoldier.STATE_SEEKING;
        this.type = EnemySoldierType.WALKER;

        this.directionX = 0;
        this.directionY = -1;
        this.targetVx = 0;
        this.targetVy = javaFloat(-this.getWalkSpeed());

        this.walkSteps = EnemySoldier.MAX_WALK_STEPS;
        this.walking = EnemySoldier.MAX_WALK_TIME;

        this.computeOrientation();
    }

    private startSeeking(): void {
        this.state = EnemySoldier.STATE_SEEKING;
        this.walkSteps = 1 + this.main.random.nextInt(EnemySoldier.MAX_WALK_STEPS);
        this.targetPlayer();
    }

    private seek(): void {
        if (--this.walking <= 0) {
            if (--this.walkSteps <= 0) {
                let dx = javaFloat(this.player!.x - this.x);
                let dy = javaFloat(this.player!.y - this.y);
                let r2 = javaFloat(javaFloat(dx * dx) + javaFloat(dy * dy));
                if (r2 > 9216) {
                    this.startAiming();
                    return;
                } else {
                    this.targetPlayer();
                }
            } else {
                this.targetPlayer();
            }
        }

        this.avoidGettingToCloseToPlayer();

        let nextX = javaFloat(this.x + this.targetVx);
        let nextY = javaFloat(this.y + this.targetVy);
        let walkable = true;
        if (this.gameMode.isDriveableBounds(javaFloat(nextX - 16), javaFloat(nextY - 6), javaFloat(nextX + 16), javaFloat(nextY + 6))) {
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
                    walkable = false;
                    break;
                }
            }
        } else {
            walkable = false;
        }

        if (walkable) {
            this.x = nextX;
            this.y = nextY;

            if (this.legFrames === 0) {
                this.legFrames = EnemySoldier.LEG_FRAMES - 1;
                this.legIndex = 1;
            } else if (this.legFrames === 13) {
                this.legIndex = 0;
            }
            this.wobbleX = javaFloat(this.wobbleScaleX * EnemySoldier.WOBBLES[this.legFrames]);
            this.wobbleY = javaFloat(this.wobbleScaleY * EnemySoldier.WOBBLES[this.legFrames]);
            this.legFrames--;
        } else {
            this.walkAtRightAngleToBarrier();
        }
    }

    private convey(): void {
        if (this.gameMode.conveyorDelta > 0 && this.gameMode.isConveyor(this.x, this.y)) {
            let nextY = javaFloat(this.y + this.gameMode.conveyorDelta);
            let walkable = true;
            if (this.gameMode.isDriveableBounds(javaFloat(this.x - 16), javaFloat(nextY - 6), javaFloat(this.x + 16), javaFloat(nextY + 6))) {
                // avoid bumping into other enemies
                for (let i = this.solids!.size() - 1; i >= 0; i--) {
                    let solidLocal = this.solids!.get(i);
                    if (
                        solidLocal !== this &&
                        solidLocal.isSolidBounds(
                            javaFloat(this.x + this.solidX1),
                            javaFloat(nextY + this.solidY1),
                            javaFloat(this.x + this.solidX2),
                            javaFloat(nextY + this.solidY2)
                        ) &&
                        !solidLocal.isSolidBounds(
                            javaFloat(this.x + this.solidX1),
                            javaFloat(this.y + this.solidY1),
                            javaFloat(this.x + this.solidX2),
                            javaFloat(this.y + this.solidY2)
                        )
                    ) {
                        walkable = false;
                        break;
                    }
                }
            } else {
                walkable = false;
            }

            if (walkable) {
                this.y = nextY;
            }
        }
    }

    private walk(): void {
        this.convey();

        switch (this.state) {
            case EnemySoldier.STATE_SEEKING:
                this.seek();
                break;
            case EnemySoldier.STATE_AIMING:
                this.aim();
                break;
        }
    }

    public override flatten(): void {
        this.remove();
        new DeadEnemySoldier(this.x, this.y);
    }

    public override explode(): void {
        this.remove();
        new DeadEnemySoldier(this.x, this.y);
        Explosion.create(this.x, this.y);
    }

    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (this.isMineBounds(x1, y1, x2, y2)) {
            this.remove();
            new DeadEnemySoldier(this.x, this.y);
        }
        return false;
    }

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (this.hitBounds(x1, y1, x2, y2)) {
            this.remove();
            new DeadEnemySoldier(this.x, this.y);
        }
        return false;
    }

    // returns true if player bullet was absorbed by enemy
    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.hitBounds(x1, y1, x2, y2)) {
            this.remove();
            new DeadEnemySoldier(this.x, this.y);
            return true;
        } else {
            return false;
        }
    }

    public override remove(): void {
        this.removeFlag = true;
        if (this.bossHelicopter !== null) {
            this.bossHelicopter.soldierKilled();
        }
        if (
            this.playSoundOnRemove &&
            !this.gameMode.isOutsideOfFrameBounds(
                javaFloat(this.x + this.hitX1),
                javaFloat(this.y + this.hitY1),
                javaFloat(this.x + this.hitX2),
                javaFloat(this.y + this.hitY2)
            )
        ) {
            this.main.playSound(this.main.soldierKilledSound);
        }
    }

    public update(): void {
        this.inSwamp = this.gameMode.isSwamp(this.x, this.y);
        if (this.type === EnemySoldierType.WALKER) {
            this.walk();
        } else {
            this.aim();
        }
    }

    public render(): void {
        if (--this.blink < 0) {
            this.blink = 4;
        }
        if (this.fire) {
            this.main.drawImage(
                (this.inSwamp ? this.main.swampSoldiers : this.main.enemySoldiers)[
                    this.blink < 2 && this.state === EnemySoldier.STATE_AIMING && this.aiming <= EnemySoldier.AIM_BLINKING ? 0 : 1
                ][this.orientation + this.legIndex],
                this.x + this.wobbleX - 16,
                this.y + this.wobbleY - 54
            );
        } else {
            this.main.drawImage(
                (this.inSwamp ? this.main.swampSoldiers : this.main.enemySoldiers)[
                    this.blink < 2 && this.state === EnemySoldier.STATE_AIMING && this.aiming <= EnemySoldier.AIM_BLINKING ? 1 : 0
                ][this.orientation + this.legIndex],
                this.x + this.wobbleX - 16,
                this.y + this.wobbleY - 54
            );
        }
    }
}
