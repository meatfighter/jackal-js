import { javaArray, javaDouble, javaFloat, type ArrayList } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { FriendlySoldierType } from "./FriendlySoldierType.js";
import type { FriendlyHelicopter } from "./FriendlyHelicopter.js";
import type { Player } from "./Player.js";
export class FriendlySoldier extends Enemy {
    declare public type: FriendlySoldierType | null;
    declare public state: number;
    declare public solids: ArrayList<Enemy> | null;
    declare public player: Player | null;
    declare public vx: number;
    declare public vy: number;
    declare public directionX: number;
    declare public directionY: number;
    declare public wandering: number;
    declare public aiming: number;
    declare public orientation: number;
    declare public legIndex: number;
    declare public legFrames: number;
    declare public walkSteps: number;
    declare public colorChanging: boolean;
    declare public colorIndex: number;
    declare public wobbleX: number;
    declare public wobbleY: number;
    declare public spriteIndex: number;
    declare public entry: number;
    declare public wobbleScaleX: number;
    declare public wobbleScaleY: number;
    declare public entering: boolean;
    declare public waving: number;
    declare public houseCount: number;
    declare public brother: FriendlySoldier | null;
    declare public left: boolean;
    declare public helicopter: FriendlyHelicopter | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.type = null;
        this.state = 0;
        this.solids = null;
        this.player = null;
        this.vx = 0;
        this.vy = 0;
        this.directionX = 0;
        this.directionY = 0;
        this.wandering = 0;
        this.aiming = 0;
        this.orientation = 0;
        this.legIndex = 0;
        this.legFrames = 0;
        this.walkSteps = 0;
        this.colorChanging = false;
        this.colorIndex = 0;
        this.wobbleX = 0;
        this.wobbleY = 0;
        this.spriteIndex = 0;
        this.entry = 0;
        this.wobbleScaleX = 0;
        this.wobbleScaleY = 0;
        this.entering = false;
        this.waving = 0;
        this.houseCount = 0;
        this.brother = null;
        this.left = false;
        this.helicopter = null;
    }

    private constructor() {
        super();
    }

    public static walkingToHelicopter(x: number, y: number, helicopter: FriendlyHelicopter, colorChanging: boolean): FriendlySoldier {
        const soldier = new FriendlySoldier();
        x = javaFloat(x);
        y = javaFloat(y);

        soldier.x = x;
        soldier.y = y;
        soldier.type = FriendlySoldierType.WALKING_TO_HELICOPTER;
        soldier.state = FriendlySoldier.STATE_WALKING_TO_HELICOPTER;
        soldier.helicopter = helicopter;
        soldier.colorChanging = colorChanging;
        if (x > helicopter.x) {
            soldier.orientation = FriendlySoldier.ORIENTATION_LEFT;
            soldier.directionX = -1;
            soldier.directionY = 0;
            soldier.vx = -FriendlySoldier.WALK_SPEED;
            soldier.vy = 0;
        } else {
            soldier.orientation = FriendlySoldier.ORIENTATION_RIGHT;
            soldier.directionX = 1;
            soldier.directionY = 0;
            soldier.vx = FriendlySoldier.WALK_SPEED;
            soldier.vy = 0;
        }
        soldier.wobbleScaleX = 0;
        soldier.wobbleScaleY = 1;
        return soldier;
    }

    public static wandering(x: number, y: number, type: FriendlySoldierType): FriendlySoldier {
        const soldier = new FriendlySoldier();
        soldier.x = javaFloat(x);
        soldier.y = javaFloat(y);
        soldier.type = type;

        if (type === FriendlySoldierType.WEAPON_CARRIER_WANDERER) {
            soldier.colorChanging = true;
        }

        soldier.startWandering();
        return soldier;
    }

    public static fromBuilding(x: number, y: number, type: FriendlySoldierType, houseCount: number, shack: boolean): FriendlySoldier {
        const soldier = new FriendlySoldier();
        soldier.x = javaFloat(x);
        soldier.y = javaFloat(y);
        soldier.type = type;
        soldier.houseCount = houseCount;
        soldier.left = type === FriendlySoldierType.HOUSE_LEFT_WALKING || type === FriendlySoldierType.HOUSE_LEFT_WAVING;

        switch (type) {
            case FriendlySoldierType.WEAPON_CARRIER:
                soldier.state = FriendlySoldier.STATE_ENTRY_DOWN;
                soldier.entering = true;
                soldier.colorChanging = true;
                soldier.orientation = FriendlySoldier.ORIENTATION_DOWN;
                soldier.entry = shack ? 68 : 100;
                soldier.wobbleScaleX = 1;
                soldier.wobbleScaleY = 0;
                break;
            case FriendlySoldierType.WANDERER:
                soldier.state = FriendlySoldier.STATE_WANDERING;
                break;
            case FriendlySoldierType.WEAPON_CARRIER_WANDERER:
                soldier.state = FriendlySoldier.STATE_WANDERING;
                soldier.colorChanging = true;
                break;
            case FriendlySoldierType.HOUSE_LEFT_WALKING:
                soldier.state = FriendlySoldier.STATE_ENTRY_LEFT;
                soldier.entering = true;
                soldier.orientation = FriendlySoldier.ORIENTATION_LEFT;
                soldier.wobbleScaleX = 0;
                soldier.wobbleScaleY = 1;
                soldier.entry = 141;
                soldier.spawnBrother();
                break;
            case FriendlySoldierType.HOUSE_RIGHT_WALKING:
                soldier.state = FriendlySoldier.STATE_ENTRY_RIGHT;
                soldier.entering = true;
                soldier.orientation = FriendlySoldier.ORIENTATION_RIGHT;
                soldier.wobbleScaleX = 0;
                soldier.wobbleScaleY = 1;
                soldier.entry = 141;
                soldier.spawnBrother();
                break;
            case FriendlySoldierType.HOUSE_LEFT_WAVING:
                soldier.state = FriendlySoldier.STATE_WAVING;
                soldier.orientation = FriendlySoldier.ORIENTATION_WAVING_LEFT;
                soldier.wobbleScaleX = 0;
                soldier.wobbleScaleY = 1;
                break;
            case FriendlySoldierType.HOUSE_RIGHT_WAVING:
                soldier.state = FriendlySoldier.STATE_WAVING;
                soldier.orientation = FriendlySoldier.ORIENTATION_WAVING_RIGHT;
                soldier.wobbleScaleX = 0;
                soldier.wobbleScaleY = 1;
                break;
        }
        return soldier;
    }

    public static readonly WALK_SPEED: number = 1;
    public static readonly MIN_WANDER_TIME: number = 1 * 91;
    public static readonly MAX_WANDER_TIME: number = 4 * 91;
    public static readonly MAX_WALK_STEPS: number = 5;
    public static readonly LEG_FRAMES: number = 26;
    public static readonly LEG_AMPLITUDE: number = 2;
    public static readonly WAVING_DELAY: number = 2 * 91;

    public static readonly STATE_ENTRY_DOWN: number = 0;
    public static readonly STATE_ENTRY_LEFT: number = 1;
    public static readonly STATE_ENTRY_RIGHT: number = 2;
    public static readonly STATE_WANDERING: number = 3;
    public static readonly STATE_WAVING: number = 4;
    public static readonly STATE_WALKING_TO_HELICOPTER: number = 5;

    public static readonly ORIENTATION_DOWN: number = 0;
    public static readonly ORIENTATION_RIGHT: number = 2;
    public static readonly ORIENTATION_UP: number = 4;
    public static readonly ORIENTATION_LEFT: number = 6;
    public static readonly ORIENTATION_WAVING_LEFT: number = 8;
    public static readonly ORIENTATION_WAVING_RIGHT: number = 10;

    public static readonly WOBBLES: number[] = javaArray(FriendlySoldier.LEG_FRAMES, 0);
    static {
        for (let i = FriendlySoldier.LEG_FRAMES - 1; i >= 0; i--) {
            FriendlySoldier.WOBBLES[i] = javaFloat(
                -FriendlySoldier.LEG_AMPLITUDE * javaFloat(Math.sin((2.0 * Math.PI * i) / javaDouble(FriendlySoldier.LEG_FRAMES)))
            );
        }
    }

    public static count: number = 0;

    public static resetCount(): void {
        FriendlySoldier.count = 0;
    }

    public override init(): void {
        super.init();

        FriendlySoldier.count++;

        this.solids = this.gameMode.solids;
        this.player = this.gameMode.player;

        this.layer = 2;
        this.bulletHits = 1;

        this.hitX1 = 0;
        this.hitY1 = -40;
        this.hitX2 = 0;
        this.hitY2 = -20;

        this.mine = true;
        this.mineX1 = 0;
        this.mineY1 = -40;
        this.mineX2 = 0;
        this.mineY2 = -20;

        this.solid = true;
        this.solidX1 = -16;
        this.solidY1 = -60;
        this.solidX2 = 16;
        this.solidY2 = 6;
    }

    private spawnBrother(): void {
        if (this.houseCount > 0) {
            this.brother = FriendlySoldier.fromBuilding(
                this.x,
                this.y,
                this.left ? FriendlySoldierType.HOUSE_LEFT_WAVING : FriendlySoldierType.HOUSE_RIGHT_WAVING,
                this.houseCount - 1,
                false
            );
        }
    }

    private promote(): void {
        if (this.left) {
            this.type = FriendlySoldierType.HOUSE_LEFT_WALKING;
            this.state = FriendlySoldier.STATE_ENTRY_LEFT;
            this.orientation = FriendlySoldier.ORIENTATION_LEFT;
        } else {
            this.type = FriendlySoldierType.HOUSE_RIGHT_WALKING;
            this.state = FriendlySoldier.STATE_ENTRY_RIGHT;
            this.orientation = FriendlySoldier.ORIENTATION_RIGHT;
        }
        this.entering = true;
        this.entry = 141;
        this.spawnBrother();
    }

    private startWandering(): void {
        this.state = FriendlySoldier.STATE_WANDERING;
        for (let i = 0; i < 16; i++) {
            let angle = javaFloat(javaFloat(6.283) * this.main.random.nextFloat());
            this.directionX = javaFloat(Math.cos(angle));
            this.directionY = javaFloat(Math.sin(angle));
            if (this.gameMode.isDriveable(javaFloat(this.x + javaFloat(this.directionX * 32)), javaFloat(this.y + javaFloat(this.directionY * 32)))) {
                break;
            }
        }
        this.vx = javaFloat(this.directionX * FriendlySoldier.WALK_SPEED);
        this.vy = javaFloat(this.directionY * FriendlySoldier.WALK_SPEED);
        this.wandering = FriendlySoldier.MIN_WANDER_TIME + this.main.random.nextInt(FriendlySoldier.MAX_WANDER_TIME - FriendlySoldier.MIN_WANDER_TIME);
        this.computeOrientation();
    }

    private startWaving(randomize: boolean, left: boolean): void {
        this.state = FriendlySoldier.STATE_WAVING;
        this.wobbleX = 0;
        this.wobbleY = 0;
        if (randomize) {
            this.orientation = this.main.random.nextBoolean() ? FriendlySoldier.ORIENTATION_WAVING_LEFT : FriendlySoldier.ORIENTATION_WAVING_RIGHT;
        } else {
            this.orientation = left ? FriendlySoldier.ORIENTATION_WAVING_LEFT : FriendlySoldier.ORIENTATION_WAVING_RIGHT;
        }
        if (this.orientation === FriendlySoldier.ORIENTATION_WAVING_LEFT) {
            this.wobbleX = -8;
        }
        this.waving = FriendlySoldier.WAVING_DELAY;
    }

    private wave(): void {
        if (this.legFrames === 0) {
            this.legFrames = FriendlySoldier.LEG_FRAMES - 1;
            this.legIndex = 1;
        } else if (this.legFrames === 13) {
            this.legIndex = 0;
        }
        this.legFrames--;

        if (
            (this.type === FriendlySoldierType.WEAPON_CARRIER ||
                this.type === FriendlySoldierType.WANDERER ||
                this.type === FriendlySoldierType.WEAPON_CARRIER_WANDERER) &&
            --this.waving <= 0
        ) {
            this.startWandering();
        }
    }

    private computeOrientation(): void {
        this.wobbleScaleX = javaFloat(Math.abs(this.directionY));
        this.wobbleScaleY = javaFloat(Math.abs(this.directionX));

        if (this.wobbleScaleY > this.wobbleScaleX) {
            if (this.directionX > 0) {
                this.orientation = FriendlySoldier.ORIENTATION_RIGHT;
            } else {
                this.orientation = FriendlySoldier.ORIENTATION_LEFT;
            }
        } else {
            if (this.directionY > 0) {
                this.orientation = FriendlySoldier.ORIENTATION_DOWN;
            } else {
                this.orientation = FriendlySoldier.ORIENTATION_UP;
            }
        }
    }

    private walkAtRightAngleToBarrier(): void {
        let direction = this.gameMode.suggestDirectionFromVelocity(this.directionX, this.directionY);
        this.directionX = direction[0];
        this.directionY = direction[1];
        this.vx = javaFloat(FriendlySoldier.WALK_SPEED * direction[0]);
        this.vy = javaFloat(FriendlySoldier.WALK_SPEED * direction[1]);
        this.computeOrientation();
    }

    private updateLegs(): void {
        if (this.legFrames === 0) {
            this.legFrames = FriendlySoldier.LEG_FRAMES - 1;
            this.legIndex = 1;
        } else if (this.legFrames === 13) {
            this.legIndex = 0;
        }
        this.wobbleX = javaFloat(this.wobbleScaleX * FriendlySoldier.WOBBLES[this.legFrames]);
        this.wobbleY = javaFloat(this.wobbleScaleY * FriendlySoldier.WOBBLES[this.legFrames]);
        this.legFrames--;
    }

    private enterLeft(): void {
        if (--this.entry <= 0) {
            this.startWaving(false, true);
            return;
        }

        if (this.entry < 120) {
            this.x = javaFloat(this.x - 1);
            this.updateLegs();
        }
    }

    private enterRight(): void {
        if (--this.entry <= 0) {
            this.startWaving(false, false);
            return;
        }

        if (this.entry < 120) {
            this.x = javaFloat(this.x + 1);
            this.updateLegs();
        }
    }

    private enterDown(): void {
        if (--this.entry <= 0) {
            this.startWaving(true, false);
            return;
        }

        if (this.entry < 79) {
            this.y = javaFloat(this.y + 2);
            this.updateLegs();
        }
    }

    private walkToHelicopter(): void {
        this.x = javaFloat(this.x + this.vx);
        this.updateLegs();

        if ((this.vx < 0 && this.x <= this.helicopter!.x) || (this.vx > 0 && this.x >= this.helicopter!.x)) {
            this.remove();
            this.helicopter!.friendlySoldierPickedUp();
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

    private wander(): void {
        let nextX = javaFloat(this.x + this.vx);
        let nextY = javaFloat(this.y + this.vy);
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
            this.updateLegs();
        } else {
            this.walkAtRightAngleToBarrier();
        }

        if (--this.wandering <= 0) {
            this.startWaving(true, false);
        }
    }

    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (this.type !== FriendlySoldierType.WALKING_TO_HELICOPTER && this.isMineBounds(x1, y1, x2, y2)) {
            this.remove();
            if (this.type === FriendlySoldierType.WEAPON_CARRIER || this.type === FriendlySoldierType.WEAPON_CARRIER_WANDERER) {
                this.gameMode.player.pickUpFlashingSoldier();
            } else {
                this.gameMode.player.collectPOW();
            }
            if (this.brother !== null) {
                this.brother.promote();
            }
        }
        return false;
    }

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        return false;
    }

    // returns true if player bullet was absorbed by enemy
    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        return false;
    }

    public override remove(): void {
        if (!this.removeFlag) {
            this.removeFlag = true;
            FriendlySoldier.count--;
        }
    }

    public override flatten(): void {}

    public override explode(): void {}

    public update(): void {
        if (this.gameMode.endingCameraPan || !this.gameMode.playing) {
            return;
        }

        this.convey();

        switch (this.state) {
            case FriendlySoldier.STATE_ENTRY_DOWN:
                this.enterDown();
                break;
            case FriendlySoldier.STATE_ENTRY_RIGHT:
                this.enterRight();
                break;
            case FriendlySoldier.STATE_ENTRY_LEFT:
                this.enterLeft();
                break;
            case FriendlySoldier.STATE_WAVING:
                this.wave();
                break;
            case FriendlySoldier.STATE_WANDERING:
                this.wander();
                break;
            case FriendlySoldier.STATE_WALKING_TO_HELICOPTER:
                this.walkToHelicopter();
                break;
        }
    }

    public render(): void {
        if (this.colorChanging) {
            this.colorIndex = (this.colorIndex + 1) & 3;
        }
        this.main.drawImage(
            this.main.friendlySoldiers[this.colorIndex][this.orientation + this.legIndex],
            this.x + this.wobbleX - 16,
            this.y + this.wobbleY - (this.orientation === FriendlySoldier.ORIENTATION_LEFT || this.orientation === FriendlySoldier.ORIENTATION_RIGHT ? 60 : 56)
        );
    }
}
