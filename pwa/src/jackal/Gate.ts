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

    private constructor() {
        super();
    }

    public static create(x: number, y: number): Gate {
        const gate = new Gate();
        gate.x = javaFloat(x);
        gate.y = javaFloat(y);
        gate.groupIndex = gate.gameMode.groupsMap[javaInt(gate.y) >> 5][(javaInt(gate.x) >> 5) + 1];
        return gate;
    }

    public static withBossGarageManager(x: number, y: number, bossGarageManager: BossGarageManager): Gate {
        const gate = Gate.create(x, y);
        gate.bossGarageManager = bossGarageManager;
        return gate;
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
        if (attackSource === AttackSource.PLAYER_WEAPON && this.hitBounds(x1, y1, x2, y2)) {
            this.remove();
            Explosion.create(javaFloat(this.x + 96), javaFloat(this.y + 64));
            this.gameMode.triggerGroup(this.groupIndex);
            if (this.bossGarageManager !== null) {
                this.bossGarageManager.gateOpen();
            }
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy
    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.hitBounds(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    public override explode(): void {}

    public update(): void {}

    public render(): void {}
}
