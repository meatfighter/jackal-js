import { javaFloat, javaInt } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import type { BossGarageManager } from "./BossGarageManager.js";
export class Gate extends Enemy {
    declare public groupIndex: number;
    declare public bossGarageManager: BossGarageManager | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.groupIndex = 0;
        this.bossGarageManager = null;
    }

    public constructor(x: number, y: number, bossGarageManager: BossGarageManager);
    public constructor(x: number, y: number);
    public constructor(arg0?: number, arg1?: number, arg2?: BossGarageManager) {
        super();
        const argCount = arguments.length;
        this.__construct_Gate(argCount, arg0, arg1, arg2);
    }

    private __construct_Gate(argCount: number, arg0?: number, arg1?: number, arg2?: BossGarageManager): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal2 = javaFloat(arg0);
            let yLocal2 = javaFloat(arg1);
            let bossGarageManagerLocal = arg2;
            this.__construct_Gate(2, xLocal2, yLocal2);
            this.bossGarageManager = bossGarageManagerLocal!;
            return;
        } else if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;

            this.groupIndex = this.gameMode.groupsMap[javaInt(yLocal) >> 5][(javaInt(xLocal) >> 5) + 1];
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public override init(): void {
        super.init();

        this.layer = 0;

        this.hitX1 = 0;
        this.hitY1 = 0;
        this.hitX2 = 192;
        this.hitY2 = 128;
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource == AttackSource.PLAYER_WEAPON && this.hit(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(javaFloat(this.x + 96), javaFloat(this.y + 64));
            this.gameMode.triggerGroup(this.groupIndex);
            if (this.bossGarageManager != null) {
                this.bossGarageManager.gateOpen();
            }
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

    public override explode(): void {}

    public update(): void {}

    public render(): void {}
}
