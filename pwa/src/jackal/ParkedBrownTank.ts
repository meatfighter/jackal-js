import { Enemy } from "./Enemy.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class ParkedBrownTank extends Enemy {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_ParkedBrownTank(argCount, arg0, arg1);
    }

    private __construct_ParkedBrownTank(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public override init(): void {
        super.init();

        this.layer = 3;

        this.bulletHits = 3;

        this.hitX1 = -40;
        this.hitY1 = -40;
        this.hitX2 = 40;
        this.hitY2 = 40;

        this.mine = true;
        this.mineX1 = -28;
        this.mineY1 = -28;
        this.mineX2 = 28;
        this.mineY2 = 28;

        this.solid = true;
        this.solidX1 = -48;
        this.solidY1 = -48;
        this.solidX2 = 48;
        this.solidY2 = 48;

        this.points = 50;
    }

    public update(): void {}

    public render(): void {
        this.main.drawCentered(this.main.parkedBrownTank, this.x, this.y);
    }
}
