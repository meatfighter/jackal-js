import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { Star } from "./Star.js";
export class InvisibleStar extends Enemy {
    declare public type: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.type = 0;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_InvisibleStar(argCount, arg0, arg1, arg2);
    }

    private __construct_InvisibleStar(argCount: number, arg0?: number, arg1?: number, arg2?: number): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let typeLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.type = typeLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
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
        if (attackSource < AttackSource.PLAYER_EXPLOSION && this.hit(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(this.x, this.y);
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
