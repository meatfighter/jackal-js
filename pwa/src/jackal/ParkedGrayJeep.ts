import { Enemy } from "./Enemy.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class ParkedGrayJeep extends Enemy {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(x: number, y: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
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
        this.main.drawCenteredAt(this.main.parkedGrayJeep, this.x, this.y);
    }
}
