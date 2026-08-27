import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
import { GrayJeep } from "./GrayJeep.js";
export class AppearingGrayJeep extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_AppearingGrayJeep(argCount, arg0, arg1);
    }

    private __construct_AppearingGrayJeep(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public init(): void {
        this.layer = 0;
    }

    public update(): void {
        if (this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT < this.y - 48) {
            let grayJeep = new GrayJeep(this.x, this.y);
            grayJeep.targetAngle = 270;
            grayJeep.displayAngle = 270;
            this.remove();
        }
    }

    public render(): void {}
}
