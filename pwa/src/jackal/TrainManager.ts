import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
import { Train } from "./Train.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class TrainManager extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_TrainManager(argCount, arg0, arg1);
    }

    private __construct_TrainManager(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly CARS: number = 6;

    public init(): void {}

    public update(): void {
        if (this.y > javaFloat(this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT)) {
            this.remove();
            for (let i = 0; i < TrainManager.CARS; i++) {
                new Train(javaFloat(this.x + (i == 0 ? 0 : 4)), javaFloat(this.y + (i << 7)), i == 0);
            }
        }
    }

    public render(): void {}
}
