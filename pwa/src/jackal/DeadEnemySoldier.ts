import { javaFloat } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class DeadEnemySoldier extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.fading = false;
        this.delay = 0;
    }

    public constructor(x: number, y: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
    }

    public static readonly PRE_FADE_DELAY: number = 91 * 2;
    public static readonly FADE_DELAY: number = 91;

    public fading: boolean = false;
    public delay: number = DeadEnemySoldier.PRE_FADE_DELAY;

    public init(): void {
        this.layer = 1;
        this.main.addPoints(100);
    }

    public update(): void {
        if (this.fading) {
            if (--this.delay === 0) {
                this.remove();
            }
        } else {
            if (--this.delay === 0) {
                this.fading = true;
                this.delay = DeadEnemySoldier.PRE_FADE_DELAY;
            }
        }
    }

    public render(): void {
        if (this.fading) {
            this.main.drawImageAlpha(this.main.deadEnemySoldier, this.x - 20, this.y - 54, this.delay / javaFloat(DeadEnemySoldier.FADE_DELAY));
        } else {
            this.main.drawImage(this.main.deadEnemySoldier, this.x - 20, this.y - 54);
        }
    }
}
