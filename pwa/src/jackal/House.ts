import { javaFloat, javaInt } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { GameMode } from "./GameMode.js";
import { Help } from "./Help.js";
export class House extends Enemy {
    declare public groupIndex: number;
    declare public left: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.groupIndex = 0;
        this.left = false;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: boolean) {
        super();
        const argCount = arguments.length;
        this.__construct_House(argCount, arg0, arg1, arg2);
    }

    private __construct_House(argCount: number, arg0?: number, arg1?: number, arg2?: boolean): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            let leftLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.left = leftLocal;

            let X = javaInt(xLocal) >> 5;
            let Y = javaInt(yLocal) >> 5;

            this.groupIndex = this.gameMode.groupsMap[Y + 2][X + (leftLocal ? 0 : 5)];

            for (let i = 0; i < 6; i++) {
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
        this.hitY2 = 192;
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource <= AttackSource.TRAVELING_EXPLOSION && this.hit(x1, y1, x2, y2)) {
            this.playSoundOnRemove = false;
            this.main.playSound(this.main.hutSound);
            this.remove();
            new Explosion(javaFloat(this.x + 96), javaFloat(this.y + 96));
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
