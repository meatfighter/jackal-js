import { javaFloat } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class DeadEnemySoldier extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.fading = false;
        this.delay = 0;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_DeadEnemySoldier(argCount, arg0, arg1);
    }

    private __construct_DeadEnemySoldier(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
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
            if (--this.delay == 0) {
                this.remove();
            }
        } else {
            if (--this.delay == 0) {
                this.fading = true;
                this.delay = DeadEnemySoldier.PRE_FADE_DELAY;
            }
        }
    }

    public render(): void {
        if (this.fading) {
            this.main.draw(this.main.deadEnemySoldier, this.x - 20, this.y - 54, this.delay / javaFloat(DeadEnemySoldier.FADE_DELAY));
        } else {
            this.main.draw(this.main.deadEnemySoldier, this.x - 20, this.y - 54);
        }
    }
}
