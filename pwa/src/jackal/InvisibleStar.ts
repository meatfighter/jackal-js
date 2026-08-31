import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { Star } from "./Star.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class InvisibleStar extends Enemy {
    declare public type: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.type = 0;
    }

    public constructor(x: number, y: number, type: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);

        this.x = x;
        this.y = y;
        this.type = type;
    }

    public override init(): void {
        super.init();

        this.layer = 0;

        this.hitX1 = -32;
        this.hitY1 = -32;
        this.hitX2 = 32;
        this.hitY2 = 32;
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource < AttackSource.PLAYER_EXPLOSION && this.hitBounds(x1, y1, x2, y2)) {
            this.remove();
            Explosion.create(this.x, this.y);
            this.main.addPoints(5000);
            new Star(this.x, this.y, this.type);
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        return false;
    }

    public update(): void {}

    public render(): void {}
}
