import { GameElement } from "./GameElement.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class BulletHit extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.timeToLive = 0;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_BulletHit(argCount, arg0, arg1);
    }

    private __construct_BulletHit(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
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
        this.main.drawCentered(this.main.bulletHit, this.x, this.y);
    }
}
