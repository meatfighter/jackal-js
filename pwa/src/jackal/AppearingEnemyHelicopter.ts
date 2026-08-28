import { MainConstants } from "../java/MainConstants.js";
import { EnemyHelicopter } from "./EnemyHelicopter.js";
import { GameElement } from "./GameElement.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class AppearingEnemyHelicopter extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(arg0?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_AppearingEnemyHelicopter(argCount, arg0);
    }

    private __construct_AppearingEnemyHelicopter(argCount: number, arg0?: number): void {
        if (argCount === 1 && typeof arg0 === "number") {
            let yLocal = javaFloat(arg0);
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public init(): void {
        this.layer = 0;
    }

    public update(): void {
        if (javaFloat(this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT) < javaFloat(this.y - 60)) {
            new EnemyHelicopter(false);
            this.remove();
        }
    }

    public render(): void {}
}
