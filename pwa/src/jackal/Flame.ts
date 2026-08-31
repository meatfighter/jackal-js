import { javaArray, javaFloat } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class Flame extends GameElement {
    declare public spriteCounter: number;
    declare public spriteIndex: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.spriteCounter = 0;
        this.spriteIndex = 0;
        this.delay = 0;
    }

    public constructor(x: number, y: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
    }

    public static readonly TIME_TO_LIVE: number = 1 * 91;

    public static readonly ALPHAS: number[] = javaArray(Flame.TIME_TO_LIVE, 0);

    static {
        for (let i = 0; i < Flame.TIME_TO_LIVE; i++) {
            Flame.ALPHAS[i] = javaFloat(Math.sqrt(javaFloat(i / javaFloat(Flame.TIME_TO_LIVE))));
        }
    }

    public delay: number = Flame.TIME_TO_LIVE;

    public init(): void {
        this.layer = 0;
    }

    public update(): void {
        if (--this.delay === 0) {
            this.remove();
        }
    }

    public render(): void {
        if (++this.spriteCounter === 8) {
            this.spriteCounter = 0;
            this.spriteIndex ^= 1;
        }
        this.main.drawCenteredAlpha(this.main.fires[this.spriteIndex][2], this.x, this.y, Flame.ALPHAS[this.delay]);
    }
}
