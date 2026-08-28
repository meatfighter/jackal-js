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

    public constructor(arg0?: number, arg1?: number, arg2?: boolean, arg3?: boolean) {
        super();
        const argCount = arguments.length;
        this.__construct_Hut(argCount, arg0, arg1, arg2, arg3);
    }

    private __construct_Hut(argCount: number, arg0?: number, arg1?: number, arg2?: boolean, arg3?: boolean): void {
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean" && typeof arg3 === "boolean") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            let shackLocal = arg2;
            let tankLocal = arg3;
            this.x = xLocal;
            this.y = yLocal;
            this.shack = shackLocal;
            this.tank = tankLocal;

            let X = javaInt(xLocal) >> 5;
            let Y = javaInt(yLocal) >> 5;

            if (shackLocal) {
                this.groupIndex = this.gameMode.groupsMap[Y + 3][X + 2];
            } else {
                this.groupIndex = this.gameMode.groupsMap[Y + 1][X + 1];
            }

            for (let i = shackLocal ? 5 : 4; i >= 0; i--) {
                for (let j = 0; j < 6; j++) {
                    this.gameMode.typesMap[Y + i][X + j] = GameMode.TYPE_SOLID;
                }
            }
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
        this.hitY2 = this.shack ? 192 : 160;
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource <= AttackSource.TRAVELING_EXPLOSION && this.hit(x1, y1, x2, y2)) {
            this.playSoundOnRemove = false;
            this.main.playSound(this.main.hutSound);
            this.remove();
            new Explosion(javaFloat(this.x + (this.shack ? 96 : 80)), javaFloat(this.y + 96));
            this.gameMode.triggerGroup(this.groupIndex);
            if (this.tank) {
                new GrayTank(javaFloat(this.x + 86), javaFloat(this.y + 96), true);
                this.main.addPoints(500);
            } else {
                new FriendlySoldier(
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
