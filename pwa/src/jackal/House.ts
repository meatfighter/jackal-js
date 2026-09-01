import { javaFloat, javaInt } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { TILE_TYPE_SOLID } from "./GameTileTypes.js";
import { Help } from "./Help.js";
export class House extends Enemy {
    declare public groupIndex: number;
    declare public left: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.groupIndex = 0;
        this.left = false;
    }

    public constructor(x: number, y: number, left: boolean) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.left = left;
        let X = javaInt(x) >> 5;
        let Y = javaInt(y) >> 5;
        this.groupIndex = this.gameMode.groupsMap[Y + 2][X + (left ? 0 : 5)];
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                this.gameMode.typesMap[Y + i][X + j] = TILE_TYPE_SOLID;
            }
        }
    }

    public override init(): void {
        super.init();

        this.layer = 0;

        this.hitX1 = 0;
        this.hitY1 = 0;
        this.hitX2 = 192;
        this.hitY2 = 192;
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource <= AttackSource.TRAVELING_EXPLOSION && this.hitBounds(x1, y1, x2, y2)) {
            this.playSoundOnRemove = false;
            this.main.playSound(this.main.hutSound);
            this.remove();
            Explosion.create(javaFloat(this.x + 96), javaFloat(this.y + 96));
            this.gameMode.triggerGroup(this.groupIndex);
            new Help(javaFloat(this.x + 96), javaFloat(this.y + 84), this.left);
            this.main.addPoints(800);
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
