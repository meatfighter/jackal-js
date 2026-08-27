import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
import { Train } from "./Train.js";
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
            let xLocal = arg0;
            let yLocal = arg1;
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly CARS: number = 6;

    public init(): void {}

    public update(): void {
        if (this.y > this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT) {
            this.remove();
            for (let i = 0; i < TrainManager.CARS; i++) {
                new Train(this.x + (i == 0 ? 0 : 4), this.y + (i << 7), i == 0);
            }
        }
    }

    public render(): void {}
}
