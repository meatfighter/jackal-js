import { javaFloat, javaInt } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { FriendlySoldier } from "./FriendlySoldier.js";
import { FriendlySoldierType } from "./FriendlySoldierType.js";
import { GameMode } from "./GameMode.js";
import { GrayTank } from "./GrayTank.js";
export class Hut extends Enemy {
    declare public groupIndex: number;
    declare public shack: boolean;
    declare public tank: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.groupIndex = 0;
        this.shack = false;
        this.tank = false;
    }

    public constructor(x: number, y: number, shack: boolean, tank: boolean) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.shack = shack;
        this.tank = tank;
        let X = javaInt(x) >> 5;
        let Y = javaInt(y) >> 5;
        if (shack) {
            this.groupIndex = this.gameMode.groupsMap[Y + 3][X + 2];
        } else {
            this.groupIndex = this.gameMode.groupsMap[Y + 1][X + 1];
        }
        for (let i = shack ? 5 : 4; i >= 0; i--) {
            for (let j = 0; j < 6; j++) {
                this.gameMode.typesMap[Y + i][X + j] = GameMode.TYPE_SOLID;
            }
        }
    }

    public override init(): void {
        super.init();

        this.layer = 0;

        this.hitX1 = 0;
        this.hitY1 = 0;
        this.hitX2 = 192;
        this.hitY2 = this.shack ? 192 : 160;
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource <= AttackSource.TRAVELING_EXPLOSION && this.hitBounds(x1, y1, x2, y2)) {
            this.playSoundOnRemove = false;
            this.main.playSound(this.main.hutSound);
            this.remove();
            Explosion.create(javaFloat(this.x + (this.shack ? 96 : 80)), javaFloat(this.y + 96));
            this.gameMode.triggerGroup(this.groupIndex);
            if (this.tank) {
                GrayTank.fromShack(javaFloat(this.x + 86), javaFloat(this.y + 96), true);
                this.main.addPoints(500);
            } else {
                FriendlySoldier.fromBuilding(
                    javaFloat(this.x + 96),
                    javaFloat(javaFloat(this.y + 48) + (this.shack ? 64 : 0)),
                    FriendlySoldierType.WEAPON_CARRIER,
                    0,
                    this.shack
                );
                this.main.addPoints(300);
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
