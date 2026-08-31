import { GameElement } from "./GameElement.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class BulletHit extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.timeToLive = 0;
    }

    public constructor(x: number, y: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
    }

    public static readonly TIME_TO_LIVE: number = 10;

    public timeToLive: number = BulletHit.TIME_TO_LIVE;

    public init(): void {
        this.layer = 1;
    }

    public update(): void {
        if (--this.timeToLive <= 0) {
            this.removeFlag = true;
        }
    }

    public render(): void {
        this.main.drawCenteredAt(this.main.bulletHit, this.x, this.y);
    }
}
