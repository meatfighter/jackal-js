import { javaFloat, javaInt, type ArrayList } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import type { Player } from "./Player.js";
export class Column extends Enemy {
    declare public left: boolean;
    declare public player: Player | null;
    declare public groupIndex: number;
    declare public vx: number;
    declare public vy: number;
    declare public angleInc: number;
    declare public canDropLeft: boolean;
    declare public canDropRight: boolean;
    declare public mines: ArrayList<Enemy> | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.rotationOffset = 0;
        this.left = false;
        this.state = 0;
        this.player = null;
        this.groupIndex = 0;
        this.angle = 0;
        this.vx = 0;
        this.vy = 0;
        this.angleInc = 0;
        this.tipSteps = 0;
        this.canDropLeft = false;
        this.canDropRight = false;
        this.mines = null;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_Column(argCount, arg0, arg1);
    }

    private __construct_Column(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;

            this.player = this.gameMode.player;

            let X = javaInt(xLocal) >> 5;
            let Y = javaInt(yLocal) >> 5;

            this.groupIndex = this.gameMode.groupsMap[Y][X];

            this.canDropLeft = !(
                this.gameMode.isSolidTile(X - 3, Y + 3) ||
                this.gameMode.isSolidTile(X - 3, Y + 4) ||
                this.gameMode.isSolidTile(X - 3, Y + 14)
            );
            this.canDropRight = !(
                this.gameMode.isSolidTile(X + 4, Y + 3) ||
                this.gameMode.isSolidTile(X + 4, Y + 4) ||
                this.gameMode.isSolidTile(X + 4, Y + 14)
            );
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_HIDDEN: number = 0;
    public static readonly STATE_TIPPING: number = 1;
    public static readonly STATE_ROLLING: number = 2;
    public static readonly STATE_STATIONARY: number = 3;

    public static readonly ROTATION_SPEED: number = javaFloat(0.6);

    public static readonly TRAP_X1: number = javaFloat(-3 * 32);
    public static readonly TRAP_Y1: number = javaFloat(8 * 32);
    public static readonly TRAP_X2: number = javaFloat(5 * 32);
    public static readonly TRAP_Y2: number = javaFloat(16 * 32);

    public static readonly GRAVITY: number = javaFloat(0.1);
    public static readonly TIP_VX: number = 2.5;
    public static readonly TIP_ANGLE_INC: number = 2;
    public static readonly ROLL_VY: number = 6;
    public static readonly ROLL_DISTANCE: number = javaFloat(10 * 32);
    public static readonly ROLL_STEPS: number = 91;
    public static readonly ROLL_ACCELERATION: number = javaFloat(
        javaFloat(2 * javaFloat(Column.ROLL_DISTANCE - javaFloat(Column.ROLL_VY * Column.ROLL_STEPS))) / (Column.ROLL_STEPS * Column.ROLL_STEPS)
    );

    public rotationOffset: number = javaFloat(27.933975);

    public state: number = Column.STATE_HIDDEN;

    public angle: number = -90;

    public tipSteps: number = javaInt(javaFloat(90 / Column.TIP_ANGLE_INC));

    public override init(): void {
        super.init();

        this.mines = this.gameMode.mines;

        this.layer = 4;

        this.hitX1 = 0;
        this.hitY1 = 0;
        this.hitX2 = 64;
        this.hitY2 = 92;

        this.solid = true;
        this.solidX1 = 0;
        this.solidY1 = 0;
        this.solidX2 = 64;
        this.solidY2 = 92;

        this.mine = true;
        this.mineX1 = Column.TRAP_X1;
        this.mineY1 = Column.TRAP_Y1;
        this.mineX2 = Column.TRAP_X2;
        this.mineY2 = Column.TRAP_Y2;

        this.points = 500;
        this.bulletHits = 7;
    }

    private rollOverEnemies(): void {
        for (let i = this.mines!.size() - 1; i >= 0; i--) {
            let mineLocal = this.mines!.get(i);
            if (
                mineLocal != this &&
                mineLocal.isMine(
                    javaFloat(this.x + this.mineX1),
                    javaFloat(this.y + this.mineY1),
                    javaFloat(this.x + this.mineX2),
                    javaFloat(this.y + this.mineY2)
                )
            ) {
                mineLocal.flatten();
            }
        }
    }

    public override flatten(): void {
        if (this.state == Column.STATE_STATIONARY) {
            this.explode();
        }
    }

    public update(): void {
        switch (this.state) {
            case Column.STATE_HIDDEN:
                break;
            case Column.STATE_TIPPING:
                this.vy = javaFloat(this.vy + Column.GRAVITY);
                this.x = javaFloat(this.x + this.vx);
                this.y = javaFloat(this.y + this.vy);
                this.angle = javaFloat(this.angle + this.angleInc);
                if (--this.tipSteps == 0) {
                    this.startRolling();
                }
                break;
            case Column.STATE_ROLLING:
                this.vy = javaFloat(this.vy + Column.ROLL_ACCELERATION);
                if (this.vy <= 0) {
                    this.stopRolling();
                }
                this.y = javaFloat(this.y + this.vy);
                this.rotationOffset = javaFloat(this.rotationOffset + javaFloat(Column.ROTATION_SPEED * this.vy));
                if (this.rotationOffset >= 56) {
                    this.rotationOffset = javaFloat(this.rotationOffset - 56);
                }
                this.rollOverEnemies();
                break;
        }
    }

    private startRolling(): void {
        this.state = Column.STATE_ROLLING;
        this.vy = Column.ROLL_VY;

        this.hitX1 = -46;
        this.hitY1 = -28;
        this.hitX2 = 46;
        this.hitY2 = 28;

        this.mineX1 = -38;
        this.mineY1 = -20;
        this.mineX2 = 38;
        this.mineY2 = 20;

        this.solidX1 = -46;
        this.solidY1 = -28;
        this.solidX2 = 46;
        this.solidY2 = 28;
    }

    private stopRolling(): void {
        this.state = Column.STATE_STATIONARY;
        this.changeLayer(3);
    }

    private startTipping(attacked: boolean): void {
        if (!attacked) {
            if (this.canDropLeft && this.canDropRight) {
                if (this.player!.x < javaFloat(this.x + 32)) {
                    if (!(this.player!.targetAngle <= 90 || this.player!.targetAngle >= 270)) {
                        return;
                    }
                } else if (this.player!.targetAngle <= 90 || this.player!.targetAngle >= 270) {
                    return;
                }
            } else if (this.canDropLeft) {
                if (this.player!.x < javaFloat(this.x + 32) || this.player!.targetAngle <= 90 || this.player!.targetAngle >= 270) {
                    return;
                }
            } else {
                if (this.player!.x > javaFloat(this.x + 32) || !(this.player!.targetAngle <= 90 || this.player!.targetAngle >= 270)) {
                    return;
                }
            }
        }

        this.state = Column.STATE_TIPPING;
        this.main.playHitExplodeSound();
        new Explosion(javaFloat(this.x + 32), javaFloat(this.y + 48));
        this.gameMode.triggerGroup(this.groupIndex);

        this.x = javaFloat(this.x + 32);
        this.y = javaFloat(this.y + 46);

        if (this.canDropLeft && this.canDropRight) {
            if (this.main.random.nextInt(7) == 3) {
                this.left = this.main.random.nextBoolean();
            } else if (this.main.random.nextInt(3) == 1) {
                this.left = this.player!.x < this.x;
            } else {
                this.left = this.player!.x > this.x;
            }
        } else {
            this.left = this.canDropLeft;
        }

        if (this.left) {
            this.vx = -Column.TIP_VX;
            this.vy = 0;
            this.angleInc = -Column.TIP_ANGLE_INC;
        } else {
            this.vx = Column.TIP_VX;
            this.vy = 0;
            this.angleInc = Column.TIP_ANGLE_INC;
        }

        this.hitX1 = -28;
        this.hitY1 = -28;
        this.hitX2 = 28;
        this.hitY2 = 28;

        this.mineX1 = -20;
        this.mineY1 = -20;
        this.mineX2 = 20;
        this.mineY2 = 20;

        this.solidX1 = -28;
        this.solidY1 = -28;
        this.solidX2 = 28;
        this.solidY2 = 28;
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (this.state == Column.STATE_HIDDEN) {
            if (attackSource < AttackSource.PLAYER_EXPLOSION && this.hit(x1, y1, x2, y2)) {
                this.startTipping(true);
                return true;
            }
        } else {
            if (
                (attackSource == AttackSource.PLAYER_WEAPON || (this.state == Column.STATE_STATIONARY && attackSource == AttackSource.TRAVELING_EXPLOSION)) &&
                this.hit(x1, y1, x2, y2)
            ) {
                this.remove();
                new Explosion(this.x, this.y);
                this.main.addPoints(this.points);
                return true;
            }
        }
        return false;
    }

    // returns true if player bullet was absorbed by enemy
    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.state == Column.STATE_HIDDEN) {
            return false;
        }
        return super.bulletAttack(x1, y1, x2, y2);
    }

    // returns true if player bumped into the enemy
    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (this.state == Column.STATE_HIDDEN) {
            if (this.gameMode.cameraY < this.y && this.isMine(x1, y1, x2, y2)) {
                this.startTipping(false);
            }
        } else {
            if (this.isMine(x1, y1, x2, y2)) {
                this.remove();
                new Explosion(this.x, this.y);
                this.main.addPoints(this.points);
                return invincible ? false : true;
            }
        }
        return false;
    }

    public render(): void {
        switch (this.state) {
            case Column.STATE_HIDDEN:
                break;
            case Column.STATE_TIPPING:
                this.main.drawRotated(this.main.columns[0], this.x, this.y, this.angle);
                break;
            case Column.STATE_ROLLING:
                this.main.drawRotated(this.main.columns[0], this.x, this.y, this.angle);
                if (this.left) {
                    this.gameMode.g.setWorldClip(this.x - 22, this.y - 23, 56, 48);
                    this.main.draw(this.main.columns[1], this.x - 46, this.y - 84 + this.rotationOffset);
                    this.main.draw(this.main.columns[1], this.x - 46, this.y - 28 + this.rotationOffset);
                    this.gameMode.g.clearWorldClip();
                } else {
                    this.gameMode.g.setWorldClip(this.x - 31, this.y - 25, 56, 48);
                    this.main.draw(this.main.columns[0], this.x - 46, this.y - 84 + this.rotationOffset);
                    this.main.draw(this.main.columns[0], this.x - 46, this.y - 28 + this.rotationOffset);
                    this.gameMode.g.clearWorldClip();
                }
                break;
            case Column.STATE_STATIONARY:
                this.main.drawRotated(this.main.columns[0], this.x, this.y, this.angle);
                break;
        }
    }
}
