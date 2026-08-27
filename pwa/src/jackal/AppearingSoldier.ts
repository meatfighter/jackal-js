import { MainConstants } from "../java/MainConstants.js";
import { EnemySoldier } from "./EnemySoldier.js";
import { EnemySoldierType } from "./EnemySoldierType.js";
import { GameElement } from "./GameElement.js";
export class AppearingSoldier extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_AppearingSoldier(argCount, arg0, arg1);
    }

    private __construct_AppearingSoldier(argCount: number, arg0?: number, arg1?: number): void {
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
        if (this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT < this.y - 75) {
            new EnemySoldier(this.x, this.y, EnemySoldierType.APPEARING);
            this.remove();
        }
    }

    public render(): void {}
}
